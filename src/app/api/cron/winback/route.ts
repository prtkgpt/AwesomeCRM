import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendSMS } from '@/lib/twilio';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface WinBackStep {
  days: number;
  channel: 'SMS' | 'EMAIL' | 'BOTH';
  template: string;
  emailSubject?: string;
  discountPercent: number;
}

function personalizeMessage(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

// POST /api/cron/winback - Process win-back automations for all companies
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all companies with win-back enabled
    const companies = await prisma.company.findMany({
      where: {
        winBackEnabled: true,
        winBackConfig: { not: null as any },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        winBackConfig: true,
        twilioAccountSid: true,
        twilioAuthToken: true,
        twilioPhoneNumber: true,
        resendApiKey: true,
      },
    });

    const results: any[] = [];

    for (const company of companies) {
      const config = company.winBackConfig as unknown as { steps: WinBackStep[] };
      if (!config?.steps?.length) continue;

      const companyResult = {
        companyId: company.id,
        companyName: company.name,
        sent: 0,
        skipped: 0,
        failed: 0,
        errors: [] as string[],
      };

      try {
        // Process each step
        for (const step of config.steps) {
          const stepDate = new Date();
          stepDate.setDate(stepDate.getDate() - step.days);

          // Find the date range for this step
          // Clients whose last booking was exactly around step.days ago
          // For step 1 (14 days): clients whose last booking was 14-15 days ago
          // This avoids re-sending to clients already contacted at this step
          const rangeStart = new Date(stepDate);
          rangeStart.setHours(0, 0, 0, 0);
          const rangeEnd = new Date(stepDate);
          rangeEnd.setDate(rangeEnd.getDate() + 1);
          rangeEnd.setHours(23, 59, 59, 999);

          // Find clients whose most recent booking falls in the target range
          // and who haven't already been contacted at this step
          const eligibleClients = await prisma.client.findMany({
            where: {
              companyId: company.id,
              // Must have at least one booking
              bookings: {
                some: {},
              },
              // Exclude clients already contacted at this step
              winBackAttempts: {
                none: {
                  step: step.days,
                  sentAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Not sent in last 24h
                },
              },
            },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              bookings: {
                select: { scheduledDate: true },
                orderBy: { scheduledDate: 'desc' },
                take: 1,
              },
            },
          });

          // Filter to clients whose last booking was in the target range
          const targetClients = eligibleClients.filter((client) => {
            if (!client.bookings.length) return false;
            const lastBooking = new Date(client.bookings[0].scheduledDate);
            return lastBooking >= rangeStart && lastBooking <= rangeEnd;
          });

          // Also check they don't already have a win-back at this step
          for (const client of targetClients) {
            const existingAttempt = await prisma.winBackAttempt.findFirst({
              where: {
                companyId: company.id,
                clientId: client.id,
                step: step.days,
              },
            });

            if (existingAttempt) {
              companyResult.skipped++;
              continue;
            }

            // Also skip if client already converted from a previous step
            const converted = await prisma.winBackAttempt.findFirst({
              where: {
                companyId: company.id,
                clientId: client.id,
                result: 'CONVERTED',
              },
            });

            if (converted) {
              companyResult.skipped++;
              continue;
            }

            const firstName = client.name.split(' ')[0];
            const vars: Record<string, string> = {
              firstName,
              clientName: client.name,
              companyName: company.name,
              discount: String(step.discountPercent),
              bookingLink: `https://cleandaycrm.com/${company.slug}/book`,
            };

            const messageBody = personalizeMessage(step.template, vars);
            let sent = false;

            try {
              // Send SMS
              if ((step.channel === 'SMS' || step.channel === 'BOTH') && client.phone) {
                await sendSMS(client.phone, messageBody, {
                  accountSid: company.twilioAccountSid || undefined,
                  authToken: company.twilioAuthToken || undefined,
                  from: company.twilioPhoneNumber || undefined,
                });
                sent = true;
              }

              // Send Email
              if ((step.channel === 'EMAIL' || step.channel === 'BOTH') && client.email) {
                const subject = personalizeMessage(
                  step.emailSubject || `We miss you, ${firstName}!`,
                  vars
                );
                await sendEmail({
                  to: client.email,
                  subject,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <h2 style="color: #333;">We Miss You!</h2>
                      <p style="font-size: 16px; color: #555; line-height: 1.6;">${messageBody}</p>
                      ${step.discountPercent > 0 ? `
                        <div style="background: #f0f9ff; border: 2px dashed #3b82f6; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
                          <p style="font-size: 24px; font-weight: bold; color: #3b82f6; margin: 0;">${step.discountPercent}% OFF</p>
                          <p style="color: #666; margin: 4px 0 0;">Your next cleaning service</p>
                        </div>
                      ` : ''}
                      <a href="https://cleandaycrm.com/${company.slug}/book"
                         style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                        Book Now
                      </a>
                    </div>
                  `,
                  apiKey: company.resendApiKey || undefined,
                  type: 'notification',
                });
                sent = true;
              }

              if (sent) {
                // Record the attempt
                await prisma.winBackAttempt.create({
                  data: {
                    companyId: company.id,
                    clientId: client.id,
                    step: step.days,
                    channel: step.channel,
                    discountPercent: step.discountPercent,
                    result: 'SENT',
                    sentAt: new Date(),
                  },
                });
                companyResult.sent++;
              } else {
                companyResult.skipped++;
              }
            } catch (sendError) {
              console.error(`Failed to send win-back to ${client.name}:`, sendError);
              companyResult.failed++;
              companyResult.errors.push(`Failed to send to ${client.name}`);
            }
          }
        }
      } catch (companyError) {
        console.error(`Win-back processing failed for company ${company.id}:`, companyError);
        companyResult.errors.push('Company processing failed');
      }

      results.push(companyResult);
    }

    const totalSent = results.reduce((sum, r) => sum + r.sent, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

    return NextResponse.json({
      success: true,
      data: {
        companiesProcessed: companies.length,
        totalSent,
        totalFailed,
        results,
      },
    });
  } catch (error) {
    console.error('Win-back cron error:', error);
    return NextResponse.json(
      { success: false, error: 'Win-back cron job failed' },
      { status: 500 }
    );
  }
}
