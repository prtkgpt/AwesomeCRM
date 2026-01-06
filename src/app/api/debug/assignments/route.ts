import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/debug/assignments - Debug cleaner assignments
export async function GET(request: NextRequest) {
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

    // Only OWNER and ADMIN can access
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all team members
    const teamMembers = await prisma.teamMember.findMany({
      where: { companyId: user.companyId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Get all bookings with assignments
    const bookings = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
        status: 'SCHEDULED',
      },
      select: {
        id: true,
        scheduledDate: true,
        assignedTo: true,
        client: {
          select: {
            name: true,
          },
        },
        assignee: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        scheduledDate: 'desc',
      },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: {
        teamMembers: teamMembers.map(tm => ({
          teamMemberId: tm.id,
          userId: tm.user.id,
          name: tm.user.name,
          email: tm.user.email,
          role: tm.user.role,
        })),
        bookings: bookings.map(b => ({
          id: b.id.slice(0, 8) + '...',
          clientName: b.client.name,
          scheduledDate: b.scheduledDate,
          assignedTo: b.assignedTo,
          assigneeName: b.assignee?.user.name || 'UNASSIGNED',
          assigneeEmail: b.assignee?.user.email || null,
        })),
      },
    });
  } catch (error) {
    console.error('GET /api/debug/assignments error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch debug info' },
      { status: 500 }
    );
  }
}
