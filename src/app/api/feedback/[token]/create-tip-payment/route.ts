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
            firstName: true,
            lastName: true,
            stripeCustomerId: true,
          },
        },
        assignedCleaner: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
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

    if (!booking.assignedCleaner) {
      return NextResponse.json(
        { success: false, error: 'No cleaner assigned to this booking' },
        { status: 400 }
      );
    }

    // Create Stripe payment intent
    // Amount in cents (Stripe requires smallest currency unit)
    const amountInCents = Math.round(tipAmount * 100);
    const cleanerUser = booking.assignedCleaner.user;
    const cleanerName = `${cleanerUser.firstName || ''} ${cleanerUser.lastName || ''}`.trim() || 'Cleaner';
    const clientName = `${booking.client.firstName || ''} ${booking.client.lastName || ''}`.trim() || 'Customer';

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        bookingId: booking.id,
        cleanerName,
        cleanerEmail: cleanerUser.email,
        clientName,
        type: 'TIP',
        feedbackToken: params.token,
      },
      description: `Tip for ${cleanerName} - ${booking.company.name}`,
      receipt_email: cleanerUser.email,
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: any) {
    console.error('POST /api/feedback/[token]/create-tip-payment error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
