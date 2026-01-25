import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { sendSMS } from '@/lib/twilio';
import { normalizePhoneNumber } from '@/lib/utils';

// Type assertion for InvoiceReminder (pre-migration compatibility)
const db = prisma as any;

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Helper to determine reminder type based on count
function getReminderType(count: number): string {
  switch (count) {
    case 0:
      return 'FIRST';
    case 1:
      return 'SECOND';
    case 2:
      return 'THIRD';
    default:
      return 'FINAL';
  }
}

// Helper to get days overdue
function getDaysOverdue(dueDate: Date): number {
  const now = new Date();
  const diffTime = now.getTime() - dueDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// POST /api/invoices/[id]/send-reminder - Send payment reminder
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const channel = body.channel || 'EMAIL'; // EMAIL, SMS, or BOTH
    const customMessage = body.message;

    // Get user with company details
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        companyId: true,
        name: true,
        company: {
          select: {
            name: true,
            phone: true,
            resendApiKey: true,
            twilioAccountSid: true,
            twilioAuthToken: true,
            twilioPhoneNumber: true,
          },
        },
      },
    });

    if (!user || !user.companyId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get invoice details
    const invoice = await prisma.invoice.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Don't send reminders for paid/cancelled invoices
    if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
      return NextResponse.json(
        { error: `Cannot send reminder for ${invoice.status.toLowerCase()} invoice` },
        { status: 400 }
      );
    }

    const companyName = user.company?.name || 'Your Cleaning Service';
    const daysOverdue = getDaysOverdue(new Date(invoice.dueDate));
    const reminderType = getReminderType((invoice as any).reminderCount || 0);
    const invoiceUrl = `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://cleandaycrm.com'}/pay/${invoice.id}`;

    // Build reminder message
    const firstName = invoice.client.name.split(' ')[0];
    let urgencyText = '';
    if (daysOverdue > 30) {
      urgencyText = 'This payment is significantly overdue. ';
    } else if (daysOverdue > 14) {
      urgencyText = 'This payment is now over 2 weeks past due. ';
    } else if (daysOverdue > 0) {
      urgencyText = `This payment is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} past due. `;
    }

    const defaultEmailMessage = customMessage || `
      Hi ${firstName},

      This is a friendly reminder that invoice ${invoice.invoiceNumber} for $${invoice.total.toFixed(2)} is due${daysOverdue > 0 ? ' and currently past due' : ''}.

      ${urgencyText}Please submit your payment at your earliest convenience.

      You can view and pay your invoice here: ${invoiceUrl}

      If you've already made this payment, please disregard this message.

      Thank you,
      ${companyName}
    `;

    const smsMessage = customMessage || `Hi ${firstName}, reminder: Invoice ${invoice.invoiceNumber} for $${invoice.total.toFixed(2)} is ${daysOverdue > 0 ? `${daysOverdue} days overdue` : 'due soon'}. Pay here: ${invoiceUrl} - ${companyName}`;

    const results: { email?: any; sms?: any } = {};
    let sentTo = '';

    // Send email reminder
    if ((channel === 'EMAIL' || channel === 'BOTH') && invoice.client.email) {
      try {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Payment Reminder from ${companyName}</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: ${daysOverdue > 14 ? '#dc2626' : daysOverdue > 0 ? '#f59e0b' : '#2563eb'}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">
                  ${daysOverdue > 14 ? '⚠️ Urgent Payment Reminder' : daysOverdue > 0 ? '📋 Payment Reminder' : '📋 Invoice Due Soon'}
                </h1>
              </div>

              <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; margin-bottom: 20px;">Hi ${firstName},</p>

                <p style="font-size: 16px; margin-bottom: 20px;">
                  This is a friendly reminder that your invoice is ${daysOverdue > 0 ? 'past due' : 'due soon'}.
                </p>

                <div style="background: ${daysOverdue > 14 ? '#fef2f2' : daysOverdue > 0 ? '#fffbeb' : '#eff6ff'}; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center; border: 1px solid ${daysOverdue > 14 ? '#fecaca' : daysOverdue > 0 ? '#fde68a' : '#bfdbfe'};">
                  <p style="margin: 0 0 5px 0; font-size: 14px; color: #6b7280;">Invoice ${invoice.invoiceNumber}</p>
                  <p style="margin: 0; font-size: 36px; font-weight: bold; color: ${daysOverdue > 14 ? '#dc2626' : daysOverdue > 0 ? '#d97706' : '#1e40af'};">$${invoice.total.toFixed(2)}</p>
                  <p style="margin: 10px 0 0 0; font-size: 14px; color: ${daysOverdue > 0 ? '#dc2626' : '#6b7280'}; font-weight: ${daysOverdue > 0 ? 'bold' : 'normal'};">
                    ${daysOverdue > 0 ? `${daysOverdue} days overdue` : `Due: ${new Date(invoice.dueDate).toLocaleDateString()}`}
                  </p>
                </div>

                ${urgencyText ? `<p style="font-size: 14px; color: #dc2626; margin-bottom: 20px;">${urgencyText}</p>` : ''}

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${invoiceUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Pay Now</a>
                </div>

                <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
                  <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
                    If you've already made this payment, please disregard this message.
                  </p>
                  <p style="font-size: 14px; color: #6b7280; margin: 0;">
                    Questions? Just reply to this email.<br>
                    ${companyName}
                  </p>
                </div>
              </div>

              <div style="text-align: center; padding: 20px; font-size: 12px; color: #9ca3af;">
                <p style="margin: 0;">This is a payment reminder from ${companyName}</p>
              </div>
            </body>
          </html>
        `;

        const subjectPrefix = daysOverdue > 14 ? '⚠️ URGENT: ' : daysOverdue > 0 ? 'Reminder: ' : '';
        await sendEmail({
          to: invoice.client.email,
          subject: `${subjectPrefix}Payment Due - Invoice ${invoice.invoiceNumber}`,
          html: emailHtml,
          type: 'notification',
          apiKey: user.company?.resendApiKey || undefined,
        });

        results.email = { success: true, sentTo: invoice.client.email };
        sentTo = invoice.client.email;
      } catch (emailError: any) {
        console.error('Failed to send reminder email:', emailError);
        results.email = { success: false, error: emailError.message };
      }
    }

    // Send SMS reminder
    if ((channel === 'SMS' || channel === 'BOTH') && invoice.client.phone) {
      try {
        const normalizedPhone = normalizePhoneNumber(invoice.client.phone);
        const smsResult = await sendSMS(normalizedPhone, smsMessage, {
          accountSid: user.company?.twilioAccountSid || undefined,
          authToken: user.company?.twilioAuthToken || undefined,
          from: user.company?.twilioPhoneNumber || undefined,
        });

        if (smsResult.success) {
          results.sms = { success: true, sentTo: normalizedPhone };
          sentTo = sentTo ? `${sentTo}, ${normalizedPhone}` : normalizedPhone;
        } else {
          results.sms = { success: false, error: smsResult.error };
        }
      } catch (smsError: any) {
        console.error('Failed to send reminder SMS:', smsError);
        results.sms = { success: false, error: smsError.message };
      }
    }

    // Check if at least one channel succeeded
    const emailSuccess = results.email?.success;
    const smsSuccess = results.sms?.success;

    if (!emailSuccess && !smsSuccess) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send reminder',
          details: {
            email: results.email?.error,
            sms: results.sms?.error,
          }
        },
        { status: 500 }
      );
    }

    // Record the reminder in database
    try {
      await db.invoiceReminder.create({
        data: {
          invoiceId: id,
          reminderType,
          channel,
          sentTo,
          sentBy: session.user.id,
          subject: `Payment Reminder - Invoice ${invoice.invoiceNumber}`,
          message: channel === 'SMS' ? smsMessage : defaultEmailMessage.trim(),
        },
      });

      // Update invoice reminder tracking (using db for pre-migration compatibility)
      await db.invoice.update({
        where: { id },
        data: {
          lastReminderAt: new Date(),
          reminderCount: { increment: 1 },
          // Mark as overdue if past due date
          ...(daysOverdue > 0 && invoice.status === 'SENT' && { status: 'OVERDUE' }),
        },
      });
    } catch (dbError) {
      console.error('Failed to record reminder (table may not exist):', dbError);
      // Continue - reminder was still sent successfully
    }

    console.log(`📧 Payment reminder sent for invoice ${invoice.invoiceNumber} to ${sentTo}`);

    return NextResponse.json({
      success: true,
      message: `Payment reminder sent to ${sentTo}`,
      results,
      reminderType,
      daysOverdue,
    });
  } catch (error: any) {
    console.error('POST /api/invoices/[id]/send-reminder error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send reminder',
      },
      { status: 500 }
    );
  }
}

// GET /api/invoices/[id]/send-reminder - Get reminder history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user || !user.companyId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify invoice belongs to company (using db for pre-migration compatibility)
    const invoice = await db.invoice.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      select: {
        id: true,
        reminderCount: true,
        lastReminderAt: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get reminder history
    let reminders: any[] = [];
    try {
      reminders = await db.invoiceReminder.findMany({
        where: { invoiceId: id },
        orderBy: { sentAt: 'desc' },
      });
    } catch {
      // Table may not exist yet
    }

    return NextResponse.json({
      success: true,
      data: {
        reminderCount: invoice.reminderCount || 0,
        lastReminderAt: invoice.lastReminderAt,
        reminders,
      },
    });
  } catch (error: any) {
    console.error('GET /api/invoices/[id]/send-reminder error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reminders' },
      { status: 500 }
    );
  }
}
