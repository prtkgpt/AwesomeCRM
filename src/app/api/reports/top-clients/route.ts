import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/reports/top-clients - Get top clients by revenue
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
    const period = searchParams.get('period') || 'month';
    const limit = parseInt(searchParams.get('limit') || '10');

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
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    // Get completed jobs grouped by client
    const completedJobs = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        status: 'COMPLETED',
        scheduledDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Group by client and calculate totals
    const clientStats = new Map<string, {
      id: string;
      name: string;
      totalRevenue: number;
      jobCount: number;
    }>();

    completedJobs.forEach((job) => {
      const clientId = job.client.id;
      const existing = clientStats.get(clientId);
      const clientName = job.client
        ? `${job.client.firstName || ''} ${job.client.lastName || ''}`.trim() || 'Unknown Client'
        : 'Unknown Client';

      if (existing) {
        existing.totalRevenue += job.finalPrice;
        existing.jobCount += 1;
      } else {
        clientStats.set(clientId, {
          id: job.client.id,
          name: clientName,
          totalRevenue: job.finalPrice,
          jobCount: 1,
        });
      }
    });

    // Convert to array and sort by revenue
    const topClients = Array.from(clientStats.values())
      .map((client) => ({
        ...client,
        averageJobValue: client.totalRevenue / client.jobCount,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: topClients,
    });
  } catch (error) {
    console.error('GET /api/reports/top-clients error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch top clients' },
      { status: 500 }
    );
  }
}
