import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendTimeOffRequestNotification } from '@/lib/notifications';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/cleaner/time-off - Get cleaner's time off requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || user.role !== 'CLEANER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get team member record
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: session.user.id },
    });

    if (!teamMember) {
      return NextResponse.json({
        success: true,
        timeOffRequests: [],
      });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const upcoming = searchParams.get('upcoming') === 'true';

    // Build query
    const whereClause: any = {
      teamMemberId: teamMember.id,
      companyId: user.companyId,
    };

    if (status) {
      whereClause.status = status;
    }

    if (upcoming) {
      whereClause.endDate = { gte: new Date() };
    }

    const timeOffRequests = await prisma.timeOffRequest.findMany({
      where: whereClause,
      orderBy: [
        { status: 'asc' }, // PENDING first
        { startDate: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      timeOffRequests,
    });
  } catch (error) {
    console.error('GET /api/cleaner/time-off error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch time off requests' },
      { status: 500 }
    );
  }
}

// POST /api/cleaner/time-off - Create a new time off request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || user.role !== 'CLEANER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get team member record
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: session.user.id },
    });

    if (!teamMember) {
      return NextResponse.json(
        { error: 'Team member profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { type, startDate, endDate, reason } = body;

    // Validate required fields
    if (!type || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Type, start date, and end date are required' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['VACATION', 'SICK_LEAVE', 'PERSONAL', 'FAMILY', 'BEREAVEMENT', 'OTHER'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid time off type' },
        { status: 400 }
      );
    }

    // Parse and validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    if (end < start) {
      return NextResponse.json(
        { error: 'End date must be after or equal to start date' },
        { status: 400 }
      );
    }

    // Check for overlapping pending/approved requests
    const existingRequest = await prisma.timeOffRequest.findFirst({
      where: {
        teamMemberId: teamMember.id,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a time off request for overlapping dates' },
        { status: 400 }
      );
    }

    // Find conflicting bookings
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        assignedTo: teamMember.id,
        status: 'SCHEDULED',
        scheduledDate: {
          gte: start,
          lte: end,
        },
      },
      select: { id: true },
    });

    // Create the time off request
    const timeOffRequest = await prisma.timeOffRequest.create({
      data: {
        companyId: user.companyId,
        teamMemberId: teamMember.id,
        type,
        startDate: start,
        endDate: end,
        reason: reason || null,
        status: 'PENDING',
        conflictedBookingIds: conflictingBookings.map(b => b.id),
      },
    });

    // Send notification to admin
    await sendTimeOffRequestNotification(timeOffRequest.id);

    return NextResponse.json({
      success: true,
      timeOffRequest,
      conflictCount: conflictingBookings.length,
      message: 'Time off request submitted successfully',
    });
  } catch (error) {
    console.error('POST /api/cleaner/time-off error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create time off request' },
      { status: 500 }
    );
  }
}
