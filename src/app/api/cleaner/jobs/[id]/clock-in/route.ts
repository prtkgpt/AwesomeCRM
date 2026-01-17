import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// POST /api/cleaner/jobs/[id]/clock-in - Clock in to a job
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, companyId: true, firstName: true, lastName: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only cleaners can clock in
    if (user.role !== 'CLEANER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the cleaner's team member record
    const teamMember = await prisma.teamMember.findUnique({
      where: { userId: user.id },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Team member profile not found' }, { status: 404 });
    }

    // Verify the booking is assigned to this cleaner
    const booking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        assignedCleanerId: teamMember.id,
        companyId: user.companyId,
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        address: {
          select: {
            street: true,
            city: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found or not assigned to you' },
        { status: 404 }
      );
    }

    // Check if already clocked in
    if (booking.clockedInAt) {
      return NextResponse.json(
        { error: 'Already clocked in to this job' },
        { status: 400 }
      );
    }

    // Update booking with clock-in time
    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        clockedInAt: new Date(),
      },
      include: {
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        address: {
          select: {
            street: true,
            city: true,
          },
        },
      },
    });

    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const clientName = `${booking.client.firstName || ''} ${booking.client.lastName || ''}`.trim();
    console.log(`✅ Cleaner ${userName} clocked in to job ${params.id} for ${clientName}`);

    return NextResponse.json({
      success: true,
      data: updatedBooking,
      message: 'Clocked in successfully',
    });
  } catch (error) {
    console.error('🔴 POST /api/cleaner/jobs/[id]/clock-in error:', error);

    if (error instanceof Error && error.message) {
      console.error('🔴 Error message:', error.message);
      console.error('🔴 Error stack:', error.stack);
      return NextResponse.json({
        success: false,
        error: `Failed to clock in: ${error.message}`,
        details: error.stack
      }, { status: 500 });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to clock in - unknown error' },
      { status: 500 }
    );
  }
}
