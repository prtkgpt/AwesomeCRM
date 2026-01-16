import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get total clients
    const totalClients = await prisma.client.count({
      where: { companyId: user.companyId },
    });

    // Get upcoming jobs (scheduled status, future dates)
    const upcomingJobs = await prisma.booking.count({
      where: {
        companyId: user.companyId,
        status: 'SCHEDULED',
        scheduledDate: { gte: now },
      },
    });

    // Get completed jobs this month
    const completedThisMonth = await prisma.booking.count({
      where: {
        companyId: user.companyId,
        status: 'COMPLETED',
        scheduledDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // Get revenue this month (completed and paid jobs)
    const revenueResult = await prisma.booking.aggregate({
      where: {
        companyId: user.companyId,
        status: 'COMPLETED',
        isPaid: true,
        scheduledDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        price: true,
      },
    });

    const revenueThisMonth = revenueResult._sum.price || 0;

    // Get upcoming jobs list (next 100 for better calendar coverage)
    const upcomingJobsList = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        status: 'SCHEDULED',
        scheduledDate: { gte: now },
      },
      include: {
        client: {
          select: {
            name: true,
          },
        },
        assignee: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: {
        totalClients,
        upcomingJobs,
        completedThisMonth,
        revenueThisMonth: Math.round(revenueThisMonth * 100) / 100, // Round to 2 decimals
        upcomingJobsList,
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
