import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

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
    const exportType = searchParams.get('type') || 'bookings'; // bookings, customers, revenue, team
    const formatType = searchParams.get('format') || 'csv'; // csv, json
    const days = parseInt(searchParams.get('days') || '30');

    const endDate = endOfDay(new Date());
    const startDate = startOfDay(subDays(new Date(), days));

    let data: Record<string, unknown>[] = [];
    let filename = '';

    switch (exportType) {
      case 'bookings': {
        const bookings = await prisma.booking.findMany({
          where: {
            companyId: user.companyId,
            scheduledDate: { gte: startDate, lte: endDate },
          },
          include: {
            client: { select: { name: true, email: true, phone: true } },
            address: { select: { street: true, city: true, state: true, zip: true } },
            assignee: {
              include: { user: { select: { name: true } } },
            },
          },
          orderBy: { scheduledDate: 'desc' },
        });

        data = bookings.map((b) => ({
          'Booking ID': b.id,
          'Scheduled Date': format(new Date(b.scheduledDate), 'yyyy-MM-dd HH:mm'),
          Status: b.status,
          'Service Type': b.serviceType,
          'Duration (min)': b.duration,
          Price: b.price,
          'Is Paid': b.isPaid ? 'Yes' : 'No',
          'Payment Method': b.paymentMethod || '',
          'Customer Name': b.client.name,
          'Customer Email': b.client.email || '',
          'Customer Phone': b.client.phone || '',
          Address: `${b.address.street}, ${b.address.city}, ${b.address.state} ${b.address.zip}`,
          'Assigned To': b.assignee?.user.name || 'Unassigned',
          'Customer Rating': b.customerRating || '',
          'Tip Amount': b.tipAmount || 0,
          'Referral Credits Applied': b.referralCreditsApplied,
          'Is Recurring': b.isRecurring ? 'Yes' : 'No',
          'Recurrence Frequency': b.recurrenceFrequency,
          'Clocked In': b.clockedInAt ? format(new Date(b.clockedInAt), 'yyyy-MM-dd HH:mm') : '',
          'Clocked Out': b.clockedOutAt ? format(new Date(b.clockedOutAt), 'yyyy-MM-dd HH:mm') : '',
          'Created At': format(new Date(b.createdAt), 'yyyy-MM-dd HH:mm'),
        }));
        filename = `bookings_${format(startDate, 'yyyyMMdd')}_${format(endDate, 'yyyyMMdd')}`;
        break;
      }

      case 'customers': {
        const clients = await prisma.client.findMany({
          where: { companyId: user.companyId },
          include: {
            addresses: { take: 1 },
            bookings: {
              where: {
                status: { in: ['COMPLETED', 'CLEANER_COMPLETED'] },
              },
              select: {
                price: true,
                scheduledDate: true,
              },
            },
          },
        });

        data = clients.map((c) => {
          const totalSpent = c.bookings.reduce((sum, b) => sum + b.price, 0);
          const lastBooking = c.bookings.sort(
            (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
          )[0];

          return {
            'Customer ID': c.id,
            Name: c.name,
            Email: c.email || '',
            Phone: c.phone || '',
            Tags: c.tags.join(', '),
            Address: c.addresses[0]
              ? `${c.addresses[0].street}, ${c.addresses[0].city}, ${c.addresses[0].state} ${c.addresses[0].zip}`
              : '',
            'Total Bookings': c.bookings.length,
            'Total Spent': totalSpent,
            'Last Booking': lastBooking
              ? format(new Date(lastBooking.scheduledDate), 'yyyy-MM-dd')
              : 'Never',
            'Referral Code': c.referralCode || '',
            'Referral Credits Balance': c.referralCreditsBalance,
            'Referral Tier': c.referralTier,
            'Has Insurance': c.hasInsurance ? 'Yes' : 'No',
            'Insurance Provider': c.insuranceProvider || '',
            'Marketing Opt-Out': c.marketingOptOut ? 'Yes' : 'No',
            'Created At': format(new Date(c.createdAt), 'yyyy-MM-dd'),
          };
        });
        filename = `customers_${format(new Date(), 'yyyyMMdd')}`;
        break;
      }

      case 'revenue': {
        const bookings = await prisma.booking.findMany({
          where: {
            companyId: user.companyId,
            scheduledDate: { gte: startDate, lte: endDate },
            status: { in: ['COMPLETED', 'CLEANER_COMPLETED'] },
          },
          include: {
            client: { select: { name: true } },
            assignee: { include: { user: { select: { name: true } } } },
          },
          orderBy: { scheduledDate: 'desc' },
        });

        data = bookings.map((b) => ({
          Date: format(new Date(b.scheduledDate), 'yyyy-MM-dd'),
          'Booking ID': b.id,
          'Customer': b.client.name,
          'Service Type': b.serviceType,
          'Cleaner': b.assignee?.user.name || 'Unassigned',
          Price: b.price,
          'Referral Credits': b.referralCreditsApplied,
          'Final Price': b.finalPrice || b.price - b.referralCreditsApplied,
          'Tip': b.tipAmount || 0,
          'Total': (b.finalPrice || b.price - b.referralCreditsApplied) + (b.tipAmount || 0),
          'Is Paid': b.isPaid ? 'Yes' : 'No',
          'Payment Method': b.paymentMethod || '',
          'Paid At': b.paidAt ? format(new Date(b.paidAt), 'yyyy-MM-dd') : '',
        }));
        filename = `revenue_${format(startDate, 'yyyyMMdd')}_${format(endDate, 'yyyyMMdd')}`;
        break;
      }

      case 'team': {
        const teamMembers = await prisma.teamMember.findMany({
          where: { companyId: user.companyId },
          include: {
            user: { select: { name: true, email: true, phone: true } },
            assignedBookings: {
              where: {
                scheduledDate: { gte: startDate, lte: endDate },
                status: { in: ['COMPLETED', 'CLEANER_COMPLETED'] },
              },
              select: {
                price: true,
                duration: true,
                tipAmount: true,
                customerRating: true,
                clockedInAt: true,
                clockedOutAt: true,
              },
            },
            payLogs: {
              where: {
                date: { gte: startDate, lte: endDate },
              },
            },
          },
        });

        data = teamMembers.map((tm) => {
          const completedJobs = tm.assignedBookings;
          const totalRevenue = completedJobs.reduce((sum, b) => sum + b.price, 0);
          const totalTips = completedJobs.reduce((sum, b) => sum + (b.tipAmount || 0), 0);
          const ratings = completedJobs
            .filter((b) => b.customerRating !== null)
            .map((b) => b.customerRating as number);
          const avgRating =
            ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : null;

          let totalHours = 0;
          completedJobs.forEach((b) => {
            if (b.clockedInAt && b.clockedOutAt) {
              totalHours +=
                (new Date(b.clockedOutAt).getTime() - new Date(b.clockedInAt).getTime()) /
                (1000 * 60 * 60);
            } else {
              totalHours += b.duration / 60;
            }
          });

          const totalPay = tm.payLogs.reduce((sum, p) => sum + p.amount, 0);

          return {
            'Team Member ID': tm.id,
            Name: tm.user.name || '',
            Email: tm.user.email,
            Phone: tm.user.phone || '',
            'Employee ID': tm.employeeId || '',
            'Hourly Rate': tm.hourlyRate || '',
            'Is Active': tm.isActive ? 'Yes' : 'No',
            Specialties: tm.specialties.join(', '),
            'Service Areas': tm.serviceAreas.join(', '),
            'Jobs Completed': completedJobs.length,
            'Total Revenue': totalRevenue,
            'Total Tips': totalTips,
            'Total Hours': Math.round(totalHours * 10) / 10,
            'Average Rating': avgRating ? Math.round(avgRating * 10) / 10 : '',
            'Total Pay': totalPay,
            'Hire Date': tm.hireDate ? format(new Date(tm.hireDate), 'yyyy-MM-dd') : '',
          };
        });
        filename = `team_${format(startDate, 'yyyyMMdd')}_${format(endDate, 'yyyyMMdd')}`;
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    if (formatType === 'json') {
      return NextResponse.json({
        filename: `${filename}.json`,
        data,
        count: data.length,
        exportedAt: new Date().toISOString(),
      });
    }

    // Convert to CSV
    if (data.length === 0) {
      return NextResponse.json({ error: 'No data to export' }, { status: 404 });
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            // Escape quotes and wrap in quotes if contains comma or quote
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(',')
      ),
    ];
    const csv = csvRows.join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  } catch (error) {
    console.error('Analytics export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
