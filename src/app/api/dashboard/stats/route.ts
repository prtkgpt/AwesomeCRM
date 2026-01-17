// ============================================
// CleanDayCRM - Dashboard Statistics API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, format } from 'date-fns';

export const dynamic = 'force-dynamic';

// GET /api/dashboard/stats - Get comprehensive dashboard statistics
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { companyId } = user;
    const now = new Date();

    // Time periods
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const yearStart = startOfYear(now);
    const yearEnd = endOfYear(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Execute all queries in parallel for performance
    const [
      // Client stats
      totalClients,
      activeClients,
      newClientsThisMonth,

      // Booking stats
      todayBookings,
      weekBookings,
      pendingBookings,
      completedBookings,
      cancelledBookings,

      // Revenue
      todayRevenue,
      weekRevenue,
      monthRevenue,
      lastMonthRevenue,
      yearRevenue,

      // Team stats
      totalTeamMembers,
      activeCleaners,

      // Reviews
      reviewStats,

      // Referral stats
      totalReferrals,
      totalCreditsIssued,

      // Upcoming jobs list
      upcomingJobs,

      // Today's schedule
      todaysSchedule,

      // Recent activity
      recentBookings,
    ] = await Promise.all([
      // Total clients
      prisma.client.count({
        where: { companyId, isActive: true },
      }),

      // Active clients (had booking in last 3 months)
      prisma.client.count({
        where: {
          companyId,
          isActive: true,
          lastBookingDate: { gte: subMonths(now, 3) },
        },
      }),

      // New clients this month
      prisma.client.count({
        where: {
          companyId,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
      }),

      // Today's bookings
      prisma.booking.count({
        where: {
          companyId,
          scheduledDate: { gte: todayStart, lte: todayEnd },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
      }),

      // Week bookings
      prisma.booking.count({
        where: {
          companyId,
          scheduledDate: { gte: weekStart, lte: weekEnd },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
      }),

      // Pending bookings
      prisma.booking.count({
        where: {
          companyId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          scheduledDate: { gte: now },
        },
      }),

      // Completed bookings this month
      prisma.booking.count({
        where: {
          companyId,
          status: 'COMPLETED',
          completedAt: { gte: monthStart, lte: monthEnd },
        },
      }),

      // Cancelled bookings this month
      prisma.booking.count({
        where: {
          companyId,
          status: 'CANCELLED',
          cancelledAt: { gte: monthStart, lte: monthEnd },
        },
      }),

      // Today's revenue
      prisma.booking.aggregate({
        where: {
          companyId,
          status: 'COMPLETED',
          isPaid: true,
          paidAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: { finalPrice: true },
      }),

      // Week revenue
      prisma.booking.aggregate({
        where: {
          companyId,
          status: 'COMPLETED',
          isPaid: true,
          paidAt: { gte: weekStart, lte: weekEnd },
        },
        _sum: { finalPrice: true },
      }),

      // Month revenue
      prisma.booking.aggregate({
        where: {
          companyId,
          status: 'COMPLETED',
          isPaid: true,
          paidAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { finalPrice: true },
      }),

      // Last month revenue (for comparison)
      prisma.booking.aggregate({
        where: {
          companyId,
          status: 'COMPLETED',
          isPaid: true,
          paidAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { finalPrice: true },
      }),

      // Year revenue
      prisma.booking.aggregate({
        where: {
          companyId,
          status: 'COMPLETED',
          isPaid: true,
          paidAt: { gte: yearStart, lte: yearEnd },
        },
        _sum: { finalPrice: true },
      }),

      // Total team members
      prisma.teamMember.count({
        where: { companyId, isActive: true },
      }),

      // Active cleaners (available and working today)
      prisma.teamMember.count({
        where: {
          companyId,
          isActive: true,
          isAvailable: true,
          user: { role: 'CLEANER' },
        },
      }),

      // Review stats
      prisma.review.aggregate({
        where: {
          booking: { companyId },
          createdAt: { gte: yearStart },
        },
        _avg: { overallRating: true },
        _count: { id: true },
      }),

      // Total referrals
      prisma.client.count({
        where: {
          companyId,
          referredById: { not: null },
        },
      }),

      // Total credits issued
      prisma.creditTransaction.aggregate({
        where: {
          client: { companyId },
          amount: { gt: 0 },
          type: { in: ['REFERRAL_EARNED', 'TIER_BONUS', 'LOYALTY_EARNED'] },
        },
        _sum: { amount: true },
      }),

      // Upcoming jobs (next 7 days)
      prisma.booking.findMany({
        where: {
          companyId,
          scheduledDate: { gte: now },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        include: {
          client: {
            select: { firstName: true, lastName: true, phone: true },
          },
          address: {
            select: { street: true, city: true, zip: true },
          },
          assignedCleaner: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { scheduledDate: 'asc' },
        take: 10,
      }),

      // Today's schedule
      prisma.booking.findMany({
        where: {
          companyId,
          scheduledDate: { gte: todayStart, lte: todayEnd },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
        include: {
          client: {
            select: { firstName: true, lastName: true, phone: true },
          },
          address: {
            select: { street: true, city: true },
          },
          assignedCleaner: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { scheduledDate: 'asc' },
      }),

      // Recent bookings
      prisma.booking.findMany({
        where: { companyId },
        include: {
          client: {
            select: { firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Calculate revenue change percentage
    const thisMonthRevenue = monthRevenue._sum.finalPrice || 0;
    const previousMonthRevenue = lastMonthRevenue._sum.finalPrice || 0;
    const revenueChange = previousMonthRevenue > 0
      ? ((thisMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : 0;

    // Available cleaners (those without jobs right now)
    const cleanersWithJobsNow = await prisma.booking.findMany({
      where: {
        companyId,
        status: 'IN_PROGRESS',
        scheduledDate: { lte: now },
        assignedCleanerId: { not: null },
      },
      select: { assignedCleanerId: true },
      distinct: ['assignedCleanerId'],
    });
    const availableCleaners = activeCleaners - cleanersWithJobsNow.length;

    return NextResponse.json({
      success: true,
      data: {
        // Revenue metrics
        todayRevenue: todayRevenue._sum.finalPrice || 0,
        weekRevenue: weekRevenue._sum.finalPrice || 0,
        monthRevenue: thisMonthRevenue,
        yearRevenue: yearRevenue._sum.finalPrice || 0,
        revenueChange: Math.round(revenueChange * 10) / 10,

        // Booking metrics
        todayBookings,
        weekBookings,
        pendingBookings,
        completedBookings,
        cancelledBookings,

        // Client metrics
        totalClients,
        activeClients,
        newClientsThisMonth,

        // Team metrics
        totalTeamMembers,
        activeCleaners,
        availableCleaners,

        // Rating metrics
        averageRating: reviewStats._avg.overallRating || 0,
        totalReviews: reviewStats._count.id || 0,

        // Referral metrics
        totalReferrals,
        totalCreditsIssued: totalCreditsIssued._sum.amount || 0,

        // Lists
        upcomingJobs: upcomingJobs.map(job => ({
          id: job.id,
          bookingNumber: job.bookingNumber,
          scheduledDate: job.scheduledDate,
          duration: job.duration,
          serviceType: job.serviceType,
          status: job.status,
          clientName: `${job.client.firstName} ${job.client.lastName || ''}`.trim(),
          clientPhone: job.client.phone,
          address: `${job.address.street}, ${job.address.city}`,
          cleanerName: job.assignedCleaner
            ? `${job.assignedCleaner.user.firstName || ''} ${job.assignedCleaner.user.lastName || ''}`.trim()
            : null,
          finalPrice: job.finalPrice,
        })),

        todaysSchedule: todaysSchedule.map(job => ({
          id: job.id,
          bookingNumber: job.bookingNumber,
          scheduledDate: job.scheduledDate,
          duration: job.duration,
          status: job.status,
          clientName: `${job.client.firstName} ${job.client.lastName || ''}`.trim(),
          address: `${job.address.street}, ${job.address.city}`,
          cleanerName: job.assignedCleaner
            ? `${job.assignedCleaner.user.firstName || ''} ${job.assignedCleaner.user.lastName || ''}`.trim()
            : 'Unassigned',
        })),

        recentActivity: recentBookings.map(b => ({
          id: b.id,
          type: 'booking',
          title: `New booking from ${b.client.firstName}`,
          status: b.status,
          createdAt: b.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('GET /api/dashboard/stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
