import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendBookingConfirmation } from '@/lib/notifications';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/public/estimate/[token]/book - Accept estimate, process payment, and create booking
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await request.json();
    const { name, email, phone, password, createAccount, payment } = body;

    // Find booking by feedback token (reusing for estimates)
    const booking = await prisma.booking.findFirst({
      where: {
        feedbackToken: params.token,
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

    // Check if already paid
    if (booking.isPaid) {
      return NextResponse.json(
        { error: 'This estimate has already been accepted' },
        { status: 400 }
      );
    }

    // TODO: Process payment with payment gateway (Stripe, etc.)
    // For now, we'll simulate successful payment
    const paymentProcessed = true; // Simulated success

    if (!paymentProcessed) {
      return NextResponse.json(
        { error: 'Payment processing failed' },
        { status: 400 }
      );
    }

    // Parse name into first/last
    const nameParts = (name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || booking.client?.firstName || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || booking.client?.lastName;

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update client with latest contact info
      if (booking.clientId) {
        await tx.client.update({
          where: { id: booking.clientId },
          data: {
            firstName,
            lastName,
            email: email || undefined,
            phone: phone || undefined,
          },
        });
      }

      // Create customer account if requested
      let customerUser = null;
      if (createAccount && password && email) {
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
              firstName,
              lastName,
              phone,
              companyId: booking.companyId,
              role: 'CLIENT',
            },
          });
        }
      }

      // Mark payment as completed
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          isPaid: true,
          paidAt: new Date(),
          paymentMethod: 'CARD',
          status: 'CONFIRMED',
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
