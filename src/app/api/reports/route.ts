import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/reports - Get revenue and job statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'week';

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    // Determine date range based on period
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
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
    }

    // Get completed jobs in the period
    const completedJobs = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        status: 'COMPLETED',
        scheduledDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Calculate revenue from completed jobs
    const revenue = completedJobs.reduce((sum, job) => sum + job.finalPrice, 0);

    // Get unpaid completed jobs
    const unpaidJobs = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        status: 'COMPLETED',
        isPaid: false,
      },
    });

    const unpaidAmount = unpaidJobs.reduce((sum, job) => sum + job.finalPrice, 0);

    // Get upcoming jobs (next 7 days)
    const upcomingEndDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingJobs = await prisma.booking.count({
      where: {
        companyId: user.companyId,
        status: 'CONFIRMED',
        scheduledDate: {
          gte: now,
          lte: upcomingEndDate,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        period,
        revenue,
        completedJobs: completedJobs.length,
        unpaidAmount,
        upcomingJobs,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('GET /api/reports error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
