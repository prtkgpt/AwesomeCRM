import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/cleaner/availability - Get cleaner's availability
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || user.role !== 'CLEANER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get team member record (which has availability data)
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId: session.user.id },
      select: {
        id: true,
        availability: true,
      },
    });

    if (!teamMember) {
      return NextResponse.json({
        success: true,
        availability: [],
      });
    }

    // Parse availability JSON
    const availability = teamMember.availability
      ? (typeof teamMember.availability === 'string'
          ? JSON.parse(teamMember.availability)
          : teamMember.availability)
      : [];

    return NextResponse.json({
      success: true,
      availability,
    });
  } catch (error) {
    console.error('🔴 GET /api/cleaner/availability error:', error);

    if (error instanceof Error && error.message) {
      console.error('🔴 Error message:', error.message);
      console.error('🔴 Error stack:', error.stack);
      return NextResponse.json({
        success: false,
        error: `Failed to fetch availability: ${error.message}`,
        details: error.stack
      }, { status: 500 });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch availability - unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/cleaner/availability - Update cleaner's availability
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

    const body = await request.json();
    const { availability } = body;

    if (!Array.isArray(availability)) {
      return NextResponse.json(
        { error: 'Invalid availability data' },
        { status: 400 }
      );
    }

    // Validate availability format
    for (const slot of availability) {
      if (
        !slot.day ||
        !slot.startTime ||
        !slot.endTime ||
        typeof slot.available !== 'boolean'
      ) {
        return NextResponse.json(
          { error: 'Invalid availability slot format' },
          { status: 400 }
        );
      }
    }

    // Get or create team member record
    let teamMember = await prisma.teamMember.findFirst({
      where: { userId: session.user.id },
    });

    if (!teamMember) {
      // Create team member if doesn't exist
      teamMember = await prisma.teamMember.create({
        data: {
          companyId: user.companyId,
          userId: session.user.id,
          isActive: true,
          availability: JSON.stringify(availability),
        },
      });
    } else {
      // Update existing team member
      teamMember = await prisma.teamMember.update({
        where: { id: teamMember.id },
        data: {
          availability: JSON.stringify(availability),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Availability updated successfully',
    });
  } catch (error) {
    console.error('🔴 POST /api/cleaner/availability error:', error);

    if (error instanceof Error && error.message) {
      console.error('🔴 Error message:', error.message);
      console.error('🔴 Error stack:', error.stack);

      // Check for specific Prisma errors
      if (error.message.includes('Foreign key constraint')) {
        return NextResponse.json({
          success: false,
          error: 'Invalid company or user reference - please contact support'
        }, { status: 400 });
      }

      return NextResponse.json({
        success: false,
        error: `Failed to update availability: ${error.message}`,
        details: error.stack
      }, { status: 500 });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update availability - unknown error' },
      { status: 500 }
    );
  }
}
