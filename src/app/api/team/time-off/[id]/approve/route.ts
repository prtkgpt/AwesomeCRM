import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendTimeOffApprovedNotification } from '@/lib/notifications';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/team/time-off/[id]/approve - Approve a time off request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyId: true, role: true },
    });

    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const timeOffRequest = await prisma.timeOffRequest.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        teamMember: true,
      },
    });

    if (!timeOffRequest) {
      return NextResponse.json(
        { error: 'Time off request not found' },
        { status: 404 }
      );
    }

    if (timeOffRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only approve pending requests' },
        { status: 400 }
      );
    }

    // Parse body for optional notes
    let notes = null;
    try {
      const body = await request.json();
      notes = body.notes || null;
    } catch {
      // No body or invalid JSON, that's fine
    }

    // Update the request status
    const updatedRequest = await prisma.timeOffRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        reviewNotes: notes,
      },
    });

    // Update the team member's availability to reflect the time off
    // This adds the time off dates as overrides in the availability JSON
    const teamMember = await prisma.teamMember.findUnique({
      where: { id: timeOffRequest.teamMemberId },
    });

    if (teamMember) {
      const availability = teamMember.availability
        ? (typeof teamMember.availability === 'string'
            ? JSON.parse(teamMember.availability)
            : teamMember.availability)
        : { recurring: {}, overrides: {} };

      // Add time off dates as unavailable in overrides
      const startDate = new Date(timeOffRequest.startDate);
      const endDate = new Date(timeOffRequest.endDate);
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        if (!availability.overrides) {
          availability.overrides = {};
        }
        availability.overrides[dateKey] = {
          available: false,
          reason: `Time off: ${timeOffRequest.type.toLowerCase().replace(/_/g, ' ')}`,
          timeOffRequestId: timeOffRequest.id,
        };
        currentDate.setDate(currentDate.getDate() + 1);
      }

      await prisma.teamMember.update({
        where: { id: teamMember.id },
        data: {
          availability: JSON.stringify(availability),
        },
      });
    }

    // Send notification to cleaner
    await sendTimeOffApprovedNotification(id);

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: 'Time off request approved successfully',
    });
  } catch (error) {
    console.error('POST /api/team/time-off/[id]/approve error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve time off request' },
      { status: 500 }
    );
  }
}
