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
        name: true,
        email: true,
        referralCode: true,
        referralCreditsEarned: true,
        referralCreditsBalance: true,
        referralTier: true,
        referralTierBonusEarned: true,
        _count: {
          select: { referrals: true },
        },
      },
      orderBy: {
        referralCreditsEarned: 'desc',
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

    const totalCreditsIssued = await prisma.client.aggregate({
      where: { companyId: user.companyId },
      _sum: { referralCreditsEarned: true },
    });

    const totalCreditsRedeemed = await prisma.client.aggregate({
      where: { companyId: user.companyId },
      _sum: { referralCreditsUsed: true },
    });

    const totalCreditsOutstanding = await prisma.client.aggregate({
      where: { companyId: user.companyId },
      _sum: { referralCreditsBalance: true },
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
        name: true,
        email: true,
        createdAt: true,
        referredBy: {
          select: {
            id: true,
            name: true,
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

    // Calculate total tier bonuses awarded
    const totalTierBonuses = await prisma.client.aggregate({
      where: { companyId: user.companyId },
      _sum: { referralTierBonusEarned: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        programEnabled: company.referralEnabled || false,
        referrerReward: company.referralReferrerReward || 0,
        refereeReward: company.referralRefereeReward || 0,
        totalReferrals,
        creditsIssued: totalCreditsIssued._sum.referralCreditsEarned || 0,
        creditsRedeemed: totalCreditsRedeemed._sum.referralCreditsUsed || 0,
        creditsOutstanding: totalCreditsOutstanding._sum.referralCreditsBalance || 0,
        tierBonusesAwarded: totalTierBonuses._sum.referralTierBonusEarned || 0,
        tierDistribution: tierStats,
        topReferrers: topReferrers.map((client) => ({
          id: client.id,
          name: client.name,
          email: client.email,
          referralCode: client.referralCode,
          referralCount: client._count.referrals,
          creditsEarned: client.referralCreditsEarned,
          creditsBalance: client.referralCreditsBalance,
          tier: client.referralTier,
          tierBonusEarned: client.referralTierBonusEarned,
        })),
        recentReferrals: recentReferrals.map((client) => ({
          id: client.id,
          name: client.name,
          email: client.email,
          createdAt: client.createdAt,
          referredBy: client.referredBy,
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
