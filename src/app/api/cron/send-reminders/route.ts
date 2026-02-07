import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendSMS } from '@/lib/twilio';
import { sendEmail } from '@/lib/email';
import { formatDate, formatTime, normalizePhoneNumber } from '@/lib/utils';
import { checkRateLimit } from '@/lib/rate-limit';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * Automated Reminder Cron Job
 * Sends reminders to customers and cleaners before appointments
 *
 * Types of reminders:
 * 1. Customer reminder (24 hours before by default)
 * 2. Cleaner reminder (24 hours before by default)
 * 3. Morning-of reminder for cleaner (day of appointment at configured time)
 */
export async function GET(request: NextRequest) {
  // Rate limit: 2 cron executions per minute
  const rateLimited = checkRateLimit(request, 'cron', 'cron-send-reminders');
  if (rateLimited) return rateLimited;

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const results = {
      customerReminders: { sent: 0, failed: 0 },
      cleanerReminders: { sent: 0, failed: 0 },
      morningOfReminders: { sent: 0, failed: 0 },
    };

    // Get all companies
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        emailDomain: true,
        twilioAccountSid: true,
        twilioAuthToken: true,
        twilioPhoneNumber: true,
        resendApiKey: true,
        enableCustomerReminders: true,
        enableCleanerReminders: true,
        customerReminderHours: true,
        cleanerReminderHours: true,
        enableMorningOfReminder: true,
        morningOfReminderTime: true,
      },
    });

    for (const company of companies) {
      // 1. Send Customer Reminders
      if (company.enableCustomerReminders) {
        const customerResults = await sendCustomerReminders(company, now);
        results.customerReminders.sent += customerResults.sent;
        results.customerReminders.failed += customerResults.failed;
      }

      // 2. Send Cleaner Reminders
      if (company.enableCleanerReminders) {
        const cleanerResults = await sendCleanerReminders(company, now);
        results.cleanerReminders.sent += cleanerResults.sent;
        results.cleanerReminders.failed += cleanerResults.failed;
      }

      // 3. Send Morning-of Reminders to Cleaners
      if (company.enableMorningOfReminder) {
        const morningResults = await sendMorningOfReminders(company, now);
        results.morningOfReminders.sent += morningResults.sent;
        results.morningOfReminders.failed += morningResults.failed;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
      totalSent:
        results.customerReminders.sent +
        results.cleanerReminders.sent +
        results.morningOfReminders.sent,
      totalFailed:
        results.customerReminders.failed +
        results.cleanerReminders.failed +
        results.morningOfReminders.failed,
    });
  } catch (error) {
    console.error('Reminder cron error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send reminders' },
      { status: 500 }
    );
  }
}

/**
 * Send reminders to customers about upcoming appointments
 */
async function sendCustomerReminders(company: any, now: Date) {
  let sent = 0;
  let failed = 0;

  const reminderHours = company.customerReminderHours;
  const targetTimeStart = new Date(now.getTime() + (reminderHours * 60 * 60 * 1000));
  const targetTimeEnd = new Date(now.getTime() + ((reminderHours + 1) * 60 * 60 * 1000));

  // Find bookings that need customer reminders
  const bookings = await prisma.booking.findMany({
    where: {
      companyId: company.id,
      status: 'SCHEDULED',
      customerReminderSentAt: null,
      scheduledDate: {
        gte: targetTimeStart,
        lt: targetTimeEnd,
      },
    },
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

  for (const booking of bookings) {
    try {
      const customerName = booking.client.name.split(' ')[0]; // First name only
      const appointmentDate = formatDate(booking.scheduledDate, 'EEEE, MMMM d');
      const appointmentTime = formatTime(booking.scheduledDate);
      const address = `${booking.address.street}, ${booking.address.city}`;

      // Create message content
      const smsMessage = `Hi ${customerName}! Reminder: Your cleaning is scheduled for ${appointmentDate} at ${appointmentTime}. Address: ${address}. See you soon! - ${company.name}`;

      const emailSubject = `Reminder: Your cleaning appointment ${appointmentDate}`;
      const emailBody = `
        <h2>Appointment Reminder</h2>
        <p>Hi ${customerName},</p>
        <p>This is a friendly reminder about your upcoming cleaning appointment.</p>
        <h3>Appointment Details:</h3>
        <ul>
          <li><strong>Date:</strong> ${appointmentDate}</li>
          <li><strong>Time:</strong> ${appointmentTime}</li>
          <li><strong>Duration:</strong> ${booking.duration} minutes</li>
          <li><strong>Address:</strong> ${address}</li>
          ${booking.assignee ? `<li><strong>Cleaner:</strong> ${booking.assignee.user.name}</li>` : ''}
        </ul>
        ${booking.notes ? `<p><strong>Special instructions:</strong> ${booking.notes}</p>` : ''}
        <p>We look forward to seeing you!</p>
        <p>Best regards,<br/>${company.name}</p>
      `;

      let smsSuccess = false;
      let emailSuccess = false;

      // Send SMS if phone number available
      if (booking.client.phone && company.twilioAccountSid) {
        const normalizedPhone = normalizePhoneNumber(booking.client.phone);
        const smsResult = await sendSMS(normalizedPhone, smsMessage, {
          accountSid: company.twilioAccountSid,
          authToken: company.twilioAuthToken,
          from: company.twilioPhoneNumber,
        });

        if (smsResult.success) {
          smsSuccess = true;
          // Log SMS message
          await prisma.message.create({
            data: {
              companyId: company.id,
              userId: booking.userId,
              bookingId: booking.id,
              to: normalizedPhone,
              from: company.twilioPhoneNumber,
              body: smsMessage,
              type: 'REMINDER',
              status: 'SENT',
              twilioSid: smsResult.sid,
            },
          });
        } else {
          // Log failed SMS
          await prisma.message.create({
            data: {
              companyId: company.id,
              userId: booking.userId,
              bookingId: booking.id,
              to: normalizedPhone,
              from: company.twilioPhoneNumber,
              body: smsMessage,
              type: 'REMINDER',
              status: 'FAILED',
              errorMessage: smsResult.error,
            },
          });
        }
      }

      // Send email if email available
      if (booking.client.email && company.resendApiKey) {
        const emailResult = await sendEmail({
          to: booking.client.email,
          subject: emailSubject,
          html: emailBody,
          from: company.emailDomain
            ? `reminders@${company.emailDomain}`
            : 'reminders@resend.dev',
          replyTo: company.email || undefined,
          apiKey: company.resendApiKey,
        });

        if (emailResult.success) {
          emailSuccess = true;
        }
      }

      // Update booking if at least one reminder was sent
      if (smsSuccess || emailSuccess) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            customerReminderSentAt: now,
            reminderSent: true,
          },
        });
        sent++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Failed to send customer reminder for booking ${booking.id}:`, error);
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send reminders to cleaners about upcoming assignments
 */
async function sendCleanerReminders(company: any, now: Date) {
  let sent = 0;
  let failed = 0;

  const reminderHours = company.cleanerReminderHours;
  const targetTimeStart = new Date(now.getTime() + (reminderHours * 60 * 60 * 1000));
  const targetTimeEnd = new Date(now.getTime() + ((reminderHours + 1) * 60 * 60 * 1000));

  // Find bookings that need cleaner reminders
  const bookings = await prisma.booking.findMany({
    where: {
      companyId: company.id,
      status: 'SCHEDULED',
      cleanerReminderSentAt: null,
      assignedTo: { not: null },
      scheduledDate: {
        gte: targetTimeStart,
        lt: targetTimeEnd,
      },
    },
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

  for (const booking of bookings) {
    if (!booking.assignee) continue;

    try {
      const cleanerName = booking.assignee.user.name?.split(' ')[0] || 'Cleaner';
      const appointmentDate = formatDate(booking.scheduledDate, 'EEEE, MMMM d');
      const appointmentTime = formatTime(booking.scheduledDate);
      const address = `${booking.address.street}, ${booking.address.city}`;

      // Create message content
      const smsMessage = `Hi ${cleanerName}! Reminder: You have a cleaning scheduled for ${appointmentDate} at ${appointmentTime}. Client: ${booking.client.name}. Address: ${address}. - ${company.name}`;

      const emailSubject = `Reminder: Cleaning assignment ${appointmentDate}`;
      const emailBody = `
        <h2>Assignment Reminder</h2>
        <p>Hi ${cleanerName},</p>
        <p>This is a reminder about your upcoming cleaning assignment.</p>
        <h3>Job Details:</h3>
        <ul>
          <li><strong>Date:</strong> ${appointmentDate}</li>
          <li><strong>Time:</strong> ${appointmentTime}</li>
          <li><strong>Duration:</strong> ${booking.duration} minutes</li>
          <li><strong>Client:</strong> ${booking.client.name}</li>
          ${booking.client.phone ? `<li><strong>Client Phone:</strong> ${booking.client.phone}</li>` : ''}
          <li><strong>Address:</strong> ${address}</li>
        </ul>
        ${booking.address.gateCode ? `<p><strong>Gate Code:</strong> ${booking.address.gateCode}</p>` : ''}
        ${booking.address.parkingInfo ? `<p><strong>Parking:</strong> ${booking.address.parkingInfo}</p>` : ''}
        ${booking.address.petInfo ? `<p><strong>Pet Info:</strong> ${booking.address.petInfo}</p>` : ''}
        ${booking.internalNotes ? `<p><strong>Internal Notes:</strong> ${booking.internalNotes}</p>` : ''}
        <p>Good luck!</p>
        <p>- ${company.name}</p>
      `;

      let smsSuccess = false;
      let emailSuccess = false;

      // Send SMS if phone number available
      if (booking.assignee.user.phone && company.twilioAccountSid) {
        const normalizedPhone = normalizePhoneNumber(booking.assignee.user.phone);
        const smsResult = await sendSMS(normalizedPhone, smsMessage, {
          accountSid: company.twilioAccountSid,
          authToken: company.twilioAuthToken,
          from: company.twilioPhoneNumber,
        });

        if (smsResult.success) {
          smsSuccess = true;
          // Log SMS message
          await prisma.message.create({
            data: {
              companyId: company.id,
              userId: booking.userId,
              bookingId: booking.id,
              to: normalizedPhone,
              from: company.twilioPhoneNumber,
              body: smsMessage,
              type: 'REMINDER',
              status: 'SENT',
              twilioSid: smsResult.sid,
            },
          });
        }
      }

      // Send email
      if (booking.assignee.user.email && company.resendApiKey) {
        const emailResult = await sendEmail({
          to: booking.assignee.user.email,
          subject: emailSubject,
          html: emailBody,
          from: company.emailDomain
            ? `reminders@${company.emailDomain}`
            : 'reminders@resend.dev',
          replyTo: company.email || undefined,
          apiKey: company.resendApiKey,
        });

        if (emailResult.success) {
          emailSuccess = true;
        }
      }

      // Update booking if at least one reminder was sent
      if (smsSuccess || emailSuccess) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            cleanerReminderSentAt: now,
          },
        });
        sent++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Failed to send cleaner reminder for booking ${booking.id}:`, error);
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Send morning-of reminders to cleaners
 */
async function sendMorningOfReminders(company: any, now: Date) {
  let sent = 0;
  let failed = 0;

  // Parse reminder time (e.g., "08:00")
  const [hours, minutes] = company.morningOfReminderTime.split(':').map(Number);

  // Check if current time is within 1 hour of the reminder time
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  if (Math.abs(currentHour - hours) > 1) {
    return { sent, failed }; // Not time to send morning reminders yet
  }

  // Get today's start and end
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Find bookings scheduled for today that haven't received morning reminder
  const bookings = await prisma.booking.findMany({
    where: {
      companyId: company.id,
      status: 'SCHEDULED',
      morningOfReminderSentAt: null,
      assignedTo: { not: null },
      scheduledDate: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
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

  for (const booking of bookings) {
    if (!booking.assignee) continue;

    try {
      const cleanerName = booking.assignee.user.name?.split(' ')[0] || 'Cleaner';
      const appointmentTime = formatTime(booking.scheduledDate);
      const address = `${booking.address.street}, ${booking.address.city}`;

      // Create message content
      const smsMessage = `Good morning ${cleanerName}! Don't forget: You have a cleaning TODAY at ${appointmentTime}. Client: ${booking.client.name}. Address: ${address}. Have a great day! - ${company.name}`;

      const emailSubject = `Today's Cleaning: ${appointmentTime} - ${booking.client.name}`;
      const emailBody = `
        <h2>Today's Assignment</h2>
        <p>Good morning ${cleanerName},</p>
        <p>Quick reminder about your cleaning today!</p>
        <h3>Today's Job:</h3>
        <ul>
          <li><strong>Time:</strong> ${appointmentTime}</li>
          <li><strong>Client:</strong> ${booking.client.name}</li>
          ${booking.client.phone ? `<li><strong>Client Phone:</strong> ${booking.client.phone}</li>` : ''}
          <li><strong>Address:</strong> ${address}</li>
          <li><strong>Duration:</strong> ${booking.duration} minutes</li>
        </ul>
        ${booking.address.gateCode ? `<p><strong>Gate Code:</strong> ${booking.address.gateCode}</p>` : ''}
        ${booking.address.parkingInfo ? `<p><strong>Parking:</strong> ${booking.address.parkingInfo}</p>` : ''}
        <p>Have a great day!</p>
        <p>- ${company.name}</p>
      `;

      let smsSuccess = false;
      let emailSuccess = false;

      // Send SMS if phone number available
      if (booking.assignee.user.phone && company.twilioAccountSid) {
        const normalizedPhone = normalizePhoneNumber(booking.assignee.user.phone);
        const smsResult = await sendSMS(normalizedPhone, smsMessage, {
          accountSid: company.twilioAccountSid,
          authToken: company.twilioAuthToken,
          from: company.twilioPhoneNumber,
        });

        if (smsResult.success) {
          smsSuccess = true;
          // Log SMS message
          await prisma.message.create({
            data: {
              companyId: company.id,
              userId: booking.userId,
              bookingId: booking.id,
              to: normalizedPhone,
              from: company.twilioPhoneNumber,
              body: smsMessage,
              type: 'REMINDER',
              status: 'SENT',
              twilioSid: smsResult.sid,
            },
          });
        }
      }

      // Send email
      if (booking.assignee.user.email && company.resendApiKey) {
        const emailResult = await sendEmail({
          to: booking.assignee.user.email,
          subject: emailSubject,
          html: emailBody,
          from: company.emailDomain
            ? `reminders@${company.emailDomain}`
            : 'reminders@resend.dev',
          replyTo: company.email || undefined,
          apiKey: company.resendApiKey,
        });

        if (emailResult.success) {
          emailSuccess = true;
        }
      }

      // Update booking if at least one reminder was sent
      if (smsSuccess || emailSuccess) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            morningOfReminderSentAt: now,
          },
        });
        sent++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Failed to send morning-of reminder for booking ${booking.id}:`, error);
      failed++;
    }
  }

  return { sent, failed };
}
