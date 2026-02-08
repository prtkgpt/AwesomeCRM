import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST /api/bookings/[id]/apply-discount - Apply a discount code to a booking
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
    const { discountCode } = body;

    if (!discountCode || !discountCode.trim()) {
      return NextResponse.json({ error: 'Discount code is required' }, { status: 400 });
    }

    // Get the booking
    const booking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
      include: {
        client: true,
        address: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.isPaid) {
      return NextResponse.json({ error: 'Cannot apply discount to a paid booking' }, { status: 400 });
    }

    // Find the discount code
    const discount = await prisma.discountCode.findFirst({
      where: {
        companyId: user.companyId,
        code: discountCode.trim().toUpperCase(),
        isActive: true,
        validFrom: { lte: new Date() },
        validUntil: { gte: new Date() },
      },
    });

    if (!discount) {
      return NextResponse.json({ error: 'Invalid or expired discount code' }, { status: 400 });
    }

    // Check usage limit
    if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
      return NextResponse.json({ error: 'Discount code has reached its usage limit' }, { status: 400 });
    }

    // Calculate discount amount
    let discountAmount: number;
    if (discount.discountType === 'PERCENT') {
      discountAmount = (booking.price * discount.discountValue) / 100;
    } else {
      discountAmount = discount.discountValue;
    }

    // Ensure discount doesn't exceed the price
    discountAmount = Math.min(discountAmount, booking.price);

    // Calculate new price
    const newPrice = Math.max(0, booking.price - discountAmount);

    // Update the booking with discount applied (store in referralCreditsApplied for now)
    // and set finalPrice
    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        referralCreditsApplied: discountAmount,
        finalPrice: newPrice,
      },
      include: {
        client: true,
        address: true,
        assignee: {
          include: {
            user: true,
          },
        },
      },
    });

    // Increment discount usage count
    await prisma.discountCode.update({
      where: { id: discount.id },
      data: { usedCount: { increment: 1 } },
    });

    return NextResponse.json({
      success: true,
      data: updatedBooking,
      discount: {
        code: discount.code,
        type: discount.discountType,
        value: discount.discountValue,
        amountApplied: discountAmount,
        originalPrice: booking.price,
        newPrice: newPrice,
      },
    });
  } catch (error) {
    console.error('POST /api/bookings/[id]/apply-discount error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to apply discount' },
      { status: 500 }
    );
  }
}

// DELETE /api/bookings/[id]/apply-discount - Remove discount from a booking
export async function DELETE(
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

    // Get the booking
    const booking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.isPaid) {
      return NextResponse.json({ error: 'Cannot remove discount from a paid booking' }, { status: 400 });
    }

    // Remove the discount
    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        referralCreditsApplied: 0,
        finalPrice: null,
      },
      include: {
        client: true,
        address: true,
        assignee: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedBooking,
    });
  } catch (error) {
    console.error('DELETE /api/bookings/[id]/apply-discount error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove discount' },
      { status: 500 }
    );
  }
}
