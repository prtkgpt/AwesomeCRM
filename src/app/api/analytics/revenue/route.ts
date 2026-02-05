import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, startOfMonth } from 'date-fns';

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
    const groupBy = searchParams.get('groupBy') || 'day'; // day, week, month

    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(new Date(), days));

    // Get all paid bookings in the date range
    const bookings = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        scheduledDate: { gte: startDate, lte: endDate },
        status: { in: ['COMPLETED', 'CLEANER_COMPLETED'] },
      },
      select: {
        id: true,
        scheduledDate: true,
        price: true,
        isPaid: true,
        serviceType: true,
        tipAmount: true,
        referralCreditsApplied: true,
      },
    });

    // Generate date intervals based on groupBy
    let intervals: Date[];
    switch (groupBy) {
      case 'week':
        intervals = eachWeekOfInterval({ start: startDate, end: endDate });
        break;
      case 'month':
        intervals = eachMonthOfInterval({ start: startDate, end: endDate });
        break;
      default:
        intervals = eachDayOfInterval({ start: startDate, end: endDate });
    }

    // Group bookings by interval
    const revenueByPeriod = intervals.map((intervalStart) => {
      let intervalEnd: Date;
      let label: string;

      switch (groupBy) {
        case 'week':
          intervalEnd = subDays(startOfWeek(subDays(intervalStart, -7)), 1);
          label = `Week of ${format(intervalStart, 'MMM d')}`;
          break;
        case 'month':
          intervalEnd = subDays(startOfMonth(subDays(intervalStart, -32)), 1);
          label = format(intervalStart, 'MMM yyyy');
          break;
        default:
          intervalEnd = endOfDay(intervalStart);
          label = format(intervalStart, 'MMM d');
      }

      const periodBookings = bookings.filter((b) => {
        const bookingDate = new Date(b.scheduledDate);
        return bookingDate >= intervalStart && bookingDate <= intervalEnd;
      });

      const paidRevenue = periodBookings
        .filter((b) => b.isPaid)
        .reduce((sum, b) => sum + b.price, 0);

      const unpaidRevenue = periodBookings
        .filter((b) => !b.isPaid)
        .reduce((sum, b) => sum + b.price, 0);

      const tips = periodBookings.reduce((sum, b) => sum + (b.tipAmount || 0), 0);
      const creditsUsed = periodBookings.reduce((sum, b) => sum + (b.referralCreditsApplied || 0), 0);

      return {
        date: format(intervalStart, 'yyyy-MM-dd'),
        label,
        paidRevenue,
        unpaidRevenue,
        totalRevenue: paidRevenue + unpaidRevenue,
        tips,
        creditsUsed,
        bookingCount: periodBookings.length,
      };
    });

    // Revenue by service type
    const revenueByServiceType = {
      STANDARD: bookings.filter((b) => b.serviceType === 'STANDARD').reduce((sum, b) => sum + b.price, 0),
      DEEP: bookings.filter((b) => b.serviceType === 'DEEP').reduce((sum, b) => sum + b.price, 0),
      MOVE_OUT: bookings.filter((b) => b.serviceType === 'MOVE_OUT').reduce((sum, b) => sum + b.price, 0),
    };

    // Summary statistics
    const totalRevenue = bookings.reduce((sum, b) => sum + b.price, 0);
    const paidRevenue = bookings.filter((b) => b.isPaid).reduce((sum, b) => sum + b.price, 0);
    const unpaidRevenue = bookings.filter((b) => !b.isPaid).reduce((sum, b) => sum + b.price, 0);
    const totalTips = bookings.reduce((sum, b) => sum + (b.tipAmount || 0), 0);
    const totalCreditsUsed = bookings.reduce((sum, b) => sum + (b.referralCreditsApplied || 0), 0);
    const averageBookingValue = bookings.length > 0 ? totalRevenue / bookings.length : 0;

    // Calculate trends
    const midpoint = Math.floor(revenueByPeriod.length / 2);
    const firstHalf = revenueByPeriod.slice(0, midpoint);
    const secondHalf = revenueByPeriod.slice(midpoint);

    const firstHalfTotal = firstHalf.reduce((sum, p) => sum + p.totalRevenue, 0);
    const secondHalfTotal = secondHalf.reduce((sum, p) => sum + p.totalRevenue, 0);
    const trend = firstHalfTotal > 0 ? Math.round(((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100) : 0;

    return NextResponse.json({
      period: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
        days,
        groupBy,
      },
      summary: {
        totalRevenue,
        paidRevenue,
        unpaidRevenue,
        totalTips,
        totalCreditsUsed,
        averageBookingValue,
        totalBookings: bookings.length,
        collectionRate: totalRevenue > 0 ? Math.round((paidRevenue / totalRevenue) * 100) : 0,
        trend,
      },
      revenueByPeriod,
      revenueByServiceType,
    });
  } catch (error) {
    console.error('Revenue analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
