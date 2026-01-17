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
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    // Only owners and admins can access financial reports
    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Owner/Admin access required' },
        { status: 403 }
      );
    }

    const companyId = user.companyId;
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'all'; // all, year, month, quarter

    // Date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    
    let dateFilter = {};
    if (period === 'month') {
      dateFilter = { gte: startOfMonth };
    } else if (period === 'year') {
      dateFilter = { gte: startOfYear };
    } else if (period === 'quarter') {
      dateFilter = { gte: startOfQuarter };
    }

    // Fetch all completed bookings
    const completedBookings = await prisma.booking.findMany({
      where: {
        companyId,
        status: 'COMPLETED',
        ...(Object.keys(dateFilter).length > 0 && { scheduledDate: dateFilter }),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
        assignee: {
          select: {
            hourlyRate: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'desc',
      },
    });

    // Calculate total revenue
    const totalRevenue = completedBookings.reduce((sum, b) => sum + b.price, 0);
    const paidRevenue = completedBookings.filter(b => b.isPaid).reduce((sum, b) => sum + b.price, 0);
    const unpaidRevenue = completedBookings.filter(b => !b.isPaid).reduce((sum, b) => sum + b.price, 0);

    // Calculate total wages paid to cleaners (hourlyRate * duration in hours)
    const totalWages = completedBookings.reduce((sum, b) => {
      const hourlyRate = b.assignee?.hourlyRate || 0;
      const hoursWorked = b.duration / 60;
      return sum + (hourlyRate * hoursWorked);
    }, 0);

    // Fetch operational expenses (if they exist in your schema)
    // For now, we'll calculate gross profit (revenue - wages)
    const grossProfit = totalRevenue - totalWages;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Revenue by service type
    const revenueByServiceType = completedBookings.reduce((acc: any, booking) => {
      const type = booking.serviceType;
      if (!acc[type]) {
        acc[type] = {
          revenue: 0,
          count: 0,
          wages: 0,
        };
      }
      const hourlyRate = booking.assignee?.hourlyRate || 0;
      const hoursWorked = booking.duration / 60;
      const wage = hourlyRate * hoursWorked;

      acc[type].revenue += booking.price;
      acc[type].count += 1;
      acc[type].wages += wage;
      return acc;
    }, {});

    // Calculate profit margin per service type
    const serviceTypeAnalytics = Object.entries(revenueByServiceType).map(([type, data]: [string, any]) => ({
      serviceType: type,
      revenue: data.revenue,
      count: data.count,
      averagePrice: data.revenue / data.count,
      wages: data.wages,
      profit: data.revenue - data.wages,
      profitMargin: ((data.revenue - data.wages) / data.revenue) * 100,
    }));

    // Revenue by payment method
    const revenueByPaymentMethod = completedBookings
      .filter(b => b.isPaid && b.paymentMethod)
      .reduce((acc: any, booking) => {
        const method = booking.paymentMethod || 'Unknown';
        if (!acc[method]) {
          acc[method] = 0;
        }
        acc[method] += booking.price;
        return acc;
      }, {});

    // Top customers by revenue
    const customerRevenue = completedBookings.reduce((acc: any, booking) => {
      const clientId = booking.clientId;
      if (!acc[clientId]) {
        acc[clientId] = {
          clientId,
          clientName: booking.client.name,
          revenue: 0,
          bookings: 0,
          firstBooking: booking.client.createdAt,
        };
      }
      acc[clientId].revenue += booking.price;
      acc[clientId].bookings += 1;
      return acc;
    }, {});

    const topCustomers = Object.values(customerRevenue)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10);

    // Calculate Customer Lifetime Value (CLV)
    const avgCustomerRevenue = topCustomers.length > 0 
      ? topCustomers.reduce((sum: number, c: any) => sum + c.revenue, 0) / topCustomers.length 
      : 0;

    // New vs returning customers revenue
    const customerFirstBookingDates = new Map<string, Date>();
    completedBookings.forEach(booking => {
      const clientId = booking.clientId;
      const bookingDate = new Date(booking.scheduledDate);
      if (!customerFirstBookingDates.has(clientId) || bookingDate < customerFirstBookingDates.get(clientId)!) {
        customerFirstBookingDates.set(clientId, bookingDate);
      }
    });

    let newCustomerRevenue = 0;
    let returningCustomerRevenue = 0;
    let newCustomerCount = 0;
    let returningCustomerCount = 0;

    completedBookings.forEach(booking => {
      const firstBooking = customerFirstBookingDates.get(booking.clientId);
      const bookingDate = new Date(booking.scheduledDate);
      const isNewCustomer = firstBooking && Math.abs(bookingDate.getTime() - firstBooking.getTime()) < 86400000; // same day

      if (isNewCustomer) {
        newCustomerRevenue += booking.price;
        newCustomerCount++;
      } else {
        returningCustomerRevenue += booking.price;
        returningCustomerCount++;
      }
    });

    // Monthly trends (last 12 months)
    const monthlyTrends = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthBookings = completedBookings.filter(b => {
        const bookingDate = new Date(b.scheduledDate);
        return bookingDate >= monthStart && bookingDate <= monthEnd;
      });

      const monthRevenue = monthBookings.reduce((sum, b) => sum + b.price, 0);
      const monthWages = monthBookings.reduce((sum, b) => {
        const hourlyRate = b.assignee?.hourlyRate || 0;
        const hoursWorked = b.duration / 60;
        return sum + (hourlyRate * hoursWorked);
      }, 0);
      const monthProfit = monthRevenue - monthWages;

      monthlyTrends.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: monthRevenue,
        wages: monthWages,
        profit: monthProfit,
        bookings: monthBookings.length,
      });
    }

    // Outstanding invoices
    const outstandingInvoices = await prisma.booking.count({
      where: {
        companyId,
        status: 'COMPLETED',
        isPaid: false,
      },
    });

    const outstandingAmount = completedBookings
      .filter(b => !b.isPaid)
      .reduce((sum, b) => sum + b.price, 0);

    // Average booking value
    const avgBookingValue = completedBookings.length > 0 
      ? totalRevenue / completedBookings.length 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalRevenue,
          paidRevenue,
          unpaidRevenue,
          totalWages,
          grossProfit,
          profitMargin: profitMargin.toFixed(2),
          totalBookings: completedBookings.length,
          avgBookingValue,
          avgCustomerLifetimeValue: avgCustomerRevenue,
        },
        serviceTypeAnalytics: serviceTypeAnalytics.sort((a, b) => b.revenue - a.revenue),
        paymentMethods: Object.entries(revenueByPaymentMethod).map(([method, revenue]) => ({
          method,
          revenue,
        })),
        topCustomers,
        customerSegmentation: {
          newCustomerRevenue,
          returningCustomerRevenue,
          newCustomerCount,
          returningCustomerCount,
          newCustomerPercent: totalRevenue > 0 ? (newCustomerRevenue / totalRevenue) * 100 : 0,
          returningCustomerPercent: totalRevenue > 0 ? (returningCustomerRevenue / totalRevenue) * 100 : 0,
        },
        monthlyTrends,
        outstandingInvoices: {
          count: outstandingInvoices,
          amount: outstandingAmount,
        },
        period,
      },
    });
  } catch (error) {
    console.error('Error fetching financial report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch financial report' },
      { status: 500 }
    );
  }
}
