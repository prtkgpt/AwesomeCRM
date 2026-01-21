import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/communications/history - Get message history
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

    // Only OWNER and ADMIN can view message history
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const type = searchParams.get('type'); // Filter by message type
    const status = searchParams.get('status'); // Filter by status
    const search = searchParams.get('search'); // Search by phone number or body

    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      companyId: user.companyId,
    };

    if (type) {
      whereClause.type = type;
    }

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { to: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.message.count({
      where: whereClause,
    });

    // Fetch messages with pagination
    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        booking: {
          select: {
            id: true,
            scheduledDate: true,
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
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasMore: page < totalPages,
        },
      },
    });
  } catch (error) {
    console.error('GET /api/communications/history error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch message history' },
      { status: 500 }
    );
  }
}
