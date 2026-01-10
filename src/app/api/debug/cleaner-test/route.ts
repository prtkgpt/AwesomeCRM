import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
      },
    });

    const teamMember = await prisma.teamMember.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        userId: true,
        role: true,
        isActive: true,
      },
    });

    // Get a sample of bookings
    const allBookings = await prisma.booking.findMany({
      where: {
        companyId: user?.companyId,
        scheduledDate: { gte: new Date() },
      },
      select: {
        id: true,
        scheduledDate: true,
        assignedTo: true,
        client: { select: { name: true } },
        assignee: {
          select: {
            id: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 10,
    });

    // Test the filtered query
    let filteredBookings = [];
    if (teamMember) {
      filteredBookings = await prisma.booking.findMany({
        where: {
          AND: [
            { companyId: user?.companyId },
            { scheduledDate: { gte: new Date() } },
            {
              OR: [
                { assignedTo: teamMember.id },
                { assignedTo: null },
              ],
            },
          ],
        },
        select: {
          id: true,
          scheduledDate: true,
          assignedTo: true,
          client: { select: { name: true } },
          assignee: {
            select: {
              id: true,
              user: { select: { name: true } },
            },
          },
        },
        orderBy: { scheduledDate: 'asc' },
        take: 10,
      });
    }

    return NextResponse.json({
      success: true,
      debug: {
        user: user,
        teamMember: teamMember,
        allBookings: allBookings.map(b => ({
          client: b.client.name,
          date: b.scheduledDate.toISOString().split('T')[0],
          assignedTo: b.assignedTo,
          assigneeName: b.assignee?.user?.name || 'UNASSIGNED',
          matchesMe: b.assignedTo === teamMember?.id,
        })),
        filteredBookings: filteredBookings.map(b => ({
          client: b.client.name,
          date: b.scheduledDate.toISOString().split('T')[0],
          assignedTo: b.assignedTo,
          assigneeName: b.assignee?.user?.name || 'UNASSIGNED',
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
