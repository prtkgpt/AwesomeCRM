import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

const timeOffSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  reason: z.string().optional(),
});

// GET: Get time off requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { teamMember: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const teamMemberId = searchParams.get('teamMemberId');
    const status = searchParams.get('status'); // pending, approved, all

    let where: any = {};

    if (user.role === 'CLEANER') {
      if (!user.teamMember) {
        return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
      }
      where.teamMemberId = user.teamMember.id;
    } else if (['OWNER', 'ADMIN'].includes(user.role)) {
      where.teamMember = { companyId: user.companyId };
      if (teamMemberId) {
        where.teamMemberId = teamMemberId;
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (status === 'pending') {
      where.isApproved = false;
    } else if (status === 'approved') {
      where.isApproved = true;
    }

    const timeOff = await prisma.cleanerTimeOff.findMany({
      where,
      include: {
        teamMember: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
      orderBy: { startDate: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: timeOff,
    });
  } catch (error) {
    console.error('Get time off error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Request time off
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { teamMember: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = timeOffSchema.parse(body);

    // Parse dates
    const startDate = startOfDay(parseISO(validatedData.startDate));
    const endDate = endOfDay(parseISO(validatedData.endDate));

    // Validate date range
    if (endDate < startDate) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    // Determine which team member
    let targetTeamMemberId: string;
    let autoApprove = false;

    if (user.role === 'CLEANER') {
      if (!user.teamMember) {
        return NextResponse.json({ error: 'Cleaner profile not found' }, { status: 404 });
      }
      targetTeamMemberId = user.teamMember.id;
    } else if (['OWNER', 'ADMIN'].includes(user.role) && body.teamMemberId) {
      targetTeamMemberId = body.teamMemberId;
      autoApprove = true; // Admins can auto-approve
    } else {
      return NextResponse.json({ error: 'Team member ID required' }, { status: 400 });
    }

    // Check for overlapping time off
    const existingTimeOff = await prisma.cleanerTimeOff.findFirst({
      where: {
        teamMemberId: targetTeamMemberId,
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (existingTimeOff) {
      return NextResponse.json(
        { error: 'Time off request overlaps with existing request' },
        { status: 400 }
      );
    }

    // Check for conflicts with scheduled jobs
    const conflictingJobs = await prisma.booking.findMany({
      where: {
        assignedTo: targetTeamMemberId,
        status: 'SCHEDULED',
        scheduledDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { id: true, scheduledDate: true },
    });

    const timeOff = await prisma.cleanerTimeOff.create({
      data: {
        teamMemberId: targetTeamMemberId,
        startDate,
        endDate,
        reason: validatedData.reason,
        isApproved: autoApprove,
        approvedById: autoApprove ? session.user.id : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: timeOff,
      warnings:
        conflictingJobs.length > 0
          ? {
              message: `${conflictingJobs.length} job(s) scheduled during this period`,
              jobIds: conflictingJobs.map((j) => j.id),
            }
          : null,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    console.error('Request time off error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Approve/reject time off request
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { timeOffId, approved } = body;

    if (!timeOffId || typeof approved !== 'boolean') {
      return NextResponse.json({ error: 'Time off ID and approved status required' }, { status: 400 });
    }

    // Get the time off request
    const timeOffRequest = await prisma.cleanerTimeOff.findFirst({
      where: { id: timeOffId },
      include: { teamMember: true },
    });

    if (!timeOffRequest || timeOffRequest.teamMember.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Time off request not found' }, { status: 404 });
    }

    const timeOff = await prisma.cleanerTimeOff.update({
      where: { id: timeOffId },
      data: {
        isApproved: approved,
        approvedById: approved ? session.user.id : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: timeOff,
      message: approved ? 'Time off approved' : 'Time off rejected',
    });
  } catch (error) {
    console.error('Approve time off error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Cancel time off request
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { teamMember: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const timeOffId = searchParams.get('id');

    if (!timeOffId) {
      return NextResponse.json({ error: 'Time off ID required' }, { status: 400 });
    }

    const timeOffRequest = await prisma.cleanerTimeOff.findFirst({
      where: { id: timeOffId },
      include: { teamMember: true },
    });

    if (!timeOffRequest || timeOffRequest.teamMember.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Time off request not found' }, { status: 404 });
    }

    // Cleaners can only delete their own requests
    if (user.role === 'CLEANER' && timeOffRequest.teamMemberId !== user.teamMember?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.cleanerTimeOff.delete({
      where: { id: timeOffId },
    });

    return NextResponse.json({
      success: true,
      message: 'Time off request cancelled',
    });
  } catch (error) {
    console.error('Delete time off error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
