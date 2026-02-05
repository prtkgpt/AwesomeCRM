import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay, subDays, format, getHours, getDay, eachDayOfInterval } from 'date-fns';

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

    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(new Date(), days));

    // Get all bookings in the date range
    const bookings = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        scheduledDate: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        scheduledDate: true,
        status: true,
        serviceType: true,
        price: true,
        duration: true,
        isRecurring: true,
        recurrenceFrequency: true,
        isPaid: true,
        customerRating: true,
        createdAt: true,
        assignedTo: true,
      },
    });

    // Status distribution
    const statusDistribution = {
      SCHEDULED: bookings.filter((b) => b.status === 'SCHEDULED').length,
      CLEANER_COMPLETED: bookings.filter((b) => b.status === 'CLEANER_COMPLETED').length,
      COMPLETED: bookings.filter((b) => b.status === 'COMPLETED').length,
      CANCELLED: bookings.filter((b) => b.status === 'CANCELLED').length,
      NO_SHOW: bookings.filter((b) => b.status === 'NO_SHOW').length,
    };

    // Service type distribution
    const serviceTypeDistribution = {
      STANDARD: bookings.filter((b) => b.serviceType === 'STANDARD').length,
      DEEP: bookings.filter((b) => b.serviceType === 'DEEP').length,
      MOVE_OUT: bookings.filter((b) => b.serviceType === 'MOVE_OUT').length,
    };

    // Booking heatmap (day of week x hour)
    const heatmap: Record<string, Record<string, number>> = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    dayNames.forEach((day) => {
      heatmap[day] = {};
      for (let hour = 6; hour <= 20; hour++) {
        heatmap[day][`${hour}:00`] = 0;
      }
    });

    bookings.forEach((booking) => {
      const date = new Date(booking.scheduledDate);
      const dayName = dayNames[getDay(date)];
      const hour = getHours(date);
      if (hour >= 6 && hour <= 20) {
        heatmap[dayName][`${hour}:00`]++;
      }
    });

    // Convert heatmap to array format for easier visualization
    const heatmapArray = dayNames.map((day) => ({
      day,
      hours: Object.entries(heatmap[day]).map(([hour, count]) => ({
        hour,
        count,
      })),
    }));

    // Daily booking counts
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
    const bookingsByDay = dateRange.map((date) => {
      const dayBookings = bookings.filter(
        (b) =>
          format(new Date(b.scheduledDate), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      return {
        date: format(date, 'yyyy-MM-dd'),
        label: format(date, 'MMM d'),
        total: dayBookings.length,
        completed: dayBookings.filter((b) =>
          ['COMPLETED', 'CLEANER_COMPLETED'].includes(b.status)
        ).length,
        cancelled: dayBookings.filter((b) => b.status === 'CANCELLED').length,
        revenue: dayBookings
          .filter((b) => ['COMPLETED', 'CLEANER_COMPLETED'].includes(b.status))
          .reduce((sum, b) => sum + b.price, 0),
      };
    });

    // Recurring vs one-time
    const recurringStats = {
      oneTime: bookings.filter((b) => !b.isRecurring).length,
      recurring: bookings.filter((b) => b.isRecurring).length,
      byFrequency: {
        WEEKLY: bookings.filter((b) => b.recurrenceFrequency === 'WEEKLY').length,
        BIWEEKLY: bookings.filter((b) => b.recurrenceFrequency === 'BIWEEKLY').length,
        MONTHLY: bookings.filter((b) => b.recurrenceFrequency === 'MONTHLY').length,
      },
    };

    // Assignment stats
    const assignedBookings = bookings.filter((b) => b.assignedTo).length;
    const unassignedBookings = bookings.filter((b) => !b.assignedTo).length;

    // Lead time analysis (time between creation and scheduled date)
    const leadTimes = bookings.map((b) => {
      const created = new Date(b.createdAt);
      const scheduled = new Date(b.scheduledDate);
      return Math.max(0, Math.floor((scheduled.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
    });
    const averageLeadTime = leadTimes.length > 0
      ? Math.round(leadTimes.reduce((sum, lt) => sum + lt, 0) / leadTimes.length)
      : 0;

    // Lead time distribution
    const leadTimeDistribution = {
      sameDay: leadTimes.filter((lt) => lt === 0).length,
      '1to3days': leadTimes.filter((lt) => lt >= 1 && lt <= 3).length,
      '4to7days': leadTimes.filter((lt) => lt >= 4 && lt <= 7).length,
      '1to2weeks': leadTimes.filter((lt) => lt >= 8 && lt <= 14).length,
      '2to4weeks': leadTimes.filter((lt) => lt >= 15 && lt <= 28).length,
      over4weeks: leadTimes.filter((lt) => lt > 28).length,
    };

    // Average duration by service type
    const averageDuration = {
      STANDARD:
        Math.round(
          bookings
            .filter((b) => b.serviceType === 'STANDARD')
            .reduce((sum, b) => sum + b.duration, 0) /
            Math.max(1, bookings.filter((b) => b.serviceType === 'STANDARD').length)
        ),
      DEEP:
        Math.round(
          bookings
            .filter((b) => b.serviceType === 'DEEP')
            .reduce((sum, b) => sum + b.duration, 0) /
            Math.max(1, bookings.filter((b) => b.serviceType === 'DEEP').length)
        ),
      MOVE_OUT:
        Math.round(
          bookings
            .filter((b) => b.serviceType === 'MOVE_OUT')
            .reduce((sum, b) => sum + b.duration, 0) /
            Math.max(1, bookings.filter((b) => b.serviceType === 'MOVE_OUT').length)
        ),
    };

    // Summary metrics
    const completedBookings = bookings.filter((b) =>
      ['COMPLETED', 'CLEANER_COMPLETED'].includes(b.status)
    );
    const summary = {
      totalBookings: bookings.length,
      completedBookings: completedBookings.length,
      cancelledBookings: statusDistribution.CANCELLED,
      noShowBookings: statusDistribution.NO_SHOW,
      completionRate:
        bookings.length > 0
          ? Math.round((completedBookings.length / bookings.length) * 100)
          : 0,
      cancellationRate:
        bookings.length > 0
          ? Math.round((statusDistribution.CANCELLED / bookings.length) * 100)
          : 0,
      noShowRate:
        bookings.length > 0
          ? Math.round((statusDistribution.NO_SHOW / bookings.length) * 100)
          : 0,
      averageLeadTime,
      assignedRate:
        bookings.length > 0 ? Math.round((assignedBookings / bookings.length) * 100) : 0,
      recurringRate:
        bookings.length > 0
          ? Math.round((recurringStats.recurring / bookings.length) * 100)
          : 0,
    };

    // Peak times
    const hourCounts: Record<number, number> = {};
    bookings.forEach((b) => {
      const hour = getHours(new Date(b.scheduledDate));
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    const peakDay = dayNames.find(
      (day) =>
        Object.values(heatmap[day]).reduce((sum, count) => sum + count, 0) ===
        Math.max(
          ...dayNames.map((d) =>
            Object.values(heatmap[d]).reduce((sum, count) => sum + count, 0)
          )
        )
    );

    return NextResponse.json({
      period: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
        days,
      },
      summary,
      statusDistribution,
      serviceTypeDistribution,
      recurringStats,
      leadTimeDistribution,
      averageDuration,
      peakTimes: {
        peakHour: peakHour ? `${peakHour[0]}:00` : null,
        peakDay,
      },
      assignmentStats: {
        assigned: assignedBookings,
        unassigned: unassignedBookings,
      },
      bookingsByDay,
      heatmap: heatmapArray,
    });
  } catch (error) {
    console.error('Booking analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
