import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, addDays, addWeeks, addMonths, isAfter, isBefore, parse } from "date-fns";
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

// Company timezone - used for parsing input dates (e.g., from booking forms)
// Dates are stored in UTC and displayed in each user's local timezone
const COMPANY_TIMEZONE = 'America/Los_Angeles'; // PST/PDT

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
 * Format date for display in PST timezone
 * All dates shown in PST regardless of user location
 * Example: 10 AM PST job shows as "10:00 AM PST" for everyone
 */
export function formatDate(date: Date | string, formatStr: string = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  // Convert to PST timezone for display
  const pstString = d.toLocaleString('en-US', {
    timeZone: COMPANY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Parse the PST string back to a Date object for formatting
  const [datePart, timePart] = pstString.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');
  const pstDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day),
                           parseInt(hour), parseInt(minute), parseInt(second));

  return format(pstDate, formatStr);
}

/**
 * Format date and time for display in PST timezone
 * All bookings shown in PST regardless of user location
 * Example: 10 AM PST job shows as "10:00 AM PST" for everyone
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  // Convert to PST timezone for display
  const pstString = d.toLocaleString('en-US', {
    timeZone: COMPANY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Parse the PST string back to a Date object for formatting
  const [datePart, timePart] = pstString.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');
  const pstDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day),
                           parseInt(hour), parseInt(minute), parseInt(second));

  const formatted = format(pstDate, 'MMM d, yyyy h:mm a');

  // Add PST/PDT indicator
  const monthNum = pstDate.getMonth();
  // DST runs roughly March-November in PST
  const isDST = monthNum >= 2 && monthNum <= 10;
  const tzAbbr = isDST ? 'PDT' : 'PST';

  return `${formatted} ${tzAbbr}`;
}

/**
 * Format time only in PST timezone
 * All times shown in PST regardless of user location
 * Example: 10 AM PST job shows as "10:00 AM PST" for everyone
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  // Convert to PST timezone for display
  const pstString = d.toLocaleString('en-US', {
    timeZone: COMPANY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Parse the PST string back to a Date object for formatting
  const [datePart, timePart] = pstString.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');
  const pstDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day),
                           parseInt(hour), parseInt(minute), parseInt(second));

  const formatted = format(pstDate, 'h:mm a');

  // Add PST/PDT indicator
  const monthNum = pstDate.getMonth();
  // DST runs roughly March-November in PST
  const isDST = monthNum >= 2 && monthNum <= 10;
  const tzAbbr = isDST ? 'PDT' : 'PST';

  return `${formatted} ${tzAbbr}`;
}

/**
 * Parse a date+time string as if it's in company timezone (PST)
 * Converts PST time to UTC for database storage
 * @param dateStr - Date string in format "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss"
 * @returns Date object in UTC
 * @example parseDateInCompanyTZ("2026-01-20T10:00") => Date representing 10 AM PST (6 PM UTC)
 */
export function parseDateInCompanyTZ(dateStr: string): Date {
  // Normalize the date string format
  let normalizedStr = dateStr;

  // If it's just a date (YYYY-MM-DD), append midnight
  if (normalizedStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    normalizedStr = `${normalizedStr}T00:00:00`;
  }
  // If it's missing seconds (YYYY-MM-DDTHH:mm), append :00
  else if (normalizedStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
    normalizedStr = `${normalizedStr}:00`;
  }

  // Use date-fns parse to extract date components WITHOUT timezone interpretation
  // This creates a Date where the components match the input string
  const parsedDate = parse(normalizedStr, "yyyy-MM-dd'T'HH:mm:ss", new Date(0));

  // fromZonedTime treats the input Date's components as being in the specified timezone
  // and returns the equivalent UTC time
  const utcDate = fromZonedTime(parsedDate, COMPANY_TIMEZONE);
  return utcDate;
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
