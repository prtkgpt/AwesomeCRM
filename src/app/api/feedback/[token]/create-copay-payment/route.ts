import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/feedback/[token]/create-copay-payment - Create Stripe payment intent for copay
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { success: false, error: 'Stripe is not configured' },
        { status: 500 }
      );
    }

    // Find booking by feedback token
    const booking = await prisma.booking.findUnique({
      where: { feedbackToken: params.token },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            stripeCustomerId: true,
          },
        },
        company: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if already paid
    if (booking.isPaid) {
      return NextResponse.json(
        { success: false, error: 'Copay already paid' },
        { status: 400 }
      );
    }

    // Get copay amount
    const copayAmount = booking.copayAmount;

    if (!copayAmount || copayAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'No copay amount due' },
        { status: 400 }
      );
    }

    // Create Stripe payment intent
    // Amount in cents (Stripe requires smallest currency unit)
    const amountInCents = Math.round(copayAmount * 100);
    const clientName = `${booking.client.firstName || ''} ${booking.client.lastName || ''}`.trim() || 'Customer';

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        bookingId: booking.id,
        clientName,
        type: 'COPAY',
        feedbackToken: params.token,
      },
      description: `Copay payment for ${booking.company.name} - ${clientName}`,
      receipt_email: booking.client.email || undefined,
    });

    // Update booking with payment intent ID
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: copayAmount,
    });
  } catch (error: any) {
    console.error('POST /api/feedback/[token]/create-copay-payment error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
