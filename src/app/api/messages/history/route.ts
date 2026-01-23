import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/messages/history - Get message history with sender info
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

    // Only OWNER and ADMIN can view full message history
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Only owners and admins can view message history' },
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
    const typeFilter = searchParams.get('type'); // Message type filter
    const statusFilter = searchParams.get('status'); // Message status filter
    const senderIdFilter = searchParams.get('senderId'); // Filter by sender
    const recipientFilter = searchParams.get('recipient'); // Filter by recipient phone
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Calculate date range (default to 30 days)
    const days = daysParam ? parseInt(daysParam) : 30;
    const validDays = [7, 15, 30].includes(days) ? days : 30;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - validDays);

    // Build where clause
    const whereClause: any = {
      companyId: user.companyId,
      createdAt: {
        gte: fromDate,
      },
    };

    if (typeFilter) {
      whereClause.type = typeFilter;
    }

    if (statusFilter) {
      whereClause.status = statusFilter;
    }

    if (senderIdFilter) {
      whereClause.userId = senderIdFilter;
    }

    if (recipientFilter) {
      whereClause.to = {
        contains: recipientFilter,
      };
    }

    // Get total count for pagination
    const totalCount = await prisma.message.count({
      where: whereClause,
    });

    // Get messages with sender info
    const messages = await prisma.message.findMany({
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
        booking: {
          select: {
            id: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get summary stats
    const typeCounts = await prisma.message.groupBy({
      by: ['type'],
      where: {
        companyId: user.companyId,
        createdAt: {
          gte: fromDate,
        },
      },
      _count: {
        type: true,
      },
    });

    const statusCounts = await prisma.message.groupBy({
      by: ['status'],
      where: {
        companyId: user.companyId,
        createdAt: {
          gte: fromDate,
        },
      },
      _count: {
        status: true,
      },
    });

    // Get unique senders
    const uniqueSenders = await prisma.message.findMany({
      where: {
        companyId: user.companyId,
        createdAt: {
          gte: fromDate,
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
    });

    return NextResponse.json({
      success: true,
      data: {
        messages: messages.map(msg => ({
          ...msg,
          sentBy: msg.user ? {
            id: msg.user.id,
            name: msg.user.name || msg.user.email,
            email: msg.user.email,
            role: msg.user.role,
          } : null,
          recipientName: msg.booking?.client?.name || null,
        })),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        stats: {
          totalMessages: totalCount,
          typeBreakdown: typeCounts.reduce((acc, curr) => {
            acc[curr.type] = curr._count.type;
            return acc;
          }, {} as Record<string, number>),
          statusBreakdown: statusCounts.reduce((acc, curr) => {
            acc[curr.status] = curr._count.status;
            return acc;
          }, {} as Record<string, number>),
          uniqueSenders: uniqueSenders.map(s => s.user).filter(Boolean),
        },
        filters: {
          days: validDays,
          fromDate: fromDate.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('GET /api/messages/history error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch message history' },
      { status: 500 }
    );
  }
}
