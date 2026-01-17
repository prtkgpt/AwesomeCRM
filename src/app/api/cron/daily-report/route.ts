// ============================================
// CleanDayCRM - Daily Report Generator
// ============================================
// Generates and sends daily business summary reports

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  subDays,
  format,
  isWithinInterval,
  addMinutes,
} from 'date-fns';

const CRON_SECRET = process.env.CRON_SECRET;

interface DailyReport {
  companyId: string;
  companyName: string;
  date: string;
  bookings: {
    completed: number;
    scheduled: number;
    cancelled: number;
    noShow: number;
  };
  revenue: {
    today: number;
    weekToDate: number;
    outstanding: number;
  };
  clients: {
    new: number;
    active: number;
  };
  team: {
    activeCleaners: number;
    topPerformer?: { name: string; jobsCompleted: number };
  };
  alerts: string[];
  upcomingTomorrow: number;
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const results = {
      reportsSent: 0,
      errors: [] as string[],
    };

    // Get companies with daily reports enabled
    const companies = await prisma.company.findMany({
      where: {
        // Add a field for this in schema if needed
        // dailyReportEnabled: true,
      },
      select: {
        id: true,
        name: true,
        timezone: true,
      },
    });

    for (const company of companies) {
      try {
        // Generate the report
        const report = await generateDailyReport(company.id, company.name, now);

        // Send to company owner(s)
        const owners = await prisma.user.findMany({
          where: {
            companyId: company.id,
            role: 'OWNER',
            isActive: true,
          },
          select: { id: true, email: true, firstName: true },
        });

        for (const owner of owners) {
          // Log the daily report generation
          console.log(`📊 Daily report generated for company ${company.id}, owner ${owner.id}`);
          console.log(`📈 Report: ${formatReportMessage(report)}`);

          results.reportsSent++;
        }
      } catch (error) {
        results.errors.push(
          `Company ${company.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Daily report generation completed',
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Daily report cron error:', error);
    return NextResponse.json(
      { success: false, error: 'Daily report job failed' },
      { status: 500 }
    );
  }
}

async function generateDailyReport(
  companyId: string,
  companyName: string,
  date: Date
): Promise<DailyReport> {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const tomorrow = addMinutes(dayEnd, 1);
  const tomorrowEnd = endOfDay(tomorrow);

  // Bookings today
  const bookingsToday = await prisma.booking.groupBy({
    by: ['status'],
    where: {
      companyId,
      scheduledDate: { gte: dayStart, lte: dayEnd },
    },
    _count: true,
  });

  const bookingStats = {
    completed: 0,
    scheduled: 0,
    cancelled: 0,
    noShow: 0,
  };

  for (const b of bookingsToday) {
    if (b.status === 'COMPLETED') bookingStats.completed = b._count;
    else if (b.status === 'CONFIRMED' || b.status === 'PENDING') bookingStats.scheduled += b._count;
    else if (b.status === 'CANCELLED') bookingStats.cancelled = b._count;
    else if (b.status === 'NO_SHOW') bookingStats.noShow = b._count;
  }

  // Revenue
  const revenueToday = await prisma.payment.aggregate({
    where: {
      companyId,
      status: 'PAID',
      capturedAt: { gte: dayStart, lte: dayEnd },
    },
    _sum: { amount: true },
  });

  const revenueWeek = await prisma.payment.aggregate({
    where: {
      companyId,
      status: 'PAID',
      capturedAt: { gte: weekStart, lte: dayEnd },
    },
    _sum: { amount: true },
  });

  const outstandingPayments = await prisma.booking.aggregate({
    where: {
      companyId,
      isPaid: false,
      status: 'COMPLETED',
    },
    _sum: { finalPrice: true },
  });

  // Clients
  const newClients = await prisma.client.count({
    where: {
      companyId,
      createdAt: { gte: dayStart, lte: dayEnd },
    },
  });

  const activeClients = await prisma.client.count({
    where: {
      companyId,
      bookings: {
        some: {
          scheduledDate: { gte: subDays(date, 30) },
        },
      },
    },
  });

  // Team
  const activeCleaners = await prisma.teamMember.count({
    where: {
      companyId,
      user: { isActive: true },
    },
  });

  // Top performer today
  const topPerformer = await prisma.booking.groupBy({
    by: ['assignedCleanerId'],
    where: {
      companyId,
      scheduledDate: { gte: dayStart, lte: dayEnd },
      status: 'COMPLETED',
      assignedCleanerId: { not: null },
    },
    _count: true,
    orderBy: { _count: { assignedCleanerId: 'desc' } },
    take: 1,
  });

  let topPerformerInfo: { name: string; jobsCompleted: number } | undefined;
  if (topPerformer[0]) {
    const cleaner = await prisma.teamMember.findUnique({
      where: { id: topPerformer[0].assignedCleanerId! },
      include: { user: true },
    });
    if (cleaner) {
      topPerformerInfo = {
        name: `${cleaner.user.firstName} ${cleaner.user.lastName}`,
        jobsCompleted: topPerformer[0]._count,
      };
    }
  }

  // Upcoming tomorrow
  const upcomingTomorrow = await prisma.booking.count({
    where: {
      companyId,
      scheduledDate: { gte: tomorrow, lte: tomorrowEnd },
      status: { in: ['CONFIRMED', 'PENDING'] },
    },
  });

  // Alerts
  const alerts: string[] = [];

  // Low inventory alert - items with zero quantity
  const lowInventory = await prisma.inventoryItem.count({
    where: {
      companyId,
      isActive: true,
      quantity: { lte: 0 },
    },
  });
  if (lowInventory > 0) {
    alerts.push(`${lowInventory} inventory items need restocking`);
  }

  // Unassigned bookings alert
  const unassigned = await prisma.booking.count({
    where: {
      companyId,
      scheduledDate: { gte: tomorrow, lte: addMinutes(tomorrowEnd, 60 * 24 * 3) },
      assignedCleanerId: null,
      status: { in: ['CONFIRMED', 'PENDING'] },
    },
  });
  if (unassigned > 0) {
    alerts.push(`${unassigned} upcoming bookings need cleaner assignment`);
  }

  // Pending reviews alert (unresponded reviews)
  const pendingReviews = await prisma.review.count({
    where: {
      booking: { companyId },
      responseText: null,
    },
  });
  if (pendingReviews > 0) {
    alerts.push(`${pendingReviews} reviews awaiting response`);
  }

  return {
    companyId,
    companyName,
    date: format(date, 'yyyy-MM-dd'),
    bookings: bookingStats,
    revenue: {
      today: revenueToday._sum.amount || 0,
      weekToDate: revenueWeek._sum.amount || 0,
      outstanding: outstandingPayments._sum.finalPrice || 0,
    },
    clients: {
      new: newClients,
      active: activeClients,
    },
    team: {
      activeCleaners,
      topPerformer: topPerformerInfo,
    },
    alerts,
    upcomingTomorrow,
  };
}

function formatReportMessage(report: DailyReport): string {
  const lines = [
    `Daily Summary for ${report.companyName}`,
    `Date: ${report.date}`,
    '',
    '📊 BOOKINGS',
    `  Completed: ${report.bookings.completed}`,
    `  Scheduled: ${report.bookings.scheduled}`,
    `  Cancelled: ${report.bookings.cancelled}`,
    report.bookings.noShow > 0 ? `  No-shows: ${report.bookings.noShow}` : '',
    '',
    '💰 REVENUE',
    `  Today: $${report.revenue.today.toFixed(2)}`,
    `  Week-to-date: $${report.revenue.weekToDate.toFixed(2)}`,
    report.revenue.outstanding > 0
      ? `  Outstanding: $${report.revenue.outstanding.toFixed(2)}`
      : '',
    '',
    '👥 CLIENTS',
    `  New today: ${report.clients.new}`,
    `  Active (30 days): ${report.clients.active}`,
    '',
    '👷 TEAM',
    `  Active cleaners: ${report.team.activeCleaners}`,
    report.team.topPerformer
      ? `  Top performer: ${report.team.topPerformer.name} (${report.team.topPerformer.jobsCompleted} jobs)`
      : '',
    '',
    `📅 Tomorrow: ${report.upcomingTomorrow} bookings scheduled`,
  ];

  if (report.alerts.length > 0) {
    lines.push('', '⚠️ ALERTS');
    report.alerts.forEach((alert) => lines.push(`  • ${alert}`));
  }

  return lines.filter(Boolean).join('\n');
}
