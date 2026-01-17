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
        firstName: true,
        lastName: true,
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
        assignedCleanerId: true,
        client: { select: { firstName: true, lastName: true } },
        assignedCleaner: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
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
                { assignedCleanerId: teamMember.id },
                { assignedCleanerId: null },
              ],
            },
          ],
        },
        select: {
          id: true,
          scheduledDate: true,
          assignedCleanerId: true,
          client: { select: { firstName: true, lastName: true } },
          assignedCleaner: {
            select: {
              id: true,
              user: { select: { firstName: true, lastName: true } },
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
          client: `${b.client.firstName || ''} ${b.client.lastName || ''}`.trim(),
          date: b.scheduledDate.toISOString().split('T')[0],
          assignedCleanerId: b.assignedCleanerId,
          assigneeName: b.assignedCleaner?.user ? `${b.assignedCleaner.user.firstName || ''} ${b.assignedCleaner.user.lastName || ''}`.trim() : 'UNASSIGNED',
          matchesMe: b.assignedCleanerId === teamMember?.id,
        })),
        filteredBookings: user.role === 'CLEANER' ? filteredBookings.map(b => ({
          client: `${b.client.firstName || ''} ${b.client.lastName || ''}`.trim(),
          date: b.scheduledDate.toISOString().split('T')[0],
          assignedCleanerId: b.assignedCleanerId,
          assigneeName: b.assignedCleaner?.user ? `${b.assignedCleaner.user.firstName || ''} ${b.assignedCleaner.user.lastName || ''}`.trim() : 'UNASSIGNED',
        })) : 'Not a cleaner',
        whereClause: user.role === 'CLEANER' && teamMember ? {
          AND: [
            { companyId: user.companyId },
            { scheduledDate: { gte: 'TODAY' } },
            {
              OR: [
                { assignedCleanerId: teamMember.id },
                { assignedCleanerId: null },
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
