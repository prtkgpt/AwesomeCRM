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
        companyId: user.companyId,
      },
      include: {
        booking: {
          include: { client: true },
        },
        client: true,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status !== 'PAID') {
      return NextResponse.json(
        { error: 'Only completed payments can be refunded' },
        { status: 400 }
      );
    }

    // Calculate already refunded amount
    const alreadyRefunded = payment.refundAmount || 0;
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

    // Update payment with refund info
    const totalRefunded = alreadyRefunded + refundAmount;
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        refundAmount: totalRefunded,
        refundReason: reason,
        stripeRefundId,
        refundedAt: new Date(),
        status: totalRefunded >= payment.amount ? 'REFUNDED' : 'PAID',
      },
    });

    // If refunding to credits, add to client's credit balance
    if (refundToCredits && payment.clientId) {
      // Get current credit balance
      const client = await prisma.client.findUnique({
        where: { id: payment.clientId },
        select: { creditBalance: true },
      });

      const newBalance = (client?.creditBalance || 0) + refundAmount;

      await prisma.client.update({
        where: { id: payment.clientId },
        data: { creditBalance: newBalance },
      });

      await prisma.creditTransaction.create({
        data: {
          clientId: payment.clientId,
          amount: refundAmount,
          balance: newBalance,
          type: 'COMPENSATION',
          description: `Refund for payment ${payment.id}`,
          referenceType: 'BOOKING',
          referenceId: payment.bookingId || undefined,
        },
      });
    }

    // Update booking paid amount if linked
    if (payment.bookingId) {
      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: {
          isPaid: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: updatedPayment,
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
