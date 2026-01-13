import { prisma } from './prisma';

// Tier thresholds and bonuses
export const TIER_CONFIG = {
  BRONZE: { minReferrals: 1, maxReferrals: 4, bonus: 10, name: 'Bronze', color: '#cd7f32' },
  SILVER: { minReferrals: 5, maxReferrals: 9, bonus: 25, name: 'Silver', color: '#c0c0c0' },
  GOLD: { minReferrals: 10, maxReferrals: Infinity, bonus: 50, name: 'Gold', color: '#ffd700' },
};

/**
 * Calculate referral tier based on number of successful referrals
 */
export function calculateReferralTier(referralCount: number): 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD' {
  if (referralCount >= TIER_CONFIG.GOLD.minReferrals) return 'GOLD';
  if (referralCount >= TIER_CONFIG.SILVER.minReferrals) return 'SILVER';
  if (referralCount >= TIER_CONFIG.BRONZE.minReferrals) return 'BRONZE';
  return 'NONE';
}

/**
 * Get tier info for display
 */
export function getTierInfo(tier: 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD') {
  if (tier === 'NONE') return { name: 'None', color: '#9ca3af', icon: '⭐', bonus: 0 };
  if (tier === 'BRONZE') return { ...TIER_CONFIG.BRONZE, icon: '🥉' };
  if (tier === 'SILVER') return { ...TIER_CONFIG.SILVER, icon: '🥈' };
  return { ...TIER_CONFIG.GOLD, icon: '🥇' };
}

/**
 * Generate a unique referral code for a client
 * Format: FIRSTNAME-XXXXX (e.g., "JOHN-A3K9Z")
 */
export function generateReferralCode(name: string, clientId: string): string {
  // Extract first name and clean it
  const firstName = name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '');
  const limitedFirstName = firstName.substring(0, 10);

  // Generate random alphanumeric suffix (5 characters)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 5; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${limitedFirstName}-${suffix}`;
}

/**
 * Check if a referral code exists and is valid
 */
export async function validateReferralCode(code: string, companyId: string): Promise<{ valid: boolean; clientId?: string; clientName?: string }> {
  if (!code || code.trim() === '') {
    return { valid: false };
  }

  const client = await prisma.client.findFirst({
    where: {
      referralCode: code.toUpperCase(),
      companyId: companyId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!client) {
    return { valid: false };
  }

  return {
    valid: true,
    clientId: client.id,
    clientName: client.name,
  };
}

/**
 * Award referral credits to both referrer and referee
 * Also checks for tier upgrades and awards tier bonuses
 */
export async function awardReferralCredits(
  referrerId: string,
  refereeId: string,
  companyId: string
): Promise<{ success: boolean; error?: string; tierUpgrade?: { oldTier: string; newTier: string; bonus: number } }> {
  try {
    // Get company referral settings
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        referralEnabled: true,
        referralReferrerReward: true,
        referralRefereeReward: true,
      },
    });

    if (!company || !company.referralEnabled) {
      return { success: false, error: 'Referral program is not enabled' };
    }

    const referrerReward = company.referralReferrerReward || 0;
    const refereeReward = company.referralRefereeReward || 0;

    // Get referrer's current tier and referral count
    const referrer = await prisma.client.findUnique({
      where: { id: referrerId },
      select: {
        referralTier: true,
        _count: {
          select: { referrals: true },
        },
      },
    });

    if (!referrer) {
      return { success: false, error: 'Referrer not found' };
    }

    const currentTier = referrer.referralTier;
    const newReferralCount = referrer._count.referrals + 1; // After this new referral
    const newTier = calculateReferralTier(newReferralCount);

    // Check if tier upgraded
    let tierBonus = 0;
    let tierUpgrade = undefined;

    if (newTier !== currentTier && newTier !== 'NONE') {
      const tierInfo = getTierInfo(newTier);
      tierBonus = tierInfo.bonus;
      tierUpgrade = {
        oldTier: currentTier,
        newTier: newTier,
        bonus: tierBonus,
      };
      console.log(`🎉 Tier upgrade! ${currentTier} → ${newTier}, bonus: $${tierBonus}`);
    }

    // Award credits to both parties in a transaction
    await prisma.$transaction([
      // Award credits to referrer (with tier bonus if applicable)
      prisma.client.update({
        where: { id: referrerId },
        data: {
          referralCreditsEarned: { increment: referrerReward + tierBonus },
          referralCreditsBalance: { increment: referrerReward + tierBonus },
          referralTier: newTier,
          ...(tierBonus > 0 && {
            referralTierBonusEarned: { increment: tierBonus },
          }),
        },
      }),
      // Award credits to referee
      prisma.client.update({
        where: { id: refereeId },
        data: {
          referralCreditsBalance: { increment: refereeReward },
        },
      }),
    ]);

    return { success: true, tierUpgrade };
  } catch (error) {
    console.error('Failed to award referral credits:', error);
    return { success: false, error: 'Failed to award credits' };
  }
}

/**
 * Apply referral credits to a booking
 */
export async function applyReferralCredits(
  clientId: string,
  bookingAmount: number
): Promise<{ creditsApplied: number; newBalance: number }> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { referralCreditsBalance: true },
  });

  if (!client || client.referralCreditsBalance <= 0) {
    return { creditsApplied: 0, newBalance: 0 };
  }

  // Apply credits up to the booking amount
  const creditsToApply = Math.min(client.referralCreditsBalance, bookingAmount);

  // Update client credits
  await prisma.client.update({
    where: { id: clientId },
    data: {
      referralCreditsUsed: { increment: creditsToApply },
      referralCreditsBalance: { decrement: creditsToApply },
    },
  });

  return {
    creditsApplied: creditsToApply,
    newBalance: client.referralCreditsBalance - creditsToApply,
  };
}
