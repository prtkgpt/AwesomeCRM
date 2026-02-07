import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, subDays, format, differenceInMinutes } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(new Date(), days));

    // Get all team members with their bookings
    const teamMembers = await prisma.teamMember.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
        assignedBookings: {
          where: {
            scheduledDate: { gte: startDate, lte: endDate },
          },
          select: {
            id: true,
            scheduledDate: true,
            status: true,
            price: true,
            duration: true,
            clockedInAt: true,
            clockedOutAt: true,
            customerRating: true,
            tipAmount: true,
            serviceType: true,
          },
        },
        payLogs: {
          where: {
            date: { gte: startDate, lte: endDate },
            type: 'PAYCHECK',
          },
          select: {
            amount: true,
            hoursWorked: true,
          },
        },
      },
    });

    // Calculate performance metrics for each team member
    const teamPerformance = teamMembers.map((member) => {
      const bookings = member.assignedBookings;
      const completedBookings = bookings.filter((b) =>
        ['COMPLETED', 'CLEANER_COMPLETED'].includes(b.status)
      );
      const cancelledBookings = bookings.filter((b) => b.status === 'CANCELLED');

      // Revenue generated
      const totalRevenue = completedBookings.reduce((sum, b) => sum + b.price, 0);

      // Tips earned
      const totalTips = completedBookings.reduce((sum, b) => sum + (b.tipAmount || 0), 0);

      // Average rating
      const ratingsArray = completedBookings
        .filter((b) => b.customerRating !== null)
        .map((b) => b.customerRating as number);
      const averageRating =
        ratingsArray.length > 0
          ? ratingsArray.reduce((sum, r) => sum + r, 0) / ratingsArray.length
          : null;

      // Hours worked (from clock in/out)
      const hoursWorked = completedBookings.reduce((total, b) => {
        if (b.clockedInAt && b.clockedOutAt) {
          const minutes = differenceInMinutes(new Date(b.clockedOutAt), new Date(b.clockedInAt));
          return total + minutes / 60;
        }
        return total + b.duration / 60; // Fallback to scheduled duration
      }, 0);

      // Estimated vs actual duration
      const scheduledMinutes = completedBookings.reduce((sum, b) => sum + b.duration, 0);
      const actualMinutes = completedBookings.reduce((total, b) => {
        if (b.clockedInAt && b.clockedOutAt) {
          return total + differenceInMinutes(new Date(b.clockedOutAt), new Date(b.clockedInAt));
        }
        return total + b.duration;
      }, 0);
      const efficiencyRate =
        scheduledMinutes > 0 ? Math.round((scheduledMinutes / actualMinutes) * 100) : 100;

      // Revenue per hour
      const revenuePerHour = hoursWorked > 0 ? totalRevenue / hoursWorked : 0;

      // Jobs by service type
      const jobsByServiceType = {
        STANDARD: completedBookings.filter((b) => b.serviceType === 'STANDARD').length,
        DEEP: completedBookings.filter((b) => b.serviceType === 'DEEP').length,
        MOVE_OUT: completedBookings.filter((b) => b.serviceType === 'MOVE_OUT').length,
      };

      // Pay information
      const totalPay = member.payLogs.reduce((sum, p) => sum + p.amount, 0);
      const loggedHours = member.payLogs.reduce((sum, p) => sum + (p.hoursWorked || 0), 0);

      return {
        id: member.id,
        userId: member.userId,
        name: member.user.name || member.user.email,
        email: member.user.email,
        photo: member.photo,
        specialties: member.specialties,
        hourlyRate: member.hourlyRate,
        metrics: {
          totalJobs: bookings.length,
          completedJobs: completedBookings.length,
          cancelledJobs: cancelledBookings.length,
          completionRate:
            bookings.length > 0 ? Math.round((completedBookings.length / bookings.length) * 100) : 0,
          totalRevenue,
          totalTips,
          revenuePerHour: Math.round(revenuePerHour * 100) / 100,
          averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
          totalRatings: ratingsArray.length,
          hoursWorked: Math.round(hoursWorked * 10) / 10,
          efficiencyRate,
          jobsByServiceType,
          payroll: {
            totalPay,
            loggedHours,
          },
        },
      };
    });

    // Sort by completed jobs by default
    teamPerformance.sort((a, b) => b.metrics.completedJobs - a.metrics.completedJobs);

    // Calculate team-wide summary
    const summary = {
      totalTeamMembers: teamMembers.length,
      totalJobsCompleted: teamPerformance.reduce((sum, m) => sum + m.metrics.completedJobs, 0),
      totalRevenue: teamPerformance.reduce((sum, m) => sum + m.metrics.totalRevenue, 0),
      totalTips: teamPerformance.reduce((sum, m) => sum + m.metrics.totalTips, 0),
      totalHoursWorked: teamPerformance.reduce((sum, m) => sum + m.metrics.hoursWorked, 0),
      averageJobsPerCleaner:
        teamMembers.length > 0
          ? Math.round(
              (teamPerformance.reduce((sum, m) => sum + m.metrics.completedJobs, 0) /
                teamMembers.length) *
                10
            ) / 10
          : 0,
      averageRating:
        teamPerformance.filter((m) => m.metrics.averageRating !== null).length > 0
          ? Math.round(
              (teamPerformance
                .filter((m) => m.metrics.averageRating !== null)
                .reduce((sum, m) => sum + (m.metrics.averageRating || 0), 0) /
                teamPerformance.filter((m) => m.metrics.averageRating !== null).length) *
                10
            ) / 10
          : null,
    };

    // Top performers
    const topPerformers = {
      byRevenue: [...teamPerformance].sort((a, b) => b.metrics.totalRevenue - a.metrics.totalRevenue).slice(0, 3),
      byJobs: [...teamPerformance].sort((a, b) => b.metrics.completedJobs - a.metrics.completedJobs).slice(0, 3),
      byRating: [...teamPerformance]
        .filter((m) => m.metrics.averageRating !== null && m.metrics.totalRatings >= 3)
        .sort((a, b) => (b.metrics.averageRating || 0) - (a.metrics.averageRating || 0))
        .slice(0, 3),
      byEfficiency: [...teamPerformance]
        .filter((m) => m.metrics.completedJobs >= 5)
        .sort((a, b) => b.metrics.efficiencyRate - a.metrics.efficiencyRate)
        .slice(0, 3),
    };

    return NextResponse.json({
      period: {
        start: format(startDate, 'yyyy-MM-dd'),
        end: format(endDate, 'yyyy-MM-dd'),
        days,
      },
      summary,
      topPerformers,
      teamMembers: teamPerformance,
    });
  } catch (error) {
    console.error('Team performance analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
