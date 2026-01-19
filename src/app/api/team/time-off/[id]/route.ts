import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/team/time-off/[id] - Get a single time off request (admin view)
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
      select: { companyId: true, role: true },
    });

    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const timeOffRequest = await prisma.timeOffRequest.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        teamMember: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!timeOffRequest) {
      return NextResponse.json(
        { error: 'Time off request not found' },
        { status: 404 }
      );
    }

    // Get conflicting bookings details
    let conflictingBookings: any[] = [];
    if (timeOffRequest.conflictedBookingIds.length > 0) {
      conflictingBookings = await prisma.booking.findMany({
        where: {
          id: { in: timeOffRequest.conflictedBookingIds },
        },
        include: {
          client: { select: { name: true, phone: true, email: true } },
          address: { select: { street: true, city: true, state: true, zip: true } },
        },
      });
    }

    // Get reviewer info if reviewed
    let reviewedBy = null;
    if (timeOffRequest.reviewedBy) {
      reviewedBy = await prisma.user.findUnique({
        where: { id: timeOffRequest.reviewedBy },
        select: { name: true, email: true },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...timeOffRequest,
        conflictingBookings,
        reviewedByUser: reviewedBy,
      },
    });
  } catch (error) {
    console.error('GET /api/team/time-off/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch time off request' },
      { status: 500 }
    );
  }
}

// DELETE /api/team/time-off/[id] - Delete a time off request (admin only)
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
      select: { companyId: true, role: true },
    });

    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const timeOffRequest = await prisma.timeOffRequest.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    });

    if (!timeOffRequest) {
      return NextResponse.json(
        { error: 'Time off request not found' },
        { status: 404 }
      );
    }

    await prisma.timeOffRequest.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Time off request deleted successfully',
    });
  } catch (error) {
    console.error('DELETE /api/team/time-off/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete time off request' },
      { status: 500 }
    );
  }
}
