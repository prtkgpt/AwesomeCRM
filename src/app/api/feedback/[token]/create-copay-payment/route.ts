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
            name: true,
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

    // Check if copay is already paid
    if (booking.copayPaid) {
      return NextResponse.json(
        { success: false, error: 'Copay already paid' },
        { status: 400 }
      );
    }

    // Get copay amount
    const copayAmount = booking.finalCopayAmount || booking.copayAmount;

    if (!copayAmount || copayAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'No copay amount due' },
        { status: 400 }
      );
    }

    // Create Stripe payment intent
    // Amount in cents (Stripe requires smallest currency unit)
    const amountInCents = Math.round(copayAmount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        bookingId: booking.id,
        clientName: booking.client.name,
        type: 'COPAY',
        feedbackToken: params.token,
      },
      description: `Copay payment for ${booking.company.name} - ${booking.client.name}`,
      receipt_email: booking.client.email || undefined,
    });

    // Update booking with payment intent ID
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        copayStripePaymentIntentId: paymentIntent.id,
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
