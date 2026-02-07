import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/bookings/[id]/approve - Admin approves completed job
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can approve jobs
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Only admins can approve jobs' },
        { status: 403 }
      );
    }

    // Verify the booking exists and is in CLEANER_COMPLETED status
    const booking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
        status: 'CLEANER_COMPLETED',
      },
      include: {
        client: {
          select: { name: true },
        },
        assignee: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        {
          error:
            'Booking not found, not in your company, or not pending approval',
        },
        { status: 404 }
      );
    }

    // Update booking status to COMPLETED (Stage 2: Fully approved)
    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        status: 'COMPLETED',
        approvedAt: new Date(),
        approvedBy: user.id,
      },
      include: {
        client: {
          select: {
            name: true,
            phone: true,
          },
        },
        address: true,
        assignee: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
        completedByUser: {
          select: { name: true, email: true },
        },
        approvedByUser: {
          select: { name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedBooking,
      message: `Job approved! Payment options are now available.`,
    });
  } catch (error) {
    console.error('🔴 POST /api/bookings/[id]/approve error:', error);

    return NextResponse.json(
      { success: false, error: 'Failed to approve job' },
      { status: 500 }
    );
  }
}
