import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/cleaner/time-off/[id] - Get a single time off request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || user.role !== 'CLEANER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get team member record
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: session.user.id },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member profile not found' },
        { status: 404 }
      );
    }

    const { id } = await params;

    const timeOffRequest = await prisma.timeOffRequest.findFirst({
      where: {
        id,
        teamMemberId: teamMember.id,
        companyId: user.companyId,
      },
    });

    if (!timeOffRequest) {
      return NextResponse.json(
        { error: 'Time off request not found' },
        { status: 404 }
      );
    }

    // Get conflicting bookings details if any
    let conflictingBookings: any[] = [];
    if (timeOffRequest.conflictedBookingIds.length > 0) {
      conflictingBookings = await prisma.booking.findMany({
        where: {
          id: { in: timeOffRequest.conflictedBookingIds },
        },
        include: {
          client: { select: { name: true } },
          address: { select: { street: true, city: true } },
        },
      });
    }

    return NextResponse.json({
      success: true,
      timeOffRequest,
      conflictingBookings,
    });
  } catch (error) {
    console.error('GET /api/cleaner/time-off/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch time off request' },
      { status: 500 }
    );
  }
}

// DELETE /api/cleaner/time-off/[id] - Cancel a pending time off request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || user.role !== 'CLEANER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get team member record
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: session.user.id },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member profile not found' },
        { status: 404 }
      );
    }

    const { id } = await params;

    const timeOffRequest = await prisma.timeOffRequest.findFirst({
      where: {
        id,
        teamMemberId: teamMember.id,
        companyId: user.companyId,
      },
    });

    if (!timeOffRequest) {
      return NextResponse.json(
        { error: 'Time off request not found' },
        { status: 404 }
      );
    }

    // Can only cancel pending requests
    if (timeOffRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only cancel pending requests' },
        { status: 400 }
      );
    }

    // Update status to cancelled
    await prisma.timeOffRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({
      success: true,
      message: 'Time off request cancelled successfully',
    });
  } catch (error) {
    console.error('DELETE /api/cleaner/time-off/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel time off request' },
      { status: 500 }
    );
  }
}
