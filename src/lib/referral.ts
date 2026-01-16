import { prisma } from './prisma';

// Credit expiration period (in days)
export const CREDIT_EXPIRATION_DAYS = 180; // 6 months

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

    // Calculate expiration date for credits
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CREDIT_EXPIRATION_DAYS);

    // Award credits to both parties in a transaction
    await prisma.$transaction(async (tx) => {
      // Update referrer totals (with tier bonus if applicable)
      await tx.client.update({
        where: { id: referrerId },
        data: {
          referralCreditsEarned: { increment: referrerReward + tierBonus },
          referralCreditsBalance: { increment: referrerReward + tierBonus },
          referralTier: newTier,
          ...(tierBonus > 0 && {
            referralTierBonusEarned: { increment: tierBonus },
          }),
        },
      });

      // Create transaction record for referrer's base reward
      await tx.referralCreditTransaction.create({
        data: {
          clientId: referrerId,
          companyId: companyId,
          amount: referrerReward,
          type: 'EARNED',
          description: `Referral reward`,
          expiresAt: expiresAt,
          status: 'ACTIVE',
          relatedReferralId: refereeId,
        },
      });

      // Create transaction record for tier bonus if applicable
      if (tierBonus > 0) {
        await tx.referralCreditTransaction.create({
          data: {
            clientId: referrerId,
            companyId: companyId,
            amount: tierBonus,
            type: 'TIER_BONUS',
            description: `${newTier} tier bonus`,
            expiresAt: expiresAt,
            status: 'ACTIVE',
          },
        });
      }

      // Update referee totals
      await tx.client.update({
        where: { id: refereeId },
        data: {
          referralCreditsBalance: { increment: refereeReward },
        },
      });

      // Create transaction record for referee's welcome credit
      await tx.referralCreditTransaction.create({
        data: {
          clientId: refereeId,
          companyId: companyId,
          amount: refereeReward,
          type: 'EARNED',
          description: `Welcome credit for using referral code`,
          expiresAt: expiresAt,
          status: 'ACTIVE',
        },
      });
    });

    return { success: true, tierUpgrade };
  } catch (error) {
    console.error('Failed to award referral credits:', error);
    return { success: false, error: 'Failed to award credits' };
  }
}

/**
 * Apply referral credits to a booking using FIFO (oldest credits first)
 */
export async function applyReferralCredits(
  clientId: string,
  bookingAmount: number,
  bookingId?: string
): Promise<{ creditsApplied: number; newBalance: number }> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { referralCreditsBalance: true, companyId: true },
  });

  if (!client || client.referralCreditsBalance <= 0) {
    return { creditsApplied: 0, newBalance: 0 };
  }

  // Get active credits ordered by expiration date (FIFO - use oldest first)
  const activeCredits = await prisma.referralCreditTransaction.findMany({
    where: {
      clientId: clientId,
      status: 'ACTIVE',
      type: { in: ['EARNED', 'TIER_BONUS'] },
    },
    orderBy: {
      expiresAt: 'asc', // Oldest expiring first
    },
  });

  let remainingAmount = Math.min(client.referralCreditsBalance, bookingAmount);
  let totalApplied = 0;

  // Apply credits using FIFO
  await prisma.$transaction(async (tx) => {
    for (const credit of activeCredits) {
      if (remainingAmount <= 0) break;

      const amountToUse = Math.min(credit.amount, remainingAmount);

      // Mark credit as used (or partially update if we need to split)
      if (amountToUse >= credit.amount) {
        // Use entire credit
        await tx.referralCreditTransaction.update({
          where: { id: credit.id },
          data: {
            status: 'USED',
            expiresAt: null, // Clear expiration since it's used
          },
        });
      } else {
        // Partial use - reduce the amount of this credit
        await tx.referralCreditTransaction.update({
          where: { id: credit.id },
          data: {
            amount: credit.amount - amountToUse,
          },
        });
      }

      // Create USED transaction record
      await tx.referralCreditTransaction.create({
        data: {
          clientId: clientId,
          companyId: client.companyId,
          amount: -amountToUse, // Negative for usage
          type: 'USED',
          description: bookingId ? `Applied to booking #${bookingId}` : 'Applied to booking',
          status: 'USED',
          relatedBookingId: bookingId,
        },
      });

      totalApplied += amountToUse;
      remainingAmount -= amountToUse;
    }

    // Update client totals
    await tx.client.update({
      where: { id: clientId },
      data: {
        referralCreditsUsed: { increment: totalApplied },
        referralCreditsBalance: { decrement: totalApplied },
      },
    });
  });

  return {
    creditsApplied: totalApplied,
    newBalance: client.referralCreditsBalance - totalApplied,
  };
}

/**
 * Expire old credits that have passed their expiration date
 * Returns the number of credits expired
 */
export async function expireOldCredits(companyId?: string): Promise<{ expiredCount: number; expiredAmount: number }> {
  const now = new Date();

  // Find all active credits that have expired
  const expiredCredits = await prisma.referralCreditTransaction.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: {
        lte: now, // Expiration date is in the past
      },
      ...(companyId && { companyId }),
    },
  });

  if (expiredCredits.length === 0) {
    return { expiredCount: 0, expiredAmount: 0 };
  }

  let totalExpiredAmount = 0;

  // Mark all expired credits and update client balances
  await prisma.$transaction(async (tx) => {
    for (const credit of expiredCredits) {
      // Mark credit as expired
      await tx.referralCreditTransaction.update({
        where: { id: credit.id },
        data: {
          status: 'EXPIRED',
          expiresAt: null, // Clear since it's now expired
        },
      });

      // Create EXPIRED transaction record for audit trail
      await tx.referralCreditTransaction.create({
        data: {
          clientId: credit.clientId,
          companyId: credit.companyId,
          amount: -credit.amount, // Negative to show removal
          type: 'EXPIRED',
          description: `Credit expired`,
          status: 'EXPIRED',
        },
      });

      // Update client balance
      await tx.client.update({
        where: { id: credit.clientId },
        data: {
          referralCreditsBalance: { decrement: credit.amount },
        },
      });

      totalExpiredAmount += credit.amount;
    }
  });

  console.log(`⏰ Expired ${expiredCredits.length} credits totaling $${totalExpiredAmount.toFixed(2)}`);

  return {
    expiredCount: expiredCredits.length,
    expiredAmount: totalExpiredAmount,
  };
}

/**
 * Get credits expiring soon (within X days)
 */
export async function getExpiringCredits(
  clientId: string,
  daysUntilExpiration: number = 30
): Promise<{ amount: number; expiresAt: Date | null }[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysUntilExpiration);

  const expiringCredits = await prisma.referralCreditTransaction.findMany({
    where: {
      clientId: clientId,
      status: 'ACTIVE',
      expiresAt: {
        lte: futureDate,
        gte: new Date(), // Not already expired
      },
    },
    select: {
      amount: true,
      expiresAt: true,
    },
    orderBy: {
      expiresAt: 'asc',
    },
  });

  return expiringCredits;
}
