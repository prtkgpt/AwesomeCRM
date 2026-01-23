import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Type for action counts result
interface ActionCount {
  action: string;
  _count: { action: number };
}

// Type for unique users result
interface UniqueUserResult {
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  } | null;
}

// GET /api/activity-log - Get activity log for the company
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with companyId and role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only OWNER and ADMIN can view activity log
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Only owners and admins can view activity log' },
        { status: 403 }
      );
    }

    if (!user.companyId) {
      return NextResponse.json(
        { success: false, error: 'User is not associated with a company' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const daysParam = searchParams.get('days'); // 7, 15, or 30
    const actionFilter = searchParams.get('action'); // Optional action type filter
    const entityTypeFilter = searchParams.get('entityType'); // Optional entity type filter
    const userIdFilter = searchParams.get('userId'); // Optional user filter
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Calculate date range (default to 30 days)
    const days = daysParam ? parseInt(daysParam) : 30;
    const validDays = [7, 15, 30].includes(days) ? days : 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - validDays);

    // Build where clause
    const whereClause: Record<string, unknown> = {
      companyId: user.companyId,
      createdAt: {
        gte: fromDate,
      },
    };

    if (actionFilter) {
      whereClause.action = actionFilter;
    }

    if (entityTypeFilter) {
      whereClause.entityType = entityTypeFilter;
    }

    if (userIdFilter) {
      whereClause.userId = userIdFilter;
    }

    // Use type assertion for auditLog until Prisma client is regenerated
    const db = prisma as unknown as {
      auditLog?: {
        count: (args: { where: Record<string, unknown> }) => Promise<number>;
        findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
        groupBy: (args: Record<string, unknown>) => Promise<ActionCount[]>;
      };
    };

    // Check if auditLog model exists (migration may not have run yet)
    if (!db.auditLog) {
      return NextResponse.json({
        success: true,
        data: {
          logs: [],
          pagination: { page, limit, totalCount: 0, totalPages: 0 },
          stats: { totalActivities: 0, actionBreakdown: {}, uniqueUsers: [] },
          filters: { days: validDays, fromDate: fromDate.toISOString() },
          message: 'Activity log table not yet created. Please run database migration.',
        },
      });
    }

    // Get total count for pagination
    const totalCount = await db.auditLog.count({
      where: whereClause,
    });

    // Get activity logs with pagination
    const activityLogs = await db.auditLog.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get summary stats for the period
    const actionCounts = await db.auditLog.groupBy({
      by: ['action'],
      where: {
        companyId: user.companyId,
        createdAt: {
          gte: fromDate,
        },
      },
      _count: {
        action: true,
      },
    });

    // Get unique users who performed actions
    const uniqueUsers = await db.auditLog.findMany({
      where: {
        companyId: user.companyId,
        createdAt: {
          gte: fromDate,
        },
        userId: {
          not: null,
        },
      },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      distinct: ['userId'],
    }) as UniqueUserResult[];

    return NextResponse.json({
      success: true,
      data: {
        logs: activityLogs,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        stats: {
          totalActivities: totalCount,
          actionBreakdown: actionCounts.reduce((acc: Record<string, number>, curr: ActionCount) => {
            acc[curr.action] = curr._count.action;
            return acc;
          }, {}),
          uniqueUsers: uniqueUsers.map((u: UniqueUserResult) => u.user).filter(Boolean),
        },
        filters: {
          days: validDays,
          fromDate: fromDate.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('GET /api/activity-log error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity log' },
      { status: 500 }
    );
  }
}
