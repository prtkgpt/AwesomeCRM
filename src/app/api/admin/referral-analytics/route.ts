import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/referral-analytics
 * Get referral program analytics for admins/owners
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role and companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Forbidden - Admin/Owner only' },
        { status: 403 }
      );
    }

    if (!user.companyId) {
      return NextResponse.json(
        { error: 'No company associated with user' },
        { status: 400 }
      );
    }

    // Check if referral program is enabled
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        referralEnabled: true,
        referralReferrerReward: true,
        referralRefereeReward: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Get top referrers (leaderboard)
    const topReferrers = await prisma.client.findMany({
      where: {
        companyId: user.companyId,
        referrals: {
          some: {}, // Has at least one referral
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        referralCode: true,
        referralTier: true,
        creditBalance: true,
        loyaltyPoints: true,
        _count: {
          select: { referrals: true },
        },
      },
      orderBy: {
        loyaltyPoints: 'desc',
      },
      take: 10,
    });

    // Get total statistics
    const totalReferrals = await prisma.client.count({
      where: {
        companyId: user.companyId,
        referredById: { not: null },
      },
    });

    const totalCreditsOutstanding = await prisma.client.aggregate({
      where: { companyId: user.companyId },
      _sum: { creditBalance: true },
    });

    const totalLoyaltyPoints = await prisma.client.aggregate({
      where: { companyId: user.companyId },
      _sum: { loyaltyPoints: true },
    });

    // Get recent referrals (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentReferrals = await prisma.client.findMany({
      where: {
        companyId: user.companyId,
        referredById: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        referredBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Get tier distribution
    const tierDistribution = await prisma.client.groupBy({
      by: ['referralTier'],
      where: { companyId: user.companyId },
      _count: { referralTier: true },
    });

    const tierStats = {
      NONE: tierDistribution.find(t => t.referralTier === 'NONE')?._count.referralTier || 0,
      BRONZE: tierDistribution.find(t => t.referralTier === 'BRONZE')?._count.referralTier || 0,
      SILVER: tierDistribution.find(t => t.referralTier === 'SILVER')?._count.referralTier || 0,
      GOLD: tierDistribution.find(t => t.referralTier === 'GOLD')?._count.referralTier || 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        programEnabled: company.referralEnabled || false,
        referrerReward: company.referralReferrerReward || 0,
        refereeReward: company.referralRefereeReward || 0,
        totalReferrals,
        creditsOutstanding: totalCreditsOutstanding._sum.creditBalance || 0,
        totalLoyaltyPoints: totalLoyaltyPoints._sum.loyaltyPoints || 0,
        tierDistribution: tierStats,
        topReferrers: topReferrers.map((client) => ({
          id: client.id,
          name: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
          email: client.email,
          referralCode: client.referralCode,
          referralCount: client._count.referrals,
          creditBalance: client.creditBalance,
          loyaltyPoints: client.loyaltyPoints,
          tier: client.referralTier,
        })),
        recentReferrals: recentReferrals.map((client) => ({
          id: client.id,
          name: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
          email: client.email,
          createdAt: client.createdAt,
          referredBy: client.referredBy ? {
            id: client.referredBy.id,
            name: `${client.referredBy.firstName || ''} ${client.referredBy.lastName || ''}`.trim(),
          } : null,
        })),
      },
    });
  } catch (error) {
    console.error('Failed to fetch referral analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch referral analytics' },
      { status: 500 }
    );
  }
}
