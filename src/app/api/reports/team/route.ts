// ============================================
// CleanDayCRM - Team Performance Reports API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subMonths,
  differenceInMinutes,
  eachDayOfInterval,
} from 'date-fns';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/reports/team - Get team member performance, utilization, ratings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user with companyId and verify role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Only OWNER and ADMIN can access team reports
    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Owner/Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const period = searchParams.get('period');
    const cleanerId = searchParams.get('cleanerId');

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    // Determine date range
    if (startDateParam && endDateParam) {
      startDate = startOfDay(new Date(startDateParam));
      endDate = endOfDay(new Date(endDateParam));
    } else {
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
          // Default: Last 30 days
          startDate = startOfDay(subDays(now, 30));
          endDate = endOfDay(now);
      }
    }

    // Build team member query
    const teamMemberWhere: any = {
      companyId: user.companyId,
      isActive: true,
    };

    if (cleanerId) {
      teamMemberWhere.id = cleanerId;
    }

    // Get all active team members
    const teamMembers = await prisma.teamMember.findMany({
      where: teamMemberWhere,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        assignedBookings: {
          where: {
            scheduledDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            reviews: {
              select: {
                overallRating: true,
                qualityRating: true,
                punctualityRating: true,
                communicationRating: true,
              },
            },
          },
        },
        timeEntries: {
          where: {
            clockIn: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
        reviews: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            overallRating: true,
            qualityRating: true,
            punctualityRating: true,
            communicationRating: true,
          },
        },
        qualityChecks: {
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            status: true,
            overallScore: true,
            thoroughnessScore: true,
            attentionToDetailScore: true,
            timeManagementScore: true,
          },
        },
      },
    });

    // Calculate working days in the period (excluding weekends by default)
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const workingDays = allDays.filter((day) => {
      const dayOfWeek = day.getDay();
      return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude Sunday and Saturday
    }).length;

    // Calculate performance metrics for each team member
    const teamPerformance = teamMembers.map((member) => {
      const bookings = member.assignedBookings;
      const completedBookings = bookings.filter((b) => b.status === 'COMPLETED');
      const cancelledBookings = bookings.filter((b) => b.status === 'CANCELLED');
      const noShowBookings = bookings.filter((b) => b.status === 'NO_SHOW');

      // Revenue generated
      const totalRevenue = completedBookings.reduce((sum, b) => sum + b.finalPrice, 0);

      // Completion and cancellation rates
      const completionRate = bookings.length > 0
        ? (completedBookings.length / bookings.length) * 100
        : 0;
      const cancellationRate = bookings.length > 0
        ? (cancelledBookings.length / bookings.length) * 100
        : 0;

      // Time tracking
      const totalMinutesWorked = member.timeEntries.reduce((sum, entry) => {
        if (entry.clockOut) {
          return sum + differenceInMinutes(entry.clockOut, entry.clockIn) - entry.breakMinutes;
        }
        return sum + (entry.totalMinutes || 0);
      }, 0);
      const totalHoursWorked = totalMinutesWorked / 60;

      // Scheduled hours (based on completed bookings)
      const scheduledMinutes = completedBookings.reduce((sum, b) => sum + b.duration, 0);
      const actualMinutes = completedBookings.reduce((sum, b) => sum + (b.actualDuration || b.duration), 0);

      // Efficiency (scheduled vs actual)
      const efficiency = actualMinutes > 0
        ? (scheduledMinutes / actualMinutes) * 100
        : 100;

      // Utilization rate (hours worked vs available hours)
      // Assuming 8 hours per working day
      const availableHours = workingDays * 8;
      const utilizationRate = availableHours > 0
        ? (totalHoursWorked / availableHours) * 100
        : 0;

      // Ratings
      const allReviews = member.reviews;
      const avgOverallRating = allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.overallRating, 0) / allReviews.length
        : member.averageRating;

      const avgQualityRating = allReviews.filter((r) => r.qualityRating).length > 0
        ? allReviews.filter((r) => r.qualityRating).reduce((sum, r) => sum + (r.qualityRating || 0), 0) / allReviews.filter((r) => r.qualityRating).length
        : null;

      const avgPunctualityRating = allReviews.filter((r) => r.punctualityRating).length > 0
        ? allReviews.filter((r) => r.punctualityRating).reduce((sum, r) => sum + (r.punctualityRating || 0), 0) / allReviews.filter((r) => r.punctualityRating).length
        : null;

      const avgCommunicationRating = allReviews.filter((r) => r.communicationRating).length > 0
        ? allReviews.filter((r) => r.communicationRating).reduce((sum, r) => sum + (r.communicationRating || 0), 0) / allReviews.filter((r) => r.communicationRating).length
        : null;

      // Quality checks
      const qualityChecks = member.qualityChecks;
      const passedQA = qualityChecks.filter((q) => q.status === 'PASSED').length;
      const failedQA = qualityChecks.filter((q) => q.status === 'FAILED').length;
      const qaPassRate = qualityChecks.length > 0
        ? (passedQA / qualityChecks.length) * 100
        : null;

      const avgQAScore = qualityChecks.filter((q) => q.overallScore).length > 0
        ? qualityChecks.filter((q) => q.overallScore).reduce((sum, q) => sum + (q.overallScore || 0), 0) / qualityChecks.filter((q) => q.overallScore).length
        : null;

      // On-time rate (based on stored metric or calculate from bookings)
      const onTimeRate = member.onTimePercentage;

      // Earnings calculation
      const hourlyRate = member.hourlyRate || 0;
      const estimatedEarnings = totalHoursWorked * hourlyRate;

      return {
        id: member.id,
        userId: member.userId,
        name: member.user
          ? `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim() || 'Unknown'
          : 'Unknown',
        email: member.user?.email,
        avatar: member.user?.avatar,
        specialties: member.specialties,
        hourlyRate,

        // Booking stats
        totalBookings: bookings.length,
        completedBookings: completedBookings.length,
        cancelledBookings: cancelledBookings.length,
        noShowBookings: noShowBookings.length,
        completionRate: parseFloat(completionRate.toFixed(2)),
        cancellationRate: parseFloat(cancellationRate.toFixed(2)),

        // Revenue
        totalRevenue,
        avgRevenuePerJob: completedBookings.length > 0
          ? totalRevenue / completedBookings.length
          : 0,

        // Time & efficiency
        totalHoursWorked: parseFloat(totalHoursWorked.toFixed(2)),
        scheduledHours: parseFloat((scheduledMinutes / 60).toFixed(2)),
        actualHours: parseFloat((actualMinutes / 60).toFixed(2)),
        efficiency: parseFloat(efficiency.toFixed(2)),
        utilizationRate: parseFloat(Math.min(utilizationRate, 100).toFixed(2)),
        onTimeRate,

        // Ratings
        avgOverallRating: avgOverallRating ? parseFloat(avgOverallRating.toFixed(2)) : null,
        avgQualityRating: avgQualityRating ? parseFloat(avgQualityRating.toFixed(2)) : null,
        avgPunctualityRating: avgPunctualityRating ? parseFloat(avgPunctualityRating.toFixed(2)) : null,
        avgCommunicationRating: avgCommunicationRating ? parseFloat(avgCommunicationRating.toFixed(2)) : null,
        totalReviews: allReviews.length,

        // Quality assurance
        qaChecks: qualityChecks.length,
        qaPassRate: qaPassRate ? parseFloat(qaPassRate.toFixed(2)) : null,
        avgQAScore: avgQAScore ? parseFloat(avgQAScore.toFixed(2)) : null,

        // Earnings
        estimatedEarnings: parseFloat(estimatedEarnings.toFixed(2)),
      };
    });

    // Sort by revenue by default
    teamPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Calculate team-wide averages
    const activeMembers = teamPerformance.filter((m) => m.totalBookings > 0);
    const teamAverages = {
      avgCompletionRate: activeMembers.length > 0
        ? activeMembers.reduce((sum, m) => sum + m.completionRate, 0) / activeMembers.length
        : 0,
      avgUtilizationRate: activeMembers.length > 0
        ? activeMembers.reduce((sum, m) => sum + m.utilizationRate, 0) / activeMembers.length
        : 0,
      avgEfficiency: activeMembers.length > 0
        ? activeMembers.reduce((sum, m) => sum + m.efficiency, 0) / activeMembers.length
        : 100,
      avgRating: activeMembers.filter((m) => m.avgOverallRating).length > 0
        ? activeMembers.filter((m) => m.avgOverallRating).reduce((sum, m) => sum + (m.avgOverallRating || 0), 0) / activeMembers.filter((m) => m.avgOverallRating).length
        : null,
      totalRevenue: teamPerformance.reduce((sum, m) => sum + m.totalRevenue, 0),
      totalBookings: teamPerformance.reduce((sum, m) => sum + m.completedBookings, 0),
      totalHoursWorked: teamPerformance.reduce((sum, m) => sum + m.totalHoursWorked, 0),
    };

    // Top performers (by different metrics)
    const topByRevenue = [...teamPerformance].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);
    const topByRating = [...teamPerformance]
      .filter((m) => m.avgOverallRating && m.totalReviews >= 3)
      .sort((a, b) => (b.avgOverallRating || 0) - (a.avgOverallRating || 0))
      .slice(0, 5);
    const topByEfficiency = [...teamPerformance]
      .filter((m) => m.completedBookings >= 5)
      .sort((a, b) => b.efficiency - a.efficiency)
      .slice(0, 5);
    const topByUtilization = [...teamPerformance]
      .sort((a, b) => b.utilizationRate - a.utilizationRate)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalTeamMembers: teamMembers.length,
          activeTeamMembers: activeMembers.length,
          ...teamAverages,
          workingDaysInPeriod: workingDays,
        },
        teamPerformance,
        leaderboards: {
          byRevenue: topByRevenue.map((m) => ({ id: m.id, name: m.name, value: m.totalRevenue })),
          byRating: topByRating.map((m) => ({ id: m.id, name: m.name, value: m.avgOverallRating })),
          byEfficiency: topByEfficiency.map((m) => ({ id: m.id, name: m.name, value: m.efficiency })),
          byUtilization: topByUtilization.map((m) => ({ id: m.id, name: m.name, value: m.utilizationRate })),
        },
        filters: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          cleanerId: cleanerId || null,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/reports/team error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch team performance reports' },
      { status: 500 }
    );
  }
}
