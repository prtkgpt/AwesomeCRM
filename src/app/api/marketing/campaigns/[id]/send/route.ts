import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendSMS, fillTemplate } from '@/lib/twilio';
import { sendEmail } from '@/lib/email';
import { normalizePhoneNumber } from '@/lib/utils';

// Type assertion for new Campaign model (pre-migration compatibility)
const db = prisma as any;

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Batch size and delay for rate limiting
const BATCH_SIZE = 25; // Send 25 messages at a time
const BATCH_DELAY_MS = 2000; // Wait 2 seconds between batches

// Helper function to build recipient filter based on segment
async function getSegmentedClients(
  companyId: string,
  segmentType: string,
  segmentData: any,
  campaignType: string
) {
  const baseWhere: any = {
    companyId,
    marketingOptOut: false,
  };

  if (campaignType === 'BULK_SMS') {
    baseWhere.phone = { not: null };
  } else if (campaignType === 'BULK_EMAIL') {
    baseWhere.email = { not: null };
  } else if (campaignType === 'BOTH') {
    baseWhere.OR = [
      { phone: { not: null } },
      { email: { not: null } },
    ];
  }

  switch (segmentType) {
    case 'TAGS':
      if (segmentData?.tags && segmentData.tags.length > 0) {
        baseWhere.tags = { hasSome: segmentData.tags };
      }
      break;

    case 'INACTIVE':
      if (segmentData?.inactiveDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - segmentData.inactiveDays);

        const activeClientIds = await prisma.booking.findMany({
          where: {
            companyId,
            scheduledDate: { gte: cutoffDate },
            status: { in: ['COMPLETED', 'CLEANER_COMPLETED', 'SCHEDULED'] },
          },
          select: { clientId: true },
          distinct: ['clientId'],
        });

        const activeIds = activeClientIds.map((b) => b.clientId);
        if (activeIds.length > 0) {
          baseWhere.id = { notIn: activeIds };
        }
      }
      break;

    case 'LOCATION':
      if (segmentData?.cities || segmentData?.states) {
        const addressFilters: any = {};
        if (segmentData.cities?.length > 0) {
          addressFilters.city = { in: segmentData.cities, mode: 'insensitive' };
        }
        if (segmentData.states?.length > 0) {
          addressFilters.state = { in: segmentData.states, mode: 'insensitive' };
        }

        const matchingAddresses = await prisma.address.findMany({
          where: {
            client: { companyId },
            ...addressFilters,
          },
          select: { clientId: true },
          distinct: ['clientId'],
        });

        const clientIds = matchingAddresses.map((a) => a.clientId);
        baseWhere.id = clientIds.length > 0 ? { in: clientIds } : { in: [] };
      }
      break;

    case 'INSURANCE':
      if (segmentData?.hasInsurance !== undefined) {
        baseWhere.hasInsurance = segmentData.hasInsurance;
      }
      break;

    case 'ALL':
    default:
      break;
  }

  // Use db (as any) for pre-migration compatibility with marketingOptOut field
  return db.client.findMany({
    where: baseWhere,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  });
}

// Helper to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// POST /api/marketing/campaigns/[id]/send - Execute campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Get the campaign
    const campaign = await db.campaign.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    // Only allow sending DRAFT or SCHEDULED campaigns
    if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
      return NextResponse.json(
        { success: false, error: 'This campaign has already been sent or is in progress' },
        { status: 400 }
      );
    }

    // Get company details for template variables and credentials
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        name: true,
        phone: true,
        twilioAccountSid: true,
        twilioAuthToken: true,
        twilioPhoneNumber: true,
        resendApiKey: true,
        emailDomain: true,
      },
    });

    if (!company) {
      return NextResponse.json({ success: false, error: 'Company not found' }, { status: 404 });
    }

    // Get recipients
    const clients = await getSegmentedClients(
      user.companyId,
      campaign.segmentType,
      campaign.segmentData,
      campaign.type
    );

    if (clients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No recipients match the campaign criteria' },
        { status: 400 }
      );
    }

    // Update campaign status to SENDING
    await db.campaign.update({
      where: { id },
      data: {
        status: 'SENDING',
        sentAt: new Date(),
        totalRecipients: clients.length,
      },
    });

    // Log campaign start (using db for pre-migration compatibility)
    try {
      await db.auditLog.create({
        data: {
          companyId: user.companyId,
          userId: session.user.id,
          action: 'CAMPAIGN_SENT',
          description: `${user.name || 'User'} started sending campaign "${campaign.name}" to ${clients.length} recipients`,
          entityType: 'Campaign',
          entityId: campaign.id,
          metadata: {
            totalRecipients: clients.length,
            campaignType: campaign.type,
          },
        },
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }

    // Process in batches
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < clients.length; i += BATCH_SIZE) {
      const batch = clients.slice(i, i + BATCH_SIZE);

      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(async (client: any) => {
          const firstName = client.name.split(' ')[0];
          const templateVars: Record<string, string> = {
            clientName: firstName,
            businessName: company.name,
            companyName: company.name,
          };

          const filledMessage = fillTemplate(campaign.messageBody, templateVars);
          const results: { sms?: any; email?: any } = {};

          // Send SMS if applicable
          if ((campaign.type === 'BULK_SMS' || campaign.type === 'BOTH') && client.phone) {
            try {
              const normalizedPhone = normalizePhoneNumber(client.phone);
              const smsResult = await sendSMS(normalizedPhone, filledMessage, {
                accountSid: company.twilioAccountSid || undefined,
                authToken: company.twilioAuthToken || undefined,
                from: company.twilioPhoneNumber || undefined,
              });

              // Create recipient record for SMS
              await db.campaignRecipient.create({
                data: {
                  campaignId: id,
                  companyId: user.companyId,
                  clientId: client.id,
                  channel: 'BULK_SMS',
                  recipient: normalizedPhone,
                  status: smsResult.success ? 'SENT' : 'FAILED',
                  sentAt: smsResult.success ? new Date() : null,
                  failedAt: smsResult.success ? null : new Date(),
                  errorMessage: smsResult.success ? null : smsResult.error,
                  twilioSid: smsResult.sid || null,
                },
              });

              // Update client's last marketing SMS timestamp
              if (smsResult.success) {
                await db.client.update({
                  where: { id: client.id },
                  data: { lastMarketingSMS: new Date() },
                });
              }

              results.sms = smsResult;
            } catch (err) {
              results.sms = { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
            }
          }

          // Send Email if applicable
          if ((campaign.type === 'BULK_EMAIL' || campaign.type === 'BOTH') && client.email) {
            try {
              const filledSubject = campaign.subject
                ? fillTemplate(campaign.subject, templateVars)
                : `Message from ${company.name}`;

              const emailResult = await sendEmail({
                to: client.email,
                subject: filledSubject,
                html: `<p>${filledMessage.replace(/\n/g, '<br>')}</p>`,
                apiKey: company.resendApiKey || undefined,
              });

              // Create recipient record for Email
              await db.campaignRecipient.create({
                data: {
                  campaignId: id,
                  companyId: user.companyId,
                  clientId: client.id,
                  channel: 'BULK_EMAIL',
                  recipient: client.email,
                  status: emailResult.success ? 'SENT' : 'FAILED',
                  sentAt: emailResult.success ? new Date() : null,
                  failedAt: emailResult.success ? null : new Date(),
                  errorMessage: emailResult.success ? null : (emailResult as any).error,
                  resendId: emailResult.data?.id || null,
                },
              });

              // Update client's last marketing email timestamp
              if (emailResult.success) {
                await db.client.update({
                  where: { id: client.id },
                  data: { lastMarketingEmail: new Date() },
                });
              }

              results.email = { ...emailResult, messageId: emailResult.data?.id };
            } catch (err) {
              results.email = { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
            }
          }

          return results;
        })
      );

      // Count results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { sms, email } = result.value;
          if (sms?.success || email?.success) {
            sentCount++;
          } else {
            failedCount++;
            if (sms?.error) errors.push(sms.error);
            if (email?.error) errors.push(email.error);
          }
        } else {
          failedCount++;
          errors.push(result.reason?.message || 'Unknown error');
        }
      });

      // Update campaign counts periodically
      await db.campaign.update({
        where: { id },
        data: {
          sentCount,
          failedCount,
        },
      });

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < clients.length) {
        await delay(BATCH_DELAY_MS);
      }
    }

    // Mark campaign as completed
    await db.campaign.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        sentCount,
        failedCount,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalRecipients: clients.length,
        sentCount,
        failedCount,
        errors: errors.slice(0, 10), // Return first 10 errors
      },
      message: `Campaign sent to ${sentCount} recipients (${failedCount} failed)`,
    });
  } catch (error) {
    console.error('POST /api/marketing/campaigns/[id]/send error:', error);

    // Try to mark campaign as failed
    try {
      const { id } = await params;
      await db.campaign.update({
        where: { id },
        data: { status: 'PAUSED' },
      });
    } catch (updateError) {
      console.error('Failed to update campaign status:', updateError);
    }

    return NextResponse.json(
      { success: false, error: 'Failed to send campaign' },
      { status: 500 }
    );
  }
}
