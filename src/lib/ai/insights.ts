import { prisma } from "@/lib/prisma";
import { InsightQuery } from "./types";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  format,
} from "date-fns";

export interface InsightData {
  query: InsightQuery;
  data: Record<string, unknown>;
  context: string;
}

type TimePeriod =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "last_30_days"
  | "last_90_days";

function getDateRange(period: TimePeriod): { start: Date; end: Date } {
  const now = new Date();

  switch (period) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "yesterday":
      const yesterday = subDays(now, 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    case "this_week":
      return { start: startOfWeek(now), end: endOfWeek(now) };
    case "last_week":
      const lastWeekStart = startOfWeek(subDays(now, 7));
      const lastWeekEnd = endOfWeek(subDays(now, 7));
      return { start: lastWeekStart, end: lastWeekEnd };
    case "this_month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "last_month":
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    case "last_30_days":
      return { start: subDays(now, 30), end: now };
    case "last_90_days":
      return { start: subDays(now, 90), end: now };
    default:
      return { start: startOfMonth(now), end: endOfMonth(now) };
  }
}

export async function fetchRevenueSummary(
  companyId: string,
  period: TimePeriod = "this_month"
): Promise<InsightData> {
  const { start, end } = getDateRange(period);
  const previousPeriod = getDateRange(
    period === "this_month" ? "last_month" : "last_30_days"
  );

  const [currentRevenue, previousRevenue, bookingStats, topServiceTypes] =
    await Promise.all([
      // Current period revenue
      prisma.booking.aggregate({
        where: {
          companyId,
          status: "COMPLETED",
          isPaid: true,
          scheduledDate: { gte: start, lte: end },
        },
        _sum: { price: true },
        _count: true,
      }),

      // Previous period revenue
      prisma.booking.aggregate({
        where: {
          companyId,
          status: "COMPLETED",
          isPaid: true,
          scheduledDate: { gte: previousPeriod.start, lte: previousPeriod.end },
        },
        _sum: { price: true },
        _count: true,
      }),

      // Booking stats
      prisma.booking.groupBy({
        by: ["status"],
        where: { companyId, scheduledDate: { gte: start, lte: end } },
        _count: true,
      }),

      // Top service types
      prisma.booking.groupBy({
        by: ["serviceType"],
        where: {
          companyId,
          status: "COMPLETED",
          scheduledDate: { gte: start, lte: end },
        },
        _count: true,
        _sum: { price: true },
        orderBy: { _sum: { price: "desc" } },
      }),
    ]);

  const currentTotal = currentRevenue._sum.price || 0;
  const previousTotal = previousRevenue._sum.price || 0;
  const changePercent =
    previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal) * 100
      : 0;

  const statusBreakdown = bookingStats.reduce(
    (acc, stat) => {
      acc[stat.status] = stat._count;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    query: "revenue_summary",
    data: {
      totalRevenue: currentTotal,
      previousPeriodRevenue: previousTotal,
      changePercent: Math.round(changePercent * 10) / 10,
      totalJobs: currentRevenue._count,
      previousPeriodJobs: previousRevenue._count,
      statusBreakdown,
      topServiceTypes: topServiceTypes.map((s) => ({
        type: s.serviceType,
        count: s._count,
        revenue: s._sum.price || 0,
      })),
      period: {
        start: format(start, "MMM d, yyyy"),
        end: format(end, "MMM d, yyyy"),
      },
    },
    context: `Revenue summary for ${period.replace("_", " ")}`,
  };
}

export async function fetchTopCustomers(
  companyId: string,
  limit: number = 10
): Promise<InsightData> {
  const clients = await prisma.client.findMany({
    where: { companyId },
    include: {
      bookings: {
        where: { status: "COMPLETED", isPaid: true },
        select: { price: true, scheduledDate: true },
      },
      _count: {
        select: { bookings: { where: { status: "COMPLETED" } } },
      },
    },
    orderBy: {
      bookings: { _count: "desc" },
    },
    take: limit * 2, // Fetch more to sort by total spent
  });

  const clientsWithSpend = clients
    .map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      totalBookings: client._count.bookings,
      totalSpent: client.bookings.reduce((sum, b) => sum + b.price, 0),
      lastBooking:
        client.bookings.length > 0
          ? client.bookings.sort(
              (a, b) =>
                new Date(b.scheduledDate).getTime() -
                new Date(a.scheduledDate).getTime()
            )[0].scheduledDate
          : null,
      tags: client.tags,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);

  const totalCustomerRevenue = clientsWithSpend.reduce(
    (sum, c) => sum + c.totalSpent,
    0
  );

  return {
    query: "top_customers",
    data: {
      customers: clientsWithSpend,
      totalCustomerCount: clients.length,
      totalRevenueFromTopCustomers: totalCustomerRevenue,
    },
    context: `Top ${limit} customers by lifetime value`,
  };
}

export async function fetchCleanerPerformance(
  companyId: string,
  cleanerName?: string
): Promise<InsightData> {
  const { start: monthStart, end: monthEnd } = getDateRange("this_month");
  const { start: lastMonthStart, end: lastMonthEnd } =
    getDateRange("last_month");

  const whereClause = cleanerName
    ? {
        companyId,
        user: { name: { contains: cleanerName, mode: "insensitive" as const } },
      }
    : { companyId };

  const cleaners = await prisma.teamMember.findMany({
    where: whereClause,
    include: {
      user: { select: { name: true, email: true } },
      assignedBookings: {
        where: {
          status: { in: ["COMPLETED", "SCHEDULED"] },
        },
        include: {
          reviews: true,
        },
      },
    },
  });

  const cleanerStats = cleaners.map((cleaner) => {
    const thisMonthBookings = cleaner.assignedBookings.filter(
      (b) =>
        b.scheduledDate >= monthStart &&
        b.scheduledDate <= monthEnd &&
        b.status === "COMPLETED"
    );
    const lastMonthBookings = cleaner.assignedBookings.filter(
      (b) =>
        b.scheduledDate >= lastMonthStart &&
        b.scheduledDate <= lastMonthEnd &&
        b.status === "COMPLETED"
    );
    const upcomingBookings = cleaner.assignedBookings.filter(
      (b) => b.scheduledDate > new Date() && b.status === "SCHEDULED"
    );

    const allReviews = cleaner.assignedBookings.flatMap((b) => b.reviews);
    const avgRating =
      allReviews.length > 0
        ? allReviews.reduce((sum, r) => sum + r.overallRating, 0) /
          allReviews.length
        : null;

    return {
      id: cleaner.id,
      name: cleaner.user.name,
      email: cleaner.user.email,
      thisMonthJobs: thisMonthBookings.length,
      lastMonthJobs: lastMonthBookings.length,
      thisMonthRevenue: thisMonthBookings.reduce((sum, b) => sum + b.price, 0),
      upcomingJobs: upcomingBookings.length,
      totalJobsAllTime: cleaner.assignedBookings.filter(
        (b) => b.status === "COMPLETED"
      ).length,
      avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      totalReviews: allReviews.length,
      specialties: cleaner.specialties,
      isActive: cleaner.isActive,
    };
  });

  return {
    query: "cleaner_performance",
    data: {
      cleaners: cleanerStats.sort(
        (a, b) => b.thisMonthJobs - a.thisMonthJobs
      ),
      totalActiveCleaners: cleanerStats.filter((c) => c.isActive).length,
      periodContext: {
        thisMonth: format(monthStart, "MMMM yyyy"),
        comparison: format(lastMonthStart, "MMMM yyyy"),
      },
    },
    context: cleanerName
      ? `Performance data for ${cleanerName}`
      : "Performance data for all cleaners",
  };
}

export async function fetchCancellationAnalysis(
  companyId: string
): Promise<InsightData> {
  const { start: monthStart } = getDateRange("this_month");
  const { start: lastMonthStart, end: lastMonthEnd } =
    getDateRange("last_month");

  const [thisMonthCancellations, lastMonthCancellations, allBookingsThisMonth] =
    await Promise.all([
      prisma.booking.findMany({
        where: {
          companyId,
          status: { in: ["CANCELLED", "NO_SHOW"] },
          scheduledDate: { gte: monthStart },
        },
        include: {
          client: { select: { name: true, tags: true } },
        },
      }),
      prisma.booking.count({
        where: {
          companyId,
          status: { in: ["CANCELLED", "NO_SHOW"] },
          scheduledDate: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
      prisma.booking.count({
        where: { companyId, scheduledDate: { gte: monthStart } },
      }),
    ]);

  const cancellationRate =
    allBookingsThisMonth > 0
      ? (thisMonthCancellations.length / allBookingsThisMonth) * 100
      : 0;

  // Analyze patterns
  const dayOfWeekCounts = thisMonthCancellations.reduce(
    (acc, b) => {
      const day = format(new Date(b.scheduledDate), "EEEE");
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const recentCancellations = thisMonthCancellations
    .sort(
      (a, b) =>
        new Date(b.scheduledDate).getTime() -
        new Date(a.scheduledDate).getTime()
    )
    .slice(0, 10)
    .map((b) => ({
      clientName: b.client.name,
      date: format(new Date(b.scheduledDate), "MMM d, yyyy"),
      status: b.status,
      lostRevenue: b.price,
    }));

  return {
    query: "cancellation_analysis",
    data: {
      thisMonthCount: thisMonthCancellations.length,
      lastMonthCount: lastMonthCancellations,
      cancellationRate: Math.round(cancellationRate * 10) / 10,
      lostRevenue: thisMonthCancellations.reduce((sum, b) => sum + b.price, 0),
      byDayOfWeek: dayOfWeekCounts,
      recentCancellations,
      noShowCount: thisMonthCancellations.filter((b) => b.status === "NO_SHOW")
        .length,
    },
    context: "Cancellation and no-show analysis for this month",
  };
}

export async function fetchUpcomingSchedule(
  companyId: string,
  days: number = 1
): Promise<InsightData> {
  const start = startOfDay(new Date());
  const end = endOfDay(subDays(new Date(), -days + 1));

  const bookings = await prisma.booking.findMany({
    where: {
      companyId,
      status: "SCHEDULED",
      scheduledDate: { gte: start, lte: end },
    },
    include: {
      client: { select: { name: true, phone: true } },
      address: {
        select: { street: true, city: true, propertyType: true, bedrooms: true },
      },
      assignee: {
        include: { user: { select: { name: true } } },
      },
    },
    orderBy: { scheduledDate: "asc" },
  });

  const groupedByDay = bookings.reduce(
    (acc, booking) => {
      const day = format(new Date(booking.scheduledDate), "yyyy-MM-dd");
      if (!acc[day]) acc[day] = [];
      acc[day].push({
        id: booking.id,
        time: format(new Date(booking.scheduledDate), "h:mm a"),
        clientName: booking.client.name,
        clientPhone: booking.client.phone,
        address: `${booking.address.street}, ${booking.address.city}`,
        propertyType: booking.address.propertyType,
        bedrooms: booking.address.bedrooms,
        serviceType: booking.serviceType,
        duration: booking.duration,
        price: booking.price,
        assignedTo: booking.assignee?.user.name || "Unassigned",
      });
      return acc;
    },
    {} as Record<string, Array<Record<string, unknown>>>
  );

  return {
    query: "upcoming_schedule",
    data: {
      totalJobs: bookings.length,
      schedule: groupedByDay,
      unassignedCount: bookings.filter((b) => !b.assignedTo).length,
      totalRevenue: bookings.reduce((sum, b) => sum + b.price, 0),
    },
    context:
      days === 1
        ? "Today's schedule"
        : `Schedule for the next ${days} days`,
  };
}

export async function fetchOverdueInvoices(
  companyId: string
): Promise<InsightData> {
  const now = new Date();

  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      companyId,
      status: { in: ["SENT", "OVERDUE"] },
      dueDate: { lt: now },
    },
    include: {
      client: { select: { name: true, email: true, phone: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const unpaidBookings = await prisma.booking.findMany({
    where: {
      companyId,
      status: "COMPLETED",
      isPaid: false,
    },
    include: {
      client: { select: { name: true } },
    },
    orderBy: { scheduledDate: "desc" },
    take: 20,
  });

  return {
    query: "overdue_invoices",
    data: {
      overdueInvoices: overdueInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.client.name,
        clientEmail: inv.client.email,
        amount: inv.total,
        dueDate: format(new Date(inv.dueDate), "MMM d, yyyy"),
        daysOverdue: Math.floor(
          (now.getTime() - new Date(inv.dueDate).getTime()) /
            (1000 * 60 * 60 * 24)
        ),
      })),
      totalOverdue: overdueInvoices.reduce((sum, inv) => sum + inv.total, 0),
      unpaidBookings: unpaidBookings.map((b) => ({
        id: b.id,
        clientName: b.client.name,
        amount: b.price,
        date: format(new Date(b.scheduledDate), "MMM d, yyyy"),
      })),
      totalUnpaidBookings: unpaidBookings.reduce(
        (sum, b) => sum + b.price,
        0
      ),
    },
    context: "Overdue invoices and unpaid bookings",
  };
}

export async function fetchLapsedClients(
  companyId: string,
  daysInactive: number = 60
): Promise<InsightData> {
  const cutoffDate = subDays(new Date(), daysInactive);

  const clients = await prisma.client.findMany({
    where: { companyId },
    include: {
      bookings: {
        where: { status: "COMPLETED" },
        orderBy: { scheduledDate: "desc" },
        take: 1,
      },
      _count: {
        select: { bookings: { where: { status: "COMPLETED" } } },
      },
    },
  });

  const lapsedClients = clients
    .filter((client) => {
      if (client.bookings.length === 0) return false;
      const lastBooking = client.bookings[0];
      return new Date(lastBooking.scheduledDate) < cutoffDate;
    })
    .map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      totalBookings: client._count.bookings,
      lastBookingDate: format(
        new Date(client.bookings[0].scheduledDate),
        "MMM d, yyyy"
      ),
      daysSinceLastBooking: Math.floor(
        (new Date().getTime() -
          new Date(client.bookings[0].scheduledDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ),
      tags: client.tags,
    }))
    .sort((a, b) => b.totalBookings - a.totalBookings);

  return {
    query: "lapsed_clients",
    data: {
      lapsedClients,
      totalLapsed: lapsedClients.length,
      totalActiveClients: clients.length - lapsedClients.length,
      potentialRevenue:
        lapsedClients.length * 150, // Estimate average booking value
      winBackCandidates: lapsedClients.filter((c) => c.totalBookings >= 3),
    },
    context: `Clients who haven't booked in ${daysInactive}+ days`,
  };
}

// Main function to fetch insights based on query type
export async function fetchInsight(
  companyId: string,
  queryType: InsightQuery,
  params?: {
    period?: TimePeriod;
    cleanerName?: string;
    limit?: number;
    days?: number;
    daysInactive?: number;
  }
): Promise<InsightData> {
  switch (queryType) {
    case "revenue_summary":
      return fetchRevenueSummary(companyId, params?.period);
    case "top_customers":
      return fetchTopCustomers(companyId, params?.limit);
    case "cleaner_performance":
      return fetchCleanerPerformance(companyId, params?.cleanerName);
    case "cancellation_analysis":
      return fetchCancellationAnalysis(companyId);
    case "upcoming_schedule":
      return fetchUpcomingSchedule(companyId, params?.days);
    case "overdue_invoices":
      return fetchOverdueInvoices(companyId);
    case "lapsed_clients":
      return fetchLapsedClients(companyId, params?.daysInactive);
    case "revenue_comparison":
      // For comparison, fetch both current and previous month
      const current = await fetchRevenueSummary(companyId, "this_month");
      const previous = await fetchRevenueSummary(companyId, "last_month");
      return {
        query: "revenue_comparison",
        data: { currentPeriod: current.data, previousPeriod: previous.data },
        context: "Month-over-month revenue comparison",
      };
    default:
      return fetchRevenueSummary(companyId);
  }
}
