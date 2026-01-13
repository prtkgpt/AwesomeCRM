import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { zonedTimeToUtc } from 'date-fns-tz';

const COMPANY_TIMEZONE = 'America/Los_Angeles'; // PST/PDT

/**
 * ONE-TIME MIGRATION SCRIPT
 * Fixes booking dates that were stored with incorrect timezone handling
 *
 * PROBLEM: Dates were created with `new Date("2026-01-20T10:00")` which JavaScript
 * interprets as local server time, not PST. This caused timezone inconsistencies.
 *
 * SOLUTION: Re-interpret all booking dates as if they were meant to be PST times,
 * and convert them to proper UTC for storage.
 *
 * HOW TO USE:
 * 1. GET /api/admin/migrate-timezones?preview=true - Preview what would change
 * 2. POST /api/admin/migrate-timezones - Execute the migration
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Get all bookings for this company
    const bookings = await prisma.booking.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        scheduledDate: true,
        client: { select: { name: true } },
        status: true,
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Analyze each booking
    const analysis = bookings.map(booking => {
      const currentDate = booking.scheduledDate;

      // Extract the date/time components as they appear in the DB
      // These might be stored as UTC but were intended to be PST
      const year = currentDate.getUTCFullYear();
      const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getUTCDate()).padStart(2, '0');
      const hours = String(currentDate.getUTCHours()).padStart(2, '0');
      const minutes = String(currentDate.getUTCMinutes()).padStart(2, '0');

      // Reconstruct the date string as it was likely intended (PST time)
      const intendedPSTString = `${year}-${month}-${day}T${hours}:${minutes}`;

      // Convert this PST time to proper UTC
      const correctedDate = zonedTimeToUtc(intendedPSTString, COMPANY_TIMEZONE);

      // Calculate the difference
      const differenceMs = correctedDate.getTime() - currentDate.getTime();
      const differenceHours = Math.round(differenceMs / (1000 * 60 * 60));

      return {
        id: booking.id,
        client: booking.client.name,
        status: booking.status,
        currentUTC: currentDate.toISOString(),
        currentPSTDisplay: intendedPSTString,
        correctedUTC: correctedDate.toISOString(),
        differenceHours,
        needsUpdate: differenceHours !== 0,
      };
    });

    const needsUpdate = analysis.filter(a => a.needsUpdate);

    return NextResponse.json({
      success: true,
      message: 'Timezone migration analysis',
      summary: {
        totalBookings: bookings.length,
        needingUpdate: needsUpdate.length,
        alreadyCorrect: bookings.length - needsUpdate.length,
      },
      bookings: analysis,
      instructions: {
        step1: 'Review the analysis above',
        step2: 'Check a few bookings to verify the correction looks right',
        step3: 'If correct, run: POST /api/admin/migrate-timezones to execute migration',
        note: 'Bookings with differenceHours = 0 are already correct and will not be updated',
      },
    });
  } catch (error) {
    console.error('Timezone migration preview error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to preview migration' },
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

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, companyId: true },
    });

    if (!user || (user.role !== 'OWNER' && user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Get all bookings for this company
    const bookings = await prisma.booking.findMany({
      where: { companyId: user.companyId },
      select: {
        id: true,
        scheduledDate: true,
      },
    });

    const updates: Array<{ id: string; oldDate: Date; newDate: Date }> = [];
    let updatedCount = 0;
    let skippedCount = 0;

    // Process each booking
    for (const booking of bookings) {
      const currentDate = booking.scheduledDate;

      // Extract the date/time components as they appear in UTC
      const year = currentDate.getUTCFullYear();
      const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getUTCDate()).padStart(2, '0');
      const hours = String(currentDate.getUTCHours()).padStart(2, '0');
      const minutes = String(currentDate.getUTCMinutes()).padStart(2, '0');

      // Reconstruct as PST time
      const intendedPSTString = `${year}-${month}-${day}T${hours}:${minutes}`;

      // Convert to proper UTC
      const correctedDate = zonedTimeToUtc(intendedPSTString, COMPANY_TIMEZONE);

      // Only update if there's a difference
      const differenceMs = correctedDate.getTime() - currentDate.getTime();

      if (differenceMs !== 0) {
        // Update the booking
        await prisma.booking.update({
          where: { id: booking.id },
          data: { scheduledDate: correctedDate },
        });

        updates.push({
          id: booking.id,
          oldDate: currentDate,
          newDate: correctedDate,
        });

        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Timezone migration completed successfully',
      summary: {
        totalBookings: bookings.length,
        updated: updatedCount,
        skipped: skippedCount,
      },
      updates: updates.slice(0, 20), // Show first 20 updates
      note: updatedCount > 20 ? `Showing first 20 of ${updatedCount} updates` : null,
    });
  } catch (error) {
    console.error('Timezone migration error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute migration' },
      { status: 500 }
    );
  }
}
