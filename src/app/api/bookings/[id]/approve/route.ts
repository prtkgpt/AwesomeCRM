// ============================================
// CleanDayCRM - Booking Approval API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { sendEmail } from '@/lib/email';
import { sendSMS } from '@/lib/twilio';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/bookings/[id]/approve - Admin approves cleaner-completed booking
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookingId } = await params;
    const body = await request.json().catch(() => ({}));
    const { triggerAutoCharge = true, sendReceipt = true, notes } = body;

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true, firstName: true, lastName: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can approve jobs
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Only admins can approve jobs' },
        { status: 403 }
      );
    }

    // Verify the booking exists and is in CLEANER_COMPLETED status
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        companyId: user.companyId,
        status: 'CLEANER_COMPLETED',
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            stripeCustomerId: true,
            defaultPaymentMethodId: true,
            autoChargeEnabled: true,
          },
        },
        address: true,
        assignedCleaner: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        {
          error: 'Booking not found, not in your company, or not pending approval',
        },
        { status: 404 }
      );
    }

    // Get company settings
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        name: true,
        stripeSecretKey: true,
        resendApiKey: true,
        twilioAccountSid: true,
        twilioAuthToken: true,
        twilioPhoneNumber: true,
        autoSendReviewRequest: true,
        reviewRequestDelay: true,
        feedbackEnabled: true,
      },
    });

    // Update status history
    const statusHistory = (booking.statusHistory as any[]) || [];
    statusHistory.push({
      status: 'COMPLETED',
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      action: 'APPROVED',
      notes,
    });

    // Update booking status to COMPLETED (Admin approved)
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'COMPLETED',
        statusHistory,
        approvedAt: new Date(),
        approvedById: user.id,
        internalNotes: notes
          ? `${booking.internalNotes || ''}\n[${new Date().toISOString()}] Approval note: ${notes}`.trim()
          : booking.internalNotes,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            stripeCustomerId: true,
            defaultPaymentMethodId: true,
            autoChargeEnabled: true,
            loyaltyPoints: true,
            totalSpent: true,
            totalBookings: true,
          },
        },
        address: true,
        assignedCleaner: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        completedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Update cleaner's stats
    if (updatedBooking.assignedCleanerId) {
      await prisma.teamMember.update({
        where: { id: updatedBooking.assignedCleanerId },
        data: {
          totalJobsCompleted: { increment: 1 },
          totalEarnings: { increment: updatedBooking.finalPrice },
        },
      });
    }

    // Update client's stats
    await prisma.client.update({
      where: { id: updatedBooking.clientId },
      data: {
        totalSpent: { increment: updatedBooking.finalPrice },
        totalBookings: { increment: 1 },
        lastBookingDate: new Date(),
      },
    });

    // Auto-charge if enabled
    let paymentResult: any = null;
    if (
      triggerAutoCharge &&
      !updatedBooking.isPaid &&
      updatedBooking.client.autoChargeEnabled &&
      updatedBooking.client.stripeCustomerId &&
      updatedBooking.client.defaultPaymentMethodId
    ) {
      // Use company's Stripe key if available, otherwise use global
      const stripeClient = company?.stripeSecretKey
        ? require('stripe')(company.stripeSecretKey)
        : stripe;

      if (stripeClient) {
        try {
          const clientName = `${updatedBooking.client.firstName} ${updatedBooking.client.lastName || ''}`.trim();
          const amountToCharge = Math.round(updatedBooking.finalPrice * 100); // Convert to cents

          const paymentIntent = await stripeClient.paymentIntents.create({
            amount: amountToCharge,
            currency: 'usd',
            customer: updatedBooking.client.stripeCustomerId,
            payment_method: updatedBooking.client.defaultPaymentMethodId,
            off_session: true,
            confirm: true,
            description: `Cleaning service - ${clientName} - ${updatedBooking.address.street}`,
            metadata: {
              bookingId: updatedBooking.id,
              bookingNumber: updatedBooking.bookingNumber,
              clientId: updatedBooking.client.id,
              companyId: user.companyId,
            },
          });

          // Update booking with payment info
          await prisma.booking.update({
            where: { id: bookingId },
            data: {
              isPaid: true,
              paidAt: new Date(),
              paymentMethod: 'CARD',
              paymentStatus: 'PAID',
              stripePaymentIntentId: paymentIntent.id,
              chargedAt: new Date(),
            },
          });

          // Create payment record
          await prisma.payment.create({
            data: {
              companyId: user.companyId,
              clientId: updatedBooking.clientId,
              bookingId: updatedBooking.id,
              amount: updatedBooking.finalPrice,
              method: 'CARD',
              status: 'PAID',
              stripePaymentIntentId: paymentIntent.id,
              stripeChargeId: paymentIntent.latest_charge as string,
              capturedAt: new Date(),
            },
          });

          paymentResult = {
            success: true,
            paymentIntentId: paymentIntent.id,
            amount: updatedBooking.finalPrice,
            status: paymentIntent.status,
          };

          console.log(`Auto-charged ${clientName} $${updatedBooking.finalPrice} for booking ${updatedBooking.bookingNumber}`);
        } catch (stripeError: any) {
          console.error('Auto-charge failed:', stripeError);
          paymentResult = {
            success: false,
            error: stripeError.message,
            code: stripeError.code,
            requiresAction: stripeError.code === 'authentication_required',
          };

          // Update booking with failed charge info
          await prisma.booking.update({
            where: { id: bookingId },
            data: {
              paymentStatus: 'FAILED',
              internalNotes: `${updatedBooking.internalNotes || ''}\n[${new Date().toISOString()}] Auto-charge failed: ${stripeError.message}`.trim(),
            },
          });
        }
      }
    }

    // Send notifications
    const clientName = `${updatedBooking.client.firstName} ${updatedBooking.client.lastName || ''}`.trim();
    const scheduledDate = new Date(updatedBooking.scheduledDate);
    const dateStr = scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    // Send completion email to client
    if (sendReceipt && updatedBooking.client.email && company?.resendApiKey) {
      try {
        const isPaid = paymentResult?.success || updatedBooking.isPaid;
        const cleanerName = updatedBooking.assignedCleaner
          ? `${updatedBooking.assignedCleaner.user.firstName || ''} ${updatedBooking.assignedCleaner.user.lastName || ''}`.trim()
          : 'Our team';

        await sendEmail({
          to: updatedBooking.client.email,
          subject: `Cleaning Completed - ${dateStr}${isPaid ? ' (Payment Received)' : ''}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #10B981; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">Cleaning Complete!</h1>
              </div>

              <div style="padding: 20px; background-color: #f9fafb;">
                <p>Hi ${clientName},</p>
                <p>Great news! Your cleaning service has been completed and approved.</p>

                <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Service Details</h3>
                  <table style="width: 100%;">
                    <tr>
                      <td style="padding: 8px 0;"><strong>Date:</strong></td>
                      <td style="text-align: right;">${dateStr}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0;"><strong>Service:</strong></td>
                      <td style="text-align: right;">${updatedBooking.serviceType.replace('_', ' ')}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0;"><strong>Address:</strong></td>
                      <td style="text-align: right;">${updatedBooking.address.street}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0;"><strong>Cleaned by:</strong></td>
                      <td style="text-align: right;">${cleanerName}</td>
                    </tr>
                    <tr style="border-top: 2px solid #e5e7eb;">
                      <td style="padding: 12px 0;"><strong>Total:</strong></td>
                      <td style="text-align: right; font-size: 18px;"><strong>$${updatedBooking.finalPrice.toFixed(2)}</strong></td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0;"><strong>Payment Status:</strong></td>
                      <td style="text-align: right;">
                        <span style="background-color: ${isPaid ? '#D1FAE5' : '#FEF3C7'}; color: ${isPaid ? '#065F46' : '#92400E'}; padding: 4px 8px; border-radius: 4px;">
                          ${isPaid ? 'Paid' : 'Payment Pending'}
                        </span>
                      </td>
                    </tr>
                  </table>
                </div>

                ${!isPaid ? `
                <div style="background-color: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #92400E;">
                    <strong>Payment Required:</strong> Please complete your payment at your earliest convenience.
                  </p>
                </div>
                ` : ''}

                <p>We hope you're satisfied with our service. Your feedback means a lot to us!</p>

                <p>Thank you for choosing ${company.name}!</p>

                <p>Best regards,<br>${company.name} Team</p>
              </div>
            </div>
          `,
          type: 'notification',
          apiKey: company.resendApiKey,
        });
        console.log('Completion email sent to:', updatedBooking.client.email);
      } catch (error) {
        console.error('Failed to send completion email:', error);
      }
    }

    // Send SMS notification
    if (updatedBooking.client.phone && company?.twilioAccountSid) {
      try {
        const isPaid = paymentResult?.success || updatedBooking.isPaid;
        const smsMessage = isPaid
          ? `Hi ${clientName}! Your ${dateStr} cleaning is complete and payment of $${updatedBooking.finalPrice.toFixed(2)} has been processed. Thank you for choosing ${company.name}!`
          : `Hi ${clientName}! Your ${dateStr} cleaning is complete. Total: $${updatedBooking.finalPrice.toFixed(2)}. Thank you for choosing ${company.name}!`;

        await sendSMS(updatedBooking.client.phone, smsMessage, {
          accountSid: company.twilioAccountSid,
          authToken: company.twilioAuthToken || undefined,
          from: company.twilioPhoneNumber || undefined,
        });
        console.log('Completion SMS sent to:', updatedBooking.client.phone);
      } catch (error) {
        console.error('Failed to send completion SMS:', error);
      }
    }

    // Schedule feedback request if enabled
    if (company?.feedbackEnabled && company?.autoSendReviewRequest) {
      const feedbackDelay = (company.reviewRequestDelay || 2) * 60 * 60 * 1000; // Convert hours to ms
      const feedbackSendAt = new Date(Date.now() + feedbackDelay);

      // Generate feedback token
      const feedbackToken = require('crypto').randomBytes(32).toString('hex');

      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          feedbackToken,
          feedbackSentAt: null, // Will be set when actually sent
        },
      });

      console.log(`Feedback request scheduled for ${feedbackSendAt.toISOString()}`);
    }

    return NextResponse.json({
      success: true,
      data: updatedBooking,
      payment: paymentResult,
      message: paymentResult?.success
        ? `Job approved and payment of $${updatedBooking.finalPrice.toFixed(2)} processed!`
        : paymentResult?.error
        ? `Job approved but auto-charge failed: ${paymentResult.error}`
        : 'Job approved! Payment options are now available.',
    });
  } catch (error) {
    console.error('POST /api/bookings/[id]/approve error:', error);

    if (error instanceof Error && error.message) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to approve job: ${error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to approve job - unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/bookings/[id]/approve - Get approval status and options
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookingId } = await params;

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        companyId: user.companyId,
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            autoChargeEnabled: true,
            stripeCustomerId: true,
            defaultPaymentMethodId: true,
          },
        },
        assignedCleaner: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        checklist: true,
        photos: {
          where: {
            type: { in: ['BEFORE', 'AFTER'] },
          },
          orderBy: { createdAt: 'asc' },
        },
        timeEntries: {
          orderBy: { clockIn: 'desc' },
          take: 1,
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Calculate actual work duration
    let actualDuration = null;
    if (booking.clockedInAt && booking.clockedOutAt) {
      actualDuration = Math.round(
        (new Date(booking.clockedOutAt).getTime() - new Date(booking.clockedInAt).getTime()) / 60000
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        booking: {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          status: booking.status,
          scheduledDate: booking.scheduledDate,
          duration: booking.duration,
          actualDuration,
          serviceType: booking.serviceType,
          finalPrice: booking.finalPrice,
          isPaid: booking.isPaid,
          completedAt: booking.completedAt,
        },
        client: booking.client,
        cleaner: booking.assignedCleaner ? {
          name: `${booking.assignedCleaner.user.firstName || ''} ${booking.assignedCleaner.user.lastName || ''}`.trim(),
        } : null,
        checklist: booking.checklist ? {
          totalTasks: booking.checklist.totalTasks,
          completedTasks: booking.checklist.completedTasks,
          completionRate: booking.checklist.totalTasks > 0
            ? Math.round((booking.checklist.completedTasks / booking.checklist.totalTasks) * 100)
            : 0,
        } : null,
        photos: {
          before: booking.photos.filter(p => p.type === 'BEFORE').length,
          after: booking.photos.filter(p => p.type === 'AFTER').length,
        },
        autoChargeAvailable: !!(
          booking.client.autoChargeEnabled &&
          booking.client.stripeCustomerId &&
          booking.client.defaultPaymentMethodId &&
          !booking.isPaid
        ),
        canApprove: booking.status === 'CLEANER_COMPLETED',
      },
    });
  } catch (error) {
    console.error('GET /api/bookings/[id]/approve error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get approval status' },
      { status: 500 }
    );
  }
}
