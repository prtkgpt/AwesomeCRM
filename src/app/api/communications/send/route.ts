import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendSMS, twilioPhoneNumber } from '@/lib/twilio';
import { sendEmail } from '@/lib/email';
import { normalizePhoneNumber } from '@/lib/utils';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Validation schema for sending communications
const sendCommunicationSchema = z.object({
  recipients: z.array(z.object({
    id: z.string(),
    type: z.enum(['client', 'cleaner']),
    name: z.string().optional(),
    email: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
  })).min(1, 'At least one recipient is required'),
  channel: z.enum(['sms', 'email', 'both']),
  subject: z.string().optional(), // Required for email
  message: z.string().min(1, 'Message is required'),
});

// Email template for custom communications
function getCustomCommunicationEmailTemplate(data: {
  recipientName: string;
  message: string;
  companyName: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Message from ${data.companyName}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #2563eb; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 28px;">${data.companyName}</h1>
  </div>

  <div style="background-color: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 18px; margin-top: 0;">Hi ${data.recipientName},</p>

    <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <p style="font-size: 16px; margin: 0; white-space: pre-wrap;">${data.message}</p>
    </div>

    <p style="font-size: 14px; margin-top: 30px;">
      Best regards,<br>
      <strong>${data.companyName}</strong>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; font-size: 12px; color: #6b7280;">
    <p>&copy; ${new Date().getFullYear()} ${data.companyName}. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

// POST /api/communications/send - Send messages/emails to recipients
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can send communications
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = sendCommunicationSchema.parse(body);

    // Validate email has subject if channel includes email
    if ((validatedData.channel === 'email' || validatedData.channel === 'both') && !validatedData.subject) {
      return NextResponse.json(
        { success: false, error: 'Subject is required for email' },
        { status: 400 }
      );
    }

    // Get company settings for Twilio and Resend
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

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const results: {
      successful: Array<{ recipientId: string; name: string; channel: string }>;
      failed: Array<{ recipientId: string; name: string; channel: string; error: string }>;
    } = {
      successful: [],
      failed: [],
    };

    // Process each recipient
    for (const recipient of validatedData.recipients) {
      const recipientName = recipient.name || 'Valued Customer';

      // Send SMS if requested
      if ((validatedData.channel === 'sms' || validatedData.channel === 'both') && recipient.phone) {
        try {
          const normalizedPhone = normalizePhoneNumber(recipient.phone);
          const smsResult = await sendSMS(normalizedPhone, validatedData.message, {
            accountSid: company.twilioAccountSid || undefined,
            authToken: company.twilioAuthToken || undefined,
            from: company.twilioPhoneNumber || undefined,
          });

          if (smsResult.success) {
            // Log message in database
            await prisma.message.create({
              data: {
                companyId: user.companyId,
                userId: session.user.id,
                to: normalizedPhone,
                from: company.twilioPhoneNumber || twilioPhoneNumber || '',
                body: validatedData.message,
                type: 'CUSTOM',
                status: 'SENT',
                twilioSid: smsResult.sid,
              },
            });

            results.successful.push({
              recipientId: recipient.id,
              name: recipientName,
              channel: 'sms',
            });
          } else {
            results.failed.push({
              recipientId: recipient.id,
              name: recipientName,
              channel: 'sms',
              error: smsResult.error || 'Failed to send SMS',
            });
          }
        } catch (error) {
          results.failed.push({
            recipientId: recipient.id,
            name: recipientName,
            channel: 'sms',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Send email if requested
      if ((validatedData.channel === 'email' || validatedData.channel === 'both') && recipient.email) {
        try {
          const emailHtml = getCustomCommunicationEmailTemplate({
            recipientName,
            message: validatedData.message,
            companyName: company.name,
          });

          await sendEmail({
            to: recipient.email,
            subject: validatedData.subject || `Message from ${company.name}`,
            html: emailHtml,
            type: 'notification',
            apiKey: company.resendApiKey || undefined,
          });

          results.successful.push({
            recipientId: recipient.id,
            name: recipientName,
            channel: 'email',
          });
        } catch (error) {
          results.failed.push({
            recipientId: recipient.id,
            name: recipientName,
            channel: 'email',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Handle cases where recipient doesn't have the required contact info
      if (validatedData.channel === 'sms' && !recipient.phone) {
        results.failed.push({
          recipientId: recipient.id,
          name: recipientName,
          channel: 'sms',
          error: 'No phone number available',
        });
      }

      if (validatedData.channel === 'email' && !recipient.email) {
        results.failed.push({
          recipientId: recipient.id,
          name: recipientName,
          channel: 'email',
          error: 'No email address available',
        });
      }
    }

    const totalSuccessful = results.successful.length;
    const totalFailed = results.failed.length;

    return NextResponse.json({
      success: true,
      data: results,
      message: `Successfully sent ${totalSuccessful} message(s). ${totalFailed > 0 ? `${totalFailed} failed.` : ''}`,
    });
  } catch (error) {
    console.error('POST /api/communications/send error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0]?.message || 'Invalid input data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to send communications' },
      { status: 500 }
    );
  }
}
