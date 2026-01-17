// ============================================
// CleanDayCRM - Payment Refund API
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

const refundSchema = z.object({
  amount: z.number().positive().optional(), // Partial refund amount, or full if not specified
  reason: z.string().min(1),
  refundToCredits: z.boolean().default(false), // Refund as store credits instead of original method
});

// POST /api/payments/[id]/refund - Process refund
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = refundSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { amount, reason, refundToCredits } = validation.data;

    // Get payment with booking info
    const payment = await prisma.payment.findFirst({
      where: {
        id: params.id,
        booking: { companyId: user.companyId },
      },
      include: {
        booking: {
          include: { client: true },
        },
        refunds: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Only completed payments can be refunded' },
        { status: 400 }
      );
    }

    // Calculate already refunded amount
    const alreadyRefunded = payment.refunds.reduce((sum, r) => sum + r.amount, 0);
    const availableForRefund = payment.amount - alreadyRefunded;

    if (availableForRefund <= 0) {
      return NextResponse.json(
        { error: 'Payment has already been fully refunded' },
        { status: 400 }
      );
    }

    const refundAmount = amount ? Math.min(amount, availableForRefund) : availableForRefund;

    let stripeRefundId: string | null = null;

    // Process Stripe refund if payment was via Stripe
    if (payment.stripePaymentIntentId && !refundToCredits) {
      try {
        const stripeRefund = await stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          amount: Math.round(refundAmount * 100), // Convert to cents
          reason: 'requested_by_customer',
        });
        stripeRefundId = stripeRefund.id;
      } catch (stripeError: any) {
        console.error('Stripe refund error:', stripeError);
        return NextResponse.json(
          { error: 'Failed to process Stripe refund', details: stripeError.message },
          { status: 500 }
        );
      }
    }

    // Create refund record
    const refund = await prisma.refund.create({
      data: {
        paymentId: payment.id,
        amount: refundAmount,
        reason,
        status: 'COMPLETED',
        stripeRefundId,
        processedById: session.user.id,
        processedAt: new Date(),
        refundMethod: refundToCredits ? 'CREDIT' : payment.method,
      },
    });

    // If refunding to credits, add to client's credit balance
    if (refundToCredits && payment.booking.clientId) {
      await prisma.client.update({
        where: { id: payment.booking.clientId },
        data: { creditBalance: { increment: refundAmount } },
      });

      await prisma.creditTransaction.create({
        data: {
          clientId: payment.booking.clientId,
          amount: refundAmount,
          type: 'REFUND',
          description: `Refund for booking ${payment.booking.bookingNumber}`,
          bookingId: payment.booking.id,
        },
      });
    }

    // Update payment status if fully refunded
    const totalRefunded = alreadyRefunded + refundAmount;
    if (totalRefunded >= payment.amount) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED' },
      });
    }

    // Update booking paid amount
    await prisma.booking.update({
      where: { id: payment.bookingId },
      data: {
        paidAmount: { decrement: refundAmount },
        isPaid: false,
      },
    });

    return NextResponse.json({
      success: true,
      data: refund,
      message: refundToCredits
        ? `$${refundAmount.toFixed(2)} refunded as store credit`
        : `$${refundAmount.toFixed(2)} refunded to original payment method`,
    });
  } catch (error) {
    console.error('POST /api/payments/[id]/refund error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process refund' },
      { status: 500 }
    );
  }
}
