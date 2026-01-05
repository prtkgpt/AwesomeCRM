import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail, getEstimateEmailTemplate } from '@/lib/email';
import { sendSMS, getEstimateSMSMessage } from '@/lib/sms';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = session.user as any;

    // Only OWNER and ADMIN can send estimates
    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const { method } = await req.json(); // 'email' or 'sms'

    if (!['email', 'sms'].includes(method)) {
      return NextResponse.json(
        { success: false, error: 'Invalid method. Must be email or sms' },
        { status: 400 }
      );
    }

    // Fetch the booking/estimate
    const booking = await prisma.booking.findUnique({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
      include: {
        client: true,
        address: true,
        company: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Estimate not found' },
        { status: 404 }
      );
    }

    if (!booking.estimateToken) {
      return NextResponse.json(
        { success: false, error: 'This booking does not have an estimate token' },
        { status: 400 }
      );
    }

    // Construct estimate URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const estimateUrl = `${baseUrl}/estimate/${booking.estimateToken}`;

    // Parse service type from internal notes
    let serviceTypeDisplay = booking.serviceType;
    try {
      const notes = booking.internalNotes as any;
      if (notes?.serviceType) {
        serviceTypeDisplay = notes.serviceType;
      }
    } catch (e) {
      // Use default
    }

    if (method === 'email') {
      // Send email
      if (!booking.client.email) {
        return NextResponse.json(
          { success: false, error: 'Client does not have an email address' },
          { status: 400 }
        );
      }

      const emailHtml = getEstimateEmailTemplate({
        customerName: booking.client.name,
        companyName: booking.company.name,
        serviceType: serviceTypeDisplay,
        scheduledDate: booking.scheduledDate.toISOString(),
        price: booking.price,
        estimateUrl,
      });

      await sendEmail({
        to: booking.client.email,
        subject: `Your Cleaning Estimate from ${booking.company.name}`,
        html: emailHtml,
        type: 'estimate',
      });

      // Update booking to track that estimate was sent (non-blocking)
      try {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            internalNotes: {
              ...((booking.internalNotes as any) || {}),
              estimateSentVia: 'email',
              estimateSentAt: new Date().toISOString(),
            },
          },
        });
      } catch (updateError) {
        // Log but don't fail the request - email was already sent
        console.error('Failed to update booking metadata:', updateError);
      }

      return NextResponse.json({
        success: true,
        message: 'Estimate sent via email',
      });
    }

    if (method === 'sms') {
      // Send SMS
      if (!booking.client.phone) {
        return NextResponse.json(
          { success: false, error: 'Client does not have a phone number' },
          { status: 400 }
        );
      }

      const smsMessage = getEstimateSMSMessage({
        customerName: booking.client.name,
        companyName: booking.company.name,
        price: booking.price,
        estimateUrl,
      });

      await sendSMS({
        to: booking.client.phone,
        message: smsMessage,
      });

      // Update booking to track that estimate was sent (non-blocking)
      try {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            internalNotes: {
              ...((booking.internalNotes as any) || {}),
              estimateSentVia: 'sms',
              estimateSentAt: new Date().toISOString(),
            },
          },
        });
      } catch (updateError) {
        // Log but don't fail the request - SMS was already sent
        console.error('Failed to update booking metadata:', updateError);
      }

      return NextResponse.json({
        success: true,
        message: 'Estimate sent via SMS',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown error' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Send estimate error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send estimate';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
