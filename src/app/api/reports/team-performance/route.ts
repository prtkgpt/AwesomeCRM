import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/reports/team-performance - Get team member performance stats
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    // Determine date range based on period
    switch (period) {
      case 'week':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      case 'year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    // Get completed jobs with assignedCleaner information
    const completedJobs = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        status: 'COMPLETED',
        scheduledDate: {
          gte: startDate,
          lte: endDate,
        },
        assignedCleaner: {
          isNot: null,
        },
      },
      include: {
        assignedCleaner: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Group by team member and calculate stats
    const teamMemberStats = new Map<string, {
      id: string;
      name: string;
      revenue: number;
      jobsCompleted: number;
    }>();

    completedJobs.forEach((job) => {
      if (!job.assignedCleaner) return;

      const memberId = job.assignedCleaner.user.id;
      const existing = teamMemberStats.get(memberId);

      if (existing) {
        existing.revenue += job.finalPrice;
        existing.jobsCompleted += 1;
      } else {
        const user = job.assignedCleaner.user;
        const userName = user
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown'
          : 'Unknown';
        teamMemberStats.set(memberId, {
          id: job.assignedCleaner.user.id,
          name: userName,
          revenue: job.finalPrice,
          jobsCompleted: 1,
        });
      }
    });

    // Convert to array and sort by revenue
    const teamPerformance = Array.from(teamMemberStats.values())
      .map((member) => ({
        ...member,
        averageJobValue: member.revenue / member.jobsCompleted,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      success: true,
      data: teamPerformance,
    });
  } catch (error) {
    console.error('GET /api/reports/team-performance error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team performance' },
      { status: 500 }
    );
  }
}
