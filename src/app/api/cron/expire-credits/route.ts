import { NextRequest, NextResponse } from 'next/server';
import { expireOldCredits } from '@/lib/referral';

/**
 * POST /api/cron/expire-credits
 * Expire referral credits that have passed their expiration date
 * This can be called by a cron job or manually by admins
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('⏰ Starting credit expiration job...');

    // Expire old credits across all companies
    const result = await expireOldCredits();

    console.log(`✅ Credit expiration job completed: ${result.expiredCount} credits expired, $${result.expiredAmount.toFixed(2)} total`);

    return NextResponse.json({
      success: true,
      expiredCount: result.expiredCount,
      expiredAmount: result.expiredAmount,
      message: `Expired ${result.expiredCount} credits totaling $${result.expiredAmount.toFixed(2)}`,
    });
  } catch (error) {
    console.error('Failed to expire credits:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to expire credits' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/expire-credits
 * Get count of credits that would be expired
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { prisma } = await import('@/lib/prisma');
    const now = new Date();

    // Count expired credits
    const count = await prisma.referralCreditTransaction.count({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lte: now,
        },
      },
    });

    // Sum expired amount
    const sum = await prisma.referralCreditTransaction.aggregate({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lte: now,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return NextResponse.json({
      success: true,
      expiredCount: count,
      expiredAmount: sum._sum.amount || 0,
    });
  } catch (error) {
    console.error('Failed to check expired credits:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check expired credits' },
      { status: 500 }
    );
  }
}
