import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

// POST /api/invoices/[id]/send - Send invoice email to client
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        companyId: true,
        company: {
          select: {
            name: true,
            resendApiKey: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get invoice details
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        booking: {
          select: {
            scheduledDate: true,
            serviceType: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (!invoice.client.email) {
      return NextResponse.json(
        { error: 'Client does not have an email address' },
        { status: 400 }
      );
    }

    // Generate invoice URL
    const invoiceUrl = `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://cleandaycrm.com'}/invoices/${invoice.id}`;
    const companyName = user.company?.name || 'Your Cleaning Service';

    // Create email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invoice from ${companyName}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Invoice from ${companyName}</h1>
          </div>

          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hi ${invoice.client.name},</p>

            <p style="font-size: 16px; margin-bottom: 20px;">
              Your invoice <strong>${invoice.invoiceNumber}</strong> is ready.
            </p>

            ${invoice.booking ? `
              <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0; font-size: 14px;"><strong>Service:</strong> ${invoice.booking.serviceType.replace('_', ' ')}</p>
                <p style="margin: 5px 0; font-size: 14px;"><strong>Date:</strong> ${new Date(invoice.booking.scheduledDate).toLocaleDateString()}</p>
              </div>
            ` : ''}

            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;">Amount Due</p>
              <p style="margin: 0; font-size: 36px; font-weight: bold; color: #1e40af;">$${invoice.total.toFixed(2)}</p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">Due by ${new Date(invoice.dueDate).toLocaleDateString()}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${invoiceUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">View Invoice</a>
            </div>

            <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
              <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">
                If you have any questions about this invoice, please contact us.
              </p>
              <p style="font-size: 14px; color: #6b7280; margin: 0;">
                Thank you for your business!<br>
                ${companyName}
              </p>
            </div>
          </div>

          <div style="text-align: center; padding: 20px; font-size: 12px; color: #9ca3af;">
            <p style="margin: 0;">This is an automated email from ${companyName}</p>
          </div>
        </body>
      </html>
    `;

    try {
      // Send the email
      await sendEmail({
        to: invoice.client.email,
        subject: `Invoice ${invoice.invoiceNumber} from ${companyName}`,
        html: emailHtml,
        type: 'notification',
        apiKey: user.company?.resendApiKey || undefined,
      });

      // Update invoice status to SENT
      await prisma.invoice.update({
        where: { id: params.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          sentTo: invoice.client.email,
        },
      });

      console.log(`✉️  Invoice ${invoice.invoiceNumber} sent to ${invoice.client.email}`);

      return NextResponse.json({
        success: true,
        message: `Invoice sent to ${invoice.client.email}`,
      });
    } catch (emailError: any) {
      console.error('Failed to send invoice email:', emailError);

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email',
          details: emailError.message,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('POST /api/invoices/[id]/send error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send invoice',
      },
      { status: 500 }
    );
  }
}
