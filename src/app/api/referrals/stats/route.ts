import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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
              firstName: true,
              lastName: true,
              email: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    } else {
      // For non-admin users, find client by email
      client = await prisma.client.findFirst({
        where: { email: session.user.email, companyId: user.companyId },
        include: {
          referrals: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
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
    const referralCount = client.referrals.length;

    // Format referrals with computed names
    const formattedReferrals = client.referrals.map(r => ({
      id: r.id,
      name: `${r.firstName || ''} ${r.lastName || ''}`.trim() || 'Unknown',
      email: r.email,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        referralCode: client.referralCode,
        referralCount,
        referrals: formattedReferrals,
        creditsBalance: client.creditBalance || 0,
        referrerReward: company.referralReferrerReward || 0,
        refereeReward: company.referralRefereeReward || 0,
        currentTier: currentTier,
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
