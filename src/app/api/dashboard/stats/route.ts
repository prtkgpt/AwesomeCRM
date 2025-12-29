import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Get total clients
    const totalClients = await prisma.client.count({
      where: { userId: session.user.id },
    });

    // Get upcoming jobs (scheduled status, future dates)
    const upcomingJobs = await prisma.booking.count({
      where: {
        userId: session.user.id,
        status: 'SCHEDULED',
        scheduledFor: { gte: now },
      },
    });

    // Get completed jobs this month
    const completedThisMonth = await prisma.booking.count({
      where: {
        userId: session.user.id,
        status: 'COMPLETED',
        scheduledFor: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    // Get revenue this month (completed and paid jobs)
    const revenueResult = await prisma.booking.aggregate({
      where: {
        userId: session.user.id,
        status: 'COMPLETED',
        isPaid: true,
        scheduledFor: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        price: true,
      },
    });

    const revenueThisMonth = revenueResult._sum.price || 0;

    // Get upcoming jobs list (next 5)
    const upcomingJobsList = await prisma.booking.findMany({
      where: {
        userId: session.user.id,
        status: 'SCHEDULED',
        scheduledFor: { gte: now },
      },
      include: {
        client: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
      take: 5,
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
