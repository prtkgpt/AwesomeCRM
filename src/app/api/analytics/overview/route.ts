import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, startOfYear, subDays, subMonths, format } from 'date-fns';

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
    const period = searchParams.get('period') || 'month'; // day, week, month, year
    const compareWithPrevious = searchParams.get('compare') === 'true';

    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (period) {
      case 'day':
        startDate = startOfDay(now);
        previousStartDate = startOfDay(subDays(now, 1));
        previousEndDate = endOfDay(subDays(now, 1));
        break;
      case 'week':
        startDate = startOfWeek(now);
        previousStartDate = startOfWeek(subDays(now, 7));
        previousEndDate = subDays(startDate, 1);
        break;
      case 'year':
        startDate = startOfYear(now);
        previousStartDate = startOfYear(subMonths(now, 12));
        previousEndDate = subDays(startDate, 1);
        break;
      case 'month':
      default:
        startDate = startOfMonth(now);
        previousStartDate = startOfMonth(subMonths(now, 1));
        previousEndDate = subDays(startDate, 1);
        break;
    }

    // Current period metrics
    const [
      bookings,
      completedBookings,
      cancelledBookings,
      clients,
      newClients,
      teamMembers,
      revenue,
      unpaidRevenue,
      averageRating,
      tips,
    ] = await Promise.all([
      // Total bookings in period
      prisma.booking.count({
        where: {
          companyId: user.companyId,
          scheduledDate: { gte: startDate },
        },
      }),
      // Completed bookings
      prisma.booking.count({
        where: {
          companyId: user.companyId,
          status: 'COMPLETED',
          scheduledDate: { gte: startDate },
        },
      }),
      // Cancelled bookings
      prisma.booking.count({
        where: {
          companyId: user.companyId,
          status: 'CANCELLED',
          scheduledDate: { gte: startDate },
        },
      }),
      // Total active clients
      prisma.client.count({
        where: { companyId: user.companyId },
      }),
      // New clients in period
      prisma.client.count({
        where: {
          companyId: user.companyId,
          createdAt: { gte: startDate },
        },
      }),
      // Active team members
      prisma.teamMember.count({
        where: {
          companyId: user.companyId,
          isActive: true,
        },
      }),
      // Total revenue (paid bookings)
      prisma.booking.aggregate({
        where: {
          companyId: user.companyId,
          isPaid: true,
          scheduledDate: { gte: startDate },
        },
        _sum: { price: true },
      }),
      // Unpaid revenue
      prisma.booking.aggregate({
        where: {
          companyId: user.companyId,
          isPaid: false,
          status: { in: ['COMPLETED', 'CLEANER_COMPLETED'] },
          scheduledDate: { gte: startDate },
        },
        _sum: { price: true },
      }),
      // Average customer rating
      prisma.booking.aggregate({
        where: {
          companyId: user.companyId,
          customerRating: { not: null },
          scheduledDate: { gte: startDate },
        },
        _avg: { customerRating: true },
      }),
      // Total tips
      prisma.booking.aggregate({
        where: {
          companyId: user.companyId,
          tipAmount: { not: null },
          scheduledDate: { gte: startDate },
        },
        _sum: { tipAmount: true },
      }),
    ]);

    // Previous period metrics for comparison
    let previousMetrics = null;
    if (compareWithPrevious) {
      const [prevBookings, prevRevenue, prevClients] = await Promise.all([
        prisma.booking.count({
          where: {
            companyId: user.companyId,
            scheduledDate: { gte: previousStartDate, lte: previousEndDate },
          },
        }),
        prisma.booking.aggregate({
          where: {
            companyId: user.companyId,
            isPaid: true,
            scheduledDate: { gte: previousStartDate, lte: previousEndDate },
          },
          _sum: { price: true },
        }),
        prisma.client.count({
          where: {
            companyId: user.companyId,
            createdAt: { gte: previousStartDate, lte: previousEndDate },
          },
        }),
      ]);

      previousMetrics = {
        bookings: prevBookings,
        revenue: prevRevenue._sum.price || 0,
        newClients: prevClients,
      };
    }

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const totalRevenue = revenue._sum.price || 0;
    const totalUnpaidRevenue = unpaidRevenue._sum.price || 0;
    const avgBookingValue = completedBookings > 0 ? totalRevenue / completedBookings : 0;

    const overview = {
      period,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(now, 'yyyy-MM-dd'),
      kpis: {
        totalRevenue: {
          value: totalRevenue,
          change: previousMetrics ? calculateChange(totalRevenue, previousMetrics.revenue) : null,
          formatted: `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        },
        unpaidRevenue: {
          value: totalUnpaidRevenue,
          formatted: `$${totalUnpaidRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        },
        averageBookingValue: {
          value: avgBookingValue,
          formatted: `$${avgBookingValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        },
        totalBookings: {
          value: bookings,
          change: previousMetrics ? calculateChange(bookings, previousMetrics.bookings) : null,
        },
        completedBookings: {
          value: completedBookings,
          completionRate: bookings > 0 ? Math.round((completedBookings / bookings) * 100) : 0,
        },
        cancelledBookings: {
          value: cancelledBookings,
          cancellationRate: bookings > 0 ? Math.round((cancelledBookings / bookings) * 100) : 0,
        },
        totalClients: {
          value: clients,
        },
        newClients: {
          value: newClients,
          change: previousMetrics ? calculateChange(newClients, previousMetrics.newClients) : null,
        },
        activeTeamMembers: {
          value: teamMembers,
        },
        averageRating: {
          value: averageRating._avg.customerRating || 0,
          formatted: (averageRating._avg.customerRating || 0).toFixed(1),
        },
        totalTips: {
          value: tips._sum.tipAmount || 0,
          formatted: `$${(tips._sum.tipAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        },
      },
      previousPeriod: previousMetrics,
    };

    return NextResponse.json(overview);
  } catch (error) {
    console.error('Analytics overview error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
