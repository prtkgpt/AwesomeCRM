import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendSMS } from '@/lib/twilio';
import { sendEmail } from '@/lib/email';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/cron/send-feedback-requests - Automatically send feedback requests 24hrs after job completion
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);

    // Find completed bookings from 24-25 hours ago that haven't had feedback requests sent yet
    const bookingsForFeedback = await prisma.booking.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: twentyFiveHoursAgo,
          lte: twentyFourHoursAgo,
        },
        feedbackSentAt: null, // Haven't sent feedback request yet
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
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
        company: {
          select: {
            name: true,
            twilioAccountSid: true,
            twilioAuthToken: true,
            twilioPhoneNumber: true,
            resendApiKey: true,
          },
        },
      },
    });

    console.log(`📋 Found ${bookingsForFeedback.length} completed jobs ready for feedback requests`);

    let sent = 0;
    let failed = 0;
    const results: any[] = [];

    for (const booking of bookingsForFeedback) {
      try {
        // Generate feedback token if doesn't exist
        let feedbackToken = booking.feedbackToken;
        if (!feedbackToken) {
          feedbackToken = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
          await prisma.booking.update({
            where: { id: booking.id },
            data: { feedbackToken },
          });
        }

        const feedbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://cleandaycrm.com'}/feedback/${feedbackToken}`;
        const clientName = `${booking.client.firstName || ''} ${booking.client.lastName || ''}`.trim() || 'Customer';
        const cleanerFirstName = booking.assignedCleaner?.user.firstName || '';
        const cleanerLastName = booking.assignedCleaner?.user.lastName || '';
        const cleanerName = `${cleanerFirstName} ${cleanerLastName}`.trim() || 'your cleaner';
        const companyName = booking.company.name;

        const sentVia: string[] = [];
        const errors: string[] = [];

        // Send SMS if client has phone and Twilio is configured
        if (booking.client.phone && booking.company.twilioAccountSid && booking.company.twilioAuthToken) {
          try {
            const smsMessage = `Hi ${clientName}! Thanks for choosing ${companyName}. How did ${cleanerName} do? Please rate your cleaning and share feedback: ${feedbackUrl}`;

            await sendSMS(
              booking.client.phone,
              smsMessage,
              {
                accountSid: booking.company.twilioAccountSid,
                authToken: booking.company.twilioAuthToken,
                from: booking.company.twilioPhoneNumber || undefined,
              }
            );

            sentVia.push('SMS');
            console.log(`✅ Sent feedback SMS to ${booking.client.phone} for booking ${booking.id}`);
          } catch (error) {
            console.error(`Failed to send feedback SMS for booking ${booking.id}:`, error);
            errors.push(`SMS: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Send Email if client has email
        if (booking.client.email) {
          try {
            const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>How was your cleaning?</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #10b981; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">✨ How was your cleaning?</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">We'd love to hear your feedback!</p>
  </div>

  <div style="background-color: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${clientName},</p>

    <p style="font-size: 16px;">Thank you for choosing ${companyName}! ${cleanerName} completed your cleaning service yesterday.</p>

    <p style="font-size: 16px;">We'd love to know how everything went! Your feedback helps us improve and ensures you get the best service possible.</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${feedbackUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">Share Your Feedback</a>
    </div>

    <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
      <p style="margin: 0; color: #1e40af; font-size: 14px;">
        <strong>On the feedback page, you can:</strong>
      </p>
      <ul style="margin: 10px 0; padding-left: 20px; color: #1e40af; font-size: 14px;">
        <li>Rate your cleaning experience (1-5 stars)</li>
        <li>Leave feedback about ${cleanerName}</li>
        ${booking.hasInsurance && booking.copayAmount > 0 ? '<li>Pay your insurance copay</li>' : ''}
        ${!booking.isPaid ? '<li>Complete your payment</li>' : ''}
        <li>Leave a tip for ${cleanerName} (optional)</li>
        <li>Share a Google review if you loved the service ⭐</li>
      </ul>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      If you have any questions or concerns, please don't hesitate to reach out.
    </p>

    <p style="font-size: 14px; margin-top: 20px;">
      Best regards,<br>
      <strong>${companyName}</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 12px; color: #6b7280;">
    <p>© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
  </div>
</body>
</html>
            `;

            await sendEmail({
              to: booking.client.email,
              subject: `How was your cleaning with ${companyName}?`,
              html: emailHtml,
              type: 'notification',
              apiKey: booking.company.resendApiKey || undefined,
            });

            sentVia.push('Email');
            console.log(`✅ Sent feedback email to ${booking.client.email} for booking ${booking.id}`);
          } catch (error) {
            console.error(`Failed to send feedback email for booking ${booking.id}:`, error);
            errors.push(`Email: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Update booking to track that feedback link was sent
        if (sentVia.length > 0) {
          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              feedbackSentAt: new Date(),
            },
          });

          sent++;
          results.push({
            bookingId: booking.id,
            clientName,
            sentVia,
            success: true,
          });
        } else {
          failed++;
          results.push({
            bookingId: booking.id,
            clientName,
            errors: errors.length > 0 ? errors : ['No contact method available'],
            success: false,
          });
        }
      } catch (error) {
        console.error(`Error processing booking ${booking.id}:`, error);
        failed++;
        results.push({
          bookingId: booking.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        });
      }
    }

    console.log(`✅ Feedback request cron completed: ${sent} sent, ${failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Processed ${bookingsForFeedback.length} bookings`,
      sent,
      failed,
      results,
    });
  } catch (error) {
    console.error('🔴 Feedback request cron job error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send feedback requests' },
      { status: 500 }
    );
  }
}
