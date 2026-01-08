import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

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

    // Get completed jobs with assignee information
    const completedJobs = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        status: 'COMPLETED',
        scheduledDate: {
          gte: startDate,
          lte: endDate,
        },
        assignee: {
          isNot: null,
        },
      },
      include: {
        assignee: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
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
      if (!job.assignee) return;

      const memberId = job.assignee.user.id;
      const existing = teamMemberStats.get(memberId);

      if (existing) {
        existing.revenue += job.price;
        existing.jobsCompleted += 1;
      } else {
        teamMemberStats.set(memberId, {
          id: job.assignee.user.id,
          name: job.assignee.user.name,
          revenue: job.price,
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
