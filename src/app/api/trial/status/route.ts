import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/trial/status - Get the current user's company trial status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        company: {
          select: {
            plan: true,
            trialEndsAt: true,
          },
        },
      },
    });

    if (!user?.company) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    const { plan, trialEndsAt } = user.company;
    const now = new Date();

    let daysRemaining: number | null = null;
    let isExpired = false;
    let isTrialActive = false;

    if (trialEndsAt) {
      const diffMs = trialEndsAt.getTime() - now.getTime();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      isExpired = diffMs < 0;
      isTrialActive = diffMs >= 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        plan,
        trialEndsAt,
        daysRemaining,
        isExpired,
        isTrialActive,
      },
    });
  } catch (error) {
    console.error('Trial status: error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trial status' },
      { status: 500 }
    );
  }
}
