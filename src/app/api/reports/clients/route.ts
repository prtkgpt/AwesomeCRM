// ============================================
// CleanDayCRM - Client Reports API
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
  differenceInDays,
  eachMonthOfInterval,
} from 'date-fns';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/reports/clients - Get client reports including new vs returning, retention, top clients
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

    // Only OWNER and ADMIN can access client reports
    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Owner/Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const period = searchParams.get('period');
    const limit = parseInt(searchParams.get('limit') || '10');

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

    // Get all clients for the company
    const allClients = await prisma.client.findMany({
      where: {
        companyId: user.companyId,
      },
      include: {
        bookings: {
          where: {
            status: 'COMPLETED',
          },
          select: {
            id: true,
            scheduledDate: true,
            finalPrice: true,
            serviceType: true,
          },
          orderBy: {
            scheduledDate: 'asc',
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    // Get clients created in the date range (new clients)
    const newClients = allClients.filter((client) => {
      const createdAt = new Date(client.createdAt);
      return createdAt >= startDate && createdAt <= endDate;
    });

    // Get clients with first booking in the date range
    const clientsWithFirstBookingInPeriod = allClients.filter((client) => {
      if (client.bookings.length === 0) return false;
      const firstBookingDate = new Date(client.bookings[0].scheduledDate);
      return firstBookingDate >= startDate && firstBookingDate <= endDate;
    });

    // Get bookings in the period
    const bookingsInPeriod = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        status: 'COMPLETED',
        scheduledDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        clientId: true,
        finalPrice: true,
        scheduledDate: true,
        serviceType: true,
      },
    });

    // Calculate unique clients who had bookings in the period
    const uniqueClientIdsInPeriod = new Set(bookingsInPeriod.map((b) => b.clientId));
    const activeClientsInPeriod = uniqueClientIdsInPeriod.size;

    // New vs returning clients (in bookings during period)
    const newClientIds = new Set(clientsWithFirstBookingInPeriod.map((c) => c.id));
    const bookingsFromNewClients = bookingsInPeriod.filter((b) => newClientIds.has(b.clientId));
    const bookingsFromReturningClients = bookingsInPeriod.filter((b) => !newClientIds.has(b.clientId));

    const newClientRevenue = bookingsFromNewClients.reduce((sum, b) => sum + b.finalPrice, 0);
    const returningClientRevenue = bookingsFromReturningClients.reduce((sum, b) => sum + b.finalPrice, 0);
    const totalRevenue = newClientRevenue + returningClientRevenue;

    // Calculate retention rate
    // Clients who had bookings in both this period and the previous period
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const prevStartDate = subDays(startDate, periodDays);
    const prevEndDate = subDays(endDate, periodDays);

    const prevPeriodBookings = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        status: 'COMPLETED',
        scheduledDate: {
          gte: prevStartDate,
          lte: prevEndDate,
        },
      },
      select: {
        clientId: true,
      },
    });

    const prevPeriodClientIds = new Set(prevPeriodBookings.map((b) => b.clientId));
    const retainedClients = Array.from(uniqueClientIdsInPeriod).filter((id) => prevPeriodClientIds.has(id));
    const retentionRate = prevPeriodClientIds.size > 0
      ? (retainedClients.length / prevPeriodClientIds.size) * 100
      : 0;

    // Churn rate
    const churnedClients = Array.from(prevPeriodClientIds).filter((id) => !uniqueClientIdsInPeriod.has(id));
    const churnRate = prevPeriodClientIds.size > 0
      ? (churnedClients.length / prevPeriodClientIds.size) * 100
      : 0;

    // Top clients by revenue (all time with option to filter by period)
    const clientRevenueMap = new Map<string, {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      totalRevenue: number;
      totalBookings: number;
      lastBookingDate: Date | null;
      loyaltyTier: string;
      isVip: boolean;
    }>();

    allClients.forEach((client) => {
      const clientBookingsInPeriod = bookingsInPeriod.filter((b) => b.clientId === client.id);
      const periodRevenue = clientBookingsInPeriod.reduce((sum, b) => sum + b.finalPrice, 0);

      if (periodRevenue > 0 || client.totalSpent > 0) {
        const lastBooking = client.bookings.length > 0
          ? client.bookings[client.bookings.length - 1]
          : null;

        clientRevenueMap.set(client.id, {
          id: client.id,
          name: `${client.firstName} ${client.lastName || ''}`.trim(),
          email: client.email,
          phone: client.phone,
          totalRevenue: periodRevenue,
          totalBookings: clientBookingsInPeriod.length,
          lastBookingDate: lastBooking ? new Date(lastBooking.scheduledDate) : null,
          loyaltyTier: client.loyaltyTier,
          isVip: client.isVip,
        });
      }
    });

    const topClients = Array.from(clientRevenueMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);

    // Client acquisition by month
    const months = eachMonthOfInterval({ start: subMonths(endDate, 11), end: endDate });
    const clientAcquisitionByMonth = months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const newInMonth = allClients.filter((c) => {
        const createdAt = new Date(c.createdAt);
        return createdAt >= monthStart && createdAt <= monthEnd;
      });
      return {
        month: format(month, 'MMM yyyy'),
        newClients: newInMonth.length,
      };
    });

    // Client lifetime value calculation
    const clientsWithBookings = allClients.filter((c) => c.bookings.length > 0);
    const totalClientLTV = clientsWithBookings.reduce((sum, c) => sum + c.totalSpent, 0);
    const avgClientLTV = clientsWithBookings.length > 0 ? totalClientLTV / clientsWithBookings.length : 0;

    // Booking frequency distribution
    const bookingFrequencyDistribution = {
      oneTime: 0,
      occasional: 0, // 2-4 bookings
      regular: 0, // 5-11 bookings
      frequent: 0, // 12+ bookings
    };

    allClients.forEach((client) => {
      const bookingCount = client.bookings.length;
      if (bookingCount === 1) {
        bookingFrequencyDistribution.oneTime += 1;
      } else if (bookingCount >= 2 && bookingCount <= 4) {
        bookingFrequencyDistribution.occasional += 1;
      } else if (bookingCount >= 5 && bookingCount <= 11) {
        bookingFrequencyDistribution.regular += 1;
      } else if (bookingCount >= 12) {
        bookingFrequencyDistribution.frequent += 1;
      }
    });

    // Loyalty tier distribution
    const loyaltyTierDistribution = allClients.reduce((acc: Record<string, number>, client) => {
      acc[client.loyaltyTier] = (acc[client.loyaltyTier] || 0) + 1;
      return acc;
    }, {});

    // Source distribution (how clients found us)
    const sourceDistribution = allClients.reduce((acc: Record<string, number>, client) => {
      const source = client.source || 'UNKNOWN';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    // Referral stats
    const clientsFromReferrals = allClients.filter((c) => c.referredById).length;
    const clientsWithReferrals = allClients.filter((c) => c.referralTier !== 'NONE').length;

    // At-risk clients (haven't booked in 60+ days)
    const sixtyDaysAgo = subDays(now, 60);
    const atRiskClients = allClients.filter((client) => {
      if (client.bookings.length === 0) return false;
      const lastBooking = client.bookings[client.bookings.length - 1];
      const lastBookingDate = new Date(lastBooking.scheduledDate);
      return lastBookingDate < sixtyDaysAgo;
    }).length;

    // Active clients (booked in last 30 days)
    const thirtyDaysAgo = subDays(now, 30);
    const activeClients = allClients.filter((client) => {
      if (client.bookings.length === 0) return false;
      const lastBooking = client.bookings[client.bookings.length - 1];
      const lastBookingDate = new Date(lastBooking.scheduledDate);
      return lastBookingDate >= thirtyDaysAgo;
    }).length;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalClients: allClients.length,
          activeClients,
          newClientsInPeriod: newClients.length,
          activeClientsInPeriod,
          atRiskClients,
          retentionRate: parseFloat(retentionRate.toFixed(2)),
          churnRate: parseFloat(churnRate.toFixed(2)),
          avgClientLTV: parseFloat(avgClientLTV.toFixed(2)),
        },
        newVsReturning: {
          newClients: clientsWithFirstBookingInPeriod.length,
          returningClients: activeClientsInPeriod - clientsWithFirstBookingInPeriod.length,
          newClientBookings: bookingsFromNewClients.length,
          returningClientBookings: bookingsFromReturningClients.length,
          newClientRevenue,
          returningClientRevenue,
          newClientRevenuePercent: totalRevenue > 0 ? (newClientRevenue / totalRevenue) * 100 : 0,
          returningClientRevenuePercent: totalRevenue > 0 ? (returningClientRevenue / totalRevenue) * 100 : 0,
        },
        topClients,
        clientAcquisitionByMonth,
        bookingFrequencyDistribution,
        loyaltyTierDistribution,
        sourceDistribution,
        referralStats: {
          clientsFromReferrals,
          clientsWhoReferred: clientsWithReferrals,
          referralConversionRate: allClients.length > 0
            ? (clientsFromReferrals / allClients.length) * 100
            : 0,
        },
        filters: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          limit,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/reports/clients error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch client reports' },
      { status: 500 }
    );
  }
}
