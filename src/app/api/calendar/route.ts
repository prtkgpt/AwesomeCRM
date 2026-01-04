import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDayBoundaries, getWeekBoundaries, doTimeSlotsOverlap } from '@/lib/utils';

// GET /api/calendar - Get calendar view with bookings and conflicts
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const view = searchParams.get('view') || 'day';

    const date = dateParam ? new Date(dateParam) : new Date();

    // Get date range based on view
    const boundaries =
      view === 'week' ? getWeekBoundaries(date) : getDayBoundaries(date);

    // Fetch bookings for the date range
    const bookings = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        scheduledDate: {
          gte: boundaries.start,
          lte: boundaries.end,
        },
      },
      include: {
        client: true,
        address: true,
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    // Detect conflicts (overlapping bookings)
    const conflicts: { bookingId: string; overlaps: string[] }[] = [];

    for (let i = 0; i < bookings.length; i++) {
      const booking1 = bookings[i];
      const overlappingIds: string[] = [];

      for (let j = i + 1; j < bookings.length; j++) {
        const booking2 = bookings[j];

        if (
          doTimeSlotsOverlap(
            booking1.scheduledDate,
            booking1.duration,
            booking2.scheduledDate,
            booking2.duration
          )
        ) {
          overlappingIds.push(booking2.id);
        }
      }

      if (overlappingIds.length > 0) {
        conflicts.push({
          bookingId: booking1.id,
          overlaps: overlappingIds,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        bookings,
        conflicts,
        view,
        date: date.toISOString(),
        range: {
          start: boundaries.start.toISOString(),
          end: boundaries.end.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('GET /api/calendar error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}
