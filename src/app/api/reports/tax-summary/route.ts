import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

interface QuarterlyBreakdown {
  quarter: string;
  earnings: number;
  tips: number;
  reimbursements: number;
  total: number;
  jobs: number;
  hours: number;
}

interface CleanerTaxSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  employeeId: string | null;
  hireDate: string | null;
  hourlyRate: number;
  address: {
    street: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  };
  // Tax Year Totals
  grossIncome: number; // wages + tips
  wages: number;
  tips: number;
  reimbursements: number; // Not included in 1099-NEC but useful for records
  totalCompensation: number; // wages + tips + reimbursements
  // Work stats
  totalJobs: number;
  totalHours: number;
  avgHourlyEarnings: number;
  // Quarterly breakdown
  quarterly: QuarterlyBreakdown[];
}

// GET /api/reports/tax-summary - Get tax summary for all cleaners
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user and check role
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

    // Only OWNER can access tax reports
    if (user.role !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: 'Only owners can access tax reports' },
        { status: 403 }
      );
    }

    // Get tax year from query params (default to current year)
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    // Validate year
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json(
        { success: false, error: 'Invalid year' },
        { status: 400 }
      );
    }

    // Date range for the tax year
    const yearStart = new Date(year, 0, 1); // Jan 1
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999); // Dec 31

    // Quarter boundaries
    const quarters = [
      { name: 'Q1', start: new Date(year, 0, 1), end: new Date(year, 2, 31, 23, 59, 59, 999) },
      { name: 'Q2', start: new Date(year, 3, 1), end: new Date(year, 5, 30, 23, 59, 59, 999) },
      { name: 'Q3', start: new Date(year, 6, 1), end: new Date(year, 8, 30, 23, 59, 59, 999) },
      { name: 'Q4', start: new Date(year, 9, 1), end: new Date(year, 11, 31, 23, 59, 59, 999) },
    ];

    // Get all team members (cleaners) for the company
    const teamMembers = await prisma.teamMember.findMany({
      where: {
        companyId: user.companyId,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Get all completed bookings for the year
    const bookings = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        status: {
          in: ['COMPLETED', 'CLEANER_COMPLETED'],
        },
        scheduledDate: {
          gte: yearStart,
          lte: yearEnd,
        },
        assignedTo: {
          not: null,
        },
      },
      select: {
        id: true,
        assignedTo: true,
        scheduledDate: true,
        duration: true,
        tipAmount: true,
      },
    });

    // Get all pay logs (reimbursements) for the year
    const payLogs = await prisma.payLog.findMany({
      where: {
        companyId: user.companyId,
        date: {
          gte: yearStart,
          lte: yearEnd,
        },
        type: {
          in: ['SUPPLIES_REIMBURSEMENT', 'GAS_REIMBURSEMENT'],
        },
      },
      select: {
        teamMemberId: true,
        amount: true,
        date: true,
        type: true,
      },
    });

    // Build tax summary for each cleaner
    const cleanerSummaries: CleanerTaxSummary[] = teamMembers.map((member) => {
      // Filter bookings for this cleaner
      const cleanerBookings = bookings.filter((b) => b.assignedTo === member.id);

      // Filter pay logs for this cleaner
      const cleanerPayLogs = payLogs.filter((p) => p.teamMemberId === member.id);

      // Calculate total hours and wages
      let totalHours = 0;
      let totalWages = 0;
      let totalTips = 0;

      cleanerBookings.forEach((booking) => {
        const hours = booking.duration / 60;
        totalHours += hours;
        totalWages += hours * (member.hourlyRate || 0);
        totalTips += booking.tipAmount || 0;
      });

      // Calculate reimbursements
      const totalReimbursements = cleanerPayLogs.reduce((sum, log) => sum + log.amount, 0);

      // Calculate quarterly breakdown
      const quarterly: QuarterlyBreakdown[] = quarters.map((q) => {
        const qBookings = cleanerBookings.filter((b) => {
          const date = new Date(b.scheduledDate);
          return date >= q.start && date <= q.end;
        });

        const qPayLogs = cleanerPayLogs.filter((p) => {
          const date = new Date(p.date);
          return date >= q.start && date <= q.end;
        });

        let qHours = 0;
        let qWages = 0;
        let qTips = 0;

        qBookings.forEach((booking) => {
          const hours = booking.duration / 60;
          qHours += hours;
          qWages += hours * (member.hourlyRate || 0);
          qTips += booking.tipAmount || 0;
        });

        const qReimbursements = qPayLogs.reduce((sum, log) => sum + log.amount, 0);

        return {
          quarter: q.name,
          earnings: Math.round(qWages * 100) / 100,
          tips: Math.round(qTips * 100) / 100,
          reimbursements: Math.round(qReimbursements * 100) / 100,
          total: Math.round((qWages + qTips + qReimbursements) * 100) / 100,
          jobs: qBookings.length,
          hours: Math.round(qHours * 100) / 100,
        };
      });

      const grossIncome = totalWages + totalTips;
      const avgHourlyEarnings = totalHours > 0 ? grossIncome / totalHours : 0;

      return {
        id: member.id,
        name: member.user.name || 'Unknown',
        email: member.user.email,
        phone: member.user.phone,
        employeeId: member.employeeId,
        hireDate: member.hireDate?.toISOString() || null,
        hourlyRate: member.hourlyRate || 0,
        address: {
          street: member.street,
          city: member.city,
          state: member.state,
          zip: member.zip,
        },
        grossIncome: Math.round(grossIncome * 100) / 100,
        wages: Math.round(totalWages * 100) / 100,
        tips: Math.round(totalTips * 100) / 100,
        reimbursements: Math.round(totalReimbursements * 100) / 100,
        totalCompensation: Math.round((grossIncome + totalReimbursements) * 100) / 100,
        totalJobs: cleanerBookings.length,
        totalHours: Math.round(totalHours * 100) / 100,
        avgHourlyEarnings: Math.round(avgHourlyEarnings * 100) / 100,
        quarterly,
      };
    });

    // Sort by gross income (highest first)
    cleanerSummaries.sort((a, b) => b.grossIncome - a.grossIncome);

    // Calculate company totals
    const companyTotals = {
      totalCleaners: cleanerSummaries.length,
      cleanersWithIncome: cleanerSummaries.filter((c) => c.grossIncome > 0).length,
      totalGrossIncome: cleanerSummaries.reduce((sum, c) => sum + c.grossIncome, 0),
      totalWages: cleanerSummaries.reduce((sum, c) => sum + c.wages, 0),
      totalTips: cleanerSummaries.reduce((sum, c) => sum + c.tips, 0),
      totalReimbursements: cleanerSummaries.reduce((sum, c) => sum + c.reimbursements, 0),
      totalJobs: cleanerSummaries.reduce((sum, c) => sum + c.totalJobs, 0),
      totalHours: cleanerSummaries.reduce((sum, c) => sum + c.totalHours, 0),
    };

    // Get company info
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { name: true, address: true, phone: true },
    });

    // Available years (check what years have data)
    const oldestBooking = await prisma.booking.findFirst({
      where: {
        companyId: user.companyId,
        status: { in: ['COMPLETED', 'CLEANER_COMPLETED'] },
      },
      orderBy: { scheduledDate: 'asc' },
      select: { scheduledDate: true },
    });

    const currentYear = new Date().getFullYear();
    const oldestYear = oldestBooking
      ? new Date(oldestBooking.scheduledDate).getFullYear()
      : currentYear;

    const availableYears = [];
    for (let y = currentYear; y >= oldestYear; y--) {
      availableYears.push(y);
    }

    return NextResponse.json({
      success: true,
      data: {
        year,
        availableYears,
        company: {
          name: company?.name || 'Unknown',
          address: company?.address,
          phone: company?.phone,
        },
        totals: companyTotals,
        cleaners: cleanerSummaries,
        // 1099-NEC threshold reminder
        threshold: {
          amount: 600,
          note: 'IRS requires 1099-NEC for non-employees paid $600 or more in a calendar year',
        },
      },
    });
  } catch (error) {
    console.error('GET /api/reports/tax-summary error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate tax summary' },
      { status: 500 }
    );
  }
}
