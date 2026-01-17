// ============================================
// CleanDayCRM - Recurring Booking Generator
// ============================================
// This endpoint generates upcoming bookings from recurring schedules
// Should be called daily by a cron job

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  addDays,
  addWeeks,
  addMonths,
  startOfDay,
  format,
} from 'date-fns';
import { generateBookingNumber } from '@/lib/auth';

const CRON_SECRET = process.env.CRON_SECRET;

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const lookAheadDays = 14; // Generate bookings up to 2 weeks in advance
    const lookAheadDate = addDays(now, lookAheadDays);

    const results = {
      generated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Get recurring parent bookings that need child bookings generated
    // A recurring parent is a booking with isRecurring=true and no recurrenceParentId
    const recurringParents = await prisma.booking.findMany({
      where: {
        isRecurring: true,
        recurrenceParentId: null,
        recurrenceFrequency: { not: 'NONE' },
        OR: [
          { recurrenceEndDate: null },
          { recurrenceEndDate: { gte: now } },
        ],
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      },
      include: {
        client: true,
        assignedCleaner: { include: { user: true } },
        company: true,
        address: true,
      },
    });

    for (const parent of recurringParents) {
      try {
        // Calculate next occurrence based on frequency
        const lastChild = await prisma.booking.findFirst({
          where: {
            recurrenceParentId: parent.id,
          },
          orderBy: {
            scheduledDate: 'desc',
          },
        });

        const lastDate = lastChild?.scheduledDate || parent.scheduledDate;
        const nextDates = calculateNextOccurrences(parent, lastDate, lookAheadDate);

        for (const nextDate of nextDates) {
          // Check if booking already exists for this date
          const existingBooking = await prisma.booking.findFirst({
            where: {
              recurrenceParentId: parent.id,
              scheduledDate: {
                gte: startOfDay(nextDate),
                lte: addDays(startOfDay(nextDate), 1),
              },
            },
          });

          if (existingBooking) {
            results.skipped++;
            continue;
          }

          // Create the child booking
          await prisma.booking.create({
            data: {
              companyId: parent.companyId,
              clientId: parent.clientId,
              addressId: parent.addressId,
              createdById: parent.createdById,
              bookingNumber: generateBookingNumber(),
              serviceType: parent.serviceType,
              serviceId: parent.serviceId,
              scheduledDate: nextDate,
              scheduledEndDate: parent.scheduledEndDate
                ? addDays(nextDate, 0) // Same day end
                : null,
              duration: parent.duration,
              assignedCleanerId: parent.assignedCleanerId,
              status: 'CONFIRMED',
              basePrice: parent.basePrice,
              subtotal: parent.subtotal,
              finalPrice: parent.finalPrice,
              isRecurring: true,
              recurrenceParentId: parent.id,
              customerNotes: parent.customerNotes,
            },
          });

          results.generated++;
        }
      } catch (error) {
        results.errors.push(
          `Parent ${parent.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    console.log(`✅ Recurring booking generation: ${results.generated} created, ${results.skipped} skipped`);

    return NextResponse.json({
      success: true,
      message: 'Recurring booking generation completed',
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Recurring cron error:', error);
    return NextResponse.json(
      { success: false, error: 'Recurring job failed' },
      { status: 500 }
    );
  }
}

function calculateNextOccurrences(
  parent: any,
  lastDate: Date,
  endDate: Date
): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(lastDate);

  // Move to next occurrence based on frequency
  currentDate = getNextDateByFrequency(parent.recurrenceFrequency, currentDate);

  while (currentDate <= endDate && dates.length < 10) {
    // Check if not past recurrence end date
    if (!parent.recurrenceEndDate || currentDate <= parent.recurrenceEndDate) {
      dates.push(new Date(currentDate));
    }

    // Move to next potential date
    currentDate = getNextDateByFrequency(parent.recurrenceFrequency, currentDate);
  }

  return dates;
}

function getNextDateByFrequency(frequency: string, fromDate: Date): Date {
  switch (frequency) {
    case 'WEEKLY':
      return addWeeks(fromDate, 1);
    case 'BIWEEKLY':
      return addWeeks(fromDate, 2);
    case 'MONTHLY':
      return addMonths(fromDate, 1);
    default:
      return addWeeks(fromDate, 1);
  }
}
