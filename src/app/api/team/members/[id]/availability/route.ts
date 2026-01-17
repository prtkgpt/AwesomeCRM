import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/team/members/[id]/availability - Get team member's availability (Admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get team member with availability
    const teamMember = await prisma.teamMember.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        companyId: true,
        availability: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Verify team member belongs to same company
    if (teamMember.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse availability JSON
    const availability = teamMember.availability
      ? (typeof teamMember.availability === 'string'
          ? JSON.parse(teamMember.availability)
          : teamMember.availability)
      : {
          recurring: {
            sunday: { available: true, start: '09:00', end: '18:00' },
            monday: { available: true, start: '09:00', end: '18:00' },
            tuesday: { available: true, start: '09:00', end: '18:00' },
            wednesday: { available: true, start: '09:00', end: '18:00' },
            thursday: { available: true, start: '09:00', end: '18:00' },
            friday: { available: true, start: '09:00', end: '18:00' },
            saturday: { available: true, start: '09:00', end: '18:00' },
          },
          overrides: {},
        };

    return NextResponse.json({
      success: true,
      data: {
        teamMember: {
          id: teamMember.id,
          name: `${teamMember.user.firstName || ''} ${teamMember.user.lastName || ''}`.trim() || 'Unknown',
          email: teamMember.user.email,
        },
        availability,
      },
    });
  } catch (error) {
    console.error('🔴 GET /api/team/members/[id]/availability error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}

// PUT /api/team/members/[id]/availability - Update team member's availability (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || !['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { availability } = body;

    if (!availability) {
      return NextResponse.json(
        { error: 'Availability data is required' },
        { status: 400 }
      );
    }

    // Get team member
    const teamMember = await prisma.teamMember.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        companyId: true,
      },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Verify team member belongs to same company
    if (teamMember.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate availability structure
    if (availability.recurring) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      for (const day of days) {
        const dayData = availability.recurring[day];
        if (dayData && dayData.available) {
          if (!dayData.start || !dayData.end) {
            return NextResponse.json(
              { error: `Invalid time range for ${day}` },
              { status: 400 }
            );
          }
        }
      }
    }

    // Update team member availability
    await prisma.teamMember.update({
      where: { id: params.id },
      data: {
        availability: JSON.stringify(availability),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Availability updated successfully',
    });
  } catch (error) {
    console.error('🔴 PUT /api/team/members/[id]/availability error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update availability' },
      { status: 500 }
    );
  }
}
