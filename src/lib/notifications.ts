import { prisma } from '@/lib/prisma';
import { sendEmail, getBookingConfirmationEmailTemplate, getBirthdayGreetingEmailTemplate, getAnniversaryGreetingEmailTemplate, getReviewRequestEmailTemplate, getTimeOffRequestEmailTemplate, getTimeOffApprovedEmailTemplate, getTimeOffDeniedEmailTemplate } from '@/lib/email';
import { sendSMS, fillTemplate } from '@/lib/twilio';

/**
 * Send booking confirmation via email and SMS
 * Logs all attempts to Message table
 */
export async function sendBookingConfirmation(bookingId: string) {
  try {
    // Fetch booking with all related data
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        address: true,
        company: true,
        assignee: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    const { client, address, company } = booking;

    // Format address
    const formattedAddress = `${address.street}, ${address.city}, ${address.state} ${address.zip}`;

    // Format service type
    const serviceType = booking.serviceType.replace(/_/g, ' ').toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Send email confirmation
    if (client.email) {
      try {
        const emailTemplate = getBookingConfirmationEmailTemplate({
          customerName: client.name.split(' ')[0], // First name
          companyName: company.name,
          serviceType,
          scheduledDate: booking.scheduledDate.toISOString(),
          address: formattedAddress,
          price: booking.price,
          accountCreated: !!client.customerUserId,
        });

        await sendEmail({
          to: client.email,
          subject: `✓ Booking Confirmed - ${company.name}`,
          html: emailTemplate,
          type: 'booking',
          apiKey: company.resendApiKey || undefined,
        });

        // Log successful email
        await prisma.message.create({
          data: {
            companyId: company.id,
            userId: booking.userId,
            bookingId: booking.id,
            to: client.email,
            from: company.email || 'noreply@cleanday.com',
            body: `Booking confirmation email sent`,
            type: 'CONFIRMATION',
            status: 'SENT',
          },
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);

        // Log failed email
        await prisma.message.create({
          data: {
            companyId: company.id,
            userId: booking.userId,
            bookingId: booking.id,
            to: client.email!,
            from: company.email || 'noreply@cleanday.com',
            body: `Failed to send confirmation email`,
            type: 'CONFIRMATION',
            status: 'FAILED',
            errorMessage: emailError instanceof Error ? emailError.message : 'Unknown error',
          },
        });
      }
    }

    // Send SMS confirmation
    if (client.phone && company.twilioPhoneNumber) {
      try {
        const smsBody = fillTemplate(
          'Your cleaning with {{companyName}} is confirmed! 📅 {{date}} at {{time}} 📍 {{address}} 💰 ${{price}}. We look forward to serving you!',
          {
            companyName: company.name,
            date: new Date(booking.scheduledDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            }),
            time: new Date(booking.scheduledDate).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit'
            }),
            address: formattedAddress,
            price: booking.price.toFixed(2),
          }
        );

        const smsResult = await sendSMS(client.phone, smsBody, {
          accountSid: company.twilioAccountSid || undefined,
          authToken: company.twilioAuthToken || undefined,
          from: company.twilioPhoneNumber,
        });

        // Log SMS attempt
        await prisma.message.create({
          data: {
            companyId: company.id,
            userId: booking.userId,
            bookingId: booking.id,
            to: client.phone,
            from: company.twilioPhoneNumber,
            body: smsBody,
            type: 'CONFIRMATION',
            status: smsResult.success ? 'SENT' : 'FAILED',
            twilioSid: smsResult.sid,
            errorMessage: smsResult.error,
          },
        });
      } catch (smsError) {
        console.error('Failed to send confirmation SMS:', smsError);

        // Log failed SMS
        await prisma.message.create({
          data: {
            companyId: company.id,
            userId: booking.userId,
            bookingId: booking.id,
            to: client.phone!,
            from: company.twilioPhoneNumber!,
            body: `Failed to send confirmation SMS`,
            type: 'CONFIRMATION',
            status: 'FAILED',
            errorMessage: smsError instanceof Error ? smsError.message : 'Unknown error',
          },
        });
      }
    }

    // Mark confirmation as sent
    await prisma.booking.update({
      where: { id: bookingId },
      data: { confirmationSent: true },
    });

    return { success: true };
  } catch (error) {
    console.error('Error in sendBookingConfirmation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send birthday greeting to a client
 */
export async function sendBirthdayGreeting(clientId: string) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { company: true },
    });

    if (!client || !client.enableBirthdayGreetings) {
      return { success: false, reason: 'Client not found or greetings disabled' };
    }

    // Get system user (owner) for message logging
    const systemUser = await prisma.user.findFirst({
      where: {
        companyId: client.companyId,
        role: 'OWNER',
      },
    });

    if (!systemUser) {
      console.error('No system user found for company:', client.companyId);
      return { success: false, reason: 'No system user found' };
    }

    const { company } = client;
    const firstName = client.name.split(' ')[0];

    // Send email
    if (client.email) {
      try {
        const emailTemplate = getBirthdayGreetingEmailTemplate({
          customerName: firstName,
          companyName: company.name,
        });

        await sendEmail({
          to: client.email,
          subject: `🎉 Happy Birthday from ${company.name}!`,
          html: emailTemplate,
          type: 'notification',
          apiKey: company.resendApiKey || undefined,
        });

        await prisma.message.create({
          data: {
            companyId: company.id,
            userId: systemUser.id,
            to: client.email,
            from: company.email || 'noreply@cleanday.com',
            body: 'Birthday greeting email sent',
            type: 'BIRTHDAY_GREETING',
            status: 'SENT',
          },
        });
      } catch (error) {
        console.error('Failed to send birthday email:', error);
      }
    }

    // Send SMS
    if (client.phone && company.twilioPhoneNumber) {
      try {
        const smsBody = `🎉 Happy Birthday ${firstName}! ${company.name} wishes you a wonderful day filled with joy! 🎂`;

        const smsResult = await sendSMS(client.phone, smsBody, {
          accountSid: company.twilioAccountSid || undefined,
          authToken: company.twilioAuthToken || undefined,
          from: company.twilioPhoneNumber,
        });

        await prisma.message.create({
          data: {
            companyId: company.id,
            userId: systemUser.id,
            to: client.phone,
            from: company.twilioPhoneNumber,
            body: smsBody,
            type: 'BIRTHDAY_GREETING',
            status: smsResult.success ? 'SENT' : 'FAILED',
            twilioSid: smsResult.sid,
            errorMessage: smsResult.error,
          },
        });
      } catch (error) {
        console.error('Failed to send birthday SMS:', error);
      }
    }

    // Update last sent timestamp
    await prisma.client.update({
      where: { id: clientId },
      data: { lastBirthdayGreetingSent: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error('Error in sendBirthdayGreeting:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send anniversary greeting to a client
 */
export async function sendAnniversaryGreeting(clientId: string) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { company: true },
    });

    if (!client || !client.enableAnniversaryGreetings) {
      return { success: false, reason: 'Client not found or greetings disabled' };
    }

    // Get system user (owner) for message logging
    const systemUser = await prisma.user.findFirst({
      where: {
        companyId: client.companyId,
        role: 'OWNER',
      },
    });

    if (!systemUser) {
      console.error('No system user found for company:', client.companyId);
      return { success: false, reason: 'No system user found' };
    }

    const { company } = client;
    const firstName = client.name.split(' ')[0];

    // Calculate years since anniversary
    const yearsAgo = client.anniversary
      ? Math.floor((Date.now() - client.anniversary.getTime()) / (1000 * 60 * 60 * 24 * 365))
      : 0;

    // Send email
    if (client.email) {
      try {
        const emailTemplate = getAnniversaryGreetingEmailTemplate({
          customerName: firstName,
          companyName: company.name,
          yearsAgo,
          anniversaryType: client.anniversaryType || 'CUSTOM',
        });

        await sendEmail({
          to: client.email,
          subject: `🎊 Happy Anniversary from ${company.name}!`,
          html: emailTemplate,
          type: 'notification',
          apiKey: company.resendApiKey || undefined,
        });

        await prisma.message.create({
          data: {
            companyId: company.id,
            userId: systemUser.id,
            to: client.email,
            from: company.email || 'noreply@cleanday.com',
            body: 'Anniversary greeting email sent',
            type: 'ANNIVERSARY_GREETING',
            status: 'SENT',
          },
        });
      } catch (error) {
        console.error('Failed to send anniversary email:', error);
      }
    }

    // Send SMS
    if (client.phone && company.twilioPhoneNumber) {
      try {
        const smsBody = yearsAgo > 0
          ? `🎊 Happy ${yearsAgo}-year anniversary ${firstName}! Thank you for being a valued ${company.name} customer! 💙`
          : `🎊 Happy Anniversary ${firstName}! ${company.name} is grateful for you! 💙`;

        const smsResult = await sendSMS(client.phone, smsBody, {
          accountSid: company.twilioAccountSid || undefined,
          authToken: company.twilioAuthToken || undefined,
          from: company.twilioPhoneNumber,
        });

        await prisma.message.create({
          data: {
            companyId: company.id,
            userId: systemUser.id,
            to: client.phone,
            from: company.twilioPhoneNumber,
            body: smsBody,
            type: 'ANNIVERSARY_GREETING',
            status: smsResult.success ? 'SENT' : 'FAILED',
            twilioSid: smsResult.sid,
            errorMessage: smsResult.error,
          },
        });
      } catch (error) {
        console.error('Failed to send anniversary SMS:', error);
      }
    }

    // Update last sent timestamp
    await prisma.client.update({
      where: { id: clientId },
      data: { lastAnniversaryGreetingSent: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error('Error in sendAnniversaryGreeting:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send review request to a client after a satisfactory service
 */
export async function sendReviewRequest(bookingId: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: true,
        company: true,
      },
    });

    if (!booking) {
      return { success: false, reason: 'Booking not found' };
    }

    // Only send to satisfied customers (4-5 stars)
    if (!booking.customerRating || booking.customerRating < 4) {
      return { success: false, reason: 'Customer rating not high enough' };
    }

    const { client, company } = booking;
    const firstName = client.name.split(' ')[0];

    // Send email
    if (client.email) {
      try {
        const emailTemplate = getReviewRequestEmailTemplate({
          customerName: firstName,
          companyName: company.name,
          googleReviewUrl: company.googleReviewUrl,
          yelpReviewUrl: company.yelpReviewUrl,
        });

        await sendEmail({
          to: client.email,
          subject: `⭐ Share Your Experience with ${company.name}`,
          html: emailTemplate,
          type: 'notification',
          apiKey: company.resendApiKey || undefined,
        });

        await prisma.message.create({
          data: {
            companyId: company.id,
            userId: booking.userId,
            bookingId: booking.id,
            to: client.email,
            from: company.email || 'noreply@cleanday.com',
            body: 'Review request email sent',
            type: 'REVIEW_REQUEST',
            status: 'SENT',
          },
        });
      } catch (error) {
        console.error('Failed to send review request email:', error);
      }
    }

    // Send SMS
    if (client.phone && company.twilioPhoneNumber) {
      try {
        let smsBody = `⭐ Hi ${firstName}! We're thrilled you loved our service! `;

        if (company.googleReviewUrl) {
          smsBody += `Would you mind leaving us a quick review? ${company.googleReviewUrl} Thank you! - ${company.name}`;
        } else {
          smsBody += `Your feedback means the world to us! - ${company.name}`;
        }

        const smsResult = await sendSMS(client.phone, smsBody, {
          accountSid: company.twilioAccountSid || undefined,
          authToken: company.twilioAuthToken || undefined,
          from: company.twilioPhoneNumber,
        });

        await prisma.message.create({
          data: {
            companyId: company.id,
            userId: booking.userId,
            bookingId: booking.id,
            to: client.phone,
            from: company.twilioPhoneNumber,
            body: smsBody,
            type: 'REVIEW_REQUEST',
            status: smsResult.success ? 'SENT' : 'FAILED',
            twilioSid: smsResult.sid,
            errorMessage: smsResult.error,
          },
        });
      } catch (error) {
        console.error('Failed to send review request SMS:', error);
      }
    }

    // Mark review request as sent
    await prisma.booking.update({
      where: { id: bookingId },
      data: { reviewRequestSentAt: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error('Error in sendReviewRequest:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send notification to admin when cleaner submits time off request
 */
export async function sendTimeOffRequestNotification(timeOffRequestId: string) {
  try {
    const timeOffRequest = await prisma.timeOffRequest.findUnique({
      where: { id: timeOffRequestId },
      include: {
        teamMember: {
          include: {
            user: true,
          },
        },
        company: true,
      },
    });

    if (!timeOffRequest) {
      return { success: false, reason: 'Time off request not found' };
    }

    const { teamMember, company } = timeOffRequest;
    const cleanerName = teamMember.user.name || teamMember.user.email;

    // Find conflicting bookings
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        companyId: company.id,
        assignedTo: teamMember.id,
        status: 'SCHEDULED',
        scheduledDate: {
          gte: timeOffRequest.startDate,
          lte: timeOffRequest.endDate,
        },
      },
    });

    // Update the time off request with conflict info
    await prisma.timeOffRequest.update({
      where: { id: timeOffRequestId },
      data: {
        conflictedBookingIds: conflictingBookings.map(b => b.id),
      },
    });

    // Find admins/owners to notify
    const admins = await prisma.user.findMany({
      where: {
        companyId: company.id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (admins.length === 0) {
      return { success: false, reason: 'No admins found to notify' };
    }

    // Get system user for logging
    const systemUser = admins[0];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || '';

    // Notify each admin
    for (const admin of admins) {
      const adminName = admin.name?.split(' ')[0] || 'Admin';

      // Send email
      if (admin.email) {
        try {
          const emailTemplate = getTimeOffRequestEmailTemplate({
            adminName,
            cleanerName: cleanerName || 'Team Member',
            companyName: company.name,
            timeOffType: timeOffRequest.type,
            startDate: timeOffRequest.startDate.toISOString(),
            endDate: timeOffRequest.endDate.toISOString(),
            reason: timeOffRequest.reason || undefined,
            conflictCount: conflictingBookings.length,
            dashboardUrl: baseUrl ? `${baseUrl}/team/time-off` : undefined,
          });

          await sendEmail({
            to: admin.email,
            subject: `📅 Time Off Request from ${cleanerName}`,
            html: emailTemplate,
            type: 'notification',
            apiKey: company.resendApiKey || undefined,
          });

          await prisma.message.create({
            data: {
              companyId: company.id,
              userId: systemUser.id,
              to: admin.email,
              from: company.email || 'noreply@cleanday.com',
              body: `Time off request notification sent to ${adminName}`,
              type: 'TIME_OFF_REQUEST',
              status: 'SENT',
            },
          });
        } catch (error) {
          console.error('Failed to send time off request email:', error);
        }
      }

      // Send SMS
      if (admin.phone && company.twilioPhoneNumber) {
        try {
          const startDateStr = timeOffRequest.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const endDateStr = timeOffRequest.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          let smsBody = `📅 Time Off Request: ${cleanerName} is requesting ${timeOffRequest.type.toLowerCase().replace(/_/g, ' ')} from ${startDateStr} to ${endDateStr}.`;

          if (conflictingBookings.length > 0) {
            smsBody += ` ⚠️ ${conflictingBookings.length} job conflict${conflictingBookings.length > 1 ? 's' : ''}.`;
          }

          smsBody += ' Please review in the dashboard.';

          const smsResult = await sendSMS(admin.phone, smsBody, {
            accountSid: company.twilioAccountSid || undefined,
            authToken: company.twilioAuthToken || undefined,
            from: company.twilioPhoneNumber,
          });

          await prisma.message.create({
            data: {
              companyId: company.id,
              userId: systemUser.id,
              to: admin.phone,
              from: company.twilioPhoneNumber,
              body: smsBody,
              type: 'TIME_OFF_REQUEST',
              status: smsResult.success ? 'SENT' : 'FAILED',
              twilioSid: smsResult.sid,
              errorMessage: smsResult.error,
            },
          });
        } catch (error) {
          console.error('Failed to send time off request SMS:', error);
        }
      }
    }

    // Update notification timestamp
    await prisma.timeOffRequest.update({
      where: { id: timeOffRequestId },
      data: { adminNotifiedAt: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error('Error in sendTimeOffRequestNotification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send notification to cleaner when time off request is approved
 */
export async function sendTimeOffApprovedNotification(timeOffRequestId: string) {
  try {
    const timeOffRequest = await prisma.timeOffRequest.findUnique({
      where: { id: timeOffRequestId },
      include: {
        teamMember: {
          include: {
            user: true,
          },
        },
        company: true,
      },
    });

    if (!timeOffRequest) {
      return { success: false, reason: 'Time off request not found' };
    }

    // Get approver info
    let approverName = 'Management';
    if (timeOffRequest.reviewedBy) {
      const approver = await prisma.user.findUnique({
        where: { id: timeOffRequest.reviewedBy },
      });
      if (approver) {
        approverName = approver.name || approver.email;
      }
    }

    const { teamMember, company } = timeOffRequest;
    const cleaner = teamMember.user;
    const cleanerName = cleaner.name?.split(' ')[0] || 'Team Member';

    // Get system user for logging
    const systemUser = await prisma.user.findFirst({
      where: { companyId: company.id, role: 'OWNER' },
    });

    if (!systemUser) {
      return { success: false, reason: 'No system user found' };
    }

    // Send email
    if (cleaner.email) {
      try {
        const emailTemplate = getTimeOffApprovedEmailTemplate({
          cleanerName,
          companyName: company.name,
          timeOffType: timeOffRequest.type,
          startDate: timeOffRequest.startDate.toISOString(),
          endDate: timeOffRequest.endDate.toISOString(),
          approverName,
          notes: timeOffRequest.reviewNotes || undefined,
        });

        await sendEmail({
          to: cleaner.email,
          subject: `✓ Time Off Approved - ${company.name}`,
          html: emailTemplate,
          type: 'notification',
          apiKey: company.resendApiKey || undefined,
        });

        await prisma.message.create({
          data: {
            companyId: company.id,
            userId: systemUser.id,
            to: cleaner.email,
            from: company.email || 'noreply@cleanday.com',
            body: 'Time off approval notification sent',
            type: 'TIME_OFF_APPROVED',
            status: 'SENT',
          },
        });
      } catch (error) {
        console.error('Failed to send time off approved email:', error);
      }
    }

    // Send SMS
    if (cleaner.phone && company.twilioPhoneNumber) {
      try {
        const startDateStr = timeOffRequest.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endDateStr = timeOffRequest.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const smsBody = `✓ Good news! Your time off request (${startDateStr} - ${endDateStr}) has been APPROVED. Enjoy your time off! - ${company.name}`;

        const smsResult = await sendSMS(cleaner.phone, smsBody, {
          accountSid: company.twilioAccountSid || undefined,
          authToken: company.twilioAuthToken || undefined,
          from: company.twilioPhoneNumber,
        });

        await prisma.message.create({
          data: {
            companyId: company.id,
            userId: systemUser.id,
            to: cleaner.phone,
            from: company.twilioPhoneNumber,
            body: smsBody,
            type: 'TIME_OFF_APPROVED',
            status: smsResult.success ? 'SENT' : 'FAILED',
            twilioSid: smsResult.sid,
            errorMessage: smsResult.error,
          },
        });
      } catch (error) {
        console.error('Failed to send time off approved SMS:', error);
      }
    }

    // Update notification timestamp
    await prisma.timeOffRequest.update({
      where: { id: timeOffRequestId },
      data: { cleanerNotifiedAt: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error('Error in sendTimeOffApprovedNotification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send notification to cleaner when time off request is denied
 */
export async function sendTimeOffDeniedNotification(timeOffRequestId: string) {
  try {
    const timeOffRequest = await prisma.timeOffRequest.findUnique({
      where: { id: timeOffRequestId },
      include: {
        teamMember: {
          include: {
            user: true,
          },
        },
        company: true,
      },
    });

    if (!timeOffRequest) {
      return { success: false, reason: 'Time off request not found' };
    }

    // Get denier info
    let approverName = 'Management';
    if (timeOffRequest.reviewedBy) {
      const approver = await prisma.user.findUnique({
        where: { id: timeOffRequest.reviewedBy },
      });
      if (approver) {
        approverName = approver.name || approver.email;
      }
    }

    const { teamMember, company } = timeOffRequest;
    const cleaner = teamMember.user;
    const cleanerName = cleaner.name?.split(' ')[0] || 'Team Member';

    // Get system user for logging
    const systemUser = await prisma.user.findFirst({
      where: { companyId: company.id, role: 'OWNER' },
    });

    if (!systemUser) {
      return { success: false, reason: 'No system user found' };
    }

    // Send email
    if (cleaner.email) {
      try {
        const emailTemplate = getTimeOffDeniedEmailTemplate({
          cleanerName,
          companyName: company.name,
          timeOffType: timeOffRequest.type,
          startDate: timeOffRequest.startDate.toISOString(),
          endDate: timeOffRequest.endDate.toISOString(),
          approverName,
          reason: timeOffRequest.reviewNotes || undefined,
        });

        await sendEmail({
          to: cleaner.email,
          subject: `Time Off Request Update - ${company.name}`,
          html: emailTemplate,
          type: 'notification',
          apiKey: company.resendApiKey || undefined,
        });

        await prisma.message.create({
          data: {
            companyId: company.id,
            userId: systemUser.id,
            to: cleaner.email,
            from: company.email || 'noreply@cleanday.com',
            body: 'Time off denial notification sent',
            type: 'TIME_OFF_DENIED',
            status: 'SENT',
          },
        });
      } catch (error) {
        console.error('Failed to send time off denied email:', error);
      }
    }

    // Send SMS
    if (cleaner.phone && company.twilioPhoneNumber) {
      try {
        const startDateStr = timeOffRequest.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endDateStr = timeOffRequest.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        let smsBody = `Your time off request (${startDateStr} - ${endDateStr}) was not approved.`;
        if (timeOffRequest.reviewNotes) {
          smsBody += ` Reason: ${timeOffRequest.reviewNotes}`;
        }
        smsBody += ` Please contact ${approverName} for more info. - ${company.name}`;

        const smsResult = await sendSMS(cleaner.phone, smsBody, {
          accountSid: company.twilioAccountSid || undefined,
          authToken: company.twilioAuthToken || undefined,
          from: company.twilioPhoneNumber,
        });

        await prisma.message.create({
          data: {
            companyId: company.id,
            userId: systemUser.id,
            to: cleaner.phone,
            from: company.twilioPhoneNumber,
            body: smsBody,
            type: 'TIME_OFF_DENIED',
            status: smsResult.success ? 'SENT' : 'FAILED',
            twilioSid: smsResult.sid,
            errorMessage: smsResult.error,
          },
        });
      } catch (error) {
        console.error('Failed to send time off denied SMS:', error);
      }
    }

    // Update notification timestamp
    await prisma.timeOffRequest.update({
      where: { id: timeOffRequestId },
      data: { cleanerNotifiedAt: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error('Error in sendTimeOffDeniedNotification:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
