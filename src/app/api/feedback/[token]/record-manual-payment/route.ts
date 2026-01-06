import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/feedback/[token]/record-manual-payment - Record manual payment (CashApp, Venmo, etc.)
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await request.json();
    const { paymentType, paymentMethod } = body; // paymentType: 'TIP' or 'COPAY', paymentMethod: 'CASHAPP', 'VENMO', etc.

    if (!paymentType || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Payment type and method are required' },
        { status: 400 }
      );
    }

    // Find booking by feedback token
    const booking = await prisma.booking.findUnique({
      where: { feedbackToken: params.token },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Update booking based on payment type
    if (paymentType === 'COPAY') {
      // Mark copay as paid via the specified method
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          copayPaid: true,
          copayPaidAt: new Date(),
          copayPaymentMethod: paymentMethod,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Copay payment via ${paymentMethod} recorded. Please complete the payment using the link provided.`,
      });
    } else if (paymentType === 'TIP') {
      const amount = body.amount || 0;

      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          tipAmount: amount,
          tipPaidVia: paymentMethod,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Tip via ${paymentMethod} recorded`,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid payment type' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('POST /api/feedback/[token]/record-manual-payment error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record payment' },
      { status: 500 }
    );
  }
}
