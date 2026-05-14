import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/announcements/active - Get active announcements for the current user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the user's company plan
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        company: {
          select: { plan: true },
        },
      },
    });

    if (!user?.company) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const companyPlan = user.company.plan;

    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        targetPlans: true,
        dismissible: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by target plans (empty targetPlans means all plans)
    const filtered = announcements.filter((a) => {
      if (a.targetPlans.length === 0) return true;
      return a.targetPlans.includes(companyPlan);
    });

    return NextResponse.json({
      success: true,
      data: filtered,
    });
  } catch (error) {
    console.error('Announcements: active error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch announcements' },
      { status: 500 }
    );
  }
}
