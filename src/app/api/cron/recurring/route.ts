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
  endOfDay,
  isBefore,
  isAfter,
  parseISO,
  setHours,
  setMinutes,
  format,
  getDay,
} from 'date-fns';
import { generateBookingNumber } from '@/lib/auth';

const CRON_SECRET = process.env.CRON_SECRET;

// Days of week mapping
const dayMapping: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

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

    // Get all active recurring bookings
    const recurringBookings = await prisma.recurringBooking.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
      include: {
        client: true,
        assignedCleaner: { include: { user: true } },
        company: true,
      },
    });

    for (const recurring of recurringBookings) {
      try {
        // Calculate next occurrence(s) within the look-ahead window
        const nextDates = calculateNextOccurrences(
          recurring,
          now,
          lookAheadDate
        );

        for (const nextDate of nextDates) {
          // Check if booking already exists for this date
          const existingBooking = await prisma.booking.findFirst({
            where: {
              recurringBookingId: recurring.id,
              scheduledDate: {
                gte: startOfDay(nextDate),
                lte: endOfDay(nextDate),
              },
            },
          });

          if (existingBooking) {
            results.skipped++;
            continue;
          }

          // Parse preferred time
          const [hours, minutes] = parseTime(recurring.preferredTime);
          const scheduledDate = setMinutes(setHours(nextDate, hours), minutes);

          // Create the booking
          const booking = await prisma.booking.create({
            data: {
              companyId: recurring.companyId,
              clientId: recurring.clientId,
              bookingNumber: generateBookingNumber(),
              serviceType: recurring.serviceType,
              scheduledDate,
              duration: recurring.duration,
              address: recurring.address,
              latitude: recurring.latitude,
              longitude: recurring.longitude,
              assignedCleanerId: recurring.assignedCleanerId,
              status: 'CONFIRMED',
              price: recurring.price,
              isRecurring: true,
              recurringBookingId: recurring.id,
              notes: recurring.notes,
              createdAt: now,
            },
          });

          // Update recurring booking stats
          await prisma.recurringBooking.update({
            where: { id: recurring.id },
            data: {
              nextOccurrence: calculateNextSingleOccurrence(recurring, nextDate),
              totalOccurrences: { increment: 1 },
            },
          });

          results.generated++;

          // Log notification for cleaner if assigned
          if (recurring.assignedCleanerId) {
            await prisma.notification.create({
              data: {
                companyId: recurring.companyId,
                userId: recurring.assignedCleaner?.userId,
                type: 'NEW_ASSIGNMENT',
                title: 'New Recurring Job Scheduled',
                message: `A recurring cleaning job has been scheduled for ${format(
                  scheduledDate,
                  'EEEE, MMMM d'
                )} at ${format(scheduledDate, 'h:mm a')}`,
                channel: 'INTERNAL',
                status: 'PENDING',
                metadata: { bookingId: booking.id },
              },
            });
          }
        }
      } catch (error) {
        results.errors.push(
          `Recurring ${recurring.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

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
  recurring: any,
  startDate: Date,
  endDate: Date
): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(recurring.nextOccurrence || recurring.startDate || startDate);

  // Make sure we start from today or later
  if (isBefore(currentDate, startOfDay(startDate))) {
    currentDate = findNextValidDate(recurring, startDate);
  }

  while (isBefore(currentDate, endDate) && dates.length < 10) {
    // Check if this date is valid
    const dayOfWeek = getDay(currentDate);
    const preferredDayNumber = dayMapping[recurring.preferredDay];

    if (dayOfWeek === preferredDayNumber) {
      // Check if not past end date
      if (!recurring.endDate || isBefore(currentDate, recurring.endDate)) {
        dates.push(new Date(currentDate));
      }
    }

    // Move to next potential date
    currentDate = getNextDateByFrequency(recurring, currentDate);
  }

  return dates;
}

function findNextValidDate(recurring: any, fromDate: Date): Date {
  let currentDate = startOfDay(fromDate);
  const preferredDayNumber = dayMapping[recurring.preferredDay];

  // Find the next preferred day
  while (getDay(currentDate) !== preferredDayNumber) {
    currentDate = addDays(currentDate, 1);
  }

  return currentDate;
}

function getNextDateByFrequency(recurring: any, fromDate: Date): Date {
  switch (recurring.frequency) {
    case 'WEEKLY':
      return addWeeks(fromDate, 1);
    case 'BIWEEKLY':
      return addWeeks(fromDate, 2);
    case 'MONTHLY':
      return addMonths(fromDate, 1);
    case 'CUSTOM':
      return addDays(fromDate, recurring.customIntervalDays || 7);
    default:
      return addWeeks(fromDate, 1);
  }
}

function calculateNextSingleOccurrence(recurring: any, afterDate: Date): Date {
  let nextDate = getNextDateByFrequency(recurring, afterDate);

  // Adjust to the preferred day if needed
  const preferredDayNumber = dayMapping[recurring.preferredDay];
  while (getDay(nextDate) !== preferredDayNumber) {
    nextDate = addDays(nextDate, 1);
  }

  return nextDate;
}

function parseTime(timeString: string): [number, number] {
  // Parse time like "9:00 AM" or "14:00"
  const match = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return [9, 0]; // Default to 9:00 AM

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return [hours, minutes];
}
