/**
 * Timezone utilities for AwesomeCRM
 * All bookings are scheduled in PST (Pacific Standard Time) / PDT (Pacific Daylight Time)
 * to avoid confusion across team members in different timezones.
 */

// PST timezone identifier
export const COMPANY_TIMEZONE = 'America/Los_Angeles';

/**
 * Convert a date and time string to PST and return as ISO string
 * The input is ALWAYS interpreted as PST time, regardless of user's local timezone.
 * @param dateString - Date string in YYYY-MM-DD format
 * @param timeString - Time string in HH:mm format
 * @returns ISO string representing the date/time in UTC (converted from PST input)
 * @example createPSTDate("2026-01-20", "10:00") => "2026-01-20T18:00:00.000Z" (10 AM PST = 6 PM UTC)
 */
export function createPSTDate(dateString: string, timeString: string): string {
  // Parse the date and time components directly (no timezone interpretation)
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);

  // Create a date representing "what time it should be" in PST
  // We'll use a reference date to calculate the PST offset
  const referenceDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  // Get PST offset for this date (handles DST automatically)
  // PST is UTC-8, PDT is UTC-7
  const pstOffsetString = referenceDate.toLocaleString('en-US', {
    timeZone: COMPANY_TIMEZONE,
    timeZoneName: 'shortOffset',
  });

  // Extract offset from string like "1/20/2026, 4:00:00 AM GMT-8"
  const offsetMatch = pstOffsetString.match(/GMT([+-]\d+)/);
  const offsetHours = offsetMatch ? parseInt(offsetMatch[1]) : -8;

  // Create UTC date: if user wants 10:00 PST and PST is UTC-8, we need 10:00 + 8 = 18:00 UTC
  const utcDate = new Date(Date.UTC(year, month - 1, day, hours - offsetHours, minutes, 0));

  return utcDate.toISOString();
}

/**
 * Format a date to display in PST timezone
 * @param date - Date object or ISO string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string in PST
 */
export function formatPSTDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return dateObj.toLocaleString('en-US', {
    ...options,
    timeZone: COMPANY_TIMEZONE,
  });
}

/**
 * Format a date for display as date only in PST
 * @param date - Date object or ISO string
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatPSTDateOnly(date: Date | string): string {
  return formatPSTDate(date, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date for display as time only in PST
 * @param date - Date object or ISO string
 * @returns Formatted time string (e.g., "10:00 AM PST")
 */
export function formatPSTTimeOnly(date: Date | string): string {
  const timeString = formatPSTDate(date, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Add PST/PDT indicator
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const isDST = isDaylightSavingTime(dateObj);
  const tzAbbr = isDST ? 'PDT' : 'PST';

  return `${timeString} ${tzAbbr}`;
}

/**
 * Format a date for display with both date and time in PST
 * @param date - Date object or ISO string
 * @returns Formatted datetime string (e.g., "Jan 15, 2024 at 10:00 AM PST")
 */
export function formatPSTDateTime(date: Date | string): string {
  const dateString = formatPSTDateOnly(date);
  const timeString = formatPSTTimeOnly(date);

  return `${dateString} at ${timeString}`;
}

/**
 * Check if a date is in daylight saving time in PST timezone
 * @param date - Date object
 * @returns true if DST is active
 */
function isDaylightSavingTime(date: Date): boolean {
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);

  const janOffset = jan.getTimezoneOffset();
  const julOffset = jul.getTimezoneOffset();

  const stdOffset = Math.max(janOffset, julOffset);

  return date.getTimezoneOffset() < stdOffset;
}

/**
 * Get the current date in PST as YYYY-MM-DD format
 * @returns Date string in YYYY-MM-DD format
 */
export function getCurrentPSTDate(): string {
  const now = new Date();
  const pstDate = new Date(now.toLocaleString('en-US', { timeZone: COMPANY_TIMEZONE }));

  const year = pstDate.getFullYear();
  const month = String(pstDate.getMonth() + 1).padStart(2, '0');
  const day = String(pstDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Get the current time in PST as HH:mm format
 * @returns Time string in HH:mm format
 */
export function getCurrentPSTTime(): string {
  const now = new Date();
  const pstDate = new Date(now.toLocaleString('en-US', { timeZone: COMPANY_TIMEZONE }));

  const hours = String(pstDate.getHours()).padStart(2, '0');
  const minutes = String(pstDate.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

/**
 * Convert ISO string to PST date and time components for form inputs
 * @param isoString - ISO date string
 * @returns Object with date and time strings for form inputs
 */
export function isoToPSTComponents(isoString: string): { date: string; time: string } {
  const dateObj = new Date(isoString);
  const pstDate = new Date(dateObj.toLocaleString('en-US', { timeZone: COMPANY_TIMEZONE }));

  const year = pstDate.getFullYear();
  const month = String(pstDate.getMonth() + 1).padStart(2, '0');
  const day = String(pstDate.getDate()).padStart(2, '0');
  const hours = String(pstDate.getHours()).padStart(2, '0');
  const minutes = String(pstDate.getMinutes()).padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}
