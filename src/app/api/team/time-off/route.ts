import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/team/time-off - List all time off requests (admin view)
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

    // Only OWNER and ADMIN can view time off requests
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const teamMemberId = searchParams.get('teamMemberId');
    const upcoming = searchParams.get('upcoming') === 'true';

    // Build query
    const whereClause: any = {
      companyId: user.companyId,
    };

    if (status) {
      whereClause.status = status;
    }

    if (teamMemberId) {
      whereClause.teamMemberId = teamMemberId;
    }

    if (upcoming) {
      whereClause.endDate = { gte: new Date() };
    }

    const timeOffRequests = await prisma.timeOffRequest.findMany({
      where: whereClause,
      include: {
        teamMember: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // PENDING first
        { startDate: 'asc' },
      ],
    });

    // Get conflict details for each request
    const requestsWithConflicts = await Promise.all(
      timeOffRequests.map(async (request) => {
        let conflictingBookings: any[] = [];
        if (request.conflictedBookingIds.length > 0) {
          conflictingBookings = await prisma.booking.findMany({
            where: {
              id: { in: request.conflictedBookingIds },
              status: 'SCHEDULED',
            },
            include: {
              client: { select: { name: true } },
              address: { select: { street: true, city: true } },
            },
          });
        }
        return {
          ...request,
          conflictingBookings,
        };
      })
    );

    // Get summary stats
    const pendingCount = timeOffRequests.filter(r => r.status === 'PENDING').length;
    const approvedCount = timeOffRequests.filter(r => r.status === 'APPROVED').length;

    return NextResponse.json({
      success: true,
      data: requestsWithConflicts,
      stats: {
        pending: pendingCount,
        approved: approvedCount,
        total: timeOffRequests.length,
      },
    });
  } catch (error) {
    console.error('GET /api/team/time-off error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch time off requests' },
      { status: 500 }
    );
  }
}
