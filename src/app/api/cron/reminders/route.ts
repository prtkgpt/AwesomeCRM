import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendSMS, fillTemplate, twilioPhoneNumber } from '@/lib/twilio';
import { formatDate, formatTime, formatCurrency, normalizePhoneNumber } from '@/lib/utils';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/cron/reminders - Send 24hr reminders (called by Vercel Cron)
export async function GET(request: NextRequest) {
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
        status: 'CONFIRMED',
        reminderSentAt: null,
        scheduledDate: {
          gte: twentyThreeHoursFromNow,
          lte: twentyFourHoursFromNow,
        },
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        address: true,
        company: {
          include: {
            messageTemplates: {
              where: {
                type: 'REMINDER',
                isActive: true,
              },
            },
          },
        },
        createdBy: true,
      },
    });

    let sent = 0;
    let failed = 0;

    for (const booking of bookingsToRemind) {
      try {
        // Get reminder template from company
        const template = booking.company.messageTemplates[0];

        if (!template) {
          console.log(`No reminder template for company ${booking.companyId}`);
          failed++;
          continue;
        }

        // Check if client has phone number
        if (!booking.client.phone) {
          console.log(`No phone number for client ${booking.client.id}`);
          failed++;
          continue;
        }

        // Compute client name
        const clientName = `${booking.client.firstName || ''} ${booking.client.lastName || ''}`.trim() || 'Customer';
        const creatorName = `${booking.createdBy.firstName || ''} ${booking.createdBy.lastName || ''}`.trim();

        // Fill template variables
        const message = fillTemplate(template.body, {
          clientName,
          date: formatDate(booking.scheduledDate, 'EEEE, MMM d'),
          time: formatTime(booking.scheduledDate),
          price: formatCurrency(booking.finalPrice),
          address: `${booking.address?.street || ''}, ${booking.address?.city || ''}`,
          businessName: booking.company?.name || creatorName || 'CleanerCRM',
        });

        // Send SMS
        const normalizedPhone = normalizePhoneNumber(booking.client.phone);
        const result = await sendSMS(normalizedPhone, message);

        if (result.success) {
          // Log message
          await prisma.message.create({
            data: {
              companyId: booking.companyId,
              userId: booking.createdById,
              bookingId: booking.id,
              to: normalizedPhone,
              from: twilioPhoneNumber!,
              body: message,
              channel: 'SMS',
              type: 'REMINDER',
              status: 'SENT',
              providerId: result.sid,
            },
          });

          // Mark reminder as sent
          await prisma.booking.update({
            where: { id: booking.id },
            data: { reminderSentAt: new Date() },
          });

          sent++;
        } else {
          // Log failed message
          await prisma.message.create({
            data: {
              companyId: booking.companyId,
              userId: booking.createdById,
              bookingId: booking.id,
              to: normalizedPhone,
              from: twilioPhoneNumber!,
              body: message,
              channel: 'SMS',
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
