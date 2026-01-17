// ============================================
// CleanDayCRM - Stripe Webhook Handler
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancelled(subscription);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId;
  const creditsApplied = parseFloat(session.metadata?.creditsApplied || '0');
  const tipAmount = parseFloat(session.metadata?.tipAmount || '0');

  if (!bookingId) {
    console.error('No bookingId in checkout session metadata');
    return;
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { client: true },
  });

  if (!booking) {
    console.error('Booking not found:', bookingId);
    return;
  }

  // Apply credits if any were pending
  if (creditsApplied > 0 && booking.clientId) {
    await prisma.client.update({
      where: { id: booking.clientId },
      data: { creditBalance: { decrement: creditsApplied } },
    });

    await prisma.creditTransaction.create({
      data: {
        clientId: booking.clientId,
        amount: -creditsApplied,
        type: 'REDEEMED',
        description: `Applied to booking ${booking.bookingNumber}`,
        bookingId: booking.id,
      },
    });
  }

  // Create payment record
  const amountPaid = (session.amount_total || 0) / 100;

  await prisma.payment.create({
    data: {
      bookingId,
      amount: amountPaid,
      method: 'CARD',
      status: 'COMPLETED',
      stripePaymentIntentId: session.payment_intent as string,
      stripeCheckoutSessionId: session.id,
      creditsApplied,
      tipAmount,
      paidAt: new Date(),
    },
  });

  // Update booking
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      isPaid: true,
      paidAt: new Date(),
      paidAmount: amountPaid + creditsApplied,
      pendingCreditsApplied: null,
      stripeCheckoutSessionId: null,
    },
  });

  // Record tip for cleaner if any
  if (tipAmount > 0 && booking.assignedCleanerId) {
    await prisma.tip.create({
      data: {
        bookingId,
        cleanerId: booking.assignedCleanerId,
        amount: tipAmount,
        paidAt: new Date(),
      },
    });
  }

  console.log(`Payment completed for booking ${booking.bookingNumber}`);
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata?.bookingId;
  if (!bookingId) return;

  // Update payment record if it exists
  await prisma.payment.updateMany({
    where: {
      stripePaymentIntentId: paymentIntent.id,
      status: 'PENDING',
    },
    data: {
      status: 'COMPLETED',
      paidAt: new Date(),
    },
  });

  console.log(`Payment intent succeeded: ${paymentIntent.id}`);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const bookingId = paymentIntent.metadata?.bookingId;
  if (!bookingId) return;

  // Update payment record
  await prisma.payment.updateMany({
    where: {
      stripePaymentIntentId: paymentIntent.id,
    },
    data: {
      status: 'FAILED',
      failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
    },
  });

  // Restore pending credits if any
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (booking?.pendingCreditsApplied && booking.clientId) {
    await prisma.booking.update({
      where: { id: bookingId },
      data: { pendingCreditsApplied: null },
    });
  }

  console.log(`Payment intent failed: ${paymentIntent.id}`);
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  // Find payment by payment intent
  const payment = await prisma.payment.findFirst({
    where: { stripePaymentIntentId: charge.payment_intent as string },
  });

  if (!payment) return;

  const refundAmount = (charge.amount_refunded || 0) / 100;

  // Check if refund already recorded
  const existingRefund = await prisma.refund.findFirst({
    where: {
      paymentId: payment.id,
      stripeRefundId: { in: charge.refunds?.data.map(r => r.id) || [] },
    },
  });

  if (!existingRefund && charge.refunds?.data[0]) {
    await prisma.refund.create({
      data: {
        paymentId: payment.id,
        amount: refundAmount,
        reason: 'Refunded via Stripe',
        status: 'COMPLETED',
        stripeRefundId: charge.refunds.data[0].id,
        processedAt: new Date(),
      },
    });
  }

  // Update payment status if fully refunded
  if (charge.refunded) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'REFUNDED' },
    });
  }

  console.log(`Charge refunded: ${charge.id}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const companyId = subscription.metadata?.companyId;
  if (!companyId) return;

  const status = subscription.status === 'active' ? 'ACTIVE' :
                 subscription.status === 'trialing' ? 'TRIAL' :
                 subscription.status === 'past_due' ? 'PAST_DUE' : 'INACTIVE';

  await prisma.company.update({
    where: { id: companyId },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: status,
      subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });

  console.log(`Subscription updated: ${subscription.id} - ${status}`);
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const companyId = subscription.metadata?.companyId;
  if (!companyId) return;

  await prisma.company.update({
    where: { id: companyId },
    data: {
      subscriptionStatus: 'CANCELLED',
    },
  });

  console.log(`Subscription cancelled: ${subscription.id}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  const company = await prisma.company.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (company) {
    await prisma.subscriptionPayment.create({
      data: {
        companyId: company.id,
        stripeInvoiceId: invoice.id,
        amount: (invoice.amount_paid || 0) / 100,
        status: 'PAID',
        paidAt: new Date(),
      },
    });
  }

  console.log(`Invoice paid: ${invoice.id}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string;
  if (!subscriptionId) return;

  const company = await prisma.company.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (company) {
    await prisma.subscriptionPayment.create({
      data: {
        companyId: company.id,
        stripeInvoiceId: invoice.id,
        amount: (invoice.amount_due || 0) / 100,
        status: 'FAILED',
      },
    });

    // TODO: Send notification to company owner about payment failure
  }

  console.log(`Invoice payment failed: ${invoice.id}`);
}
