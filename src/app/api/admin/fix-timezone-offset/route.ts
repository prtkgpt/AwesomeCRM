import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * SIMPLER TIMEZONE FIX
 * Adds/subtracts hours from all booking dates
 *
 * USE CASE: If dates were stored with wrong timezone offset
 * Example: Job scheduled for 10 AM PST but stored as 10 AM UTC
 * Solution: Add 8 hours to shift from PST to UTC properly
 *
 * HOW TO USE:
 * 1. GET /api/admin/fix-timezone-offset?hoursOffset=8&preview=true
 *    - Preview adding 8 hours to all dates
 * 2. POST /api/admin/fix-timezone-offset with body: { hoursOffset: 8 }
 *    - Execute the fix
 *
 * IMPORTANT: Run preview first to verify the correction!
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const hoursOffset = parseInt(searchParams.get('hoursOffset') || '8');

    const bookings = await prisma.booking.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        scheduledDate: true,
        client: { select: { name: true } },
        status: true,
      },
      orderBy: { scheduledDate: 'asc' },
      take: 50, // Preview first 50
    });

    const preview = bookings.map(booking => {
      const current = booking.scheduledDate;
      const adjusted = new Date(current.getTime() + hoursOffset * 60 * 60 * 1000);

      return {
        id: booking.id,
        client: booking.client.name,
        status: booking.status,
        currentUTC: current.toISOString(),
        currentDisplay: current.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }),
        adjustedUTC: adjusted.toISOString(),
        adjustedDisplay: adjusted.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }),
      };
    });

    return NextResponse.json({
      success: true,
      message: `Preview: ${hoursOffset > 0 ? 'Adding' : 'Subtracting'} ${Math.abs(hoursOffset)} hours`,
      hoursOffset,
      totalBookings: await prisma.booking.count({ where: { companyId: user.companyId } }),
      preview,
      instructions: {
        checkPreview: 'Verify the adjustedDisplay times look correct',
        toExecute: `POST /api/admin/fix-timezone-offset with body: { "hoursOffset": ${hoursOffset} }`,
        note: 'This will update ALL bookings in your company',
      },
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to preview' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true, email: true },
    });

    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const hoursOffset = body.hoursOffset;

    if (!hoursOffset || typeof hoursOffset !== 'number') {
      return NextResponse.json(
        { error: 'hoursOffset is required and must be a number' },
        { status: 400 }
      );
    }

    // Get all bookings
    const bookings = await prisma.booking.findMany({
      where: { companyId: user.companyId },
      select: { id: true, scheduledDate: true },
    });

    console.log(`🔧 TIMEZONE FIX - Starting migration for ${bookings.length} bookings`);
    console.log(`🔧 TIMEZONE FIX - User: ${user.email}, Offset: ${hoursOffset} hours`);

    const updates: Array<{ id: string; before: string; after: string }> = [];

    // Update each booking
    for (const booking of bookings) {
      const before = booking.scheduledDate;
      const after = new Date(before.getTime() + hoursOffset * 60 * 60 * 1000);

      await prisma.booking.update({
        where: { id: booking.id },
        data: { scheduledDate: after },
      });

      if (updates.length < 20) {
        updates.push({
          id: booking.id,
          before: before.toISOString(),
          after: after.toISOString(),
        });
      }
    }

    console.log(`✅ TIMEZONE FIX - Completed successfully`);

    return NextResponse.json({
      success: true,
      message: `Successfully adjusted ${bookings.length} bookings by ${hoursOffset} hours`,
      summary: {
        totalUpdated: bookings.length,
        hoursOffset,
        executedBy: user.email,
        executedAt: new Date().toISOString(),
      },
      sampleUpdates: updates,
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute migration' },
      { status: 500 }
    );
  }
}
