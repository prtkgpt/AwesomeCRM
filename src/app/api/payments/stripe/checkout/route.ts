// ============================================
// CleanDayCRM - Stripe Checkout Session API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { z } from 'zod';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const checkoutSchema = z.object({
  bookingId: z.string().cuid(),
  applyCredits: z.number().min(0).optional(),
  tipAmount: z.number().min(0).optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

// POST /api/payments/stripe/checkout - Create Stripe checkout session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = checkoutSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { bookingId, applyCredits, tipAmount, successUrl, cancelUrl } = validation.data;

    // Get booking details
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, companyId: user.companyId },
      include: {
        client: true,
        address: true,
        company: {
          select: {
            name: true,
            stripeAccountId: true,
            stripeCustomerId: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.isPaid) {
      return NextResponse.json({ error: 'Booking already paid' }, { status: 400 });
    }

    let amountDue = booking.finalPrice || booking.totalPrice;
    let creditsApplied = 0;

    // Apply credits if requested
    if (applyCredits && applyCredits > 0 && booking.client) {
      creditsApplied = Math.min(applyCredits, booking.client.creditBalance, amountDue);
      amountDue -= creditsApplied;
    }

    // Add tip if provided
    if (tipAmount && tipAmount > 0) {
      amountDue += tipAmount;
    }

    // If fully paid with credits
    if (amountDue <= 0) {
      // Process as credit-only payment
      if (creditsApplied > 0) {
        await prisma.client.update({
          where: { id: booking.clientId! },
          data: { creditBalance: { decrement: creditsApplied } },
        });

        await prisma.creditTransaction.create({
          data: {
            clientId: booking.clientId!,
            amount: -creditsApplied,
            type: 'REDEEMED',
            description: `Applied to booking ${booking.bookingNumber}`,
            bookingId: booking.id,
          },
        });

        await prisma.payment.create({
          data: {
            bookingId: booking.id,
            amount: 0,
            method: 'CREDIT',
            status: 'COMPLETED',
            creditsApplied,
            paidAt: new Date(),
          },
        });

        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            isPaid: true,
            paidAt: new Date(),
            paidAmount: creditsApplied,
          },
        });
      }

      return NextResponse.json({
        success: true,
        paidWithCredits: true,
        creditsApplied,
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create or get Stripe customer
    let stripeCustomerId = booking.client?.stripeCustomerId;
    if (!stripeCustomerId && booking.client) {
      const customer = await stripe.customers.create({
        email: booking.client.email || undefined,
        name: `${booking.client.firstName} ${booking.client.lastName || ''}`.trim(),
        phone: booking.client.phone || undefined,
        metadata: {
          clientId: booking.client.id,
          companyId: user.companyId,
        },
      });
      stripeCustomerId = customer.id;

      await prisma.client.update({
        where: { id: booking.client.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    // Build line items
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${booking.serviceType} Cleaning`,
            description: `Booking #${booking.bookingNumber} - ${booking.address?.street}, ${booking.address?.city}`,
          },
          unit_amount: Math.round((booking.finalPrice || booking.totalPrice) * 100),
        },
        quantity: 1,
      },
    ];

    // Add tip as separate line item
    if (tipAmount && tipAmount > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Tip for Cleaner',
            description: 'Thank you for your generosity!',
          },
          unit_amount: Math.round(tipAmount * 100),
        },
        quantity: 1,
      });
    }

    // Show credits as discount
    const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
    if (creditsApplied > 0) {
      // Create a coupon for the credit amount
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(creditsApplied * 100),
        currency: 'usd',
        name: 'Store Credits Applied',
        duration: 'once',
      });
      discounts.push({ coupon: coupon.id });
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId || undefined,
      customer_email: stripeCustomerId ? undefined : booking.client?.email || undefined,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      discounts: discounts.length > 0 ? discounts : undefined,
      success_url: successUrl || `${baseUrl}/client/bookings/${booking.id}?payment=success`,
      cancel_url: cancelUrl || `${baseUrl}/client/bookings/${booking.id}?payment=cancelled`,
      metadata: {
        bookingId: booking.id,
        companyId: user.companyId,
        clientId: booking.clientId || '',
        creditsApplied: creditsApplied.toString(),
        tipAmount: (tipAmount || 0).toString(),
      },
      payment_intent_data: {
        metadata: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
        },
      },
    });

    // Store pending credits application
    if (creditsApplied > 0) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          pendingCreditsApplied: creditsApplied,
          stripeCheckoutSessionId: checkoutSession.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
      amountDue,
      creditsToApply: creditsApplied,
    });
  } catch (error) {
    console.error('POST /api/payments/stripe/checkout error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
