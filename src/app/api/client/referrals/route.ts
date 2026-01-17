import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  generateReferralCode,
  getTierInfo,
  getExpiringCredits,
  TIER_CONFIG,
  CREDIT_EXPIRATION_DAYS,
} from '@/lib/referral';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/client/referrals - Get referral code, stats, and referred clients
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

    // Check if referral program is enabled
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        referralEnabled: true,
        referralReferrerReward: true,
        referralRefereeReward: true,
        referralCreditExpiry: true,
        name: true,
      },
    });

    if (!company?.referralEnabled) {
      return NextResponse.json(
        { success: false, error: 'Referral program is not enabled' },
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
            email: true,
            createdAt: true,
            totalBookings: true,
            totalSpent: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        creditTransactions: {
          where: {
            type: { in: ['REFERRAL_EARNED', 'TIER_BONUS'] },
          },
          select: {
            id: true,
            type: true,
            amount: true,
            description: true,
            status: true,
            expiresAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client profile not found' },
        { status: 404 }
      );
    }

    // Get tier info
    const currentTier = client.referralTier as 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD';
    const tierInfo = getTierInfo(currentTier);
    const referralCount = client.referrals.length;

    // Calculate progress to next tier
    let nextTier = null;
    let referralsToNextTier = 0;
    let nextTierBonus = 0;

    if (currentTier === 'NONE') {
      nextTier = 'BRONZE';
      referralsToNextTier = TIER_CONFIG.BRONZE.minReferrals - referralCount;
      nextTierBonus = TIER_CONFIG.BRONZE.bonus;
    } else if (currentTier === 'BRONZE') {
      nextTier = 'SILVER';
      referralsToNextTier = TIER_CONFIG.SILVER.minReferrals - referralCount;
      nextTierBonus = TIER_CONFIG.SILVER.bonus;
    } else if (currentTier === 'SILVER') {
      nextTier = 'GOLD';
      referralsToNextTier = TIER_CONFIG.GOLD.minReferrals - referralCount;
      nextTierBonus = TIER_CONFIG.GOLD.bonus;
    }

    // Get credits expiring soon (within 30 days)
    const expiringCredits = await getExpiringCredits(client.id, 30);
    const expiringAmount = expiringCredits.reduce(
      (sum, credit) => sum + credit.amount,
      0
    );

    // Calculate total credits earned from referrals
    const referralCreditsEarned = client.creditTransactions
      .filter((tx) => tx.type === 'REFERRAL_EARNED' && tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const tierBonusesEarned = client.creditTransactions
      .filter((tx) => tx.type === 'TIER_BONUS' && tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);

    return NextResponse.json({
      success: true,
      data: {
        referralCode: client.referralCode,
        shareUrl: client.referralCode
          ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/book?ref=${client.referralCode}`
          : null,
        // Stats
        stats: {
          totalReferrals: referralCount,
          activeReferrals: client.referrals.filter((r) => r.totalBookings > 0)
            .length,
          creditsEarned: referralCreditsEarned,
          tierBonusesEarned,
          creditBalance: client.creditBalance,
        },
        // Tier info
        tier: {
          current: currentTier,
          info: tierInfo,
          nextTier,
          referralsToNextTier: Math.max(0, referralsToNextTier),
          nextTierBonus,
        },
        // Rewards info
        rewards: {
          referrerReward: company.referralReferrerReward || 0,
          refereeReward: company.referralRefereeReward || 0,
          creditExpirationDays:
            company.referralCreditExpiry || CREDIT_EXPIRATION_DAYS,
        },
        // Expiring credits warning
        expiringCredits: {
          amount: expiringAmount,
          credits: expiringCredits.map((c) => ({
            amount: c.amount,
            expiresAt: c.expiresAt,
          })),
        },
        // Referred clients
        referrals: client.referrals.map((ref) => ({
          id: ref.id,
          name: `${ref.firstName} ${ref.lastName || ''}`.trim(),
          joinedAt: ref.createdAt,
          hasBooked: ref.totalBookings > 0,
          totalBookings: ref.totalBookings,
        })),
        // Recent credit transactions
        recentTransactions: client.creditTransactions.map((tx) => ({
          id: tx.id,
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          status: tx.status,
          expiresAt: tx.expiresAt,
          createdAt: tx.createdAt,
        })),
        // Company info for sharing
        companyName: company.name,
      },
    });
  } catch (error) {
    console.error('GET /api/client/referrals error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch referral data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/client/referrals - Generate referral code if not exists
 */
export async function POST(request: NextRequest) {
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

    // Find the client record linked to this user
    const client = await prisma.client.findFirst({
      where: {
        userId: user.id,
        companyId: user.companyId,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client profile not found' },
        { status: 404 }
      );
    }

    // Check if client already has a referral code
    if (client.referralCode) {
      return NextResponse.json({
        success: true,
        data: {
          referralCode: client.referralCode,
          shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/book?ref=${client.referralCode}`,
          message: 'Referral code already exists',
        },
      });
    }

    // Generate unique referral code
    let referralCode = generateReferralCode(client.firstName, client.id);
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      // Check if code already exists
      const existing = await prisma.client.findFirst({
        where: { referralCode, companyId: user.companyId },
      });

      if (!existing) {
        break;
      }

      // Generate new code and try again
      attempts++;
      referralCode = generateReferralCode(client.firstName, client.id);
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate unique referral code' },
        { status: 500 }
      );
    }

    // Update client with referral code
    const updatedClient = await prisma.client.update({
      where: { id: client.id },
      data: { referralCode },
    });

    return NextResponse.json({
      success: true,
      data: {
        referralCode: updatedClient.referralCode,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/book?ref=${updatedClient.referralCode}`,
        rewards: {
          referrerReward: company.referralReferrerReward || 0,
          refereeReward: company.referralRefereeReward || 0,
        },
      },
      message: 'Referral code generated successfully',
    });
  } catch (error) {
    console.error('POST /api/client/referrals error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate referral code' },
      { status: 500 }
    );
  }
}
