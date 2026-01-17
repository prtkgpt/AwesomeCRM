// ============================================
// CleanDayCRM - Revenue Reports API
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
} from 'date-fns';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

type GroupBy = 'day' | 'week' | 'month' | 'year';

interface RevenueDataPoint {
  period: string;
  periodStart: Date;
  periodEnd: Date;
  revenue: number;
  bookings: number;
  avgBookingValue: number;
}

// GET /api/reports/revenue - Get revenue reports with various groupings
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

    // Only OWNER and ADMIN can access revenue reports
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
    const period = searchParams.get('period'); // week, month, year, custom

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
      status: 'COMPLETED',
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

    // Fetch all completed bookings in the date range
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

    // Calculate total revenue
    const totalRevenue = bookings.reduce((sum, b) => sum + b.finalPrice, 0);
    const totalBookings = bookings.length;
    const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Revenue by period (grouped)
    const revenueByPeriod: RevenueDataPoint[] = [];

    if (groupBy === 'day') {
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      days.forEach((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        const dayBookings = bookings.filter((b) => {
          const bookingDate = new Date(b.scheduledDate);
          return bookingDate >= dayStart && bookingDate <= dayEnd;
        });
        const revenue = dayBookings.reduce((sum, b) => sum + b.finalPrice, 0);
        revenueByPeriod.push({
          period: format(day, 'yyyy-MM-dd'),
          periodStart: dayStart,
          periodEnd: dayEnd,
          revenue,
          bookings: dayBookings.length,
          avgBookingValue: dayBookings.length > 0 ? revenue / dayBookings.length : 0,
        });
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
        const revenue = weekBookings.reduce((sum, b) => sum + b.finalPrice, 0);
        revenueByPeriod.push({
          period: `Week of ${format(weekStart, 'MMM d, yyyy')}`,
          periodStart: weekStart,
          periodEnd: weekEnd,
          revenue,
          bookings: weekBookings.length,
          avgBookingValue: weekBookings.length > 0 ? revenue / weekBookings.length : 0,
        });
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
        const revenue = monthBookings.reduce((sum, b) => sum + b.finalPrice, 0);
        revenueByPeriod.push({
          period: format(month, 'MMMM yyyy'),
          periodStart: monthStart,
          periodEnd: monthEnd,
          revenue,
          bookings: monthBookings.length,
          avgBookingValue: monthBookings.length > 0 ? revenue / monthBookings.length : 0,
        });
      });
    } else if (groupBy === 'year') {
      // Group by year - get unique years from bookings
      const years = new Set(bookings.map((b) => new Date(b.scheduledDate).getFullYear()));
      Array.from(years).sort().forEach((year) => {
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59);
        const yearBookings = bookings.filter((b) => {
          return new Date(b.scheduledDate).getFullYear() === year;
        });
        const revenue = yearBookings.reduce((sum, b) => sum + b.finalPrice, 0);
        revenueByPeriod.push({
          period: year.toString(),
          periodStart: yearStart,
          periodEnd: yearEnd,
          revenue,
          bookings: yearBookings.length,
          avgBookingValue: yearBookings.length > 0 ? revenue / yearBookings.length : 0,
        });
      });
    }

    // Revenue by service type
    const revenueByServiceType = bookings.reduce((acc: Record<string, { revenue: number; count: number }>, booking) => {
      const type = booking.serviceType;
      if (!acc[type]) {
        acc[type] = { revenue: 0, count: 0 };
      }
      acc[type].revenue += booking.finalPrice;
      acc[type].count += 1;
      return acc;
    }, {});

    const serviceTypeStats = Object.entries(revenueByServiceType)
      .map(([type, data]) => ({
        serviceType: type,
        revenue: data.revenue,
        bookings: data.count,
        avgBookingValue: data.revenue / data.count,
        percentOfTotal: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Revenue by cleaner
    const revenueByCleaner = bookings.reduce((acc: Record<string, {
      id: string;
      name: string;
      revenue: number;
      count: number;
    }>, booking) => {
      if (!booking.assignedCleaner) return acc;

      const cleanerId = booking.assignedCleaner.id;
      const cleanerName = booking.assignedCleaner.user
        ? `${booking.assignedCleaner.user.firstName || ''} ${booking.assignedCleaner.user.lastName || ''}`.trim() || 'Unknown'
        : 'Unknown';

      if (!acc[cleanerId]) {
        acc[cleanerId] = {
          id: cleanerId,
          name: cleanerName,
          revenue: 0,
          count: 0,
        };
      }
      acc[cleanerId].revenue += booking.finalPrice;
      acc[cleanerId].count += 1;
      return acc;
    }, {});

    const cleanerStats = Object.values(revenueByCleaner)
      .map((cleaner) => ({
        ...cleaner,
        avgBookingValue: cleaner.revenue / cleaner.count,
        percentOfTotal: totalRevenue > 0 ? (cleaner.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Compare to previous period
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevStartDate = subDays(startDate, periodDays);
    const prevEndDate = subDays(endDate, periodDays);

    const prevWhereClause: any = {
      companyId: user.companyId,
      status: 'COMPLETED',
      scheduledDate: {
        gte: prevStartDate,
        lte: prevEndDate,
      },
    };

    if (serviceType) {
      prevWhereClause.serviceType = serviceType;
    }

    if (cleanerId) {
      prevWhereClause.assignedCleanerId = cleanerId;
    }

    const prevPeriodBookings = await prisma.booking.findMany({
      where: prevWhereClause,
      select: {
        finalPrice: true,
      },
    });

    const prevTotalRevenue = prevPeriodBookings.reduce((sum, b) => sum + b.finalPrice, 0);
    const prevTotalBookings = prevPeriodBookings.length;

    const revenueGrowth = prevTotalRevenue > 0
      ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100
      : totalRevenue > 0 ? 100 : 0;

    const bookingsGrowth = prevTotalBookings > 0
      ? ((totalBookings - prevTotalBookings) / prevTotalBookings) * 100
      : totalBookings > 0 ? 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalBookings,
          avgBookingValue,
          revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
          bookingsGrowth: parseFloat(bookingsGrowth.toFixed(2)),
          previousPeriodRevenue: prevTotalRevenue,
          previousPeriodBookings: prevTotalBookings,
        },
        revenueByPeriod,
        revenueByServiceType: serviceTypeStats,
        revenueByCleaner: cleanerStats,
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
    console.error('GET /api/reports/revenue error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch revenue reports' },
      { status: 500 }
    );
  }
}
