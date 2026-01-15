import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendBookingConfirmation } from '@/lib/notifications';

// POST /api/public/estimate/[token]/book - Accept estimate, process payment, and create booking
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await request.json();
    const { name, email, phone, password, createAccount, payment } = body;

    // Find booking by estimate token
    const booking = await prisma.booking.findFirst({
      where: {
        estimateToken: params.token,
      },
      include: {
        client: true,
        address: true,
        company: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Estimate not found' },
        { status: 404 }
      );
    }

    // Check if already accepted
    if (booking.estimateAccepted) {
      return NextResponse.json(
        { error: 'This estimate has already been accepted' },
        { status: 400 }
      );
    }

    // TODO: Process payment with payment gateway (Stripe, etc.)
    // For now, we'll simulate successful payment
    // In production, integrate with Stripe:
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: Math.round(booking.price * 100),
    //   currency: 'usd',
    //   payment_method_types: ['card'],
    // });

    const paymentProcessed = true; // Simulated success

    if (!paymentProcessed) {
      return NextResponse.json(
        { error: 'Payment processing failed' },
        { status: 400 }
      );
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update client with latest contact info
      await tx.client.update({
        where: { id: booking.clientId },
        data: {
          name,
          email,
          phone,
        },
      });

      // Create customer account if requested
      let customerUser = null;
      if (createAccount && password) {
        // Check if user with email already exists
        const existingUser = await tx.user.findUnique({
          where: { email },
        });

        if (!existingUser) {
          // Create new customer user
          const passwordHash = await bcrypt.hash(password, 10);
          customerUser = await tx.user.create({
            data: {
              email,
              passwordHash,
              name,
              phone,
              companyId: booking.companyId,
              role: 'CUSTOMER',
            },
          });

          // Link client to customer user
          await tx.client.update({
            where: { id: booking.clientId },
            data: {
              customerUserId: customerUser.id,
            },
          });
        }
      }

      // Mark estimate as accepted and payment as completed
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          estimateAccepted: true,
          estimateAcceptedAt: new Date(),
          isPaid: true,
          paidAt: new Date(),
          paymentMethod: 'card',
          status: 'SCHEDULED',
          // Store payment info in internal notes (don't store actual card details!)
          internalNotes: JSON.stringify({
            ...((booking.internalNotes as any) || {}),
            paymentProcessed: true,
            paymentDate: new Date().toISOString(),
            last4: payment.cardNumber.slice(-4),
            billingZip: payment.billingZip,
          }),
        },
      });

      return {
        booking: updatedBooking,
        customerUser,
      };
    });

    // Send booking confirmation email/SMS (async, don't await to avoid blocking)
    sendBookingConfirmation(result.booking.id).catch(error => {
      console.error('Failed to send booking confirmation:', error);
      // Don't fail the booking if confirmation fails
    });

    return NextResponse.json({
      success: true,
      data: {
        booking: result.booking,
        accountCreated: !!result.customerUser,
      },
      message: 'Booking confirmed successfully',
    });
  } catch (error) {
    console.error('POST /api/public/estimate/[token]/book error:', error);
    return NextResponse.json(
      { error: 'Failed to process booking' },
      { status: 500 }
    );
  }
}
