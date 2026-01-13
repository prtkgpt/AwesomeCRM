import { prisma } from './prisma';

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
 */
export async function awardReferralCredits(
  referrerId: string,
  refereeId: string,
  companyId: string
): Promise<{ success: boolean; error?: string }> {
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

    // Award credits to both parties in a transaction
    await prisma.$transaction([
      // Award credits to referrer
      prisma.client.update({
        where: { id: referrerId },
        data: {
          referralCreditsEarned: { increment: referrerReward },
          referralCreditsBalance: { increment: referrerReward },
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

    return { success: true };
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
