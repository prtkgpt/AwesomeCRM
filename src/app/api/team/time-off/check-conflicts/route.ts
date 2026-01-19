import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/team/time-off/check-conflicts - Check if a date has time-off conflicts
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { teamMemberId, date, startDate, endDate } = body;

    // Can check either a single date or a date range
    const checkStartDate = startDate ? new Date(startDate) : date ? new Date(date) : null;
    const checkEndDate = endDate ? new Date(endDate) : date ? new Date(date) : null;

    if (!checkStartDate) {
      return NextResponse.json(
        { error: 'Date or date range is required' },
        { status: 400 }
      );
    }

    // Build where clause
    const whereClause: any = {
      companyId: user.companyId,
      status: 'APPROVED',
      startDate: { lte: checkEndDate || checkStartDate },
      endDate: { gte: checkStartDate },
    };

    if (teamMemberId) {
      whereClause.teamMemberId = teamMemberId;
    }

    // Find approved time-off requests that overlap with the date(s)
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
              },
            },
          },
        },
      },
    });

    // Get list of team member IDs who have time off
    const unavailableTeamMemberIds = Array.from(new Set(timeOffRequests.map(r => r.teamMemberId)));

    // Get list of team members who are available
    const allTeamMembers = await prisma.teamMember.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
        id: { notIn: unavailableTeamMemberIds },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      hasConflicts: timeOffRequests.length > 0,
      conflicts: timeOffRequests.map(r => ({
        id: r.id,
        type: r.type,
        startDate: r.startDate,
        endDate: r.endDate,
        reason: r.reason,
        teamMemberId: r.teamMemberId,
        cleanerName: r.teamMember.user.name || r.teamMember.user.email,
      })),
      unavailableTeamMemberIds,
      availableTeamMembers: allTeamMembers.map(tm => ({
        id: tm.id,
        name: tm.user.name || tm.user.email,
        email: tm.user.email,
      })),
    });
  } catch (error) {
    console.error('POST /api/team/time-off/check-conflicts error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check conflicts' },
      { status: 500 }
    );
  }
}
