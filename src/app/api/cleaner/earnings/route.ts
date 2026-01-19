import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only cleaners can access this endpoint
    if (user.role !== 'CLEANER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the cleaner's TeamMember record
    const teamMember = await prisma.teamMember.findUnique({
      where: { userId: session.user.id },
      include: {
        company: {
          select: {
            timezone: true,
            name: true,
          },
        },
      },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Cleaner profile not found' },
        { status: 404 }
      );
    }

    const now = new Date();

    // Get start of week (Monday)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // Get start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get start of year
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get all completed jobs
    const allCompletedJobs = await prisma.booking.findMany({
      where: {
        assignedTo: teamMember.id,
        status: {
          in: ['COMPLETED', 'CLEANER_COMPLETED'],
        },
      },
      include: {
        client: {
          select: {
            name: true,
          },
        },
        address: {
          select: {
            city: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'desc',
      },
    });

    // Helper to calculate earnings
    const calculateEarnings = (jobs: typeof allCompletedJobs) => {
      return jobs.reduce((total, job) => {
        const hours = job.duration / 60;
        const wage = hours * (teamMember.hourlyRate || 0);
        return total + wage;
      }, 0);
    };

    // Helper to calculate tips
    const calculateTips = (jobs: typeof allCompletedJobs) => {
      return jobs.reduce((total, job) => total + (job.tipAmount || 0), 0);
    };

    // Filter jobs by time periods
    const jobsThisWeek = allCompletedJobs.filter(
      (job) => new Date(job.scheduledDate) >= startOfWeek
    );
    const jobsThisMonth = allCompletedJobs.filter(
      (job) => new Date(job.scheduledDate) >= startOfMonth
    );
    const jobsThisYear = allCompletedJobs.filter(
      (job) => new Date(job.scheduledDate) >= startOfYear
    );

    // Get pay logs for bonuses/reimbursements
    const allPayLogs = await prisma.payLog.findMany({
      where: {
        teamMemberId: teamMember.id,
      },
      orderBy: {
        date: 'desc',
      },
    });

    const payLogsThisMonth = allPayLogs.filter(
      (log) => new Date(log.date) >= startOfMonth
    );
    const payLogsThisYear = allPayLogs.filter(
      (log) => new Date(log.date) >= startOfYear
    );

    // Calculate bonuses (non-paycheck logs)
    const bonusesThisMonth = payLogsThisMonth
      .filter((log) => log.type !== 'PAYCHECK')
      .reduce((total, log) => total + log.amount, 0);
    const bonusesThisYear = payLogsThisYear
      .filter((log) => log.type !== 'PAYCHECK')
      .reduce((total, log) => total + log.amount, 0);

    // Monthly trends for the past 12 months
    const monthlyTrends = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      const monthJobs = allCompletedJobs.filter((job) => {
        const jobDate = new Date(job.scheduledDate);
        return jobDate >= monthStart && jobDate <= monthEnd;
      });

      const monthPayLogs = allPayLogs.filter((log) => {
        const logDate = new Date(log.date);
        return logDate >= monthStart && logDate <= monthEnd;
      });

      const wages = calculateEarnings(monthJobs);
      const tips = calculateTips(monthJobs);
      const bonuses = monthPayLogs
        .filter((log) => log.type !== 'PAYCHECK')
        .reduce((total, log) => total + log.amount, 0);

      monthlyTrends.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        fullMonth: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        wages,
        tips,
        bonuses,
        total: wages + tips + bonuses,
        jobs: monthJobs.length,
      });
    }

    // Weekly trends for the past 8 weeks
    const weeklyTrends = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(startOfWeek);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekJobs = allCompletedJobs.filter((job) => {
        const jobDate = new Date(job.scheduledDate);
        return jobDate >= weekStart && jobDate <= weekEnd;
      });

      const wages = calculateEarnings(weekJobs);
      const tips = calculateTips(weekJobs);

      weeklyTrends.push({
        week: `Week ${8 - i}`,
        weekLabel: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        wages,
        tips,
        total: wages + tips,
        jobs: weekJobs.length,
      });
    }

    // Daily earnings for the current week (for detailed view)
    const dailyEarnings = [];
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(startOfWeek);
      dayStart.setDate(dayStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayJobs = allCompletedJobs.filter((job) => {
        const jobDate = new Date(job.scheduledDate);
        return jobDate >= dayStart && jobDate <= dayEnd;
      });

      const wages = calculateEarnings(dayJobs);
      const tips = calculateTips(dayJobs);

      dailyEarnings.push({
        day: daysOfWeek[i],
        fullDate: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        wages,
        tips,
        total: wages + tips,
        jobs: dayJobs.length,
      });
    }

    // Earnings breakdown by service type
    const serviceTypeBreakdown: Record<string, { wages: number; tips: number; jobs: number }> = {};
    allCompletedJobs.forEach((job) => {
      const serviceType = job.serviceType || 'STANDARD';
      if (!serviceTypeBreakdown[serviceType]) {
        serviceTypeBreakdown[serviceType] = { wages: 0, tips: 0, jobs: 0 };
      }
      const hours = job.duration / 60;
      const wage = hours * (teamMember.hourlyRate || 0);
      serviceTypeBreakdown[serviceType].wages += wage;
      serviceTypeBreakdown[serviceType].tips += job.tipAmount || 0;
      serviceTypeBreakdown[serviceType].jobs += 1;
    });

    const serviceTypeData = Object.entries(serviceTypeBreakdown).map(([type, data]) => ({
      name: type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' '),
      wages: Math.round(data.wages * 100) / 100,
      tips: Math.round(data.tips * 100) / 100,
      total: Math.round((data.wages + data.tips) * 100) / 100,
      jobs: data.jobs,
    }));

    // Recent earnings (last 10 jobs)
    const recentEarnings = allCompletedJobs.slice(0, 10).map((job) => {
      const hours = job.duration / 60;
      const wage = hours * (teamMember.hourlyRate || 0);
      return {
        id: job.id,
        date: job.scheduledDate,
        client: job.client.name,
        city: job.address.city,
        duration: job.duration,
        wage: Math.round(wage * 100) / 100,
        tip: job.tipAmount || 0,
        total: Math.round((wage + (job.tipAmount || 0)) * 100) / 100,
        serviceType: job.serviceType,
      };
    });

    // Calculate summary stats
    const earningsThisWeek = calculateEarnings(jobsThisWeek);
    const earningsThisMonth = calculateEarnings(jobsThisMonth);
    const earningsThisYear = calculateEarnings(jobsThisYear);
    const earningsAllTime = calculateEarnings(allCompletedJobs);

    const tipsThisWeek = calculateTips(jobsThisWeek);
    const tipsThisMonth = calculateTips(jobsThisMonth);
    const tipsThisYear = calculateTips(jobsThisYear);
    const tipsAllTime = calculateTips(allCompletedJobs);

    // Calculate projected monthly earnings based on current pace
    const daysIntoMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const projectedMonthlyTotal = daysIntoMonth > 0
      ? ((earningsThisMonth + tipsThisMonth + bonusesThisMonth) / daysIntoMonth) * daysInMonth
      : 0;

    // Average earnings per job
    const avgEarningsPerJob = allCompletedJobs.length > 0
      ? (earningsAllTime + tipsAllTime) / allCompletedJobs.length
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        // Summary stats
        summary: {
          hourlyRate: teamMember.hourlyRate || 0,
          totalJobs: allCompletedJobs.length,
          jobsThisWeek: jobsThisWeek.length,
          jobsThisMonth: jobsThisMonth.length,
          avgEarningsPerJob: Math.round(avgEarningsPerJob * 100) / 100,
          projectedMonthlyTotal: Math.round(projectedMonthlyTotal * 100) / 100,
        },

        // Period breakdowns
        thisWeek: {
          wages: Math.round(earningsThisWeek * 100) / 100,
          tips: Math.round(tipsThisWeek * 100) / 100,
          bonuses: 0, // Weekly bonuses not tracked separately
          total: Math.round((earningsThisWeek + tipsThisWeek) * 100) / 100,
          jobs: jobsThisWeek.length,
        },
        thisMonth: {
          wages: Math.round(earningsThisMonth * 100) / 100,
          tips: Math.round(tipsThisMonth * 100) / 100,
          bonuses: Math.round(bonusesThisMonth * 100) / 100,
          total: Math.round((earningsThisMonth + tipsThisMonth + bonusesThisMonth) * 100) / 100,
          jobs: jobsThisMonth.length,
        },
        thisYear: {
          wages: Math.round(earningsThisYear * 100) / 100,
          tips: Math.round(tipsThisYear * 100) / 100,
          bonuses: Math.round(bonusesThisYear * 100) / 100,
          total: Math.round((earningsThisYear + tipsThisYear + bonusesThisYear) * 100) / 100,
          jobs: jobsThisYear.length,
        },
        allTime: {
          wages: Math.round(earningsAllTime * 100) / 100,
          tips: Math.round(tipsAllTime * 100) / 100,
          total: Math.round((earningsAllTime + tipsAllTime) * 100) / 100,
          jobs: allCompletedJobs.length,
        },

        // Chart data
        monthlyTrends,
        weeklyTrends,
        dailyEarnings,
        serviceTypeData,

        // Recent transactions
        recentEarnings,
      },
    });
  } catch (error) {
    console.error('Failed to fetch cleaner earnings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings data' },
      { status: 500 }
    );
  }
}
