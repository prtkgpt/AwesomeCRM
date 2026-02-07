import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/feedback/[token]/create-tip-payment - Create Stripe payment intent for tip
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

    const body = await request.json();
    const { tipAmount } = body;

    if (!tipAmount || tipAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid tip amount' },
        { status: 400 }
      );
    }

    // Find booking by feedback token
    const booking = await prisma.booking.findUnique({
      where: { feedbackToken: params.token },
      include: {
        client: {
          select: {
            name: true,
            stripeCustomerId: true,
          },
        },
        assignee: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
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

    if (!booking.assignee) {
      return NextResponse.json(
        { success: false, error: 'No cleaner assigned to this booking' },
        { status: 400 }
      );
    }

    // Create Stripe payment intent
    // Amount in cents (Stripe requires smallest currency unit)
    const amountInCents = Math.round(tipAmount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        bookingId: booking.id,
        cleanerName: booking.assignee.user.name || 'Cleaner',
        cleanerEmail: booking.assignee.user.email,
        clientName: booking.client.name,
        type: 'TIP',
        feedbackToken: params.token,
      },
      description: `Tip for ${booking.assignee.user.name || 'cleaner'} - ${booking.company.name}`,
      receipt_email: booking.assignee.user.email,
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('POST /api/feedback/[token]/create-tip-payment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
