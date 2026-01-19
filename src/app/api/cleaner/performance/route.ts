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
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    // Get start of month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get all completed jobs (both CLEANER_COMPLETED and COMPLETED)
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

    // Filter jobs by time period
    const jobsThisWeek = allCompletedJobs.filter(
      (job) => new Date(job.scheduledDate) >= startOfWeek
    );
    const jobsThisMonth = allCompletedJobs.filter(
      (job) => new Date(job.scheduledDate) >= startOfMonth
    );

    // Calculate earnings (based on duration * hourly rate)
    const calculateEarnings = (jobs: typeof allCompletedJobs) => {
      return jobs.reduce((total, job) => {
        const hours = job.duration / 60;
        const wage = hours * (teamMember.hourlyRate || 0);
        return total + wage;
      }, 0);
    };

    const earningsThisWeek = calculateEarnings(jobsThisWeek);
    const earningsThisMonth = calculateEarnings(jobsThisMonth);
    const earningsAllTime = calculateEarnings(allCompletedJobs);

    // Calculate tips
    const tipsThisWeek = jobsThisWeek.reduce(
      (total, job) => total + (job.tipAmount || 0),
      0
    );
    const tipsThisMonth = jobsThisMonth.reduce(
      (total, job) => total + (job.tipAmount || 0),
      0
    );
    const tipsAllTime = allCompletedJobs.reduce(
      (total, job) => total + (job.tipAmount || 0),
      0
    );

    // Calculate average customer rating
    const jobsWithRatings = allCompletedJobs.filter(
      (job) => job.customerRating !== null
    );
    const averageRating = jobsWithRatings.length > 0
      ? jobsWithRatings.reduce((sum, job) => sum + (job.customerRating || 0), 0) / jobsWithRatings.length
      : 0;

    // Get recent jobs with ratings (last 10)
    const recentJobsWithRatings = allCompletedJobs
      .filter((job) => job.customerRating !== null)
      .slice(0, 10)
      .map((job) => ({
        id: job.id,
        date: job.scheduledDate,
        client: job.client.name,
        city: job.address.city,
        rating: job.customerRating,
        tip: job.tipAmount || 0,
        feedback: job.customerFeedback,
      }));

    // Calculate average job duration
    const averageDuration = allCompletedJobs.length > 0
      ? allCompletedJobs.reduce((sum, job) => sum + job.duration, 0) / allCompletedJobs.length
      : 0;

    // Get pay logs for additional income tracking
    const payLogsThisMonth = await prisma.payLog.findMany({
      where: {
        teamMemberId: teamMember.id,
        date: {
          gte: startOfMonth,
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    const bonusesThisMonth = payLogsThisMonth
      .filter((log) => log.type !== 'PAYCHECK')
      .reduce((total, log) => total + log.amount, 0);

    // Calculate weekly earnings trend (last 4 weeks)
    const weeklyTrends = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(startOfWeek);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekJobs = allCompletedJobs.filter((job) => {
        const jobDate = new Date(job.scheduledDate);
        return jobDate >= weekStart && jobDate < weekEnd;
      });

      weeklyTrends.push({
        week: `Week ${4 - i}`,
        weekStart: weekStart.toISOString(),
        jobs: weekJobs.length,
        earnings: calculateEarnings(weekJobs),
        tips: weekJobs.reduce((sum, job) => sum + (job.tipAmount || 0), 0),
      });
    }

    // Get cleaner reviews (if any)
    const cleanerReviews = await prisma.cleaningReview.findMany({
      where: {
        booking: {
          assignedTo: teamMember.id,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    // Calculate completion rate (jobs completed on the same day as scheduled)
    const onTimeJobs = allCompletedJobs.filter((job) => {
      if (!job.clockedOutAt) return true; // Manual completions count as on-time
      const scheduled = new Date(job.scheduledDate);
      const completed = new Date(job.clockedOutAt);
      // Same day = on time
      return scheduled.toDateString() === completed.toDateString();
    });
    const onTimeRate = allCompletedJobs.length > 0
      ? (onTimeJobs.length / allCompletedJobs.length) * 100
      : 100;

    // Calculate current streak (consecutive days with completed jobs)
    let currentStreak = 0;
    const sortedJobs = [...allCompletedJobs].sort(
      (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    );
    if (sortedJobs.length > 0) {
      let lastDate = new Date(sortedJobs[0].scheduledDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      lastDate.setHours(0, 0, 0, 0);

      // Only count streak if last job was today or yesterday
      const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 1) {
        currentStreak = 1;
        for (let i = 1; i < sortedJobs.length; i++) {
          const jobDate = new Date(sortedJobs[i].scheduledDate);
          jobDate.setHours(0, 0, 0, 0);
          const dayDiff = Math.floor((lastDate.getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24));
          if (dayDiff === 1) {
            currentStreak++;
            lastDate = jobDate;
          } else if (dayDiff > 1) {
            break;
          }
        }
      }
    }

    // Calculate last month stats for comparison
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const jobsLastMonth = allCompletedJobs.filter((job) => {
      const jobDate = new Date(job.scheduledDate);
      return jobDate >= startOfLastMonth && jobDate <= endOfLastMonth;
    });
    const earningsLastMonth = calculateEarnings(jobsLastMonth);
    const tipsLastMonth = jobsLastMonth.reduce((sum, job) => sum + (job.tipAmount || 0), 0);

    // Calculate improvement percentages
    const earningsChange = earningsLastMonth > 0
      ? ((earningsThisMonth - earningsLastMonth) / earningsLastMonth) * 100
      : earningsThisMonth > 0 ? 100 : 0;
    const jobsChange = jobsLastMonth.length > 0
      ? ((jobsThisMonth.length - jobsLastMonth.length) / jobsLastMonth.length) * 100
      : jobsThisMonth.length > 0 ? 100 : 0;

    // Calculate milestones/achievements
    const achievements = [];
    if (allCompletedJobs.length >= 100) {
      achievements.push({ icon: '🏆', title: 'Century Club', description: '100+ jobs completed!' });
    } else if (allCompletedJobs.length >= 50) {
      achievements.push({ icon: '🌟', title: 'Rising Star', description: '50+ jobs completed!' });
    } else if (allCompletedJobs.length >= 25) {
      achievements.push({ icon: '💪', title: 'Getting Started', description: '25+ jobs completed!' });
    }
    if (averageRating >= 4.8) {
      achievements.push({ icon: '⭐', title: 'Customer Favorite', description: '4.8+ star rating!' });
    }
    if (currentStreak >= 5) {
      achievements.push({ icon: '🔥', title: 'On Fire', description: `${currentStreak} day streak!` });
    }
    if (tipsAllTime >= 500) {
      achievements.push({ icon: '💰', title: 'Tip Master', description: '$500+ in tips earned!' });
    }
    if (onTimeRate >= 98) {
      achievements.push({ icon: '⏰', title: 'Always On Time', description: '98%+ on-time rate!' });
    }

    // Personal bests
    const personalBests = {
      bestWeekEarnings: Math.max(...weeklyTrends.map(w => w.earnings + w.tips), 0),
      bestWeekJobs: Math.max(...weeklyTrends.map(w => w.jobs), 0),
      highestTip: Math.max(...allCompletedJobs.map(j => j.tipAmount || 0), 0),
      longestStreak: currentStreak, // Could be expanded with historical tracking
    };

    // Progress towards next milestone
    const nextMilestone = allCompletedJobs.length < 25
      ? { target: 25, current: allCompletedJobs.length, label: '25 Jobs' }
      : allCompletedJobs.length < 50
      ? { target: 50, current: allCompletedJobs.length, label: '50 Jobs' }
      : allCompletedJobs.length < 100
      ? { target: 100, current: allCompletedJobs.length, label: '100 Jobs' }
      : { target: 250, current: allCompletedJobs.length, label: '250 Jobs' };

    return NextResponse.json({
      success: true,
      data: {
        // Overview stats
        totalJobsCompleted: allCompletedJobs.length,
        jobsThisWeek: jobsThisWeek.length,
        jobsThisMonth: jobsThisMonth.length,

        // Earnings
        earningsThisWeek,
        earningsThisMonth,
        earningsAllTime,

        // Tips
        tipsThisWeek,
        tipsThisMonth,
        tipsAllTime,

        // Bonuses/Reimbursements
        bonusesThisMonth,

        // Performance metrics
        averageRating: Number(averageRating.toFixed(2)),
        totalRatingsReceived: jobsWithRatings.length,
        averageDuration: Math.round(averageDuration),
        onTimeRate: Math.round(onTimeRate),
        currentStreak,

        // Comparison stats
        earningsLastMonth,
        jobsLastMonth: jobsLastMonth.length,
        earningsChange: Math.round(earningsChange),
        jobsChange: Math.round(jobsChange),

        // Hourly rate
        hourlyRate: teamMember.hourlyRate || 0,

        // Recent performance
        recentJobsWithRatings,
        weeklyTrends,

        // Achievements and motivation
        achievements,
        personalBests,
        nextMilestone,

        // Cleaner-submitted reviews
        cleanerReviews: cleanerReviews.map((review) => ({
          id: review.id,
          date: review.createdAt,
          overallRating: review.overallRating,
          houseConditionRating: review.houseConditionRating,
          customerRating: review.customerRating,
          tipRating: review.tipRating,
          notes: review.notes,
        })),
      },
    });
  } catch (error) {
    console.error('Failed to fetch cleaner performance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch performance data' },
      { status: 500 }
    );
  }
}
