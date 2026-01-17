import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// ============================================
// Validation Schemas
// ============================================

const queryParamsSchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year', 'all']).default('month'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ============================================
// Helper Functions
// ============================================

function getDateRange(period: string, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  let end: Date = new Date(now);

  if (customStart && customEnd) {
    return {
      start: new Date(customStart),
      end: new Date(customEnd),
    };
  }

  switch (period) {
    case 'week':
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      break;
    case 'month':
      start = new Date(now);
      start.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      start = new Date(now);
      start.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      start = new Date(now);
      start.setFullYear(now.getFullYear() - 1);
      break;
    case 'all':
    default:
      start = new Date(0); // Beginning of time
      break;
  }

  return { start, end };
}

// ============================================
// GET /api/team/[id]/performance - Get performance metrics
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can view team member performance
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = queryParamsSchema.parse({
      period: searchParams.get('period') || 'month',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    });

    // Get team member
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      select: {
        id: true,
        hireDate: true,
        hourlyRate: true,
        averageRating: true,
        totalJobsCompleted: true,
        totalEarnings: true,
        onTimePercentage: true,
        customerSatisfaction: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    const { start, end } = getDateRange(queryParams.period, queryParams.startDate, queryParams.endDate);

    // Get all bookings in the date range
    const bookings = await prisma.booking.findMany({
      where: {
        assignedCleanerId: id,
        scheduledDate: {
          gte: start,
          lte: end,
        },
      },
      select: {
        id: true,
        bookingNumber: true,
        scheduledDate: true,
        scheduledEndDate: true,
        duration: true,
        actualDuration: true,
        status: true,
        basePrice: true,
        finalPrice: true,
        tipAmount: true,
        customerRating: true,
        customerFeedback: true,
        clockedInAt: true,
        clockedOutAt: true,
        completedAt: true,
        arrivedAt: true,
      },
    });

    // Calculate metrics
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b =>
      b.status === 'COMPLETED' || b.status === 'CLEANER_COMPLETED'
    );
    const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED');
    const noShowBookings = bookings.filter(b => b.status === 'NO_SHOW');

    // Completion rate
    const completionRate = totalBookings > 0
      ? (completedBookings.length / totalBookings) * 100
      : 0;

    // Revenue metrics
    const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.finalPrice || 0), 0);
    const totalTips = completedBookings.reduce((sum, b) => sum + (b.tipAmount || 0), 0);
    const averageJobValue = completedBookings.length > 0
      ? totalRevenue / completedBookings.length
      : 0;

    // Rating metrics
    const ratedBookings = completedBookings.filter(b => b.customerRating !== null);
    const averageRating = ratedBookings.length > 0
      ? ratedBookings.reduce((sum, b) => sum + (b.customerRating || 0), 0) / ratedBookings.length
      : 0;

    // Rating distribution
    const ratingDistribution = {
      5: ratedBookings.filter(b => b.customerRating === 5).length,
      4: ratedBookings.filter(b => b.customerRating === 4).length,
      3: ratedBookings.filter(b => b.customerRating === 3).length,
      2: ratedBookings.filter(b => b.customerRating === 2).length,
      1: ratedBookings.filter(b => b.customerRating === 1).length,
    };

    // On-time performance
    const bookingsWithArrival = completedBookings.filter(b => b.arrivedAt && b.scheduledDate);
    let onTimeCount = 0;
    let lateCount = 0;
    let earlyCount = 0;
    const lateThresholdMinutes = 15;

    bookingsWithArrival.forEach(b => {
      const scheduledTime = new Date(b.scheduledDate).getTime();
      const arrivalTime = new Date(b.arrivedAt!).getTime();
      const diffMinutes = (arrivalTime - scheduledTime) / (1000 * 60);

      if (diffMinutes <= lateThresholdMinutes && diffMinutes >= -30) {
        onTimeCount++;
      } else if (diffMinutes > lateThresholdMinutes) {
        lateCount++;
      } else {
        earlyCount++;
      }
    });

    const onTimePercentage = bookingsWithArrival.length > 0
      ? (onTimeCount / bookingsWithArrival.length) * 100
      : 100;

    // Duration metrics
    const bookingsWithDuration = completedBookings.filter(b => b.actualDuration !== null);
    const averageActualDuration = bookingsWithDuration.length > 0
      ? bookingsWithDuration.reduce((sum, b) => sum + (b.actualDuration || 0), 0) / bookingsWithDuration.length
      : 0;
    const averageEstimatedDuration = completedBookings.length > 0
      ? completedBookings.reduce((sum, b) => sum + (b.duration || 0), 0) / completedBookings.length
      : 0;
    const durationAccuracy = averageEstimatedDuration > 0
      ? (1 - Math.abs(averageActualDuration - averageEstimatedDuration) / averageEstimatedDuration) * 100
      : 100;

    // Get reviews for the period
    const reviews = await prisma.review.findMany({
      where: {
        cleanerId: id,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        id: true,
        overallRating: true,
        qualityRating: true,
        punctualityRating: true,
        communicationRating: true,
        valueRating: true,
        comment: true,
        createdAt: true,
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Calculate detailed rating breakdown
    const detailedRatings = {
      quality: reviews.filter(r => r.qualityRating).reduce((sum, r) => sum + (r.qualityRating || 0), 0) /
        (reviews.filter(r => r.qualityRating).length || 1),
      punctuality: reviews.filter(r => r.punctualityRating).reduce((sum, r) => sum + (r.punctualityRating || 0), 0) /
        (reviews.filter(r => r.punctualityRating).length || 1),
      communication: reviews.filter(r => r.communicationRating).reduce((sum, r) => sum + (r.communicationRating || 0), 0) /
        (reviews.filter(r => r.communicationRating).length || 1),
      value: reviews.filter(r => r.valueRating).reduce((sum, r) => sum + (r.valueRating || 0), 0) /
        (reviews.filter(r => r.valueRating).length || 1),
    };

    // Weekly/Monthly trend data
    const trends = [];
    const trendPeriodCount = queryParams.period === 'week' ? 7 :
      queryParams.period === 'month' ? 4 :
      queryParams.period === 'quarter' ? 12 : 12;
    const trendUnit = queryParams.period === 'week' ? 'day' : 'week';

    for (let i = trendPeriodCount - 1; i >= 0; i--) {
      const periodStart = new Date(end);
      const periodEnd = new Date(end);

      if (trendUnit === 'day') {
        periodStart.setDate(periodStart.getDate() - i - 1);
        periodEnd.setDate(periodEnd.getDate() - i);
      } else {
        periodStart.setDate(periodStart.getDate() - (i + 1) * 7);
        periodEnd.setDate(periodEnd.getDate() - i * 7);
      }

      const periodBookings = completedBookings.filter(b => {
        const date = new Date(b.scheduledDate);
        return date >= periodStart && date < periodEnd;
      });

      const periodRevenue = periodBookings.reduce((sum, b) => sum + (b.finalPrice || 0), 0);
      const periodRatings = periodBookings.filter(b => b.customerRating !== null);
      const periodAvgRating = periodRatings.length > 0
        ? periodRatings.reduce((sum, b) => sum + (b.customerRating || 0), 0) / periodRatings.length
        : null;

      trends.push({
        period: periodStart.toISOString().split('T')[0],
        label: trendUnit === 'day'
          ? periodStart.toLocaleDateString('en-US', { weekday: 'short' })
          : `Week ${trendPeriodCount - i}`,
        jobsCompleted: periodBookings.length,
        revenue: periodRevenue,
        averageRating: periodAvgRating,
      });
    }

    // Get quality check scores
    const qualityChecks = await prisma.qualityCheck.findMany({
      where: {
        cleanerId: id,
        completedAt: {
          gte: start,
          lte: end,
        },
        status: { in: ['PASSED', 'FAILED', 'NEEDS_ATTENTION'] },
      },
      select: {
        id: true,
        overallScore: true,
        thoroughnessScore: true,
        attentionToDetailScore: true,
        timeManagementScore: true,
        status: true,
        completedAt: true,
      },
    });

    const passedQAChecks = qualityChecks.filter(q => q.status === 'PASSED').length;
    const qaPassRate = qualityChecks.length > 0
      ? (passedQAChecks / qualityChecks.length) * 100
      : 100;

    const avgQAScores = {
      overall: qualityChecks.filter(q => q.overallScore).reduce((sum, q) => sum + (q.overallScore || 0), 0) /
        (qualityChecks.filter(q => q.overallScore).length || 1),
      thoroughness: qualityChecks.filter(q => q.thoroughnessScore).reduce((sum, q) => sum + (q.thoroughnessScore || 0), 0) /
        (qualityChecks.filter(q => q.thoroughnessScore).length || 1),
      attentionToDetail: qualityChecks.filter(q => q.attentionToDetailScore).reduce((sum, q) => sum + (q.attentionToDetailScore || 0), 0) /
        (qualityChecks.filter(q => q.attentionToDetailScore).length || 1),
      timeManagement: qualityChecks.filter(q => q.timeManagementScore).reduce((sum, q) => sum + (q.timeManagementScore || 0), 0) /
        (qualityChecks.filter(q => q.timeManagementScore).length || 1),
    };

    return NextResponse.json({
      success: true,
      data: {
        teamMember: {
          id: teamMember.id,
          name: `${teamMember.user.firstName || ''} ${teamMember.user.lastName || ''}`.trim(),
          email: teamMember.user.email,
          hireDate: teamMember.hireDate,
          hourlyRate: teamMember.hourlyRate,
        },
        period: {
          type: queryParams.period,
          start: start.toISOString(),
          end: end.toISOString(),
        },
        summary: {
          totalBookings,
          completedBookings: completedBookings.length,
          cancelledBookings: cancelledBookings.length,
          noShowBookings: noShowBookings.length,
          completionRate: Math.round(completionRate * 100) / 100,
        },
        revenue: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalTips: Math.round(totalTips * 100) / 100,
          averageJobValue: Math.round(averageJobValue * 100) / 100,
        },
        ratings: {
          averageRating: Math.round(averageRating * 100) / 100,
          totalRatings: ratedBookings.length,
          distribution: ratingDistribution,
          detailed: {
            quality: Math.round(detailedRatings.quality * 100) / 100,
            punctuality: Math.round(detailedRatings.punctuality * 100) / 100,
            communication: Math.round(detailedRatings.communication * 100) / 100,
            value: Math.round(detailedRatings.value * 100) / 100,
          },
        },
        punctuality: {
          onTimePercentage: Math.round(onTimePercentage * 100) / 100,
          onTimeCount,
          lateCount,
          earlyCount,
          totalTracked: bookingsWithArrival.length,
        },
        duration: {
          averageEstimated: Math.round(averageEstimatedDuration),
          averageActual: Math.round(averageActualDuration),
          accuracyPercentage: Math.round(durationAccuracy * 100) / 100,
        },
        qualityAssurance: {
          totalChecks: qualityChecks.length,
          passedChecks: passedQAChecks,
          passRate: Math.round(qaPassRate * 100) / 100,
          averageScores: {
            overall: Math.round(avgQAScores.overall * 100) / 100,
            thoroughness: Math.round(avgQAScores.thoroughness * 100) / 100,
            attentionToDetail: Math.round(avgQAScores.attentionToDetail * 100) / 100,
            timeManagement: Math.round(avgQAScores.timeManagement * 100) / 100,
          },
        },
        trends,
        recentReviews: reviews.map(r => ({
          id: r.id,
          rating: r.overallRating,
          comment: r.comment,
          clientName: `${r.client?.firstName || ''} ${r.client?.lastName || ''}`.trim(),
          date: r.createdAt,
        })),
        // Lifetime stats from cached values
        lifetime: {
          averageRating: teamMember.averageRating,
          totalJobsCompleted: teamMember.totalJobsCompleted,
          totalEarnings: teamMember.totalEarnings,
          onTimePercentage: teamMember.onTimePercentage,
          customerSatisfaction: teamMember.customerSatisfaction,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/team/[id]/performance error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch performance metrics' },
      { status: 500 }
    );
  }
}
