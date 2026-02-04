import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { checkRateLimit } from '@/lib/rate-limit';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/payments/auto-charge - Automatically charge customer's saved payment method
export async function POST(request: NextRequest) {
  // Rate limit: 10 payment operations per minute per IP
  const rateLimited = checkRateLimit(request, 'payments');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Get booking with client details
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

    // Check if job is completed
    if (booking.status !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Job must be completed before charging' },
        { status: 400 }
      );
    }

    // Check if already paid
    if (booking.isPaid) {
      return NextResponse.json(
        { success: false, error: 'Booking is already paid' },
        { status: 400 }
      );
    }

    // Check if client has auto-charge enabled and payment method saved
    if (!booking.client.autoChargeEnabled || !booking.client.stripePaymentMethodId) {
      return NextResponse.json(
        { success: false, error: 'Client does not have auto-charge enabled or no payment method on file' },
        { status: 400 }
      );
    }

    // Check if customer exists
    if (!booking.client.stripeCustomerId) {
      return NextResponse.json(
        { success: false, error: 'Client does not have a Stripe customer ID' },
        { status: 400 }
      );
    }

    // Create payment intent with saved payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.price * 100), // Convert to cents
      currency: 'usd',
      customer: booking.client.stripeCustomerId,
      payment_method: booking.client.stripePaymentMethodId,
      off_session: true, // Charge without customer present
      confirm: true, // Automatically confirm the payment
      description: `Cleaning service - ${booking.client.name} - ${booking.address.street}`,
      metadata: {
        bookingId: booking.id,
        clientId: booking.client.id,
        userId: session.user.id,
      },
    });

    // Update booking with payment info
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paymentMethod: 'card',
        stripePaymentIntentId: paymentIntent.id,
        autoChargeAttemptedAt: new Date(),
        autoChargeSuccessful: true,
      },
    });

    console.log(`✅ Auto-charged ${booking.client.name} $${booking.price} for booking ${booking.id}`);

    return NextResponse.json({
      success: true,
      data: {
        paymentIntentId: paymentIntent.id,
        amount: booking.price,
        status: paymentIntent.status,
      },
    });
  } catch (error: any) {
    console.error('🔴 POST /api/payments/auto-charge error:', error);

    // Record failed attempt
    if (request.json) {
      const { bookingId } = await request.json();
      if (bookingId) {
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            autoChargeAttemptedAt: new Date(),
            autoChargeSuccessful: false,
          },
        }).catch(e => console.error('Failed to record failed auto-charge attempt:', e));
      }
    }

    // Map Stripe errors to safe, user-friendly messages
    let message = 'Failed to charge customer. Please try again.';
    if (error?.type === 'StripeAuthenticationError') {
      message = 'Stripe authentication failed. Please check your Stripe configuration in Settings.';
    } else if (error?.type === 'StripeCardError') {
      message = 'The card was declined. Please ask the customer to update their payment method.';
    } else if (error?.type === 'StripeInvalidRequestError') {
      message = 'Payment request failed. The customer\'s payment method may need to be updated.';
    } else if (error?.type === 'StripeConnectionError') {
      message = 'Could not connect to Stripe. Please try again.';
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
