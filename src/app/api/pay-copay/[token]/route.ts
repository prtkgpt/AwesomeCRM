import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/pay-copay/[token] - Get booking and payment details by feedback token
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { feedbackToken: params.token },
      include: {
        client: true,
        company: {
          select: {
            name: true,
            zelleEmail: true,
            venmoUsername: true,
            cashappUsername: true,
          },
        },
        assignedCleaner: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
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

    // Check if copay is applicable
    if (!booking.copayAmount || booking.copayAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'No copay required for this booking' },
        { status: 400 }
      );
    }

    // Check if already paid
    if (booking.isPaid) {
      return NextResponse.json(
        { success: false, error: 'Copay already paid', alreadyPaid: true },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: booking });
  } catch (error) {
    console.error('GET /api/pay-copay/[token] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

// POST /api/pay-copay/[token] - Process copay payment
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await request.json();
    const { paymentMethod, stripePaymentIntentId } = body;

    // Validate payment method
    const validMethods = ['STRIPE', 'ZELLE', 'VENMO', 'CASHAPP'];
    if (!paymentMethod || !validMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment method' },
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

    // Check if already paid
    if (booking.isPaid) {
      return NextResponse.json(
        { success: false, error: 'Copay already paid' },
        { status: 400 }
      );
    }

    // Check if copay is applicable
    if (!booking.copayAmount || booking.copayAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'No copay required for this booking' },
        { status: 400 }
      );
    }

    // Update booking with payment information
    const updateData: any = {
      isPaid: true,
      paidAt: new Date(),
      paymentMethod: paymentMethod === 'STRIPE' ? 'CARD' : paymentMethod,
    };

    // If Stripe payment, store the payment intent ID
    if (paymentMethod === 'STRIPE' && stripePaymentIntentId) {
      updateData.stripePaymentIntentId = stripePaymentIntentId;
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedBooking,
      message: 'Copay payment recorded successfully!',
    });
  } catch (error) {
    console.error('POST /api/pay-copay/[token] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}
