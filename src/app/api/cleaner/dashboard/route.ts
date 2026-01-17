import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/cleaner/dashboard - Get cleaner dashboard with comprehensive data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true, firstName: true, lastName: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only cleaners can access this endpoint
    if (user.role !== 'CLEANER') {
      return NextResponse.json({ error: 'Forbidden - Cleaner role required' }, { status: 403 });
    }

    // Get the cleaner's team member record
    const teamMember = await prisma.teamMember.findUnique({
      where: { userId: user.id },
      include: {
        company: {
          select: {
            name: true,
            timezone: true,
          },
        },
      },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member profile not found' }, { status: 404 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Calculate weekly date range (Sunday to Saturday)
    const dayOfWeek = now.getDay();
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - dayOfWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Calculate month date range
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // ================================
    // TODAY'S ASSIGNED JOBS
    // ================================
    const todayJobs = await prisma.booking.findMany({
      where: {
        assignedCleanerId: teamMember.id,
        companyId: user.companyId,
        scheduledDate: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: {
          notIn: ['CANCELLED', 'RESCHEDULED'],
        },
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        address: {
          select: {
            id: true,
            street: true,
            unit: true,
            city: true,
            state: true,
            zip: true,
            lat: true,
            lng: true,
            entryInstructions: true,
            parkingInfo: true,
            gateCode: true,
            hasPets: true,
            petDetails: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        checklist: {
          select: {
            id: true,
            totalTasks: true,
            completedTasks: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    // Transform today's jobs (hide customer price, show cleaner wage)
    const todayJobsFormatted = todayJobs.map((job) => {
      const durationHours = job.duration / 60;
      const estimatedWage = teamMember.hourlyRate ? teamMember.hourlyRate * durationHours : 0;

      return {
        id: job.id,
        bookingNumber: job.bookingNumber,
        scheduledDate: job.scheduledDate,
        scheduledEndDate: job.scheduledEndDate,
        duration: job.duration,
        status: job.status,
        serviceType: job.serviceType,
        service: job.service,
        client: {
          id: job.client.id,
          name: `${job.client.firstName} ${job.client.lastName || ''}`.trim(),
          phone: job.client.phone,
        },
        address: job.address,
        estimatedWage: parseFloat(estimatedWage.toFixed(2)),
        cleanerNotes: job.cleanerNotes,
        customerNotes: job.customerNotes,
        onMyWayAt: job.onMyWayAt,
        arrivedAt: job.arrivedAt,
        clockedInAt: job.clockedInAt,
        clockedOutAt: job.clockedOutAt,
        checklist: job.checklist,
      };
    });

    // ================================
    // WEEKLY SCHEDULE
    // ================================
    const weeklyJobs = await prisma.booking.findMany({
      where: {
        assignedCleanerId: teamMember.id,
        companyId: user.companyId,
        scheduledDate: {
          gte: weekStart,
          lte: weekEnd,
        },
        status: {
          notIn: ['CANCELLED', 'RESCHEDULED'],
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
        service: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    // Group jobs by day of week
    const weeklySchedule: Record<string, typeof weeklyJobs> = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    dayNames.forEach((day) => {
      weeklySchedule[day] = [];
    });

    weeklyJobs.forEach((job) => {
      const jobDate = new Date(job.scheduledDate);
      const dayName = dayNames[jobDate.getDay()];
      weeklySchedule[dayName].push(job);
    });

    // Format weekly schedule
    const weeklyScheduleFormatted = Object.entries(weeklySchedule).map(([day, jobs]) => ({
      day,
      date: new Date(weekStart.getTime() + dayNames.indexOf(day) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      jobCount: jobs.length,
      jobs: jobs.map((job) => ({
        id: job.id,
        bookingNumber: job.bookingNumber,
        scheduledDate: job.scheduledDate,
        duration: job.duration,
        status: job.status,
        clientName: `${job.client.firstName} ${job.client.lastName || ''}`.trim(),
        city: job.address?.city,
        serviceName: job.service?.name,
      })),
    }));

    // ================================
    // PERFORMANCE METRICS
    // ================================

    // Get all completed jobs for this cleaner
    const completedJobs = await prisma.booking.findMany({
      where: {
        assignedCleanerId: teamMember.id,
        companyId: user.companyId,
        status: {
          in: ['COMPLETED', 'CLEANER_COMPLETED'],
        },
      },
      select: {
        id: true,
        scheduledDate: true,
        clockedInAt: true,
        duration: true,
        customerRating: true,
        tipAmount: true,
        actualDuration: true,
      },
    });

    // Calculate average rating
    const jobsWithRatings = completedJobs.filter((job) => job.customerRating !== null);
    const averageRating = jobsWithRatings.length > 0
      ? jobsWithRatings.reduce((sum, job) => sum + (job.customerRating || 0), 0) / jobsWithRatings.length
      : 0;

    // Calculate on-time percentage (clocked in within 15 minutes of scheduled time)
    const jobsWithClockIn = completedJobs.filter((job) => job.clockedInAt !== null);
    const onTimeJobs = jobsWithClockIn.filter((job) => {
      const scheduledTime = new Date(job.scheduledDate).getTime();
      const clockInTime = new Date(job.clockedInAt!).getTime();
      const diffMinutes = (clockInTime - scheduledTime) / (1000 * 60);
      return diffMinutes <= 15; // Within 15 minutes is considered on-time
    });
    const onTimePercentage = jobsWithClockIn.length > 0
      ? (onTimeJobs.length / jobsWithClockIn.length) * 100
      : 100;

    // Get recent reviews
    const recentReviews = await prisma.review.findMany({
      where: {
        cleanerId: teamMember.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      select: {
        id: true,
        overallRating: true,
        comment: true,
        createdAt: true,
        client: {
          select: {
            firstName: true,
          },
        },
      },
    });

    const performanceMetrics = {
      averageRating: parseFloat(averageRating.toFixed(2)),
      totalRatings: jobsWithRatings.length,
      completedJobsCount: completedJobs.length,
      onTimePercentage: parseFloat(onTimePercentage.toFixed(1)),
      recentReviews: recentReviews.map((review) => ({
        id: review.id,
        rating: review.overallRating,
        comment: review.comment,
        clientFirstName: review.client.firstName,
        date: review.createdAt,
      })),
    };

    // ================================
    // EARNINGS SUMMARY
    // ================================

    // Calculate earnings based on duration and hourly rate
    const calculateEarnings = (jobs: typeof completedJobs) => {
      return jobs.reduce((total, job) => {
        const hours = (job.actualDuration || job.duration) / 60;
        const wage = hours * (teamMember.hourlyRate || 0);
        return total + wage;
      }, 0);
    };

    // This week's completed jobs
    const thisWeekCompletedJobs = completedJobs.filter(
      (job) => new Date(job.scheduledDate) >= weekStart && new Date(job.scheduledDate) <= weekEnd
    );

    // This month's completed jobs
    const thisMonthCompletedJobs = completedJobs.filter(
      (job) => new Date(job.scheduledDate) >= monthStart && new Date(job.scheduledDate) <= monthEnd
    );

    // Calculate tips
    const thisWeekTips = thisWeekCompletedJobs.reduce((sum, job) => sum + (job.tipAmount || 0), 0);
    const thisMonthTips = thisMonthCompletedJobs.reduce((sum, job) => sum + (job.tipAmount || 0), 0);
    const allTimeTips = completedJobs.reduce((sum, job) => sum + (job.tipAmount || 0), 0);

    // Get pay logs for bonuses/reimbursements
    const thisMonthPayLogs = await prisma.payLog.findMany({
      where: {
        teamMemberId: teamMember.id,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
        status: 'PAID',
      },
    });

    const thisMonthBonuses = thisMonthPayLogs
      .filter((log) => log.type === 'BONUS')
      .reduce((sum, log) => sum + log.amount, 0);

    const thisMonthReimbursements = thisMonthPayLogs
      .filter((log) => log.type === 'REIMBURSEMENT')
      .reduce((sum, log) => sum + log.amount, 0);

    const earningsSummary = {
      hourlyRate: teamMember.hourlyRate || 0,
      thisWeek: {
        jobsCompleted: thisWeekCompletedJobs.length,
        earnings: parseFloat(calculateEarnings(thisWeekCompletedJobs).toFixed(2)),
        tips: parseFloat(thisWeekTips.toFixed(2)),
        total: parseFloat((calculateEarnings(thisWeekCompletedJobs) + thisWeekTips).toFixed(2)),
      },
      thisMonth: {
        jobsCompleted: thisMonthCompletedJobs.length,
        earnings: parseFloat(calculateEarnings(thisMonthCompletedJobs).toFixed(2)),
        tips: parseFloat(thisMonthTips.toFixed(2)),
        bonuses: parseFloat(thisMonthBonuses.toFixed(2)),
        reimbursements: parseFloat(thisMonthReimbursements.toFixed(2)),
        total: parseFloat(
          (calculateEarnings(thisMonthCompletedJobs) + thisMonthTips + thisMonthBonuses + thisMonthReimbursements).toFixed(2)
        ),
      },
      allTime: {
        jobsCompleted: completedJobs.length,
        earnings: parseFloat(calculateEarnings(completedJobs).toFixed(2)),
        tips: parseFloat(allTimeTips.toFixed(2)),
        total: parseFloat((calculateEarnings(completedJobs) + allTimeTips).toFixed(2)),
      },
    };

    // ================================
    // RESPONSE
    // ================================
    return NextResponse.json({
      success: true,
      data: {
        cleaner: {
          id: teamMember.id,
          userId: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Cleaner',
          companyName: teamMember.company.name,
        },
        todayJobs: todayJobsFormatted,
        weeklySchedule: weeklyScheduleFormatted,
        performanceMetrics,
        earningsSummary,
        metadata: {
          currentDate: now.toISOString(),
          weekRange: {
            start: weekStart.toISOString(),
            end: weekEnd.toISOString(),
          },
          monthRange: {
            start: monthStart.toISOString(),
            end: monthEnd.toISOString(),
          },
          timezone: teamMember.company.timezone,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/cleaner/dashboard error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to fetch dashboard: ${error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard' },
      { status: 500 }
    );
  }
}
