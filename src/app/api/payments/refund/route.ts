import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// POST /api/payments/refund - Issue a refund for a booking
export async function POST(request: NextRequest) {
  // Rate limit: 5 refund operations per minute per IP
  const rateLimited = checkRateLimit(request, 'payments');
  if (rateLimited) return rateLimited;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user and verify role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Only owners and admins can issue refunds' }, { status: 403 });
    }

    if (!stripe) {
      return NextResponse.json(
        { success: false, error: 'Payment processing is not configured' },
        { status: 503 }
      );
    }

    const { bookingId, amount, reason } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Get booking with payment details
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        companyId: user.companyId,
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

    // Check if booking is paid
    if (!booking.isPaid) {
      return NextResponse.json(
        { success: false, error: 'This booking has not been paid' },
        { status: 400 }
      );
    }

    // Check if payment was made via Stripe (has payment intent ID)
    if (!booking.stripePaymentIntentId) {
      return NextResponse.json(
        { success: false, error: 'This booking was not paid via Stripe. Manual refund required.' },
        { status: 400 }
      );
    }

    // Calculate refund amount
    const maxRefundAmount = booking.finalPrice || booking.price;
    const refundAmount = amount ? Math.min(amount, maxRefundAmount) : maxRefundAmount;

    if (refundAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid refund amount' },
        { status: 400 }
      );
    }

    // Create refund via Stripe
    const refund = await stripe.refunds.create({
      payment_intent: booking.stripePaymentIntentId,
      amount: Math.round(refundAmount * 100), // Convert to cents
      reason: reason === 'duplicate' ? 'duplicate' :
              reason === 'fraudulent' ? 'fraudulent' : 'requested_by_customer',
      metadata: {
        bookingId: booking.id,
        clientId: booking.client.id,
        refundedBy: session.user.id,
      },
    });

    // Determine if this is a full or partial refund
    const isFullRefund = refundAmount >= maxRefundAmount;

    // Update booking payment status
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        isPaid: !isFullRefund, // Keep as paid if partial refund
        internalNotes: booking.internalNotes
          ? `${booking.internalNotes}\n\n[REFUND] ${new Date().toLocaleString()} - $${refundAmount.toFixed(2)} refunded (${isFullRefund ? 'full' : 'partial'}). Refund ID: ${refund.id}${reason ? `. Reason: ${reason}` : ''}`
          : `[REFUND] ${new Date().toLocaleString()} - $${refundAmount.toFixed(2)} refunded (${isFullRefund ? 'full' : 'partial'}). Refund ID: ${refund.id}${reason ? `. Reason: ${reason}` : ''}`,
      },
    });

    console.log(`💸 Refund issued: $${refundAmount} for booking ${booking.id} (${isFullRefund ? 'full' : 'partial'})`);

    return NextResponse.json({
      success: true,
      data: {
        refundId: refund.id,
        amount: refundAmount,
        status: refund.status,
        isFullRefund,
      },
    });
  } catch (error: any) {
    console.error('POST /api/payments/refund error:', error);

    // Map Stripe errors to user-friendly messages
    let message = 'Failed to issue refund. Please try again.';
    if (error?.type === 'StripeAuthenticationError') {
      message = 'Stripe authentication failed. Please check your Stripe configuration.';
    } else if (error?.type === 'StripeInvalidRequestError') {
      if (error.message?.includes('already been refunded')) {
        message = 'This payment has already been refunded.';
      } else if (error.message?.includes('greater than')) {
        message = 'Refund amount exceeds the original payment.';
      } else {
        message = error.message || 'Invalid refund request.';
      }
    } else if (error?.type === 'StripeConnectionError') {
      message = 'Could not connect to Stripe. Please try again.';
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
