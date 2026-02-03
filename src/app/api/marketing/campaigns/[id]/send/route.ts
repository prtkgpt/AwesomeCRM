import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendSMS } from '@/lib/twilio';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// POST /api/marketing/campaigns/[id]/send - Execute a campaign
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const campaign = await prisma.campaign.findFirst({
      where: { id: params.id, companyId: user.companyId },
    });

    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      return NextResponse.json(
        { success: false, error: 'Campaign has already been sent or is currently sending' },
        { status: 400 }
      );
    }

    // Accept optional excluded/selected recipient IDs from request body
    let bodyData: any = {};
    try { bodyData = await request.json(); } catch { /* no body is fine */ }
    const excludedClientIds: string[] = bodyData.excludedClientIds || [];

    // Build audience from segment filter
    const filter = (campaign.segmentFilter as any) || {};
    const whereClause: any = {
      companyId: user.companyId,
      marketingOptOut: { not: true },
    };

    if (excludedClientIds.length > 0) {
      whereClause.id = { notIn: excludedClientIds };
    }

    if (filter.tags && filter.tags.length > 0) {
      whereClause.tags = { hasSome: filter.tags };
    }
    if (filter.noBookingDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - filter.noBookingDays);
      whereClause.bookings = {
        none: { scheduledDate: { gte: cutoff } },
      };
    }

    // Filter by channel capability
    if (campaign.channel === 'SMS') {
      whereClause.phone = { not: null };
    } else if (campaign.channel === 'EMAIL') {
      whereClause.email = { not: null };
    }

    const recipients = await prisma.client.findMany({
      where: whereClause,
      select: { id: true, name: true, email: true, phone: true },
    });

    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No recipients match the campaign filters' },
        { status: 400 }
      );
    }

    // Mark campaign as sending
    await prisma.campaign.update({
      where: { id: params.id },
      data: { status: 'SENDING', recipientCount: recipients.length },
    });

    // Create recipient records
    await prisma.campaignRecipient.createMany({
      data: recipients.map((r) => ({
        campaignId: params.id,
        clientId: r.id,
        channel: campaign.channel,
        status: 'PENDING',
      })),
      skipDuplicates: true,
    });

    // Get company for credentials
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
      const personalizedBody = campaign.body
        .replace(/\{\{client\.name\}\}/g, recipient.name)
        .replace(/\{\{clientName\}\}/g, recipient.name)
        .replace(/\{\{company\.name\}\}/g, company?.name || '');

      const personalizedSubject = campaign.subject
        ? campaign.subject
            .replace(/\{\{client\.name\}\}/g, recipient.name)
            .replace(/\{\{clientName\}\}/g, recipient.name)
            .replace(/\{\{company\.name\}\}/g, company?.name || '')
        : '';

      // Send SMS
      if ((campaign.channel === 'SMS' || campaign.channel === 'BOTH') && recipient.phone) {
        try {
          const smsResult = await sendSMS(recipient.phone, personalizedBody, {
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
              body: personalizedBody,
              type: 'MARKETING_SMS',
              status: smsResult.success ? 'SENT' : 'FAILED',
              twilioSid: smsResult.sid || null,
              errorMessage: smsResult.success ? null : 'Send failed',
            },
          });

          if (smsResult.success) sentCount++;
          else failedCount++;

          // Update recipient status (only for SMS-only campaigns, BOTH handled after email)
          if (campaign.channel === 'SMS') {
            await prisma.campaignRecipient.updateMany({
              where: { campaignId: params.id, clientId: recipient.id },
              data: { status: smsResult.success ? 'SENT' : 'FAILED', sentAt: new Date() },
            });
          }
        } catch {
          failedCount++;
          if (campaign.channel === 'SMS') {
            await prisma.campaignRecipient.updateMany({
              where: { campaignId: params.id, clientId: recipient.id },
              data: { status: 'FAILED', sentAt: new Date() },
            });
          }
        }
      }

      // Send Email
      if ((campaign.channel === 'EMAIL' || campaign.channel === 'BOTH') && recipient.email) {
        try {
          const emailResult = await sendEmail({
            to: recipient.email,
            subject: personalizedSubject,
            html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <p>${personalizedBody.replace(/\n/g, '<br/>')}</p>
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
              body: personalizedBody,
              type: 'MARKETING_EMAIL',
              status: emailResult.success ? 'SENT' : 'FAILED',
              errorMessage: emailResult.success ? null : 'Send failed',
            },
          });

          if (emailResult.success) sentCount++;
          else failedCount++;

          // Update recipient status for EMAIL or BOTH
          if (campaign.channel === 'EMAIL' || campaign.channel === 'BOTH') {
            await prisma.campaignRecipient.updateMany({
              where: { campaignId: params.id, clientId: recipient.id },
              data: { status: emailResult.success ? 'SENT' : 'FAILED', sentAt: new Date() },
            });
          }
        } catch {
          failedCount++;
          if (campaign.channel === 'EMAIL' || campaign.channel === 'BOTH') {
            await prisma.campaignRecipient.updateMany({
              where: { campaignId: params.id, clientId: recipient.id },
              data: { status: 'FAILED', sentAt: new Date() },
            });
          }
        }
      }
    }

    // Update campaign stats
    await prisma.campaign.update({
      where: { id: params.id },
      data: {
        status: 'SENT',
        sentCount,
        failedCount,
        sentAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: { recipientCount: recipients.length, sentCount, failedCount },
    });
  } catch (error) {
    console.error('POST /api/marketing/campaigns/[id]/send error:', error);

    // Try to mark as failed
    try {
      await prisma.campaign.update({
        where: { id: params.id },
        data: { status: 'FAILED' },
      });
    } catch {}

    return NextResponse.json({ success: false, error: 'Campaign send failed' }, { status: 500 });
  }
}
