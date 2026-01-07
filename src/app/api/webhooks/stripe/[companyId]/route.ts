import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// Multi-tenant webhook endpoint - each company has their own URL
// URL format: /api/webhooks/stripe/[companyId]
export async function POST(
  request: NextRequest,
  { params }: { params: { companyId: string } }
) {
  try {
    const { companyId } = params;
    const body = await request.text();
    const signature = headers().get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature found' },
        { status: 400 }
      );
    }

    // Look up the company's Stripe credentials from database
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        stripeSecretKey: true,
        stripeWebhookSecret: true,
      },
    });

    if (!company) {
      console.error(`Company not found: ${companyId}`);
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    if (!company.stripeWebhookSecret) {
      console.error(`Company ${company.name} has no webhook secret configured`);
      return NextResponse.json(
        { error: 'Webhook secret not configured for this company' },
        { status: 500 }
      );
    }

    if (!company.stripeSecretKey) {
      console.error(`Company ${company.name} has no Stripe secret key configured`);
      return NextResponse.json(
        { error: 'Stripe not configured for this company' },
        { status: 500 }
      );
    }

    // Initialize Stripe with the company's secret key
    const stripe = new Stripe(company.stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Verify the webhook signature using company's webhook secret
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        company.stripeWebhookSecret
      );
    } catch (err: any) {
      console.error(
        `Webhook signature verification failed for ${company.name}:`,
        err.message
      );
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    // Log the event
    console.log(
      `[${company.name}] Received Stripe event: ${event.type} (${event.id})`
    );

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
          companyId,
          company.name
        );
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent,
          companyId,
          company.name
        );
        break;

      case 'charge.succeeded':
        await handleChargeSucceeded(
          event.data.object as Stripe.Charge,
          companyId,
          company.name
        );
        break;

      case 'charge.failed':
        await handleChargeFailed(
          event.data.object as Stripe.Charge,
          companyId,
          company.name
        );
        break;

      case 'payment_method.attached':
        console.log(
          `[${company.name}] Payment method attached:`,
          event.data.object.id
        );
        break;

      case 'customer.created':
        console.log(
          `[${company.name}] Customer created:`,
          event.data.object.id
        );
        break;

      case 'customer.updated':
        console.log(
          `[${company.name}] Customer updated:`,
          event.data.object.id
        );
        break;

      default:
        console.log(`[${company.name}] Unhandled event type: ${event.type}`);
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

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  companyId: string,
  companyName: string
) {
  console.log(`[${companyName}] Payment succeeded:`, paymentIntent.id);

  // Extract booking ID from metadata
  const bookingId = paymentIntent.metadata?.bookingId;

  if (!bookingId) {
    console.warn(`[${companyName}] No bookingId in payment intent metadata`);
    return;
  }

  try {
    // Verify the booking belongs to this company
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        companyId: companyId,
      },
    });

    if (!booking) {
      console.error(
        `[${companyName}] Booking ${bookingId} not found or doesn't belong to this company`
      );
      return;
    }

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

    console.log(`[${companyName}] Booking ${bookingId} marked as paid`);
  } catch (error) {
    console.error(`[${companyName}] Failed to update booking:`, error);
  }
}

async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  companyId: string,
  companyName: string
) {
  console.log(`[${companyName}] Payment failed:`, paymentIntent.id);

  const bookingId = paymentIntent.metadata?.bookingId;

  if (!bookingId) {
    console.warn(`[${companyName}] No bookingId in payment intent metadata`);
    return;
  }

  try {
    // Verify the booking belongs to this company
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        companyId: companyId,
      },
    });

    if (!booking) {
      console.error(
        `[${companyName}] Booking ${bookingId} not found or doesn't belong to this company`
      );
      return;
    }

    // Log the failed payment
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        autoChargeAttemptedAt: new Date(),
        autoChargeSuccessful: false,
      },
    });

    console.log(`[${companyName}] Payment failed for booking ${bookingId}`);
  } catch (error) {
    console.error(`[${companyName}] Failed to log payment failure:`, error);
  }
}

async function handleChargeSucceeded(
  charge: Stripe.Charge,
  companyId: string,
  companyName: string
) {
  console.log(`[${companyName}] Charge succeeded:`, charge.id);
  // Additional charge success handling if needed
}

async function handleChargeFailed(
  charge: Stripe.Charge,
  companyId: string,
  companyName: string
) {
  console.log(`[${companyName}] Charge failed:`, charge.id);
  // Additional charge failure handling if needed
}
