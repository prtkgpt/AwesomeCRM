import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// POST /api/payments/create-link - Create Stripe payment link
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Get user's company
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get booking details with company info
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        companyId: user.companyId,
      },
      include: {
        client: true,
        address: true,
        company: {
          select: {
            name: true,
            stripeSecretKey: true,
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

    // Check if company has Stripe configured
    if (!booking.company.stripeSecretKey) {
      return NextResponse.json(
        { success: false, error: 'Payment processing is not configured for your company' },
        { status: 503 }
      );
    }

    // Initialize Stripe with company's credentials
    const stripe = new Stripe(booking.company.stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

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
          companyId: booking.companyId,
        },
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${booking.company.name} - Cleaning Service`,
              description: `${booking.serviceType.replace('_', ' ')} • ${booking.address.street}, ${booking.address.city}`,
            },
            unit_amount: Math.round(booking.price * 100),
          },
          quantity: 1,
        },
      ],
      customer_email: booking.client.email || undefined,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://cleandaycrm.com'}/jobs/${booking.id}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'https://cleandaycrm.com'}/jobs/${booking.id}?payment=cancelled`,
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
