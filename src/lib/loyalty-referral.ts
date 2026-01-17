// ============================================
// CleanDayCRM - Loyalty & Referral Programs
// ============================================

import { prisma } from './prisma';
import { ReferralTier, LoyaltyTier, CreditType, CreditStatus } from '@prisma/client';
import { generateReferralCode } from './auth';

// ============================================
// REFERRAL PROGRAM
// ============================================

interface ReferralConfig {
  referrerReward: number;
  refereeReward: number;
  creditExpiryDays: number;
}

/**
 * Generate a unique referral code for a client
 */
export async function createReferralCode(
  clientId: string
): Promise<string> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    throw new Error('Client not found');
  }

  if (client.referralCode) {
    return client.referralCode;
  }

  let code: string;
  let isUnique = false;

  // Generate unique code
  while (!isUnique) {
    code = generateReferralCode(client.firstName);
    const existing = await prisma.client.findUnique({
      where: { referralCode: code },
    });
    if (!existing) {
      isUnique = true;
    }
  }

  await prisma.client.update({
    where: { id: clientId },
    data: { referralCode: code! },
  });

  return code!;
}

/**
 * Apply a referral code for a new client
 */
export async function applyReferralCode(
  newClientId: string,
  referralCode: string,
  companyId: string
): Promise<{ success: boolean; message: string; referrerId?: string }> {
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

  if (!company?.referralEnabled) {
    return { success: false, message: 'Referral program is not enabled' };
  }

  // Find the referrer
  const referrer = await prisma.client.findFirst({
    where: {
      referralCode,
      companyId,
      isActive: true,
    },
  });

  if (!referrer) {
    return { success: false, message: 'Invalid referral code' };
  }

  const newClient = await prisma.client.findUnique({
    where: { id: newClientId },
  });

  if (!newClient) {
    return { success: false, message: 'New client not found' };
  }

  if (newClient.referredById) {
    return { success: false, message: 'Client already has a referrer' };
  }

  if (referrer.id === newClientId) {
    return { success: false, message: 'Cannot refer yourself' };
  }

  const config: ReferralConfig = {
    referrerReward: company.referralReferrerReward || 25,
    refereeReward: company.referralRefereeReward || 25,
    creditExpiryDays: company.referralCreditExpiry || 365,
  };

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.creditExpiryDays);

  // Transaction to update both clients
  await prisma.$transaction(async (tx) => {
    // Link new client to referrer
    await tx.client.update({
      where: { id: newClientId },
      data: {
        referredById: referrer.id,
      },
    });

    // Credit the referrer
    if (config.referrerReward > 0) {
      const referrerNewBalance = referrer.creditBalance + config.referrerReward;

      await tx.client.update({
        where: { id: referrer.id },
        data: {
          creditBalance: referrerNewBalance,
        },
      });

      await tx.creditTransaction.create({
        data: {
          clientId: referrer.id,
          type: CreditType.REFERRAL_EARNED,
          amount: config.referrerReward,
          balance: referrerNewBalance,
          description: `Referral reward for ${newClient.firstName}`,
          referenceType: 'REFERRAL',
          referenceId: newClientId,
          expiresAt,
          status: CreditStatus.ACTIVE,
        },
      });
    }

    // Credit the new client (referee)
    if (config.refereeReward > 0) {
      const refereeNewBalance = newClient.creditBalance + config.refereeReward;

      await tx.client.update({
        where: { id: newClientId },
        data: {
          creditBalance: refereeNewBalance,
        },
      });

      await tx.creditTransaction.create({
        data: {
          clientId: newClientId,
          type: CreditType.REFERRAL_EARNED,
          amount: config.refereeReward,
          balance: refereeNewBalance,
          description: `Welcome bonus from ${referrer.firstName}`,
          referenceType: 'REFERRAL',
          referenceId: referrer.id,
          expiresAt,
          status: CreditStatus.ACTIVE,
        },
      });
    }

    // Update referrer's tier
    await updateReferralTier(referrer.id, tx);
  });

  return {
    success: true,
    message: `Referral applied! You received $${config.refereeReward} credit.`,
    referrerId: referrer.id,
  };
}

/**
 * Update a client's referral tier based on their referral count
 */
async function updateReferralTier(
  clientId: string,
  tx?: any
): Promise<ReferralTier> {
  const prismaClient = tx || prisma;

  const referralCount = await prismaClient.client.count({
    where: { referredById: clientId },
  });

  let newTier: ReferralTier;
  let tierBonus = 0;

  if (referralCount >= 20) {
    newTier = ReferralTier.PLATINUM;
    tierBonus = 100; // $100 bonus for reaching Platinum
  } else if (referralCount >= 10) {
    newTier = ReferralTier.GOLD;
    tierBonus = 50; // $50 bonus for reaching Gold
  } else if (referralCount >= 5) {
    newTier = ReferralTier.SILVER;
    tierBonus = 25; // $25 bonus for reaching Silver
  } else if (referralCount >= 1) {
    newTier = ReferralTier.BRONZE;
    tierBonus = 10; // $10 bonus for reaching Bronze
  } else {
    newTier = ReferralTier.NONE;
  }

  const client = await prismaClient.client.findUnique({
    where: { id: clientId },
    select: { referralTier: true, creditBalance: true },
  });

  if (!client) return ReferralTier.NONE;

  // Check if tier increased
  const tierOrder = [ReferralTier.NONE, ReferralTier.BRONZE, ReferralTier.SILVER, ReferralTier.GOLD, ReferralTier.PLATINUM];
  const currentTierIndex = tierOrder.indexOf(client.referralTier);
  const newTierIndex = tierOrder.indexOf(newTier);

  if (newTierIndex > currentTierIndex && tierBonus > 0) {
    // Award tier bonus
    const newBalance = client.creditBalance + tierBonus;

    await prismaClient.client.update({
      where: { id: clientId },
      data: {
        referralTier: newTier,
        creditBalance: newBalance,
      },
    });

    await prismaClient.creditTransaction.create({
      data: {
        clientId,
        type: CreditType.TIER_BONUS,
        amount: tierBonus,
        balance: newBalance,
        description: `${newTier} tier bonus`,
        status: CreditStatus.ACTIVE,
      },
    });
  } else {
    await prismaClient.client.update({
      where: { id: clientId },
      data: { referralTier: newTier },
    });
  }

  return newTier;
}

/**
 * Get referral statistics for a client
 */
export async function getReferralStats(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      referrals: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          totalBookings: true,
          totalSpent: true,
        },
      },
      creditTransactions: {
        where: {
          type: {
            in: [CreditType.REFERRAL_EARNED, CreditType.TIER_BONUS],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  if (!client) {
    throw new Error('Client not found');
  }

  const totalEarned = await prisma.creditTransaction.aggregate({
    where: {
      clientId,
      type: { in: [CreditType.REFERRAL_EARNED, CreditType.TIER_BONUS] },
      amount: { gt: 0 },
    },
    _sum: { amount: true },
  });

  return {
    referralCode: client.referralCode,
    tier: client.referralTier,
    totalReferrals: client.referrals.length,
    activeReferrals: client.referrals.filter(r => r.totalBookings > 0).length,
    totalEarned: totalEarned._sum.amount || 0,
    currentBalance: client.creditBalance,
    referrals: client.referrals,
    recentTransactions: client.creditTransactions,
    nextTier: getNextReferralTier(client.referralTier, client.referrals.length),
  };
}

function getNextReferralTier(
  currentTier: ReferralTier,
  referralCount: number
): { tier: ReferralTier; referralsNeeded: number } | null {
  switch (currentTier) {
    case ReferralTier.NONE:
      return { tier: ReferralTier.BRONZE, referralsNeeded: 1 - referralCount };
    case ReferralTier.BRONZE:
      return { tier: ReferralTier.SILVER, referralsNeeded: 5 - referralCount };
    case ReferralTier.SILVER:
      return { tier: ReferralTier.GOLD, referralsNeeded: 10 - referralCount };
    case ReferralTier.GOLD:
      return { tier: ReferralTier.PLATINUM, referralsNeeded: 20 - referralCount };
    case ReferralTier.PLATINUM:
      return null; // Already at max tier
  }
}

// ============================================
// LOYALTY PROGRAM
// ============================================

/**
 * Award loyalty points for a completed booking
 */
export async function awardLoyaltyPoints(
  bookingId: string
): Promise<{ pointsAwarded: number; newTotal: number; tierChanged: boolean }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      client: true,
      company: {
        select: {
          loyaltyEnabled: true,
          loyaltyPointsPerDollar: true,
        },
      },
    },
  });

  if (!booking || !booking.company.loyaltyEnabled) {
    return { pointsAwarded: 0, newTotal: 0, tierChanged: false };
  }

  if (booking.status !== 'COMPLETED') {
    return { pointsAwarded: 0, newTotal: booking.client.loyaltyPoints, tierChanged: false };
  }

  const pointsPerDollar = booking.company.loyaltyPointsPerDollar || 1;
  const pointsToAward = Math.floor(booking.finalPrice * pointsPerDollar);

  const newTotalPoints = booking.client.loyaltyPoints + pointsToAward;
  const newTotalSpent = booking.client.totalSpent + booking.finalPrice;
  const newTotalBookings = booking.client.totalBookings + 1;

  // Determine new tier
  const newTier = calculateLoyaltyTier(newTotalBookings, newTotalSpent);
  const tierChanged = newTier !== booking.client.loyaltyTier;

  await prisma.client.update({
    where: { id: booking.clientId },
    data: {
      loyaltyPoints: newTotalPoints,
      totalSpent: newTotalSpent,
      totalBookings: newTotalBookings,
      loyaltyTier: newTier,
      lastBookingDate: booking.scheduledDate,
      firstBookingDate: booking.client.firstBookingDate || booking.scheduledDate,
    },
  });

  // Record the points transaction
  await prisma.creditTransaction.create({
    data: {
      clientId: booking.clientId,
      type: CreditType.LOYALTY_EARNED,
      amount: pointsToAward,
      balance: newTotalPoints,
      description: `Points for booking #${booking.bookingNumber}`,
      referenceType: 'BOOKING',
      referenceId: bookingId,
      status: CreditStatus.ACTIVE,
    },
  });

  return {
    pointsAwarded: pointsToAward,
    newTotal: newTotalPoints,
    tierChanged,
  };
}

/**
 * Calculate loyalty tier based on bookings and spending
 */
function calculateLoyaltyTier(
  totalBookings: number,
  totalSpent: number
): LoyaltyTier {
  // Diamond: 100+ bookings OR $6000+ spent
  if (totalBookings >= 100 || totalSpent >= 6000) {
    return LoyaltyTier.DIAMOND;
  }
  // Platinum: 50+ bookings OR $3000+ spent
  if (totalBookings >= 50 || totalSpent >= 3000) {
    return LoyaltyTier.PLATINUM;
  }
  // Gold: 25+ bookings OR $1500+ spent
  if (totalBookings >= 25 || totalSpent >= 1500) {
    return LoyaltyTier.GOLD;
  }
  // Silver: 10+ bookings OR $500+ spent
  if (totalBookings >= 10 || totalSpent >= 500) {
    return LoyaltyTier.SILVER;
  }
  // Basic: everyone else
  return LoyaltyTier.BASIC;
}

/**
 * Redeem loyalty points for credit
 */
export async function redeemLoyaltyPoints(
  clientId: string,
  pointsToRedeem: number,
  companyId: string
): Promise<{ success: boolean; creditAmount: number; message: string }> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      loyaltyEnabled: true,
      loyaltyPointsValue: true,
    },
  });

  if (!company?.loyaltyEnabled) {
    return { success: false, creditAmount: 0, message: 'Loyalty program is not enabled' };
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    return { success: false, creditAmount: 0, message: 'Client not found' };
  }

  if (client.loyaltyPoints < pointsToRedeem) {
    return {
      success: false,
      creditAmount: 0,
      message: `Insufficient points. You have ${client.loyaltyPoints} points.`,
    };
  }

  const pointValue = company.loyaltyPointsValue || 0.01; // $0.01 per point default
  const creditAmount = pointsToRedeem * pointValue;

  const newPoints = client.loyaltyPoints - pointsToRedeem;
  const newCreditBalance = client.creditBalance + creditAmount;

  await prisma.$transaction(async (tx) => {
    // Deduct points
    await tx.client.update({
      where: { id: clientId },
      data: {
        loyaltyPoints: newPoints,
        creditBalance: newCreditBalance,
      },
    });

    // Record points redemption
    await tx.creditTransaction.create({
      data: {
        clientId,
        type: CreditType.LOYALTY_USED,
        amount: -pointsToRedeem,
        balance: newPoints,
        description: `Redeemed ${pointsToRedeem} points for $${creditAmount.toFixed(2)} credit`,
        status: CreditStatus.USED,
      },
    });

    // Record credit addition
    await tx.creditTransaction.create({
      data: {
        clientId,
        type: CreditType.LOYALTY_EARNED,
        amount: creditAmount,
        balance: newCreditBalance,
        description: `Credit from ${pointsToRedeem} loyalty points`,
        status: CreditStatus.ACTIVE,
      },
    });
  });

  return {
    success: true,
    creditAmount,
    message: `Successfully redeemed ${pointsToRedeem} points for $${creditAmount.toFixed(2)} credit`,
  };
}

/**
 * Get loyalty program statistics for a client
 */
export async function getLoyaltyStats(clientId: string, companyId: string) {
  const [client, company] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: {
        loyaltyPoints: true,
        loyaltyTier: true,
        totalBookings: true,
        totalSpent: true,
        creditBalance: true,
        firstBookingDate: true,
        lastBookingDate: true,
      },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        loyaltyEnabled: true,
        loyaltyPointsPerDollar: true,
        loyaltyPointsValue: true,
      },
    }),
  ]);

  if (!client || !company) {
    throw new Error('Client or company not found');
  }

  const pointValue = company.loyaltyPointsValue || 0.01;
  const creditValue = client.loyaltyPoints * pointValue;

  return {
    points: client.loyaltyPoints,
    tier: client.loyaltyTier,
    totalBookings: client.totalBookings,
    totalSpent: client.totalSpent,
    creditBalance: client.creditBalance,
    pointsCreditValue: creditValue,
    tierBenefits: getLoyaltyTierBenefits(client.loyaltyTier),
    nextTier: getNextLoyaltyTier(client.loyaltyTier, client.totalBookings, client.totalSpent),
    memberSince: client.firstBookingDate,
  };
}

/**
 * Get benefits for a loyalty tier
 */
function getLoyaltyTierBenefits(tier: LoyaltyTier): {
  discountPercent: number;
  freeAddons: string[];
  priorityBooking: boolean;
  exclusiveOffers: boolean;
} {
  switch (tier) {
    case LoyaltyTier.DIAMOND:
      return {
        discountPercent: 20,
        freeAddons: ['Inside fridge', 'Inside oven', 'Inside cabinets'],
        priorityBooking: true,
        exclusiveOffers: true,
      };
    case LoyaltyTier.PLATINUM:
      return {
        discountPercent: 15,
        freeAddons: ['Inside fridge', 'Inside oven'],
        priorityBooking: true,
        exclusiveOffers: true,
      };
    case LoyaltyTier.GOLD:
      return {
        discountPercent: 10,
        freeAddons: ['Inside fridge'],
        priorityBooking: true,
        exclusiveOffers: false,
      };
    case LoyaltyTier.SILVER:
      return {
        discountPercent: 5,
        freeAddons: [],
        priorityBooking: false,
        exclusiveOffers: false,
      };
    case LoyaltyTier.BASIC:
    default:
      return {
        discountPercent: 0,
        freeAddons: [],
        priorityBooking: false,
        exclusiveOffers: false,
      };
  }
}

function getNextLoyaltyTier(
  currentTier: LoyaltyTier,
  bookings: number,
  spent: number
): { tier: LoyaltyTier; bookingsNeeded: number; spendNeeded: number } | null {
  switch (currentTier) {
    case LoyaltyTier.BASIC:
      return {
        tier: LoyaltyTier.SILVER,
        bookingsNeeded: Math.max(0, 10 - bookings),
        spendNeeded: Math.max(0, 500 - spent),
      };
    case LoyaltyTier.SILVER:
      return {
        tier: LoyaltyTier.GOLD,
        bookingsNeeded: Math.max(0, 25 - bookings),
        spendNeeded: Math.max(0, 1500 - spent),
      };
    case LoyaltyTier.GOLD:
      return {
        tier: LoyaltyTier.PLATINUM,
        bookingsNeeded: Math.max(0, 50 - bookings),
        spendNeeded: Math.max(0, 3000 - spent),
      };
    case LoyaltyTier.PLATINUM:
      return {
        tier: LoyaltyTier.DIAMOND,
        bookingsNeeded: Math.max(0, 100 - bookings),
        spendNeeded: Math.max(0, 6000 - spent),
      };
    case LoyaltyTier.DIAMOND:
      return null; // Already at max tier
  }
}

// ============================================
// CREDIT MANAGEMENT
// ============================================

/**
 * Apply credits to a booking
 */
export async function applyCreditsToBooking(
  bookingId: string,
  creditAmount: number
): Promise<{ success: boolean; appliedAmount: number; message: string }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { client: true },
  });

  if (!booking) {
    return { success: false, appliedAmount: 0, message: 'Booking not found' };
  }

  if (booking.isPaid) {
    return { success: false, appliedAmount: 0, message: 'Booking is already paid' };
  }

  const maxApplicable = Math.min(creditAmount, booking.client.creditBalance, booking.finalPrice);

  if (maxApplicable <= 0) {
    return { success: false, appliedAmount: 0, message: 'No credits available to apply' };
  }

  const newCreditBalance = booking.client.creditBalance - maxApplicable;
  const newFinalPrice = booking.finalPrice - maxApplicable;

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        creditsApplied: { increment: maxApplicable },
        finalPrice: newFinalPrice,
      },
    });

    await tx.client.update({
      where: { id: booking.clientId },
      data: {
        creditBalance: newCreditBalance,
      },
    });

    await tx.creditTransaction.create({
      data: {
        clientId: booking.clientId,
        type: CreditType.REFERRAL_USED,
        amount: -maxApplicable,
        balance: newCreditBalance,
        description: `Applied to booking #${booking.bookingNumber}`,
        referenceType: 'BOOKING',
        referenceId: bookingId,
        status: CreditStatus.USED,
        usedAt: new Date(),
      },
    });
  });

  return {
    success: true,
    appliedAmount: maxApplicable,
    message: `$${maxApplicable.toFixed(2)} credit applied`,
  };
}

/**
 * Expire old credits
 */
export async function expireOldCredits(): Promise<number> {
  const now = new Date();

  const expiredCredits = await prisma.creditTransaction.findMany({
    where: {
      status: CreditStatus.ACTIVE,
      expiresAt: { lte: now },
      amount: { gt: 0 },
    },
    include: { client: true },
  });

  let expiredCount = 0;

  for (const credit of expiredCredits) {
    await prisma.$transaction(async (tx) => {
      // Mark credit as expired
      await tx.creditTransaction.update({
        where: { id: credit.id },
        data: { status: CreditStatus.EXPIRED },
      });

      // Deduct from client balance
      await tx.client.update({
        where: { id: credit.clientId },
        data: {
          creditBalance: { decrement: credit.amount },
        },
      });

      // Create expiry record
      await tx.creditTransaction.create({
        data: {
          clientId: credit.clientId,
          type: CreditType.REFERRAL_EXPIRED,
          amount: -credit.amount,
          balance: credit.client.creditBalance - credit.amount,
          description: `Credit expired`,
          referenceType: credit.referenceType,
          referenceId: credit.id,
          status: CreditStatus.EXPIRED,
        },
      });
    });

    expiredCount++;
  }

  return expiredCount;
}
