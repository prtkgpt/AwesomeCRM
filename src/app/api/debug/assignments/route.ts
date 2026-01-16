import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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

    // Get current user's full info
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
      },
    });

    // Get team member record for current user
    const teamMember = await prisma.teamMember.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        userId: true,
        isActive: true,
      },
    });

    // Get all upcoming bookings
    const allBookings = await prisma.booking.findMany({
      where: {
        companyId: user.companyId,
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
      take: 20,
    });

    // Test the filtered query if user is a cleaner
    let filteredBookings: typeof allBookings = [];
    if (user.role === 'CLEANER' && teamMember) {
      filteredBookings = await prisma.booking.findMany({
        where: {
          AND: [
            { companyId: user.companyId },
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
        take: 20,
      });
    }

    return NextResponse.json({
      success: true,
      debug: {
        currentUser: currentUser,
        teamMember: teamMember,
        allBookings: allBookings.map(b => ({
          client: b.client.name,
          date: b.scheduledDate.toISOString().split('T')[0],
          assignedTo: b.assignedTo,
          assigneeName: b.assignee?.user?.name || 'UNASSIGNED',
          matchesMe: b.assignedTo === teamMember?.id,
        })),
        filteredBookings: user.role === 'CLEANER' ? filteredBookings.map(b => ({
          client: b.client.name,
          date: b.scheduledDate.toISOString().split('T')[0],
          assignedTo: b.assignedTo,
          assigneeName: b.assignee?.user?.name || 'UNASSIGNED',
        })) : 'Not a cleaner',
        whereClause: user.role === 'CLEANER' && teamMember ? {
          AND: [
            { companyId: user.companyId },
            { scheduledDate: { gte: 'TODAY' } },
            {
              OR: [
                { assignedTo: teamMember.id },
                { assignedTo: null },
              ],
            },
          ],
        } : 'Not a cleaner',
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
