import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/cleaner/jobs/[id]/complete - Mark job as completed
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
      select: { id: true, role: true, companyId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only cleaners can complete jobs
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
        assignedTo: teamMember.id,
        companyId: user.companyId,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found or not assigned to you' },
        { status: 404 }
      );
    }

    // Update booking status to completed
    const updatedBooking = await prisma.booking.update({
      where: { id: params.id },
      data: {
        status: 'COMPLETED',
      },
      include: {
        client: {
          select: {
            name: true,
            phone: true,
          },
        },
        address: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedBooking,
      message: 'Job marked as completed',
    });
  } catch (error) {
    console.error('🔴 POST /api/cleaner/jobs/[id]/complete error:', error);

    if (error instanceof Error && error.message) {
      console.error('🔴 Error message:', error.message);
      console.error('🔴 Error stack:', error.stack);

      // Check for specific Prisma errors
      if (error.message.includes('Record to update not found')) {
        return NextResponse.json({
          success: false,
          error: 'Job not found or already updated'
        }, { status: 404 });
      }

      return NextResponse.json({
        success: false,
        error: `Failed to complete job: ${error.message}`,
        details: error.stack
      }, { status: 500 });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to complete job - unknown error' },
      { status: 500 }
    );
  }
}
