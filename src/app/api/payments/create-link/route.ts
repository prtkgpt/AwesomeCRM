import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// POST /api/payments/create-link - Create Stripe payment link
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { success: false, error: 'Payment processing is not configured' },
        { status: 503 }
      );
    }

    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Get booking details
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: session.user.id,
      },
      include: {
        client: true,
        address: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.price * 100), // Convert to cents
      currency: 'usd',
      description: `Cleaning service - ${booking.client.name}`,
      metadata: {
        bookingId: booking.id,
        clientId: booking.client.id,
        userId: session.user.id,
      },
      ...(booking.client.stripeCustomerId && {
        customer: booking.client.stripeCustomerId,
      }),
    });

    // Create a payment link (using Checkout Session for better UX)
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_intent_data: {
        metadata: {
          bookingId: booking.id,
          clientId: booking.client.id,
          userId: session.user.id,
        },
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Cleaning Service - ${booking.serviceType}`,
              description: `${booking.address.street}, ${booking.address.city}`,
            },
            unit_amount: Math.round(booking.price * 100),
          },
          quantity: 1,
        },
      ],
      customer_email: booking.client.email || undefined,
      success_url: `${process.env.NEXTAUTH_URL}/jobs/${booking.id}?payment=success`,
      cancel_url: `${process.env.NEXTAUTH_URL}/jobs/${booking.id}?payment=cancelled`,
    });

    // Update booking with payment link
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        stripePaymentIntentId: paymentIntent.id,
        stripePaymentLink: checkoutSession.url,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentLink: checkoutSession.url,
        paymentIntentId: paymentIntent.id,
      },
    });
  } catch (error) {
    console.error('POST /api/payments/create-link error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payment link' },
      { status: 500 }
    );
  }
}
