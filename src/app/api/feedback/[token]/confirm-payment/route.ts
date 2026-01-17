import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/feedback/[token]/confirm-payment - Confirm and record payment
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await request.json();
    const { paymentIntentId, paymentType } = body; // paymentType: 'TIP' or 'COPAY'

    if (!paymentIntentId) {
      return NextResponse.json(
        { success: false, error: 'Payment intent ID is required' },
        { status: 400 }
      );
    }

    // Find booking by feedback token
    const booking = await prisma.booking.findUnique({
      where: { feedbackToken: params.token },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify payment with Stripe (if configured)
    if (stripe) {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        return NextResponse.json(
          { success: false, error: 'Payment not completed' },
          { status: 400 }
        );
      }
    }

    // Update booking based on payment type
    if (paymentType === 'TIP') {
      const amount = body.amount || 0;

      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          tipAmount: amount,
          tipPaidVia: 'STRIPE',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Tip recorded successfully',
      });
    } else if (paymentType === 'COPAY') {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          copayPaid: true,
          copayPaidAt: new Date(),
          copayPaymentMethod: 'STRIPE',
          copayStripePaymentIntentId: paymentIntentId,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Copay payment recorded successfully',
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid payment type' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('POST /api/feedback/[token]/confirm-payment error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}
