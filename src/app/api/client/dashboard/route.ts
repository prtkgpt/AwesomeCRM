import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getTierInfo } from '@/lib/referral';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/client/dashboard - Get client dashboard data
 * Returns upcoming bookings, recent bookings, loyalty info, credit balance, and referral stats
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only clients can access this endpoint
    if (user.role !== 'CLIENT') {
      return NextResponse.json(
        { error: 'Forbidden - This endpoint is only for clients' },
        { status: 403 }
      );
    }

    // Find the client record linked to this user
    const client = await prisma.client.findFirst({
      where: {
        userId: user.id,
        companyId: user.companyId,
      },
      include: {
        referrals: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        creditTransactions: {
          where: {
            status: 'ACTIVE',
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client profile not found' },
        { status: 404 }
      );
    }

    const now = new Date();

    // Get upcoming bookings (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingBookings = await prisma.booking.findMany({
      where: {
        clientId: client.id,
        companyId: user.companyId,
        scheduledDate: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
        status: {
          in: ['PENDING', 'CONFIRMED', 'CLEANER_EN_ROUTE', 'IN_PROGRESS'],
        },
      },
      include: {
        address: {
          select: {
            label: true,
            street: true,
            city: true,
            state: true,
            zip: true,
          },
        },
        service: {
          select: {
            name: true,
            type: true,
          },
        },
        assignedCleaner: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 5,
    });

    // Get recent completed bookings (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentBookings = await prisma.booking.findMany({
      where: {
        clientId: client.id,
        companyId: user.companyId,
        status: 'COMPLETED',
        completedAt: {
          gte: thirtyDaysAgo,
        },
      },
      include: {
        address: {
          select: {
            label: true,
            street: true,
            city: true,
          },
        },
        service: {
          select: {
            name: true,
            type: true,
          },
        },
        reviews: {
          where: {
            clientId: client.id,
          },
          select: {
            id: true,
            overallRating: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: 5,
    });

    // Get company settings for referral program info
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        referralEnabled: true,
        referralReferrerReward: true,
        referralRefereeReward: true,
        loyaltyEnabled: true,
        loyaltyPointsPerDollar: true,
        loyaltyPointsValue: true,
      },
    });

    // Calculate referral stats
    const totalReferrals = await prisma.client.count({
      where: {
        referredById: client.id,
      },
    });

    // Get loyalty tier info
    const loyaltyTierInfo = {
      tier: client.loyaltyTier,
      points: client.loyaltyPoints,
      totalSpent: client.totalSpent,
      totalBookings: client.totalBookings,
    };

    // Get referral tier info
    const referralTierInfo = getTierInfo(client.referralTier as 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD');

    // Count bookings pending review (completed but no review submitted)
    const bookingsPendingReview = await prisma.booking.count({
      where: {
        clientId: client.id,
        companyId: user.companyId,
        status: 'COMPLETED',
        reviews: {
          none: {
            clientId: client.id,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          email: client.email,
          phone: client.phone,
          isVip: client.isVip,
        },
        upcomingBookings: upcomingBookings.map((booking) => ({
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          scheduledDate: booking.scheduledDate,
          duration: booking.duration,
          serviceType: booking.serviceType,
          serviceName: booking.service?.name,
          status: booking.status,
          finalPrice: booking.finalPrice,
          address: booking.address,
          cleaner: booking.assignedCleaner
            ? {
                firstName: booking.assignedCleaner.user.firstName,
                lastName: booking.assignedCleaner.user.lastName,
              }
            : null,
        })),
        recentBookings: recentBookings.map((booking) => ({
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          completedAt: booking.completedAt,
          serviceType: booking.serviceType,
          serviceName: booking.service?.name,
          finalPrice: booking.finalPrice,
          address: booking.address,
          hasReview: booking.reviews.length > 0,
          rating: booking.reviews[0]?.overallRating || null,
        })),
        loyalty: company?.loyaltyEnabled
          ? {
              tier: loyaltyTierInfo.tier,
              points: loyaltyTierInfo.points,
              pointsValue: company.loyaltyPointsValue || 0.01,
              totalSpent: loyaltyTierInfo.totalSpent,
              totalBookings: loyaltyTierInfo.totalBookings,
            }
          : null,
        credits: {
          balance: client.creditBalance,
          recentTransactions: client.creditTransactions.map((tx) => ({
            id: tx.id,
            type: tx.type,
            amount: tx.amount,
            description: tx.description,
            createdAt: tx.createdAt,
            expiresAt: tx.expiresAt,
          })),
        },
        referrals: company?.referralEnabled
          ? {
              code: client.referralCode,
              tier: client.referralTier,
              tierInfo: referralTierInfo,
              totalReferrals,
              referrerReward: company.referralReferrerReward || 0,
              refereeReward: company.referralRefereeReward || 0,
              recentReferrals: client.referrals.map((ref) => ({
                id: ref.id,
                name: `${ref.firstName} ${ref.lastName || ''}`.trim(),
                createdAt: ref.createdAt,
              })),
            }
          : null,
        stats: {
          bookingsPendingReview,
          upcomingBookingsCount: upcomingBookings.length,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/client/dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
