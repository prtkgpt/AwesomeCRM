import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// This endpoint receives webhook events from Stripe
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature found' },
        { status: 400 }
      );
    }

    // Get the webhook secret from your company settings
    // For now, you'll need to set this as an environment variable
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('Stripe webhook secret not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Initialize Stripe (you'll need to add your secret key to env)
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-11-20.acacia',
    });

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    // Handle the event
    console.log(`Received event: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.succeeded':
        await handleChargeSucceeded(event.data.object as Stripe.Charge);
        break;

      case 'charge.failed':
        await handleChargeFailed(event.data.object as Stripe.Charge);
        break;

      case 'payment_method.attached':
        console.log('Payment method attached:', event.data.object);
        break;

      case 'customer.created':
        console.log('Customer created:', event.data.object);
        break;

      case 'customer.updated':
        console.log('Customer updated:', event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment succeeded:', paymentIntent.id);

  // Extract booking ID from metadata
  const bookingId = paymentIntent.metadata?.bookingId;

  if (!bookingId) {
    console.warn('No bookingId in payment intent metadata');
    return;
  }

  try {
    // Update booking payment status
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        isPaid: true,
        paymentMethod: 'STRIPE',
        paidAt: new Date(),
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    console.log(`Booking ${bookingId} marked as paid`);
  } catch (error) {
    console.error('Failed to update booking:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Payment failed:', paymentIntent.id);

  const bookingId = paymentIntent.metadata?.bookingId;

  if (!bookingId) {
    console.warn('No bookingId in payment intent metadata');
    return;
  }

  try {
    // Log the failed payment
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        autoChargeAttemptedAt: new Date(),
        autoChargeSuccessful: false,
      },
    });

    console.log(`Payment failed for booking ${bookingId}`);
  } catch (error) {
    console.error('Failed to log payment failure:', error);
  }
}

async function handleChargeSucceeded(charge: Stripe.Charge) {
  console.log('Charge succeeded:', charge.id);
  // Additional charge success handling if needed
}

async function handleChargeFailed(charge: Stripe.Charge) {
  console.log('Charge failed:', charge.id);
  // Additional charge failure handling if needed
}
