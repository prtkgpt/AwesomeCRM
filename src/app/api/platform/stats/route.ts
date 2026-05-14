import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/platform/stats - Platform-wide statistics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isPlatformAdmin: true },
    });

    if (!user?.isPlatformAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalCompanies,
      totalUsers,
      totalClients,
      totalBookings,
      recentCompanies,
      basicCompanies,
      proCompanies,
      freeCompanies,
      churnedCompanies,
      expiringIn7Days,
      expiredTrials,
      neverConverted,
      companiesForHealth,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.user.count(),
      prisma.client.count(),
      prisma.booking.count(),
      prisma.company.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          createdAt: true,
          _count: { select: { users: true, clients: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      // Revenue stats
      prisma.company.count({ where: { plan: 'BASIC' } }),
      prisma.company.count({ where: { plan: 'PRO' } }),
      prisma.company.count({ where: { plan: 'FREE' } }),
      prisma.company.count({ where: { subscriptionStatus: { not: 'ACTIVE' } } }),
      // Trial status
      prisma.company.count({
        where: {
          trialEndsAt: { gte: now, lte: sevenDaysFromNow },
        },
      }),
      prisma.company.count({
        where: {
          trialEndsAt: { lt: now },
          plan: 'FREE',
        },
      }),
      prisma.company.count({
        where: {
          plan: 'FREE',
          trialEndsAt: { lt: now },
        },
      }),
      // Health scores - get companies with counts
      prisma.company.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          createdAt: true,
          trialEndsAt: true,
          phone: true,
          email: true,
          _count: {
            select: {
              clients: true,
              bookings: true,
              users: true,
            },
          },
          bookings: {
            select: { scheduledDate: true },
            orderBy: { scheduledDate: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    // Calculate revenue
    const paidCompanies = basicCompanies + proCompanies;
    const mrr = basicCompanies * 20; // BASIC = $20/month

    const revenue = {
      mrr,
      paidCompanies,
      freeCompanies,
      basicCompanies,
      proCompanies,
      churnedCompanies,
    };

    const trialStatus = {
      expiringIn7Days,
      expired: expiredTrials,
      neverConverted,
    };

    // Calculate health scores
    const healthScores = companiesForHealth.map((company) => {
      let healthScore = 0;

      const clientCount = company._count.clients;
      const bookingCount = company._count.bookings;
      const userCount = company._count.users;
      const lastBookingDate = company.bookings[0]?.scheduledDate || null;

      // clients > 0 = +30
      if (clientCount > 0) healthScore += 30;

      // bookings > 5 = +25
      if (bookingCount > 5) healthScore += 25;

      // bookings in last 30 days > 0 = +25
      if (lastBookingDate && lastBookingDate >= thirtyDaysAgo) {
        healthScore += 25;
      }

      // multiple users = +10
      if (userCount > 1) healthScore += 10;

      // has phone/email configured = +10
      if (company.phone || company.email) healthScore += 10;

      let healthLabel: 'healthy' | 'at_risk' | 'inactive';
      if (healthScore >= 60) {
        healthLabel = 'healthy';
      } else if (healthScore >= 30) {
        healthLabel = 'at_risk';
      } else {
        healthLabel = 'inactive';
      }

      return {
        id: company.id,
        name: company.name,
        slug: company.slug,
        plan: company.plan,
        createdAt: company.createdAt,
        trialEndsAt: company.trialEndsAt,
        clientCount,
        bookingCount,
        userCount,
        lastBookingDate,
        healthScore,
        healthLabel,
      };
    });

    // Sort by healthScore ascending (worst first), take top 20
    healthScores.sort((a, b) => a.healthScore - b.healthScore);
    const top20HealthScores = healthScores.slice(0, 20);

    return NextResponse.json({
      success: true,
      data: {
        totalCompanies,
        totalUsers,
        totalClients,
        totalBookings,
        recentCompanies,
        revenue,
        trialStatus,
        healthScores: top20HealthScores,
      },
    });
  } catch (error) {
    console.error('Platform: stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
