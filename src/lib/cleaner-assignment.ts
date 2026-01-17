// ============================================
// CleanDayCRM - AI-based Cleaner Assignment
// ============================================

import { prisma } from './prisma';
import { addMinutes, parseISO, isWithinInterval, format, getDay } from 'date-fns';

interface AssignmentCandidate {
  cleanerId: string;
  cleanerName: string;
  score: number;
  reasons: string[];
  distance?: number;
  rating: number;
  availability: boolean;
  workload: number;
}

interface AssignmentOptions {
  bookingId?: string;
  clientId: string;
  addressId: string;
  scheduledDate: Date;
  duration: number;
  serviceType: string;
  companyId: string;
  preferredCleanerId?: string;
}

interface AssignmentResult {
  recommended: AssignmentCandidate | null;
  alternatives: AssignmentCandidate[];
  autoAssigned: boolean;
}

/**
 * AI-based cleaner assignment algorithm
 * Scores cleaners based on multiple factors:
 * - Availability during the booking time
 * - Distance to the job location
 * - Customer preference (if they have a preferred cleaner)
 * - Cleaner's rating and performance
 * - Current workload (jobs already scheduled that day)
 * - Specialties matching the service type
 * - Service area coverage
 */
export async function findBestCleaner(
  options: AssignmentOptions
): Promise<AssignmentResult> {
  const {
    clientId,
    addressId,
    scheduledDate,
    duration,
    serviceType,
    companyId,
    preferredCleanerId,
  } = options;

  // Get client preferences
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      preferences: true,
    },
  });

  // Get the address for the booking
  const address = await prisma.address.findUnique({
    where: { id: addressId },
  });

  if (!address) {
    return { recommended: null, alternatives: [], autoAssigned: false };
  }

  // Get all active cleaners for this company
  const cleaners = await prisma.teamMember.findMany({
    where: {
      companyId,
      isActive: true,
      isAvailable: true,
      user: {
        role: 'CLEANER',
        isActive: true,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      assignedBookings: {
        where: {
          scheduledDate: {
            gte: new Date(scheduledDate.setHours(0, 0, 0, 0)),
            lt: new Date(scheduledDate.setHours(23, 59, 59, 999)),
          },
          status: {
            notIn: ['CANCELLED', 'NO_SHOW'],
          },
        },
      },
    },
  });

  const bookingStart = scheduledDate;
  const bookingEnd = addMinutes(scheduledDate, duration);
  const dayOfWeek = getDayName(getDay(scheduledDate)).toLowerCase();

  const candidates: AssignmentCandidate[] = [];

  for (const cleaner of cleaners) {
    const score = { value: 0, reasons: [] as string[] };

    // 1. Check availability
    const isAvailable = checkCleanerAvailability(
      cleaner,
      bookingStart,
      bookingEnd,
      dayOfWeek
    );

    if (!isAvailable.available) {
      continue; // Skip unavailable cleaners
    }

    // 2. Customer preference bonus (+30 points)
    if (preferredCleanerId && cleaner.id === preferredCleanerId) {
      score.value += 30;
      score.reasons.push('Customer preferred cleaner');
    } else if (client?.preferences?.preferredCleaner === cleaner.id) {
      score.value += 30;
      score.reasons.push('Customer preferred cleaner');
    }

    // 3. Rating score (up to +25 points)
    const ratingScore = Math.round(cleaner.averageRating * 5);
    score.value += ratingScore;
    if (cleaner.averageRating >= 4.5) {
      score.reasons.push(`Excellent rating (${cleaner.averageRating.toFixed(1)})`);
    }

    // 4. Service type specialty (+15 points)
    if (cleaner.serviceTypes && cleaner.serviceTypes.includes(serviceType)) {
      score.value += 15;
      score.reasons.push(`Specialized in ${serviceType}`);
    } else if (cleaner.specialties && cleaner.specialties.some(s =>
      s.toLowerCase().includes(serviceType.toLowerCase())
    )) {
      score.value += 15;
      score.reasons.push(`Experienced with ${serviceType}`);
    }

    // 5. Service area coverage (+10 points)
    if (address.zip && cleaner.serviceAreas) {
      if (cleaner.serviceAreas.includes(address.zip) ||
          cleaner.serviceAreas.includes(address.city)) {
        score.value += 10;
        score.reasons.push('Serves this area');
      }
    }

    // 6. Workload balance (-5 points per existing job)
    const existingJobs = cleaner.assignedBookings.length;
    const workloadPenalty = existingJobs * 5;
    score.value -= workloadPenalty;
    if (existingJobs === 0) {
      score.reasons.push('No jobs scheduled today');
    } else if (existingJobs <= 2) {
      score.reasons.push(`Light workload (${existingJobs} jobs)`);
    }

    // 7. On-time performance (+10 points for 95%+ on-time)
    if (cleaner.onTimePercentage >= 95) {
      score.value += 10;
      score.reasons.push('Excellent punctuality');
    } else if (cleaner.onTimePercentage >= 90) {
      score.value += 5;
    }

    // 8. Customer satisfaction (+10 points for 4.5+ satisfaction)
    if (cleaner.customerSatisfaction >= 4.5) {
      score.value += 10;
      score.reasons.push('High customer satisfaction');
    }

    // 9. Experience bonus (+5 points for experienced cleaners)
    if (cleaner.yearsExperience && cleaner.yearsExperience >= 2) {
      score.value += 5;
      score.reasons.push('Experienced cleaner');
    }

    // 10. Language preference (+5 points)
    if (client?.preferences?.languagePreference && cleaner.languages) {
      if (cleaner.languages.includes(client.preferences.languagePreference)) {
        score.value += 5;
        score.reasons.push('Speaks preferred language');
      }
    }

    candidates.push({
      cleanerId: cleaner.id,
      cleanerName: `${cleaner.user.firstName || ''} ${cleaner.user.lastName || ''}`.trim(),
      score: score.value,
      reasons: score.reasons,
      rating: cleaner.averageRating,
      availability: true,
      workload: existingJobs,
    });
  }

  // Sort by score (highest first)
  candidates.sort((a, b) => b.score - a.score);

  return {
    recommended: candidates[0] || null,
    alternatives: candidates.slice(1, 5), // Top 4 alternatives
    autoAssigned: false,
  };
}

/**
 * Check if a cleaner is available for a specific time slot
 */
function checkCleanerAvailability(
  cleaner: any,
  bookingStart: Date,
  bookingEnd: Date,
  dayOfWeek: string
): { available: boolean; reason?: string } {
  // Check if cleaner works on this day
  if (cleaner.availability) {
    const daySchedule = cleaner.availability[dayOfWeek];
    if (!daySchedule || !daySchedule.enabled) {
      return { available: false, reason: 'Does not work on this day' };
    }

    // Check if booking time is within cleaner's working hours
    const workStart = parseTimeToDate(daySchedule.start, bookingStart);
    const workEnd = parseTimeToDate(daySchedule.end, bookingStart);

    if (bookingStart < workStart || bookingEnd > workEnd) {
      return { available: false, reason: 'Outside working hours' };
    }
  }

  // Check for conflicts with existing bookings
  for (const existingBooking of cleaner.assignedBookings) {
    const existingStart = new Date(existingBooking.scheduledDate);
    const existingEnd = addMinutes(existingStart, existingBooking.duration);

    // Check for overlap
    if (
      (bookingStart >= existingStart && bookingStart < existingEnd) ||
      (bookingEnd > existingStart && bookingEnd <= existingEnd) ||
      (bookingStart <= existingStart && bookingEnd >= existingEnd)
    ) {
      return { available: false, reason: 'Has conflicting booking' };
    }
  }

  // Check max jobs per day
  if (cleaner.maxJobsPerDay && cleaner.assignedBookings.length >= cleaner.maxJobsPerDay) {
    return { available: false, reason: 'Maximum jobs reached for today' };
  }

  return { available: true };
}

/**
 * Auto-assign cleaner to a booking
 */
export async function autoAssignCleaner(
  bookingId: string,
  companyId: string
): Promise<{ success: boolean; cleanerId?: string; error?: string }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      client: {
        include: { preferences: true },
      },
      address: true,
    },
  });

  if (!booking) {
    return { success: false, error: 'Booking not found' };
  }

  if (booking.assignedCleanerId) {
    return { success: true, cleanerId: booking.assignedCleanerId };
  }

  const result = await findBestCleaner({
    bookingId,
    clientId: booking.clientId,
    addressId: booking.addressId,
    scheduledDate: booking.scheduledDate,
    duration: booking.duration,
    serviceType: booking.serviceType,
    companyId,
    preferredCleanerId: booking.client.preferences?.preferredCleaner || undefined,
  });

  if (!result.recommended) {
    return { success: false, error: 'No available cleaners found' };
  }

  // Assign the recommended cleaner
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      assignedCleanerId: result.recommended.cleanerId,
      assignmentMethod: 'AUTO',
    },
  });

  return { success: true, cleanerId: result.recommended.cleanerId };
}

/**
 * Get available time slots for a specific date and service
 */
export async function getAvailableSlots(
  companyId: string,
  date: Date,
  duration: number,
  serviceType?: string,
  cleanerId?: string
): Promise<{ start: string; end: string; cleanerCount: number }[]> {
  const slots: { start: string; end: string; cleanerCount: number }[] = [];

  // Get company operating hours
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { operatingHours: true },
  });

  const dayOfWeek = getDayName(getDay(date)).toLowerCase();
  const operatingHours = (company?.operatingHours as any)?.[dayOfWeek];

  if (!operatingHours || !operatingHours.enabled) {
    return slots; // Company closed on this day
  }

  const dayStart = parseTimeToDate(operatingHours.start, date);
  const dayEnd = parseTimeToDate(operatingHours.end, date);

  // Generate 30-minute slots
  let slotStart = dayStart;
  while (addMinutes(slotStart, duration) <= dayEnd) {
    const slotEnd = addMinutes(slotStart, duration);

    // Count available cleaners for this slot
    const availableCleaners = await countAvailableCleaners(
      companyId,
      slotStart,
      slotEnd,
      serviceType,
      cleanerId
    );

    if (availableCleaners > 0) {
      slots.push({
        start: format(slotStart, 'HH:mm'),
        end: format(slotEnd, 'HH:mm'),
        cleanerCount: availableCleaners,
      });
    }

    slotStart = addMinutes(slotStart, 30); // 30-minute intervals
  }

  return slots;
}

/**
 * Count available cleaners for a time slot
 */
async function countAvailableCleaners(
  companyId: string,
  start: Date,
  end: Date,
  serviceType?: string,
  specificCleanerId?: string
): Promise<number> {
  const dayOfWeek = getDayName(getDay(start)).toLowerCase();

  const cleaners = await prisma.teamMember.findMany({
    where: {
      companyId,
      isActive: true,
      isAvailable: true,
      ...(specificCleanerId ? { id: specificCleanerId } : {}),
      ...(serviceType ? { serviceTypes: { has: serviceType } } : {}),
      user: {
        role: 'CLEANER',
        isActive: true,
      },
    },
    include: {
      assignedBookings: {
        where: {
          scheduledDate: {
            gte: new Date(start.setHours(0, 0, 0, 0)),
            lt: new Date(start.setHours(23, 59, 59, 999)),
          },
          status: {
            notIn: ['CANCELLED', 'NO_SHOW'],
          },
        },
      },
    },
  });

  let availableCount = 0;

  for (const cleaner of cleaners) {
    const result = checkCleanerAvailability(cleaner, start, end, dayOfWeek);
    if (result.available) {
      availableCount++;
    }
  }

  return availableCount;
}

// Helper functions

function getDayName(dayIndex: number): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[dayIndex];
}

function parseTimeToDate(time: string, referenceDate: Date): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(referenceDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Calculate optimal route for a cleaner's daily jobs
 * Returns jobs sorted by optimal travel order
 */
export async function optimizeCleanerRoute(
  cleanerId: string,
  date: Date
): Promise<{ bookings: any[]; totalDistance?: number }> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookings = await prisma.booking.findMany({
    where: {
      assignedCleanerId: cleanerId,
      scheduledDate: {
        gte: startOfDay,
        lt: endOfDay,
      },
      status: {
        notIn: ['CANCELLED', 'NO_SHOW'],
      },
    },
    include: {
      client: true,
      address: true,
    },
    orderBy: {
      scheduledDate: 'asc',
    },
  });

  // For now, return sorted by time
  // TODO: Implement actual route optimization using Google Maps Directions API
  return { bookings };
}

/**
 * Check if a cleaner can take on additional work
 */
export async function canCleanerTakeJob(
  cleanerId: string,
  date: Date,
  duration: number
): Promise<{ canTake: boolean; reason?: string; currentJobs: number }> {
  const cleaner = await prisma.teamMember.findUnique({
    where: { id: cleanerId },
    include: {
      assignedBookings: {
        where: {
          scheduledDate: {
            gte: new Date(date.setHours(0, 0, 0, 0)),
            lt: new Date(date.setHours(23, 59, 59, 999)),
          },
          status: {
            notIn: ['CANCELLED', 'NO_SHOW'],
          },
        },
      },
    },
  });

  if (!cleaner) {
    return { canTake: false, reason: 'Cleaner not found', currentJobs: 0 };
  }

  if (!cleaner.isActive || !cleaner.isAvailable) {
    return { canTake: false, reason: 'Cleaner is not available', currentJobs: 0 };
  }

  const currentJobs = cleaner.assignedBookings.length;

  if (cleaner.maxJobsPerDay && currentJobs >= cleaner.maxJobsPerDay) {
    return {
      canTake: false,
      reason: `Maximum jobs (${cleaner.maxJobsPerDay}) reached for today`,
      currentJobs
    };
  }

  // Calculate total hours scheduled
  const totalMinutes = cleaner.assignedBookings.reduce(
    (sum, b) => sum + b.duration,
    0
  );
  const totalWithNewJob = totalMinutes + duration;

  // Check against preferred hours (convert to minutes)
  if (cleaner.preferredHours && totalWithNewJob > cleaner.preferredHours * 60) {
    return {
      canTake: false,
      reason: `Would exceed preferred hours (${cleaner.preferredHours}h)`,
      currentJobs,
    };
  }

  return { canTake: true, currentJobs };
}
