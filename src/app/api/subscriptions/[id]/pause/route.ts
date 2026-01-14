import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/subscriptions/[id]/pause - Pause a subscription
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only admins/owners can pause subscriptions
    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get the subscription (parent booking)
    const subscription = await prisma.booking.findFirst({
      where: {
        id: params.id,
        companyId: user.companyId,
        isRecurring: true,
        recurrenceParentId: null,
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Get all future child bookings (scheduled status only)
    const now = new Date();
    const futureBookings = await prisma.booking.findMany({
      where: {
        recurrenceParentId: subscription.id,
        scheduledDate: {
          gte: now,
        },
        status: 'SCHEDULED', // Only pause scheduled bookings
      },
    });

    // Cancel all future scheduled bookings
    if (futureBookings.length > 0) {
      await prisma.booking.updateMany({
        where: {
          id: {
            in: futureBookings.map((b) => b.id),
          },
        },
        data: {
          status: 'CANCELLED',
          internalNotes: `Subscription paused on ${new Date().toISOString()}`,
        },
      });
    }

    // Update parent booking to mark as paused (using internalNotes as status flag)
    await prisma.booking.update({
      where: { id: subscription.id },
      data: {
        internalNotes: `[PAUSED] Subscription paused on ${new Date().toISOString()}. Original notes: ${subscription.internalNotes || ''}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Subscription paused. ${futureBookings.length} future bookings cancelled.`,
      cancelledBookings: futureBookings.length,
    });
  } catch (error) {
    console.error('POST /api/subscriptions/[id]/pause error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to pause subscription' },
      { status: 500 }
    );
  }
}
