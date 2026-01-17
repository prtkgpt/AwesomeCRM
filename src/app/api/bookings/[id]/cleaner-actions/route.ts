import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendSMS } from '@/lib/twilio';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/bookings/[id]/cleaner-actions - Handle cleaner workflow actions
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // 'on_my_way', 'clock_in', 'clock_out'

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch booking with client info
    const booking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
      include: {
        client: true,
        address: true,
        assignee: {
          include: {
            user: true,
          },
        },
        company: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify cleaner is assigned to this booking (or is OWNER/ADMIN)
    if (user.role === 'CLEANER') {
      if (!booking.assignee || booking.assignee.userId !== session.user.id) {
        return NextResponse.json(
          { error: 'You are not assigned to this booking' },
          { status: 403 }
        );
      }
    }

    const now = new Date();
    let updateData: any = {};
    let messageText = '';
    let activityMessage = '';

    switch (action) {
      case 'on_my_way':
        if (booking.onMyWaySentAt) {
          return NextResponse.json(
            { error: 'On my way already sent' },
            { status: 400 }
          );
        }

        updateData = { onMyWaySentAt: now };
        messageText = `${booking.company.name}: ${user.name || 'Your cleaner'} is on the way to your cleaning appointment at ${booking.address.street}. They should arrive shortly!`;
        activityMessage = `${user.name || 'Cleaner'} is on the way to ${booking.client.name}'s cleaning`;

        // Send SMS to customer
        if (booking.client.phone) {
          try {
            // Get company's Twilio credentials
            const twilioOptions = booking.company.twilioAccountSid && booking.company.twilioAuthToken && booking.company.twilioPhoneNumber
              ? {
                  accountSid: booking.company.twilioAccountSid,
                  authToken: booking.company.twilioAuthToken,
                  from: booking.company.twilioPhoneNumber,
                }
              : undefined;

            const smsResult = await sendSMS(
              booking.client.phone,
              messageText,
              twilioOptions
            );

            // Log the message
            await prisma.message.create({
              data: {
                companyId: booking.companyId,
                userId: session.user.id,
                bookingId: booking.id,
                type: 'ON_MY_WAY',
                to: booking.client.phone,
                from: twilioOptions?.from || process.env.TWILIO_PHONE_NUMBER || '',
                body: messageText,
                status: smsResult.success ? 'SENT' : 'FAILED',
              },
            });
          } catch (error) {
            console.error('Failed to send SMS:', error);
            // Continue anyway - don't fail the whole request
          }
        }
        break;

      case 'clock_in':
        if (booking.clockedInAt) {
          return NextResponse.json(
            { error: 'Already clocked in' },
            { status: 400 }
          );
        }

        updateData = { clockedInAt: now };
        activityMessage = `${user.name || 'Cleaner'} started cleaning at ${booking.client.name}'s property`;
        break;

      case 'clock_out':
        if (!booking.clockedInAt) {
          return NextResponse.json(
            { error: 'Must clock in first' },
            { status: 400 }
          );
        }

        if (booking.clockedOutAt) {
          return NextResponse.json(
            { error: 'Already clocked out' },
            { status: 400 }
          );
        }

        // Generate unique feedback token if not exists
        const feedbackToken = booking.feedbackToken || `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        updateData = {
          clockedOutAt: now,
          status: 'COMPLETED', // Auto-mark as completed when clocking out
          feedbackToken, // Add feedback token for customer review/tip
        };
        activityMessage = `${user.name || 'Cleaner'} finished cleaning at ${booking.client.name}'s property`;

        // Send completion SMS to customer with links
        if (booking.client.phone) {
          try {
            const baseUrl = process.env.NEXTAUTH_URL || 'https://cleandaycrm.com';
            const feedbackUrl = `${baseUrl}/feedback/${feedbackToken}`;
            const reviewUrl = booking.company.googleReviewUrl;

            // Build message with links
            let completionMessage = `${booking.company.name}: Thank you! Your cleaning is complete.\n\n`;
            completionMessage += `⭐ Rate & Tip: ${feedbackUrl}\n`;

            // Add copay link if client has copay
            if (booking.copayAmount && booking.copayAmount > 0 && !booking.copayPaid) {
              const copayUrl = `${baseUrl}/pay-copay/${feedbackToken}`;
              completionMessage += `💳 Pay Copay ($${booking.copayAmount}): ${copayUrl}\n`;
            }

            // Add Google review link
            if (reviewUrl) {
              completionMessage += `📝 Leave Review: ${reviewUrl}`;
            }

            // Get company's Twilio credentials
            const twilioOptions = booking.company.twilioAccountSid && booking.company.twilioAuthToken && booking.company.twilioPhoneNumber
              ? {
                  accountSid: booking.company.twilioAccountSid,
                  authToken: booking.company.twilioAuthToken,
                  from: booking.company.twilioPhoneNumber,
                }
              : undefined;

            const smsResult = await sendSMS(
              booking.client.phone,
              completionMessage,
              twilioOptions
            );

            // Log the message
            await prisma.message.create({
              data: {
                companyId: booking.companyId,
                userId: session.user.id,
                bookingId: booking.id,
                type: 'THANK_YOU',
                to: booking.client.phone,
                from: twilioOptions?.from || process.env.TWILIO_PHONE_NUMBER || '',
                body: completionMessage,
                status: smsResult.success ? 'SENT' : 'FAILED',
              },
            });
          } catch (error) {
            console.error('Failed to send completion SMS:', error);
            // Continue anyway - don't fail the whole request
          }
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: true,
        address: true,
        assignee: {
          include: {
            user: true,
          },
        },
      },
    });

    // Create activity log entry (we'll implement this as a Message for now)
    await prisma.message.create({
      data: {
        companyId: booking.companyId,
        userId: session.user.id,
        bookingId: booking.id,
        type: 'CUSTOM',
        to: 'INTERNAL',
        from: 'SYSTEM',
        body: activityMessage,
        status: 'DELIVERED',
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedBooking,
      message: activityMessage,
    });
  } catch (error) {
    console.error('POST /api/bookings/[id]/cleaner-actions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process action' },
      { status: 500 }
    );
  }
}
