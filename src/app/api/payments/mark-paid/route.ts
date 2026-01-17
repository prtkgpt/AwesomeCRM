import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { markPaidSchema } from '@/lib/validations';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/payments/mark-paid - Mark booking as paid (cash/check/zelle)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = markPaidSchema.parse(body);

    // Verify booking ownership
    const booking = await prisma.booking.findFirst({
      where: {
        id: validatedData.bookingId,
        userId: session.user.id,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Update booking as paid
    const updatedBooking = await prisma.booking.update({
      where: { id: validatedData.bookingId },
      data: {
        isPaid: true,
        paymentMethod: validatedData.paymentMethod,
        paidAt: validatedData.paidAt || new Date(),
      },
      include: {
        client: true,
        address: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedBooking,
      message: 'Booking marked as paid',
    });
  } catch (error) {
    console.error('POST /api/payments/mark-paid error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to mark booking as paid' },
      { status: 500 }
    );
  }
}
