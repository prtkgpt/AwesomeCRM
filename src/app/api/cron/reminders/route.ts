import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendSMS, fillTemplate, twilioPhoneNumber } from '@/lib/twilio';
import { formatDate, formatTime, formatCurrency, normalizePhoneNumber } from '@/lib/utils';
import { checkRateLimit } from '@/lib/rate-limit';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/cron/reminders - Send 24hr reminders (called by Vercel Cron)
export async function GET(request: NextRequest) {
  // Rate limit: 2 cron executions per minute (protection against accidental hammering)
  const rateLimited = checkRateLimit(request, 'cron', 'cron-reminders');
  if (rateLimited) return rateLimited;

  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twentyThreeHoursFromNow = new Date(now.getTime() + 23 * 60 * 60 * 1000);

    // Find bookings scheduled 23-24 hours from now that haven't had reminders sent
    const bookingsToRemind = await prisma.booking.findMany({
      where: {
        status: 'SCHEDULED',
        reminderSent: false,
        scheduledDate: {
          gte: twentyThreeHoursFromNow,
          lte: twentyFourHoursFromNow,
        },
      },
      include: {
        client: true,
        address: true,
        user: {
          include: {
            messageTemplates: {
              where: {
                type: 'REMINDER',
                isActive: true,
              },
            },
          },
        },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const booking of bookingsToRemind) {
      try {
        // Get reminder template
        const template = booking.user.messageTemplates[0];

        if (!template) {
          console.log(`No reminder template for user ${booking.userId}`);
          failed++;
          continue;
        }

        // Check if client has phone number
        if (!booking.client.phone) {
          console.log(`No phone number for client ${booking.client.id}`);
          failed++;
          continue;
        }

        // Fill template variables
        const message = fillTemplate(template.template, {
          clientName: booking.client.name,
          date: formatDate(booking.scheduledDate, 'EEEE, MMM d'),
          time: formatTime(booking.scheduledDate),
          price: formatCurrency(booking.price),
          address: `${booking.address.street}, ${booking.address.city}`,
          businessName: booking.user.businessName || booking.user.name || 'CleanerCRM',
        });

        // Send SMS
        const normalizedPhone = normalizePhoneNumber(booking.client.phone);
        const result = await sendSMS(normalizedPhone, message);

        if (result.success) {
          // Log message
          await prisma.message.create({
            data: {
              companyId: booking.companyId,
              userId: booking.userId,
              bookingId: booking.id,
              to: normalizedPhone,
              from: twilioPhoneNumber!,
              body: message,
              type: 'REMINDER',
              status: 'SENT',
              twilioSid: result.sid,
            },
          });

          // Mark reminder as sent
          await prisma.booking.update({
            where: { id: booking.id },
            data: { reminderSent: true },
          });

          sent++;
        } else {
          // Log failed message
          await prisma.message.create({
            data: {
              companyId: booking.companyId,
              userId: booking.userId,
              bookingId: booking.id,
              to: normalizedPhone,
              from: twilioPhoneNumber!,
              body: message,
              type: 'REMINDER',
              status: 'FAILED',
              errorMessage: result.error,
            },
          });

          failed++;
        }
      } catch (error) {
        console.error(`Failed to send reminder for booking ${booking.id}:`, error);
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: bookingsToRemind.length,
    });
  } catch (error) {
    console.error('GET /api/cron/reminders error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send reminders' },
      { status: 500 }
    );
  }
}
