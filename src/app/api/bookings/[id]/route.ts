import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updateBookingSchema } from '@/lib/validations';

// GET /api/bookings/[id] - Get booking details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
      include: {
        client: true,
        address: true,
        messages: {
          orderBy: {
            createdAt: 'desc',
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

    return NextResponse.json({ success: true, data: booking });
  } catch (error) {
    console.error('GET /api/bookings/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

// PUT /api/bookings/[id] - Update booking
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateBookingSchema.parse(body);

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify ownership
    const existingBooking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Update booking
    const booking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        ...(validatedData.clientId && { clientId: validatedData.clientId }),
        ...(validatedData.addressId && { addressId: validatedData.addressId }),
        ...(validatedData.scheduledDate && { scheduledDate: validatedData.scheduledDate }),
        ...(validatedData.duration && { duration: validatedData.duration }),
        ...(validatedData.serviceType && { serviceType: validatedData.serviceType }),
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.price !== undefined && { price: validatedData.price }),
        ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
        ...(validatedData.internalNotes !== undefined && { internalNotes: validatedData.internalNotes }),
        ...(validatedData.isPaid !== undefined && { isPaid: validatedData.isPaid }),
        ...(validatedData.paymentMethod && { paymentMethod: validatedData.paymentMethod }),
      },
      include: {
        client: true,
        address: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Booking updated successfully',
    });
  } catch (error) {
    console.error('PUT /api/bookings/[id] error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid input data' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update booking' },
      { status: 500 }
    );
  }
}

// DELETE /api/bookings/[id] - Delete booking
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existingBooking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Delete booking
    await prisma.booking.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Booking deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/bookings/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete booking' },
      { status: 500 }
    );
  }
}
