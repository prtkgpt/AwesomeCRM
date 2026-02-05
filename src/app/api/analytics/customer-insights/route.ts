import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay, subDays, subMonths, format, differenceInDays } from 'date-fns';

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
    const days = parseInt(searchParams.get('days') || '90');

    const now = new Date();
    const endDate = endOfDay(now);
    const startDate = startOfDay(subDays(now, days));
    const churnThreshold = 90; // Days without booking to consider churned

    // Get all clients with their bookings
    const clients = await prisma.client.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tags: true,
        createdAt: true,
        referralCode: true,
        referralCreditsBalance: true,
        referralTier: true,
        marketingOptOut: true,
        bookings: {
          select: {
            id: true,
            scheduledDate: true,
            status: true,
            price: true,
            serviceType: true,
            customerRating: true,
            tipAmount: true,
            isPaid: true,
          },
          orderBy: { scheduledDate: 'desc' },
        },
      },
    });

    // Analyze each client
    const clientAnalytics = clients.map((client) => {
      const completedBookings = client.bookings.filter((b) =>
        ['COMPLETED', 'CLEANER_COMPLETED'].includes(b.status)
      );
      const recentBookings = completedBookings.filter(
        (b) => new Date(b.scheduledDate) >= startDate
      );

      // Lifetime value
      const lifetimeValue = completedBookings.reduce((sum, b) => sum + b.price, 0);
      const periodValue = recentBookings.reduce((sum, b) => sum + b.price, 0);

      // Last booking date
      const lastBooking = completedBookings[0];
      const daysSinceLastBooking = lastBooking
        ? differenceInDays(now, new Date(lastBooking.scheduledDate))
        : null;

      // Customer status
      let status: 'active' | 'at_risk' | 'churned' | 'new';
      if (daysSinceLastBooking === null) {
        status = 'new';
      } else if (daysSinceLastBooking > churnThreshold) {
        status = 'churned';
      } else if (daysSinceLastBooking > 45) {
        status = 'at_risk';
      } else {
        status = 'active';
      }

      // Average booking value
      const averageBookingValue =
        completedBookings.length > 0 ? lifetimeValue / completedBookings.length : 0;

      // Average rating given
      const ratings = completedBookings
        .filter((b) => b.customerRating !== null)
        .map((b) => b.customerRating as number);
      const averageRating =
        ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null;

      // Tips given
      const totalTips = completedBookings.reduce((sum, b) => sum + (b.tipAmount || 0), 0);

      // Service type preference
      const serviceTypeCounts = completedBookings.reduce(
        (acc, b) => {
          acc[b.serviceType] = (acc[b.serviceType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      const preferredServiceType = Object.entries(serviceTypeCounts).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0];

      // Booking frequency (average days between bookings)
      let bookingFrequency: number | null = null;
      if (completedBookings.length > 1) {
        const sortedDates = completedBookings
          .map((b) => new Date(b.scheduledDate))
          .sort((a, b) => a.getTime() - b.getTime());
        const intervals = [];
        for (let i = 1; i < sortedDates.length; i++) {
          intervals.push(differenceInDays(sortedDates[i], sortedDates[i - 1]));
        }
        bookingFrequency = Math.round(
          intervals.reduce((sum, i) => sum + i, 0) / intervals.length
        );
      }

      return {
        id: client.id,
        name: client.name,
        email: client.email,
        tags: client.tags,
        createdAt: client.createdAt,
        status,
        metrics: {
          lifetimeValue,
          periodValue,
          totalBookings: completedBookings.length,
          periodBookings: recentBookings.length,
          averageBookingValue,
          daysSinceLastBooking,
          averageRating,
          totalTips,
          preferredServiceType,
          bookingFrequency,
          hasReferralCode: !!client.referralCode,
          referralCreditsBalance: client.referralCreditsBalance,
          referralTier: client.referralTier,
          marketingOptOut: client.marketingOptOut,
        },
      };
    });

    // Segment customers
    const segments = {
      active: clientAnalytics.filter((c) => c.status === 'active'),
      atRisk: clientAnalytics.filter((c) => c.status === 'at_risk'),
      churned: clientAnalytics.filter((c) => c.status === 'churned'),
      new: clientAnalytics.filter((c) => c.status === 'new'),
    };

    // New customers in period
    const newCustomersInPeriod = clients.filter(
      (c) => new Date(c.createdAt) >= startDate
    ).length;

    // Returning customers (multiple bookings in period)
    const returningCustomers = clientAnalytics.filter(
      (c) => c.metrics.periodBookings > 1
    ).length;

    // Customer lifetime value distribution
    const clvDistribution = {
      under100: clientAnalytics.filter((c) => c.metrics.lifetimeValue < 100).length,
      '100to500': clientAnalytics.filter(
        (c) => c.metrics.lifetimeValue >= 100 && c.metrics.lifetimeValue < 500
      ).length,
      '500to1000': clientAnalytics.filter(
        (c) => c.metrics.lifetimeValue >= 500 && c.metrics.lifetimeValue < 1000
      ).length,
      '1000to5000': clientAnalytics.filter(
        (c) => c.metrics.lifetimeValue >= 1000 && c.metrics.lifetimeValue < 5000
      ).length,
      over5000: clientAnalytics.filter((c) => c.metrics.lifetimeValue >= 5000).length,
    };

    // Top customers by lifetime value
    const topCustomers = [...clientAnalytics]
      .sort((a, b) => b.metrics.lifetimeValue - a.metrics.lifetimeValue)
      .slice(0, 10);

    // Churn analysis
    const churnedInPeriod = clientAnalytics.filter(
      (c) =>
        c.status === 'churned' &&
        c.metrics.daysSinceLastBooking !== null &&
        c.metrics.daysSinceLastBooking < days + churnThreshold
    ).length;

    // Referral program stats
    const referralStats = {
      customersWithReferralCode: clientAnalytics.filter((c) => c.metrics.hasReferralCode).length,
      totalCreditsBalance: clientAnalytics.reduce(
        (sum, c) => sum + c.metrics.referralCreditsBalance,
        0
      ),
      tierDistribution: {
        NONE: clientAnalytics.filter((c) => c.metrics.referralTier === 'NONE').length,
        BRONZE: clientAnalytics.filter((c) => c.metrics.referralTier === 'BRONZE').length,
        SILVER: clientAnalytics.filter((c) => c.metrics.referralTier === 'SILVER').length,
        GOLD: clientAnalytics.filter((c) => c.metrics.referralTier === 'GOLD').length,
      },
    };

    // Calculate summary stats
    const totalLifetimeValue = clientAnalytics.reduce(
      (sum, c) => sum + c.metrics.lifetimeValue,
      0
    );
    const averageLifetimeValue =
      clientAnalytics.length > 0 ? totalLifetimeValue / clientAnalytics.length : 0;

    return NextResponse.json({
      period: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
        days,
      },
      summary: {
        totalCustomers: clients.length,
        newCustomers: newCustomersInPeriod,
        activeCustomers: segments.active.length,
        atRiskCustomers: segments.atRisk.length,
        churnedCustomers: segments.churned.length,
        newNoBooking: segments.new.length,
        returningCustomers,
        churnedInPeriod,
        churnRate:
          clients.length > 0 ? Math.round((segments.churned.length / clients.length) * 100) : 0,
        totalLifetimeValue,
        averageLifetimeValue: Math.round(averageLifetimeValue),
      },
      clvDistribution,
      referralStats,
      topCustomers,
      segments: {
        activeCount: segments.active.length,
        atRiskCount: segments.atRisk.length,
        churnedCount: segments.churned.length,
        newCount: segments.new.length,
      },
    });
  } catch (error) {
    console.error('Customer insights error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
