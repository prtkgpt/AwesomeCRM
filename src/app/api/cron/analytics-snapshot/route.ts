import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

// Cron job to generate daily, weekly, and monthly analytics snapshots
// Should be called daily, ideally after midnight

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional - for security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const yesterday = subDays(now, 1);

    // Get all active companies
    const companies = await prisma.company.findMany({
      where: { subscriptionStatus: 'ACTIVE' },
      select: { id: true, name: true },
    });

    const results = {
      processed: 0,
      errors: [] as string[],
      snapshots: {
        daily: 0,
        weekly: 0,
        monthly: 0,
      },
    };

    for (const company of companies) {
      try {
        // Generate daily snapshot for yesterday
        await generateSnapshot(company.id, yesterday, 'DAILY');
        results.snapshots.daily++;

        // Generate weekly snapshot on Mondays
        if (now.getDay() === 1) {
          const lastWeekStart = startOfWeek(subDays(now, 7));
          await generateSnapshot(company.id, lastWeekStart, 'WEEKLY');
          results.snapshots.weekly++;
        }

        // Generate monthly snapshot on the 1st
        if (now.getDate() === 1) {
          const lastMonthStart = startOfMonth(subDays(now, 1));
          await generateSnapshot(company.id, lastMonthStart, 'MONTHLY');
          results.snapshots.monthly++;
        }

        results.processed++;
      } catch (error) {
        console.error(`Error processing company ${company.id}:`, error);
        results.errors.push(`Company ${company.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} companies`,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Analytics snapshot cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateSnapshot(companyId: string, date: Date, type: 'DAILY' | 'WEEKLY' | 'MONTHLY') {
  let startDate: Date;
  let endDate: Date;

  switch (type) {
    case 'DAILY':
      startDate = startOfDay(date);
      endDate = endOfDay(date);
      break;
    case 'WEEKLY':
      startDate = startOfWeek(date);
      endDate = endOfWeek(date);
      break;
    case 'MONTHLY':
      startDate = startOfMonth(date);
      endDate = endOfMonth(date);
      break;
  }

  // Check if snapshot already exists
  const existingSnapshot = await prisma.analyticsSnapshot.findUnique({
    where: {
      companyId_date_type: {
        companyId,
        date: startDate,
        type,
      },
    },
  });

  if (existingSnapshot) {
    console.log(`Snapshot already exists for ${companyId} on ${format(startDate, 'yyyy-MM-dd')} (${type})`);
    return existingSnapshot;
  }

  // Gather metrics
  const [
    bookings,
    completedBookings,
    cancelledBookings,
    noShowBookings,
    scheduledBookings,
    paidRevenue,
    unpaidRevenue,
    newClients,
    activeClients,
    teamMembers,
    referralSignups,
    referralCreditsAwarded,
    referralCreditsUsed,
    ratings,
    tips,
  ] = await Promise.all([
    // Total bookings
    prisma.booking.count({
      where: {
        companyId,
        scheduledDate: { gte: startDate, lte: endDate },
      },
    }),
    // Completed bookings
    prisma.booking.count({
      where: {
        companyId,
        status: { in: ['COMPLETED', 'CLEANER_COMPLETED'] },
        scheduledDate: { gte: startDate, lte: endDate },
      },
    }),
    // Cancelled bookings
    prisma.booking.count({
      where: {
        companyId,
        status: 'CANCELLED',
        scheduledDate: { gte: startDate, lte: endDate },
      },
    }),
    // No show bookings
    prisma.booking.count({
      where: {
        companyId,
        status: 'NO_SHOW',
        scheduledDate: { gte: startDate, lte: endDate },
      },
    }),
    // Scheduled bookings
    prisma.booking.count({
      where: {
        companyId,
        status: 'SCHEDULED',
        scheduledDate: { gte: startDate, lte: endDate },
      },
    }),
    // Paid revenue
    prisma.booking.aggregate({
      where: {
        companyId,
        isPaid: true,
        scheduledDate: { gte: startDate, lte: endDate },
      },
      _sum: { price: true },
    }),
    // Unpaid revenue
    prisma.booking.aggregate({
      where: {
        companyId,
        isPaid: false,
        status: { in: ['COMPLETED', 'CLEANER_COMPLETED'] },
        scheduledDate: { gte: startDate, lte: endDate },
      },
      _sum: { price: true },
    }),
    // New clients
    prisma.client.count({
      where: {
        companyId,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    // Active clients (with bookings in period)
    prisma.client.count({
      where: {
        companyId,
        bookings: {
          some: {
            scheduledDate: { gte: startDate, lte: endDate },
          },
        },
      },
    }),
    // Active team members
    prisma.teamMember.count({
      where: {
        companyId,
        isActive: true,
      },
    }),
    // Referral signups
    prisma.client.count({
      where: {
        companyId,
        referredById: { not: null },
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    // Referral credits awarded
    prisma.referralCreditTransaction.aggregate({
      where: {
        companyId,
        type: 'EARNED',
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    }),
    // Referral credits used
    prisma.referralCreditTransaction.aggregate({
      where: {
        companyId,
        type: 'USED',
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    }),
    // Ratings
    prisma.booking.aggregate({
      where: {
        companyId,
        customerRating: { not: null },
        scheduledDate: { gte: startDate, lte: endDate },
      },
      _avg: { customerRating: true },
      _count: { customerRating: true },
    }),
    // Tips
    prisma.booking.aggregate({
      where: {
        companyId,
        tipAmount: { not: null },
        scheduledDate: { gte: startDate, lte: endDate },
      },
      _sum: { tipAmount: true },
    }),
  ]);

  // Revenue by service type
  const revenueByServiceType = await prisma.booking.groupBy({
    by: ['serviceType'],
    where: {
      companyId,
      status: { in: ['COMPLETED', 'CLEANER_COMPLETED'] },
      scheduledDate: { gte: startDate, lte: endDate },
    },
    _sum: { price: true },
  });

  const revenueByService: Record<string, number> = {};
  revenueByServiceType.forEach((item) => {
    revenueByService[item.serviceType] = item._sum.price || 0;
  });

  // Calculate hours worked
  const bookingsWithTime = await prisma.booking.findMany({
    where: {
      companyId,
      status: { in: ['COMPLETED', 'CLEANER_COMPLETED'] },
      scheduledDate: { gte: startDate, lte: endDate },
    },
    select: {
      duration: true,
      clockedInAt: true,
      clockedOutAt: true,
    },
  });

  let totalHoursWorked = 0;
  bookingsWithTime.forEach((b) => {
    if (b.clockedInAt && b.clockedOutAt) {
      totalHoursWorked +=
        (new Date(b.clockedOutAt).getTime() - new Date(b.clockedInAt).getTime()) / (1000 * 60 * 60);
    } else {
      totalHoursWorked += b.duration / 60;
    }
  });

  // Returning customers
  const returningCustomers = await prisma.client.count({
    where: {
      companyId,
      bookings: {
        some: {
          scheduledDate: { gte: startDate, lte: endDate },
        },
      },
      createdAt: { lt: startDate },
    },
  });

  // Calculate metrics
  const totalRevenue = (paidRevenue._sum.price || 0) + (unpaidRevenue._sum.price || 0);
  const averageBookingValue = completedBookings > 0 ? totalRevenue / completedBookings : 0;
  const averageJobsPerCleaner = teamMembers > 0 ? completedBookings / teamMembers : 0;

  // Create or update snapshot
  const snapshot = await prisma.analyticsSnapshot.upsert({
    where: {
      companyId_date_type: {
        companyId,
        date: startDate,
        type,
      },
    },
    update: {
      totalRevenue,
      averageBookingValue,
      revenueByService,
      unpaidRevenue: unpaidRevenue._sum.price || 0,
      totalBookings: bookings,
      completedBookings,
      cancelledBookings,
      noShowBookings,
      scheduledBookings,
      newCustomers: newClients,
      returningCustomers,
      totalActiveCustomers: activeClients,
      churned: 0, // Would need more complex calculation
      activeCleaners: teamMembers,
      averageJobsPerCleaner,
      totalHoursWorked,
      referralSignups,
      referralConversions: referralSignups, // Simplified
      referralCreditsAwarded: referralCreditsAwarded._sum.amount || 0,
      referralCreditsUsed: Math.abs(referralCreditsUsed._sum.amount || 0),
      averageRating: ratings._avg.customerRating,
      totalReviews: ratings._count.customerRating,
      totalTips: tips._sum.tipAmount || 0,
    },
    create: {
      companyId,
      date: startDate,
      type,
      totalRevenue,
      averageBookingValue,
      revenueByService,
      unpaidRevenue: unpaidRevenue._sum.price || 0,
      totalBookings: bookings,
      completedBookings,
      cancelledBookings,
      noShowBookings,
      scheduledBookings,
      newCustomers: newClients,
      returningCustomers,
      totalActiveCustomers: activeClients,
      churned: 0,
      activeCleaners: teamMembers,
      averageJobsPerCleaner,
      totalHoursWorked,
      referralSignups,
      referralConversions: referralSignups,
      referralCreditsAwarded: referralCreditsAwarded._sum.amount || 0,
      referralCreditsUsed: Math.abs(referralCreditsUsed._sum.amount || 0),
      averageRating: ratings._avg.customerRating,
      totalReviews: ratings._count.customerRating,
      totalTips: tips._sum.tipAmount || 0,
    },
  });

  console.log(`Created ${type} snapshot for company ${companyId} on ${format(startDate, 'yyyy-MM-dd')}`);
  return snapshot;
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
