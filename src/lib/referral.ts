import { prisma } from './prisma';

// Credit expiration period (in days)
export const CREDIT_EXPIRATION_DAYS = 180; // 6 months

// Tier thresholds and bonuses
export const TIER_CONFIG = {
  BRONZE: { minReferrals: 1, maxReferrals: 4, bonus: 10, name: 'Bronze', color: '#cd7f32' },
  SILVER: { minReferrals: 5, maxReferrals: 9, bonus: 25, name: 'Silver', color: '#c0c0c0' },
  GOLD: { minReferrals: 10, maxReferrals: 19, bonus: 50, name: 'Gold', color: '#ffd700' },
  PLATINUM: { minReferrals: 20, maxReferrals: Infinity, bonus: 100, name: 'Platinum', color: '#e5e4e2' },
};

/**
 * Calculate referral tier based on number of successful referrals
 */
export function calculateReferralTier(referralCount: number): 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' {
  if (referralCount >= TIER_CONFIG.PLATINUM.minReferrals) return 'PLATINUM';
  if (referralCount >= TIER_CONFIG.GOLD.minReferrals) return 'GOLD';
  if (referralCount >= TIER_CONFIG.SILVER.minReferrals) return 'SILVER';
  if (referralCount >= TIER_CONFIG.BRONZE.minReferrals) return 'BRONZE';
  return 'NONE';
}

/**
 * Get tier info for display
 */
export function getTierInfo(tier: 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM') {
  if (tier === 'NONE') return { name: 'None', color: '#9ca3af', icon: '⭐', bonus: 0 };
  if (tier === 'BRONZE') return { ...TIER_CONFIG.BRONZE, icon: '🥉' };
  if (tier === 'SILVER') return { ...TIER_CONFIG.SILVER, icon: '🥈' };
  if (tier === 'GOLD') return { ...TIER_CONFIG.GOLD, icon: '🥇' };
  return { ...TIER_CONFIG.PLATINUM, icon: '💎' };
}

/**
 * Generate a unique referral code for a client
 * Format: FIRSTNAME-XXXXX (e.g., "JOHN-A3K9Z")
 */
export function generateReferralCode(firstName: string, clientId: string): string {
  // Clean first name
  const cleanName = (firstName || 'CLIENT').toUpperCase().replace(/[^A-Z]/g, '');
  const limitedFirstName = cleanName.substring(0, 10);

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
      firstName: true,
      lastName: true,
    },
  });

  if (!client) {
    return { valid: false };
  }

  return {
    valid: true,
    clientId: client.id,
    clientName: `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Customer',
  };
}

/**
 * Award referral credits to both referrer and referee
 * Uses CreditTransaction model for tracking
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
        referralCreditExpiry: true,
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
    expiresAt.setDate(expiresAt.getDate() + (company.referralCreditExpiry || 365));

    // Get referrer's current credit balance
    const referrerCredits = await prisma.creditTransaction.aggregate({
      where: { clientId: referrerId, status: 'ACTIVE' },
      _sum: { amount: true },
    });
    const referrerBalance = referrerCredits._sum.amount || 0;

    // Get referee's current credit balance
    const refereeCredits = await prisma.creditTransaction.aggregate({
      where: { clientId: refereeId, status: 'ACTIVE' },
      _sum: { amount: true },
    });
    const refereeBalance = refereeCredits._sum.amount || 0;

    // Award credits to both parties in a transaction
    await prisma.$transaction(async (tx) => {
      // Update referrer tier
      await tx.client.update({
        where: { id: referrerId },
        data: {
          referralTier: newTier,
        },
      });

      // Create credit transaction for referrer's base reward
      if (referrerReward > 0) {
        await tx.creditTransaction.create({
          data: {
            clientId: referrerId,
            amount: referrerReward,
            balance: referrerBalance + referrerReward + tierBonus,
            type: 'REFERRAL_EARNED',
            description: `Referral reward`,
            referenceType: 'REFERRAL',
            referenceId: refereeId,
            expiresAt: expiresAt,
            status: 'ACTIVE',
          },
        });
      }

      // Create credit transaction for tier bonus if applicable
      if (tierBonus > 0) {
        await tx.creditTransaction.create({
          data: {
            clientId: referrerId,
            amount: tierBonus,
            balance: referrerBalance + referrerReward + tierBonus,
            type: 'TIER_BONUS',
            description: `${newTier} tier bonus`,
            referenceType: 'TIER_BONUS',
            expiresAt: expiresAt,
            status: 'ACTIVE',
          },
        });
      }

      // Create credit transaction for referee's welcome credit
      if (refereeReward > 0) {
        await tx.creditTransaction.create({
          data: {
            clientId: refereeId,
            amount: refereeReward,
            balance: refereeBalance + refereeReward,
            type: 'REFERRAL_EARNED',
            description: `Welcome credit for using referral code`,
            referenceType: 'REFERRAL',
            expiresAt: expiresAt,
            status: 'ACTIVE',
          },
        });
      }
    });

    return { success: true, tierUpgrade };
  } catch (error) {
    console.error('Failed to award referral credits:', error);
    return { success: false, error: 'Failed to award credits' };
  }
}

/**
 * Get client's current credit balance
 */
export async function getClientCreditBalance(clientId: string): Promise<number> {
  const result = await prisma.creditTransaction.aggregate({
    where: {
      clientId,
      status: 'ACTIVE',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    _sum: { amount: true },
  });
  return result._sum.amount || 0;
}

/**
 * Apply credits to a booking using FIFO (oldest credits first)
 */
export async function applyCredits(
  clientId: string,
  bookingAmount: number,
  bookingId?: string
): Promise<{ creditsApplied: number; newBalance: number }> {
  const currentBalance = await getClientCreditBalance(clientId);

  if (currentBalance <= 0) {
    return { creditsApplied: 0, newBalance: 0 };
  }

  // Get active credits ordered by expiration date (FIFO - use oldest first)
  const activeCredits = await prisma.creditTransaction.findMany({
    where: {
      clientId: clientId,
      status: 'ACTIVE',
      amount: { gt: 0 },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: {
      expiresAt: 'asc', // Oldest expiring first
    },
  });

  let remainingAmount = Math.min(currentBalance, bookingAmount);
  let totalApplied = 0;

  // Apply credits using FIFO
  await prisma.$transaction(async (tx) => {
    for (const credit of activeCredits) {
      if (remainingAmount <= 0) break;

      const amountToUse = Math.min(credit.amount, remainingAmount);

      // Mark credit as used (partially or fully)
      if (amountToUse >= credit.amount) {
        // Use entire credit
        await tx.creditTransaction.update({
          where: { id: credit.id },
          data: {
            status: 'USED',
            usedAt: new Date(),
          },
        });
      } else {
        // Partial use - reduce the amount of this credit
        await tx.creditTransaction.update({
          where: { id: credit.id },
          data: {
            amount: credit.amount - amountToUse,
          },
        });
      }

      // Create USED transaction record
      await tx.creditTransaction.create({
        data: {
          clientId: clientId,
          amount: -amountToUse, // Negative for usage
          balance: currentBalance - totalApplied - amountToUse,
          type: 'REFERRAL_USED',
          description: bookingId ? `Applied to booking ${bookingId}` : 'Applied to booking',
          referenceType: 'BOOKING',
          referenceId: bookingId,
          status: 'USED',
          usedAt: new Date(),
        },
      });

      totalApplied += amountToUse;
      remainingAmount -= amountToUse;
    }
  });

  return {
    creditsApplied: totalApplied,
    newBalance: currentBalance - totalApplied,
  };
}

/**
 * Expire old credits that have passed their expiration date
 */
export async function expireOldCredits(companyId?: string): Promise<{ expiredCount: number; expiredAmount: number }> {
  const now = new Date();

  // Find all active credits that have expired
  const expiredCredits = await prisma.creditTransaction.findMany({
    where: {
      status: 'ACTIVE',
      amount: { gt: 0 },
      expiresAt: {
        lte: now,
      },
      ...(companyId && {
        client: { companyId }
      }),
    },
    include: {
      client: { select: { id: true } },
    },
  });

  if (expiredCredits.length === 0) {
    return { expiredCount: 0, expiredAmount: 0 };
  }

  let totalExpiredAmount = 0;

  // Mark all expired credits
  await prisma.$transaction(async (tx) => {
    for (const credit of expiredCredits) {
      // Mark credit as expired
      await tx.creditTransaction.update({
        where: { id: credit.id },
        data: {
          status: 'EXPIRED',
        },
      });

      // Create EXPIRED transaction record for audit trail
      await tx.creditTransaction.create({
        data: {
          clientId: credit.clientId,
          amount: -credit.amount, // Negative to show removal
          balance: 0, // Will be recalculated
          type: 'REFERRAL_EXPIRED',
          description: `Credit expired`,
          status: 'EXPIRED',
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

  const expiringCredits = await prisma.creditTransaction.findMany({
    where: {
      clientId: clientId,
      status: 'ACTIVE',
      amount: { gt: 0 },
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
