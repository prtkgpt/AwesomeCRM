// ============================================
// CleanDayCRM - Cleaner Assignment API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { findBestCleaner, autoAssignCleaner, canCleanerTakeJob } from '@/lib/cleaner-assignment';
import { sendSMS } from '@/lib/twilio';
import { sendEmail } from '@/lib/email';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/bookings/[id]/assign - Assign cleaner manually or trigger AI auto-assignment
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
    const body = await request.json();

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true, firstName: true, lastName: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only admins/owners can assign cleaners
    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get the booking
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        companyId: user.companyId,
      },
      include: {
        client: {
          include: {
            preferences: true,
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
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if booking can be assigned (not cancelled or completed)
    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(booking.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot assign cleaner to ${booking.status.toLowerCase()} booking` },
        { status: 400 }
      );
    }

    const { cleanerId, autoAssign, notifyCleaner = true } = body;

    let assignedCleanerId: string | null = null;
    let assignmentMethod: string = 'MANUAL';
    let assignmentResult: any = null;
    let previousCleaner: any = null;

    // Store previous cleaner for potential notification
    if (booking.assignedCleaner) {
      previousCleaner = {
        id: booking.assignedCleanerId,
        name: `${booking.assignedCleaner.user.firstName || ''} ${booking.assignedCleaner.user.lastName || ''}`.trim(),
        email: booking.assignedCleaner.user.email,
      };
    }

    if (autoAssign) {
      // AI Auto-assignment
      const result = await findBestCleaner({
        bookingId,
        clientId: booking.clientId,
        addressId: booking.addressId,
        scheduledDate: booking.scheduledDate,
        duration: booking.duration,
        serviceType: booking.serviceType,
        companyId: user.companyId,
        preferredCleanerId: booking.client.preferences?.preferredCleaner || undefined,
      });

      if (!result.recommended) {
        return NextResponse.json({
          success: false,
          error: 'No available cleaners found for this time slot',
          alternatives: result.alternatives,
        }, { status: 404 });
      }

      assignedCleanerId = result.recommended.cleanerId;
      assignmentMethod = 'AUTO';
      assignmentResult = {
        recommended: result.recommended,
        alternatives: result.alternatives,
        criteria: {
          score: result.recommended.score,
          reasons: result.recommended.reasons,
        },
      };
    } else if (cleanerId) {
      // Manual assignment
      // Verify cleaner exists and belongs to company
      const cleaner = await prisma.teamMember.findFirst({
        where: {
          id: cleanerId,
          companyId: user.companyId,
          isActive: true,
          user: {
            role: 'CLEANER',
            isActive: true,
          },
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      if (!cleaner) {
        return NextResponse.json(
          { success: false, error: 'Cleaner not found or inactive' },
          { status: 404 }
        );
      }

      // Check if cleaner can take this job
      const canTake = await canCleanerTakeJob(
        cleanerId,
        booking.scheduledDate,
        booking.duration
      );

      if (!canTake.canTake) {
        return NextResponse.json({
          success: false,
          error: canTake.reason || 'Cleaner cannot take this job',
          currentJobs: canTake.currentJobs,
        }, { status: 400 });
      }

      assignedCleanerId = cleanerId;
      assignmentMethod = 'MANUAL';
      assignmentResult = {
        cleaner: {
          id: cleaner.id,
          name: `${cleaner.user.firstName || ''} ${cleaner.user.lastName || ''}`.trim(),
          email: cleaner.user.email,
          phone: cleaner.user.phone,
        },
        currentJobs: canTake.currentJobs,
      };
    } else if (cleanerId === null) {
      // Unassign cleaner
      assignedCleanerId = null;
      assignmentMethod = null as any;
      assignmentResult = {
        unassigned: true,
        previousCleaner,
      };
    } else {
      return NextResponse.json(
        { success: false, error: 'Must provide cleanerId or set autoAssign to true' },
        { status: 400 }
      );
    }

    // Update status history
    const statusHistory = (booking.statusHistory as any[]) || [];
    statusHistory.push({
      action: assignedCleanerId ? 'CLEANER_ASSIGNED' : 'CLEANER_UNASSIGNED',
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      cleanerId: assignedCleanerId,
      method: assignmentMethod,
    });

    // Update the booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        assignedCleanerId,
        assignmentMethod,
        statusHistory,
        // Update status to CONFIRMED if it was PENDING and cleaner is assigned
        ...(booking.status === 'PENDING' && assignedCleanerId && {
          status: 'CONFIRMED',
        }),
      },
      include: {
        client: true,
        address: true,
        assignedCleaner: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    // Send notifications
    if (notifyCleaner && assignedCleanerId) {
      const company = await prisma.company.findUnique({
        where: { id: user.companyId },
        select: {
          name: true,
          twilioAccountSid: true,
          twilioAuthToken: true,
          twilioPhoneNumber: true,
          resendApiKey: true,
        },
      });

      if (company && updatedBooking.assignedCleaner) {
        const cleaner = updatedBooking.assignedCleaner;
        const cleanerName = `${cleaner.user.firstName || ''} ${cleaner.user.lastName || ''}`.trim() || 'there';
        const cleanerEmail = cleaner.user.email;
        const cleanerPhone = cleaner.user.phone;

        const scheduledDate = new Date(updatedBooking.scheduledDate);
        const dateStr = scheduledDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        });
        const timeStr = scheduledDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        });

        const fullAddress = `${updatedBooking.address.street}, ${updatedBooking.address.city}, ${updatedBooking.address.state} ${updatedBooking.address.zip}`;
        const clientName = `${updatedBooking.client.firstName} ${updatedBooking.client.lastName || ''}`.trim();

        // Send SMS notification
        if (cleanerPhone && company.twilioAccountSid) {
          try {
            const assignmentType = assignmentMethod === 'AUTO' ? '(auto-assigned)' : '';
            const smsMessage = `Hi ${cleanerName}! You've been assigned ${assignmentType} a cleaning job on ${dateStr} at ${timeStr}. Client: ${clientName}. Location: ${fullAddress}. Check your dashboard for details.`;

            await sendSMS(cleanerPhone, smsMessage, {
              accountSid: company.twilioAccountSid,
              authToken: company.twilioAuthToken || undefined,
              from: company.twilioPhoneNumber || undefined,
            });
            console.log('Assignment SMS sent to:', cleanerPhone);
          } catch (error) {
            console.error('Failed to send SMS:', error);
          }
        }

        // Send email notification
        if (cleanerEmail && company.resendApiKey) {
          try {
            const assignmentType = assignmentMethod === 'AUTO' ? ' (Auto-Assigned)' : '';
            await sendEmail({
              to: cleanerEmail,
              subject: `New Job Assignment${assignmentType} - ${clientName} on ${dateStr}`,
              html: `
                <h2>New Job Assignment${assignmentType}</h2>
                <p>Hi ${cleanerName},</p>
                <p>You've been assigned a new cleaning job:</p>
                <table style="border-collapse: collapse; margin: 20px 0;">
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Client</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${clientName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Date & Time</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${dateStr} at ${timeStr}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Service</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${updatedBooking.serviceType.replace('_', ' ')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Duration</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${updatedBooking.duration} minutes</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Address</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${fullAddress}</td>
                  </tr>
                </table>
                ${updatedBooking.address.gateCode ? `<p><strong>Gate Code:</strong> ${updatedBooking.address.gateCode}</p>` : ''}
                ${updatedBooking.address.parkingInfo ? `<p><strong>Parking:</strong> ${updatedBooking.address.parkingInfo}</p>` : ''}
                ${updatedBooking.cleanerNotes ? `<p><strong>Notes:</strong> ${updatedBooking.cleanerNotes}</p>` : ''}
                <p>Log in to your dashboard to view full details and accept the job.</p>
                <p>Best regards,<br>${company.name}</p>
              `,
              type: 'notification',
              apiKey: company.resendApiKey,
            });
            console.log('Assignment email sent to:', cleanerEmail);
          } catch (error) {
            console.error('Failed to send email:', error);
          }
        }
      }

      // Notify previous cleaner if unassigned
      if (previousCleaner && previousCleaner.email && !assignedCleanerId) {
        const company = await prisma.company.findUnique({
          where: { id: user.companyId },
          select: { name: true, resendApiKey: true },
        });

        if (company?.resendApiKey) {
          const scheduledDate = new Date(updatedBooking.scheduledDate);
          const dateStr = scheduledDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          });

          try {
            await sendEmail({
              to: previousCleaner.email,
              subject: `Job Unassigned - ${dateStr}`,
              html: `
                <h2>Job Unassigned</h2>
                <p>Hi ${previousCleaner.name},</p>
                <p>You have been unassigned from the following job:</p>
                <ul>
                  <li><strong>Client:</strong> ${updatedBooking.client.firstName} ${updatedBooking.client.lastName || ''}</li>
                  <li><strong>Date:</strong> ${dateStr}</li>
                  <li><strong>Address:</strong> ${updatedBooking.address.street}, ${updatedBooking.address.city}</li>
                </ul>
                <p>Please check your dashboard for your updated schedule.</p>
                <p>Best regards,<br>${company.name}</p>
              `,
              type: 'notification',
              apiKey: company.resendApiKey,
            });
          } catch (error) {
            console.error('Failed to send unassignment email:', error);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedBooking,
      assignment: assignmentResult,
      message: assignedCleanerId
        ? `Cleaner ${assignmentMethod === 'AUTO' ? 'auto-' : ''}assigned successfully`
        : 'Cleaner unassigned successfully',
    });
  } catch (error) {
    console.error('POST /api/bookings/[id]/assign error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to assign cleaner' },
      { status: 500 }
    );
  }
}

// GET /api/bookings/[id]/assign - Get assignment recommendations
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

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only admins/owners can view assignment recommendations
    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get the booking
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        companyId: user.companyId,
      },
      include: {
        client: {
          include: {
            preferences: true,
          },
        },
        address: true,
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
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get AI recommendations
    const recommendations = await findBestCleaner({
      bookingId,
      clientId: booking.clientId,
      addressId: booking.addressId,
      scheduledDate: booking.scheduledDate,
      duration: booking.duration,
      serviceType: booking.serviceType,
      companyId: user.companyId,
      preferredCleanerId: booking.client.preferences?.preferredCleaner || undefined,
    });

    // Get all available cleaners with details
    const allCleaners = await prisma.teamMember.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
        user: {
          role: 'CLEANER',
          isActive: true,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        averageRating: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        booking: {
          id: booking.id,
          scheduledDate: booking.scheduledDate,
          duration: booking.duration,
          serviceType: booking.serviceType,
          currentCleaner: booking.assignedCleaner ? {
            id: booking.assignedCleanerId,
            name: `${booking.assignedCleaner.user.firstName || ''} ${booking.assignedCleaner.user.lastName || ''}`.trim(),
          } : null,
        },
        clientPreference: booking.client.preferences?.preferredCleaner || null,
        recommendations: {
          recommended: recommendations.recommended,
          alternatives: recommendations.alternatives,
        },
        allCleaners: allCleaners.map((c) => ({
          id: c.id,
          name: `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim(),
          email: c.user.email,
          avatar: c.user.avatar,
          rating: c.averageRating,
          totalJobs: c.totalJobsCompleted,
          isAvailable: c.isAvailable,
          serviceTypes: c.serviceTypes,
          serviceAreas: c.serviceAreas,
        })),
      },
    });
  } catch (error) {
    console.error('GET /api/bookings/[id]/assign error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get assignment recommendations' },
      { status: 500 }
    );
  }
}
