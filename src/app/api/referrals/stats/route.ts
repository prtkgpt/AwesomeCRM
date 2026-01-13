import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateReferralTier, getTierInfo, TIER_CONFIG, getExpiringCredits, CREDIT_EXPIRATION_DAYS } from '@/lib/referral';

/**
 * GET /api/referrals/stats
 * Get referral statistics for the current user's client account
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user?.companyId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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

    if (!company?.referralEnabled) {
      return NextResponse.json(
        { success: false, error: 'Referral program is not enabled' },
        { status: 403 }
      );
    }

    // Find the client associated with this user
    // For CUSTOMER role, use customerClient relation
    // For others (ADMIN/OWNER), they might want to see a specific client
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    let client;
    if (clientId && (user.role === 'ADMIN' || user.role === 'OWNER')) {
      // Admin/Owner can view any client's referral stats
      client = await prisma.client.findFirst({
        where: { id: clientId, companyId: user.companyId },
        include: {
          referrals: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    } else {
      // Customer can only view their own stats
      client = await prisma.client.findFirst({
        where: { customerUserId: session.user.id, companyId: user.companyId },
        include: {
          referrals: {
            select: {
              id: true,
              name: true,
              email: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client account not found' },
        { status: 404 }
      );
    }

    // Calculate tier info
    const currentTier = client.referralTier;
    const tierInfo = getTierInfo(currentTier);
    const referralCount = client.referrals.length;

    // Calculate progress to next tier
    let nextTier = null;
    let referralsToNextTier = 0;
    if (currentTier === 'NONE' || currentTier === 'BRONZE') {
      nextTier = currentTier === 'NONE' ? 'BRONZE' : 'SILVER';
      const nextTierConfig = nextTier === 'BRONZE' ? TIER_CONFIG.BRONZE : TIER_CONFIG.SILVER;
      referralsToNextTier = nextTierConfig.minReferrals - referralCount;
    } else if (currentTier === 'SILVER') {
      nextTier = 'GOLD';
      referralsToNextTier = TIER_CONFIG.GOLD.minReferrals - referralCount;
    }

    // Get credits expiring soon (within 30 days)
    const expiringCredits = await getExpiringCredits(client.id, 30);
    const expiringAmount = expiringCredits.reduce((sum, credit) => sum + credit.amount, 0);

    return NextResponse.json({
      success: true,
      data: {
        referralCode: client.referralCode,
        referralCount: client.referrals.length,
        referrals: client.referrals,
        creditsEarned: client.referralCreditsEarned,
        creditsUsed: client.referralCreditsUsed,
        creditsBalance: client.referralCreditsBalance,
        referrerReward: company.referralReferrerReward || 0,
        refereeReward: company.referralRefereeReward || 0,
        // Tier info
        currentTier: currentTier,
        tierInfo: tierInfo,
        tierBonusEarned: client.referralTierBonusEarned,
        nextTier: nextTier,
        referralsToNextTier: Math.max(0, referralsToNextTier),
        // Expiration info
        creditExpirationDays: CREDIT_EXPIRATION_DAYS,
        expiringCredits: expiringCredits,
        expiringAmount: expiringAmount,
      },
    });
  } catch (error) {
    console.error('Failed to fetch referral stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch referral statistics' },
      { status: 500 }
    );
  }
}
