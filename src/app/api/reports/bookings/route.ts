// ============================================
// CleanDayCRM - Booking Reports API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  differenceInMinutes,
} from 'date-fns';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

type GroupBy = 'day' | 'week' | 'month';

interface BookingStatsDataPoint {
  period: string;
  periodStart: Date;
  periodEnd: Date;
  total: number;
  completed: number;
  cancelled: number;
  pending: number;
  inProgress: number;
  completionRate: number;
  cancellationRate: number;
}

// GET /api/reports/bookings - Get booking stats, completion rates, cancellation rates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user with companyId and verify role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only OWNER and ADMIN can access booking reports
    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Owner/Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const groupBy = (searchParams.get('groupBy') || 'day') as GroupBy;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const serviceType = searchParams.get('serviceType');
    const cleanerId = searchParams.get('cleanerId');
    const period = searchParams.get('period');

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    // Determine date range
    if (startDateParam && endDateParam) {
      startDate = startOfDay(new Date(startDateParam));
      endDate = endOfDay(new Date(endDateParam));
    } else {
      switch (period) {
        case 'week':
          startDate = startOfWeek(now);
          endDate = endOfWeek(now);
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'year':
          startDate = startOfYear(now);
          endDate = endOfYear(now);
          break;
        default:
          // Default: Last 30 days
          startDate = startOfDay(subDays(now, 30));
          endDate = endOfDay(now);
      }
    }

    // Build where clause
    const whereClause: any = {
      companyId: user.companyId,
      scheduledDate: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (serviceType) {
      whereClause.serviceType = serviceType;
    }

    if (cleanerId) {
      whereClause.assignedCleanerId = cleanerId;
    }

    // Fetch all bookings in the date range
    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        assignedCleaner: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    // Calculate overall stats
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter((b) => b.status === 'COMPLETED').length;
    const cancelledBookings = bookings.filter((b) => b.status === 'CANCELLED').length;
    const pendingBookings = bookings.filter((b) => b.status === 'PENDING').length;
    const confirmedBookings = bookings.filter((b) => b.status === 'CONFIRMED').length;
    const inProgressBookings = bookings.filter((b) => b.status === 'IN_PROGRESS').length;
    const noShowBookings = bookings.filter((b) => b.status === 'NO_SHOW').length;
    const rescheduledBookings = bookings.filter((b) => b.status === 'RESCHEDULED').length;

    const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
    const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;
    const noShowRate = totalBookings > 0 ? (noShowBookings / totalBookings) * 100 : 0;

    // Calculate average duration (for completed bookings with actual duration)
    const completedWithDuration = bookings.filter((b) => b.status === 'COMPLETED' && b.actualDuration);
    const avgActualDuration = completedWithDuration.length > 0
      ? completedWithDuration.reduce((sum, b) => sum + (b.actualDuration || 0), 0) / completedWithDuration.length
      : 0;

    const avgScheduledDuration = completedBookings > 0
      ? bookings.filter((b) => b.status === 'COMPLETED').reduce((sum, b) => sum + b.duration, 0) / completedBookings
      : 0;

    // Stats by period
    const statsByPeriod: BookingStatsDataPoint[] = [];

    const getPeriodStats = (periodBookings: typeof bookings, periodLabel: string, pStart: Date, pEnd: Date) => {
      const total = periodBookings.length;
      const completed = periodBookings.filter((b) => b.status === 'COMPLETED').length;
      const cancelled = periodBookings.filter((b) => b.status === 'CANCELLED').length;
      const pending = periodBookings.filter((b) => ['PENDING', 'CONFIRMED'].includes(b.status)).length;
      const inProgress = periodBookings.filter((b) => ['IN_PROGRESS', 'CLEANER_EN_ROUTE', 'CLEANER_COMPLETED'].includes(b.status)).length;

      return {
        period: periodLabel,
        periodStart: pStart,
        periodEnd: pEnd,
        total,
        completed,
        cancelled,
        pending,
        inProgress,
        completionRate: total > 0 ? (completed / total) * 100 : 0,
        cancellationRate: total > 0 ? (cancelled / total) * 100 : 0,
      };
    };

    if (groupBy === 'day') {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      days.forEach((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        const dayBookings = bookings.filter((b) => {
          const bookingDate = new Date(b.scheduledDate);
          return bookingDate >= dayStart && bookingDate <= dayEnd;
        });
        statsByPeriod.push(getPeriodStats(dayBookings, format(day, 'yyyy-MM-dd'), dayStart, dayEnd));
      });
    } else if (groupBy === 'week') {
      const weeks = eachWeekOfInterval({ start: startDate, end: endDate });
      weeks.forEach((week) => {
        const weekStart = startOfWeek(week);
        const weekEnd = endOfWeek(week);
        const weekBookings = bookings.filter((b) => {
          const bookingDate = new Date(b.scheduledDate);
          return bookingDate >= weekStart && bookingDate <= weekEnd;
        });
        statsByPeriod.push(getPeriodStats(weekBookings, `Week of ${format(weekStart, 'MMM d, yyyy')}`, weekStart, weekEnd));
      });
    } else if (groupBy === 'month') {
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      months.forEach((month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthBookings = bookings.filter((b) => {
          const bookingDate = new Date(b.scheduledDate);
          return bookingDate >= monthStart && bookingDate <= monthEnd;
        });
        statsByPeriod.push(getPeriodStats(monthBookings, format(month, 'MMMM yyyy'), monthStart, monthEnd));
      });
    }

    // Stats by service type
    const byServiceType = bookings.reduce((acc: Record<string, {
      total: number;
      completed: number;
      cancelled: number;
    }>, booking) => {
      const type = booking.serviceType;
      if (!acc[type]) {
        acc[type] = { total: 0, completed: 0, cancelled: 0 };
      }
      acc[type].total += 1;
      if (booking.status === 'COMPLETED') acc[type].completed += 1;
      if (booking.status === 'CANCELLED') acc[type].cancelled += 1;
      return acc;
    }, {});

    const serviceTypeStats = Object.entries(byServiceType)
      .map(([type, data]) => ({
        serviceType: type,
        total: data.total,
        completed: data.completed,
        cancelled: data.cancelled,
        completionRate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
        cancellationRate: data.total > 0 ? (data.cancelled / data.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Stats by cleaner
    const byCleaner = bookings.reduce((acc: Record<string, {
      id: string;
      name: string;
      total: number;
      completed: number;
      cancelled: number;
      totalDuration: number;
      totalActualDuration: number;
    }>, booking) => {
      if (!booking.assignedCleaner) return acc;

      const cId = booking.assignedCleaner.id;
      const cName = booking.assignedCleaner.user
        ? `${booking.assignedCleaner.user.firstName || ''} ${booking.assignedCleaner.user.lastName || ''}`.trim() || 'Unknown'
        : 'Unknown';

      if (!acc[cId]) {
        acc[cId] = {
          id: cId,
          name: cName,
          total: 0,
          completed: 0,
          cancelled: 0,
          totalDuration: 0,
          totalActualDuration: 0,
        };
      }
      acc[cId].total += 1;
      if (booking.status === 'COMPLETED') {
        acc[cId].completed += 1;
        acc[cId].totalDuration += booking.duration;
        acc[cId].totalActualDuration += booking.actualDuration || booking.duration;
      }
      if (booking.status === 'CANCELLED') acc[cId].cancelled += 1;
      return acc;
    }, {});

    const cleanerStats = Object.values(byCleaner)
      .map((cleaner) => ({
        ...cleaner,
        completionRate: cleaner.total > 0 ? (cleaner.completed / cleaner.total) * 100 : 0,
        cancellationRate: cleaner.total > 0 ? (cleaner.cancelled / cleaner.total) * 100 : 0,
        avgDuration: cleaner.completed > 0 ? cleaner.totalDuration / cleaner.completed : 0,
        avgActualDuration: cleaner.completed > 0 ? cleaner.totalActualDuration / cleaner.completed : 0,
        efficiency: cleaner.totalDuration > 0
          ? (cleaner.totalDuration / cleaner.totalActualDuration) * 100
          : 100,
      }))
      .sort((a, b) => b.total - a.total);

    // Status breakdown
    const statusBreakdown = {
      pending: pendingBookings,
      confirmed: confirmedBookings,
      inProgress: inProgressBookings,
      completed: completedBookings,
      cancelled: cancelledBookings,
      noShow: noShowBookings,
      rescheduled: rescheduledBookings,
    };

    // Time slot distribution
    const timeSlotDistribution = bookings.reduce((acc: Record<string, number>, booking) => {
      const slot = booking.timeSlot || 'UNSPECIFIED';
      acc[slot] = (acc[slot] || 0) + 1;
      return acc;
    }, {});

    // Day of week distribution
    const dayOfWeekDistribution = bookings.reduce((acc: Record<string, number>, booking) => {
      const dayName = format(new Date(booking.scheduledDate), 'EEEE');
      acc[dayName] = (acc[dayName] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalBookings,
          completedBookings,
          cancelledBookings,
          pendingBookings: pendingBookings + confirmedBookings,
          inProgressBookings,
          completionRate: parseFloat(completionRate.toFixed(2)),
          cancellationRate: parseFloat(cancellationRate.toFixed(2)),
          noShowRate: parseFloat(noShowRate.toFixed(2)),
          avgScheduledDuration: Math.round(avgScheduledDuration),
          avgActualDuration: Math.round(avgActualDuration),
        },
        statusBreakdown,
        statsByPeriod,
        statsByServiceType: serviceTypeStats,
        statsByCleaner: cleanerStats,
        timeSlotDistribution,
        dayOfWeekDistribution,
        filters: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          groupBy,
          serviceType: serviceType || null,
          cleanerId: cleanerId || null,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/reports/bookings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch booking reports' },
      { status: 500 }
    );
  }
}
