import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/subscriptions - List all recurring subscriptions
export async function GET(request: NextRequest) {
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

    // Only admins/owners can view all subscriptions
    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get all parent recurring bookings (where recurrenceParentId is null and isRecurring is true)
    const subscriptions = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        isRecurring: true,
        recurrenceParentId: null, // Only parent bookings
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        address: {
          select: {
            id: true,
            street: true,
            city: true,
            state: true,
            zip: true,
          },
        },
        assignee: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduledDate: 'desc',
      },
    });

    // For each subscription, get child bookings count and upcoming bookings
    const subscriptionsWithDetails = await Promise.all(
      subscriptions.map(async (subscription) => {
        // Get all child bookings
        const childBookings = await prisma.booking.findMany({
          where: {
            recurrenceParentId: subscription.id,
          },
          orderBy: {
            scheduledDate: 'asc',
          },
          select: {
            id: true,
            scheduledDate: true,
            status: true,
            isPaid: true,
          },
        });

        // Count total bookings (parent + children)
        const totalBookings = childBookings.length + 1;

        // Get upcoming bookings (scheduled or in progress)
        const now = new Date();
        const upcomingBookings = childBookings.filter(
          (b) => new Date(b.scheduledDate) >= now && b.status === 'SCHEDULED'
        );

        // Get completed bookings
        const completedBookings = childBookings.filter(
          (b) => b.status === 'COMPLETED'
        );

        // Determine subscription status
        let subscriptionStatus: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'PAUSED' = 'ACTIVE';

        if (subscription.status === 'CANCELLED') {
          subscriptionStatus = 'CANCELLED';
        } else if (
          subscription.recurrenceEndDate &&
          new Date(subscription.recurrenceEndDate) < now &&
          upcomingBookings.length === 0
        ) {
          subscriptionStatus = 'COMPLETED';
        } else if (upcomingBookings.length === 0 && childBookings.length > 0) {
          // All child bookings are in the past but not cancelled
          subscriptionStatus = 'COMPLETED';
        }

        // Calculate next booking date
        const nextBooking = upcomingBookings.length > 0 ? upcomingBookings[0] : null;

        // Calculate total revenue
        const totalRevenue = subscription.price * totalBookings;
        const paidRevenue = (
          [subscription, ...childBookings].filter((b) => b.isPaid).length *
          subscription.price
        );

        return {
          ...subscription,
          subscriptionStatus,
          totalBookings,
          completedCount: completedBookings.length,
          upcomingCount: upcomingBookings.length,
          nextBookingDate: nextBooking?.scheduledDate || null,
          totalRevenue,
          paidRevenue,
          unpaidRevenue: totalRevenue - paidRevenue,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: subscriptionsWithDetails,
    });
  } catch (error) {
    console.error('GET /api/subscriptions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}
