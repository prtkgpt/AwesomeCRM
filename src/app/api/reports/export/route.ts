// ============================================
// CleanDayCRM - Report Export API
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
} from 'date-fns';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

type ReportType = 'revenue' | 'bookings' | 'clients' | 'team';
type ExportFormat = 'csv' | 'json';

interface ExportRequest {
  reportType: ReportType;
  format: ExportFormat;
  startDate?: string;
  endDate?: string;
  period?: string;
  filters?: {
    serviceType?: string;
    cleanerId?: string;
    status?: string;
  };
}

// POST /api/reports/export - Generate CSV/JSON export of report data
export async function POST(request: NextRequest) {
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

    // Only OWNER and ADMIN can export reports
    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Owner/Admin access required' },
        { status: 403 }
      );
    }

    const body: ExportRequest = await request.json();
    const { reportType, format: exportFormat = 'csv', startDate: startDateParam, endDate: endDateParam, period, filters } = body;

    if (!reportType) {
      return NextResponse.json(
        { success: false, error: 'reportType is required' },
        { status: 400 }
      );
    }

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

    let data: any[] = [];
    let headers: string[] = [];
    let filename = '';

    switch (reportType) {
      case 'revenue':
        const revenueData = await getRevenueExportData(user.companyId, startDate, endDate, filters);
        data = revenueData.rows;
        headers = revenueData.headers;
        filename = `revenue-report-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}`;
        break;

      case 'bookings':
        const bookingsData = await getBookingsExportData(user.companyId, startDate, endDate, filters);
        data = bookingsData.rows;
        headers = bookingsData.headers;
        filename = `bookings-report-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}`;
        break;

      case 'clients':
        const clientsData = await getClientsExportData(user.companyId, startDate, endDate, filters);
        data = clientsData.rows;
        headers = clientsData.headers;
        filename = `clients-report-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}`;
        break;

      case 'team':
        const teamData = await getTeamExportData(user.companyId, startDate, endDate, filters);
        data = teamData.rows;
        headers = teamData.headers;
        filename = `team-performance-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}`;
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid report type' },
          { status: 400 }
        );
    }

    if (exportFormat === 'json') {
      return NextResponse.json({
        success: true,
        data: {
          filename: `${filename}.json`,
          contentType: 'application/json',
          rows: data,
          rowCount: data.length,
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // Generate CSV
    const csv = generateCSV(headers, data);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  } catch (error) {
    console.error('POST /api/reports/export error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export report' },
      { status: 500 }
    );
  }
}

// Helper function to generate CSV from data
function generateCSV(headers: string[], rows: any[]): string {
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.map(escapeCSV).join(',');
  const dataRows = rows.map((row) =>
    headers.map((header) => escapeCSV(row[header])).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

// Revenue export data
async function getRevenueExportData(companyId: string, startDate: Date, endDate: Date, filters?: any) {
  const whereClause: any = {
    companyId,
    status: 'COMPLETED',
    scheduledDate: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (filters?.serviceType) {
    whereClause.serviceType = filters.serviceType;
  }

  if (filters?.cleanerId) {
    whereClause.assignedCleanerId = filters.cleanerId;
  }

  const bookings = await prisma.booking.findMany({
    where: whereClause,
    include: {
      client: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      assignedCleaner: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
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

  const headers = [
    'Date',
    'Booking Number',
    'Client Name',
    'Client Email',
    'Service Type',
    'Service Name',
    'Cleaner',
    'Base Price',
    'Discount',
    'Tax',
    'Tips',
    'Final Price',
    'Payment Status',
    'Payment Method',
  ];

  const rows = bookings.map((booking) => ({
    'Date': format(new Date(booking.scheduledDate), 'yyyy-MM-dd'),
    'Booking Number': booking.bookingNumber,
    'Client Name': `${booking.client.firstName} ${booking.client.lastName || ''}`.trim(),
    'Client Email': booking.client.email || '',
    'Service Type': booking.serviceType,
    'Service Name': booking.service?.name || '',
    'Cleaner': booking.assignedCleaner?.user
      ? `${booking.assignedCleaner.user.firstName || ''} ${booking.assignedCleaner.user.lastName || ''}`.trim()
      : 'Unassigned',
    'Base Price': booking.basePrice.toFixed(2),
    'Discount': booking.discountAmount.toFixed(2),
    'Tax': booking.taxAmount.toFixed(2),
    'Tips': booking.tipAmount.toFixed(2),
    'Final Price': booking.finalPrice.toFixed(2),
    'Payment Status': booking.paymentStatus,
    'Payment Method': booking.paymentMethod || '',
  }));

  return { headers, rows };
}

// Bookings export data
async function getBookingsExportData(companyId: string, startDate: Date, endDate: Date, filters?: any) {
  const whereClause: any = {
    companyId,
    scheduledDate: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (filters?.serviceType) {
    whereClause.serviceType = filters.serviceType;
  }

  if (filters?.cleanerId) {
    whereClause.assignedCleanerId = filters.cleanerId;
  }

  if (filters?.status) {
    whereClause.status = filters.status;
  }

  const bookings = await prisma.booking.findMany({
    where: whereClause,
    include: {
      client: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      assignedCleaner: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      address: {
        select: {
          street: true,
          city: true,
          state: true,
          zip: true,
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

  const headers = [
    'Date',
    'Time',
    'Booking Number',
    'Status',
    'Client Name',
    'Client Phone',
    'Client Email',
    'Address',
    'Service Type',
    'Service Name',
    'Cleaner',
    'Duration (min)',
    'Actual Duration (min)',
    'Price',
    'Is Recurring',
    'Notes',
  ];

  const rows = bookings.map((booking) => ({
    'Date': format(new Date(booking.scheduledDate), 'yyyy-MM-dd'),
    'Time': format(new Date(booking.scheduledDate), 'HH:mm'),
    'Booking Number': booking.bookingNumber,
    'Status': booking.status,
    'Client Name': `${booking.client.firstName} ${booking.client.lastName || ''}`.trim(),
    'Client Phone': booking.client.phone || '',
    'Client Email': booking.client.email || '',
    'Address': booking.address
      ? `${booking.address.street}, ${booking.address.city}, ${booking.address.state} ${booking.address.zip}`
      : '',
    'Service Type': booking.serviceType,
    'Service Name': booking.service?.name || '',
    'Cleaner': booking.assignedCleaner?.user
      ? `${booking.assignedCleaner.user.firstName || ''} ${booking.assignedCleaner.user.lastName || ''}`.trim()
      : 'Unassigned',
    'Duration (min)': booking.duration,
    'Actual Duration (min)': booking.actualDuration || '',
    'Price': booking.finalPrice.toFixed(2),
    'Is Recurring': booking.isRecurring ? 'Yes' : 'No',
    'Notes': booking.customerNotes || '',
  }));

  return { headers, rows };
}

// Clients export data
async function getClientsExportData(companyId: string, startDate: Date, endDate: Date, filters?: any) {
  const clients = await prisma.client.findMany({
    where: {
      companyId,
    },
    include: {
      addresses: {
        where: {
          isPrimary: true,
        },
        take: 1,
      },
      bookings: {
        where: {
          status: 'COMPLETED',
          scheduledDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          finalPrice: true,
          scheduledDate: true,
        },
      },
      _count: {
        select: {
          bookings: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const headers = [
    'Client ID',
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Address',
    'City',
    'State',
    'Zip',
    'Created Date',
    'Total Bookings (All Time)',
    'Bookings in Period',
    'Revenue in Period',
    'Total Spent',
    'Loyalty Tier',
    'Referral Tier',
    'Is VIP',
    'Source',
    'Tags',
  ];

  const rows = clients.map((client) => {
    const primaryAddress = client.addresses[0];
    const periodRevenue = client.bookings.reduce((sum, b) => sum + b.finalPrice, 0);

    return {
      'Client ID': client.id,
      'First Name': client.firstName,
      'Last Name': client.lastName || '',
      'Email': client.email || '',
      'Phone': client.phone || '',
      'Address': primaryAddress?.street || '',
      'City': primaryAddress?.city || '',
      'State': primaryAddress?.state || '',
      'Zip': primaryAddress?.zip || '',
      'Created Date': format(new Date(client.createdAt), 'yyyy-MM-dd'),
      'Total Bookings (All Time)': client._count.bookings,
      'Bookings in Period': client.bookings.length,
      'Revenue in Period': periodRevenue.toFixed(2),
      'Total Spent': client.totalSpent.toFixed(2),
      'Loyalty Tier': client.loyaltyTier,
      'Referral Tier': client.referralTier,
      'Is VIP': client.isVip ? 'Yes' : 'No',
      'Source': client.source || '',
      'Tags': client.tags.join(', '),
    };
  });

  return { headers, rows };
}

// Team export data
async function getTeamExportData(companyId: string, startDate: Date, endDate: Date, filters?: any) {
  const whereClause: any = {
    companyId,
    isActive: true,
  };

  if (filters?.cleanerId) {
    whereClause.id = filters.cleanerId;
  }

  const teamMembers = await prisma.teamMember.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      assignedBookings: {
        where: {
          scheduledDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          status: true,
          finalPrice: true,
          duration: true,
          actualDuration: true,
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
        },
      },
      timeEntries: {
        where: {
          clockIn: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          clockIn: true,
          clockOut: true,
          breakMinutes: true,
          totalMinutes: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const headers = [
    'Team Member ID',
    'Name',
    'Email',
    'Hourly Rate',
    'Total Bookings',
    'Completed Bookings',
    'Cancelled Bookings',
    'Completion Rate (%)',
    'Total Revenue',
    'Avg Revenue per Job',
    'Total Hours Worked',
    'Scheduled Hours',
    'Efficiency (%)',
    'Avg Rating',
    'Total Reviews',
    'Specialties',
  ];

  const rows = teamMembers.map((member) => {
    const bookings = member.assignedBookings;
    const completedBookings = bookings.filter((b) => b.status === 'COMPLETED');
    const cancelledBookings = bookings.filter((b) => b.status === 'CANCELLED');

    const totalRevenue = completedBookings.reduce((sum, b) => sum + b.finalPrice, 0);
    const completionRate = bookings.length > 0
      ? (completedBookings.length / bookings.length) * 100
      : 0;

    const totalMinutesWorked = member.timeEntries.reduce((sum, entry) => {
      if (entry.totalMinutes) return sum + entry.totalMinutes;
      if (entry.clockOut) {
        const minutes = (entry.clockOut.getTime() - entry.clockIn.getTime()) / (1000 * 60);
        return sum + minutes - entry.breakMinutes;
      }
      return sum;
    }, 0);

    const scheduledMinutes = completedBookings.reduce((sum, b) => sum + b.duration, 0);
    const actualMinutes = completedBookings.reduce((sum, b) => sum + (b.actualDuration || b.duration), 0);
    const efficiency = actualMinutes > 0 ? (scheduledMinutes / actualMinutes) * 100 : 100;

    const avgRating = member.reviews.length > 0
      ? member.reviews.reduce((sum, r) => sum + r.overallRating, 0) / member.reviews.length
      : null;

    return {
      'Team Member ID': member.id,
      'Name': member.user
        ? `${member.user.firstName || ''} ${member.user.lastName || ''}`.trim()
        : 'Unknown',
      'Email': member.user?.email || '',
      'Hourly Rate': member.hourlyRate?.toFixed(2) || '0.00',
      'Total Bookings': bookings.length,
      'Completed Bookings': completedBookings.length,
      'Cancelled Bookings': cancelledBookings.length,
      'Completion Rate (%)': completionRate.toFixed(2),
      'Total Revenue': totalRevenue.toFixed(2),
      'Avg Revenue per Job': completedBookings.length > 0
        ? (totalRevenue / completedBookings.length).toFixed(2)
        : '0.00',
      'Total Hours Worked': (totalMinutesWorked / 60).toFixed(2),
      'Scheduled Hours': (scheduledMinutes / 60).toFixed(2),
      'Efficiency (%)': efficiency.toFixed(2),
      'Avg Rating': avgRating?.toFixed(2) || 'N/A',
      'Total Reviews': member.reviews.length,
      'Specialties': member.specialties.join(', '),
    };
  });

  return { headers, rows };
}
