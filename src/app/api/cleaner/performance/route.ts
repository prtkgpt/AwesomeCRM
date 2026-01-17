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
        assignedCleanerId: teamMember.id,
        status: {
          in: ['COMPLETED', 'CLEANER_COMPLETED'],
        },
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
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
        client: `${job.client.firstName || ''} ${job.client.lastName || ''}`.trim(),
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
    const cleanerReviews = await prisma.review.findMany({
      where: {
        cleanerId: teamMember.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

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

        // Hourly rate
        hourlyRate: teamMember.hourlyRate || 0,

        // Recent performance
        recentJobsWithRatings,
        weeklyTrends,

        // Cleaner-submitted reviews
        cleanerReviews: cleanerReviews.map((review) => ({
          id: review.id,
          date: review.createdAt,
          overallRating: review.overallRating,
          qualityRating: review.qualityRating,
          punctualityRating: review.punctualityRating,
          communicationRating: review.communicationRating,
          comment: review.comment,
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
