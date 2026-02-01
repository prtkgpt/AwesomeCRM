import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendSMS } from '@/lib/twilio';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// POST /api/marketing/send-bulk - Quick send to selected recipients
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { recipientIds, channel, subject, message } = body;

    if (!recipientIds || recipientIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one recipient is required' },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message body is required' },
        { status: 400 }
      );
    }

    if (!channel || !['SMS', 'EMAIL', 'BOTH'].includes(channel)) {
      return NextResponse.json(
        { success: false, error: 'Channel must be SMS, EMAIL, or BOTH' },
        { status: 400 }
      );
    }

    if ((channel === 'EMAIL' || channel === 'BOTH') && !subject) {
      return NextResponse.json(
        { success: false, error: 'Subject is required for email messages' },
        { status: 400 }
      );
    }

    // Fetch recipients scoped to company
    const recipients = await prisma.client.findMany({
      where: {
        id: { in: recipientIds },
        companyId: user.companyId,
      },
      select: { id: true, name: true, email: true, phone: true },
    });

    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        name: true,
        twilioAccountSid: true,
        twilioAuthToken: true,
        twilioPhoneNumber: true,
        resendApiKey: true,
        emailDomain: true,
      },
    });

    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      const personalizedMessage = message
        .replace(/\{\{client\.name\}\}/g, recipient.name)
        .replace(/\{\{clientName\}\}/g, recipient.name)
        .replace(/\{\{company\.name\}\}/g, company?.name || '');

      // SMS
      if ((channel === 'SMS' || channel === 'BOTH') && recipient.phone) {
        try {
          const result = await sendSMS(recipient.phone, personalizedMessage, {
            accountSid: company?.twilioAccountSid || undefined,
            authToken: company?.twilioAuthToken || undefined,
            from: company?.twilioPhoneNumber || undefined,
          });

          await prisma.message.create({
            data: {
              companyId: user.companyId,
              userId: session.user.id,
              to: recipient.phone,
              from: company?.twilioPhoneNumber || 'system',
              body: personalizedMessage,
              type: 'MARKETING_SMS',
              status: result.success ? 'SENT' : 'FAILED',
              twilioSid: result.sid || null,
            },
          });

          if (result.success) sentCount++;
          else failedCount++;
        } catch {
          failedCount++;
        }
      }

      // Email
      if ((channel === 'EMAIL' || channel === 'BOTH') && recipient.email) {
        try {
          const personalizedSubject = subject
            ? subject
                .replace(/\{\{client\.name\}\}/g, recipient.name)
                .replace(/\{\{clientName\}\}/g, recipient.name)
                .replace(/\{\{company\.name\}\}/g, company?.name || '')
            : '';

          const result = await sendEmail({
            to: recipient.email,
            subject: personalizedSubject,
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <p>${personalizedMessage.replace(/\n/g, '<br/>')}</p>
              <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;" />
              <p style="font-size: 12px; color: #999;">From ${company?.name || 'your cleaning service'}</p>
            </div>`,
            apiKey: company?.resendApiKey || undefined,
            type: 'notification',
          });

          await prisma.message.create({
            data: {
              companyId: user.companyId,
              userId: session.user.id,
              to: recipient.email,
              from: company?.emailDomain ? `marketing@${company.emailDomain}` : 'noreply@cleandaycrm.com',
              body: personalizedMessage,
              type: 'MARKETING_EMAIL',
              status: result.success ? 'SENT' : 'FAILED',
            },
          });

          if (result.success) sentCount++;
          else failedCount++;
        } catch {
          failedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        recipientCount: recipients.length,
        sentCount,
        failedCount,
      },
    });
  } catch (error) {
    console.error('POST /api/marketing/send-bulk error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send messages' }, { status: 500 });
  }
}
