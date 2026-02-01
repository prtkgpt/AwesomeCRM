import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { checkRateLimit } from '@/lib/rate-limit';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/payments/create-link - Create Stripe payment link
export async function POST(request: NextRequest) {
  // Rate limit: 10 payment operations per minute per IP
  const rateLimited = checkRateLimit(request, 'payments');
  if (rateLimited) return rateLimited;

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

    // Check if company has Stripe configured with a valid key
    const stripeKey = booking.company.stripeSecretKey;
    if (!stripeKey) {
      return NextResponse.json(
        { success: false, error: 'Payment processing is not configured. Go to Settings to add your Stripe secret key.' },
        { status: 503 }
      );
    }

    if (!stripeKey.startsWith('sk_test_') && !stripeKey.startsWith('sk_live_')) {
      return NextResponse.json(
        { success: false, error: 'Invalid Stripe secret key. The key must start with sk_test_ or sk_live_. Please update it in Settings.' },
        { status: 400 }
      );
    }

    // Initialize Stripe with company's credentials
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    // Create a Checkout Session (creates its own PaymentIntent automatically)
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_intent_data: {
        description: `Cleaning service - ${booking.client.name}`,
        metadata: {
          bookingId: booking.id,
          clientId: booking.client.id,
          userId: session.user.id,
          companyId: booking.companyId,
        },
        ...(booking.client.stripeCustomerId && {
          customer: booking.client.stripeCustomerId,
        }),
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

    // Store the Checkout Session's PaymentIntent ID (not a separate orphaned one)
    const paymentIntentId = typeof checkoutSession.payment_intent === 'string'
      ? checkoutSession.payment_intent
      : checkoutSession.payment_intent?.id || null;

    // Update booking with payment link
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        ...(paymentIntentId && { stripePaymentIntentId: paymentIntentId }),
        stripePaymentLink: checkoutSession.url,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentLink: checkoutSession.url,
        paymentIntentId,
      },
    });
  } catch (error: any) {
    console.error('POST /api/payments/create-link error:', error);

    // Map Stripe errors to safe, user-friendly messages
    let message = 'Failed to create payment link. Please try again.';
    if (error?.type === 'StripeAuthenticationError') {
      message = 'Stripe authentication failed. Please check your Stripe secret key in Settings.';
    } else if (error?.type === 'StripePermissionError') {
      message = 'Your Stripe account does not have permission for this operation.';
    } else if (error?.type === 'StripeInvalidRequestError') {
      message = 'Payment request failed: ' + (error.message || 'invalid parameters');
    } else if (error?.type === 'StripeConnectionError') {
      message = 'Could not connect to Stripe. Please try again.';
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
