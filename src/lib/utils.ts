import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, addDays, addWeeks, addMonths, isAfter, isBefore } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  return phone;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string, formatStr: string = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, formatStr);
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'MMM d, yyyy h:mm a');
}

/**
 * Format time only
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'h:mm a');
}

/**
 * Format duration in minutes to human-readable format
 * Examples: 30 → "30 min", 60 → "1 hr", 90 → "1 hr 30 min", 120 → "2 hrs"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hr' : `${hours} hrs`;
  }

  const hourText = hours === 1 ? '1 hr' : `${hours} hrs`;
  return `${hourText} ${remainingMinutes} min`;
}

/**
 * Generate recurring booking dates
 */
export function generateRecurringDates(
  startDate: Date,
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY',
  endDate?: Date,
  maxOccurrences: number = 52 // Default to 1 year of weekly bookings
): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);
  let count = 0;

  const addInterval = (date: Date): Date => {
    switch (frequency) {
      case 'WEEKLY':
        return addWeeks(date, 1);
      case 'BIWEEKLY':
        return addWeeks(date, 2);
      case 'MONTHLY':
        return addMonths(date, 1);
      default:
        return date;
    }
  };

  while (count < maxOccurrences) {
    currentDate = addInterval(currentDate);

    if (endDate && isAfter(currentDate, endDate)) {
      break;
    }

    dates.push(new Date(currentDate));
    count++;
  }

  return dates;
}

/**
 * Check if two time slots overlap
 */
export function doTimeSlotsOverlap(
  start1: Date,
  duration1: number, // in minutes
  start2: Date,
  duration2: number
): boolean {
  const end1 = new Date(start1.getTime() + duration1 * 60000);
  const end2 = new Date(start2.getTime() + duration2 * 60000);

  return (
    (start1 < end2 && start1 >= start2) ||
    (start2 < end1 && start2 >= start1) ||
    (start1 <= start2 && end1 >= end2) ||
    (start2 <= start1 && end2 >= end1)
  );
}

/**
 * Get week boundaries for a given date
 */
export function getWeekBoundaries(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay()); // Sunday

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Get day boundaries
 */
export function getDayBoundaries(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate US phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || cleaned.length === 11;
}

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  return phone;
}
