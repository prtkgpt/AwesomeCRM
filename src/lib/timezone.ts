/**
 * Timezone utilities for AwesomeCRM
 *
 * Multi-tenant timezone support:
 * - All dates are stored in UTC in the database
 * - Dates are displayed in the user's device timezone by default
 * - Functions accept an optional timezone parameter for flexibility
 */

// Fallback timezone for server-side rendering
const FALLBACK_TIMEZONE = 'America/Los_Angeles';

/**
 * Get the user's device timezone
 * Uses the browser's Intl API to detect the timezone
 * Falls back to America/Los_Angeles for server-side rendering
 * @returns IANA timezone identifier (e.g., "America/New_York", "Europe/London")
 */
export function getDeviceTimezone(): string {
  if (typeof window !== 'undefined' && typeof Intl !== 'undefined') {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return FALLBACK_TIMEZONE;
    }
  }
  return FALLBACK_TIMEZONE;
}

/**
 * Get the timezone abbreviation (e.g., "EST", "PST", "GMT")
 * @param date - Date to check for DST
 * @param timezone - IANA timezone identifier (defaults to device timezone)
 * @returns Timezone abbreviation
 */
export function getTimezoneAbbreviation(date: Date | string, timezone?: string): string {
  const tz = timezone || getDeviceTimezone();
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Use Intl to get the timezone abbreviation
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'short',
  });

  const parts = formatter.formatToParts(dateObj);
  const tzPart = parts.find(part => part.type === 'timeZoneName');
  return tzPart?.value || tz;
}

/**
 * Convert a date and time string to UTC, interpreting the input as being in the specified timezone
 * @param dateString - Date string in YYYY-MM-DD format
 * @param timeString - Time string in HH:mm format
 * @param timezone - IANA timezone identifier (defaults to device timezone)
 * @returns ISO string in UTC
 */
export function createDateInTimezone(dateString: string, timeString: string, timezone?: string): string {
  const tz = timezone || getDeviceTimezone();
  const dateTimeString = `${dateString}T${timeString}:00`;

  // Parse as the specified timezone using Intl.DateTimeFormat
  const date = new Date(dateTimeString);

  // Get the offset for the specified timezone at this date
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: tz }));
  const localDate = new Date(date.toLocaleString('en-US'));
  const offset = localDate.getTime() - tzDate.getTime();

  // Adjust the date by the offset to get the correct UTC time
  const adjustedDate = new Date(date.getTime() + offset);

  return adjustedDate.toISOString();
}

/**
 * Format a date to display in the specified timezone
 * @param date - Date object or ISO string
 * @param options - Intl.DateTimeFormat options
 * @param timezone - IANA timezone identifier (defaults to device timezone)
 * @returns Formatted date string
 */
export function formatDateInTimezone(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {},
  timezone?: string
): string {
  const tz = timezone || getDeviceTimezone();
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return dateObj.toLocaleString('en-US', {
    ...options,
    timeZone: tz,
  });
}

/**
 * Format a date for display as date only
 * @param date - Date object or ISO string
 * @param timezone - IANA timezone identifier (defaults to device timezone)
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatLocalDateOnly(date: Date | string, timezone?: string): string {
  return formatDateInTimezone(date, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }, timezone);
}

/**
 * Format a date for display as time only with timezone indicator
 * @param date - Date object or ISO string
 * @param timezone - IANA timezone identifier (defaults to device timezone)
 * @returns Formatted time string (e.g., "10:00 AM EST")
 */
export function formatLocalTimeOnly(date: Date | string, timezone?: string): string {
  const tz = timezone || getDeviceTimezone();
  const timeString = formatDateInTimezone(date, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }, tz);

  const tzAbbr = getTimezoneAbbreviation(date, tz);
  return `${timeString} ${tzAbbr}`;
}

/**
 * Format a date for display with both date and time
 * @param date - Date object or ISO string
 * @param timezone - IANA timezone identifier (defaults to device timezone)
 * @returns Formatted datetime string (e.g., "Jan 15, 2024 at 10:00 AM EST")
 */
export function formatLocalDateTime(date: Date | string, timezone?: string): string {
  const dateString = formatLocalDateOnly(date, timezone);
  const timeString = formatLocalTimeOnly(date, timezone);

  return `${dateString} at ${timeString}`;
}

/**
 * Get the current date in the specified timezone as YYYY-MM-DD format
 * @param timezone - IANA timezone identifier (defaults to device timezone)
 * @returns Date string in YYYY-MM-DD format
 */
export function getCurrentLocalDate(timezone?: string): string {
  const tz = timezone || getDeviceTimezone();
  const now = new Date();
  const localDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));

  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Get the current time in the specified timezone as HH:mm format
 * @param timezone - IANA timezone identifier (defaults to device timezone)
 * @returns Time string in HH:mm format
 */
export function getCurrentLocalTime(timezone?: string): string {
  const tz = timezone || getDeviceTimezone();
  const now = new Date();
  const localDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));

  const hours = String(localDate.getHours()).padStart(2, '0');
  const minutes = String(localDate.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

/**
 * Convert ISO string to date and time components for form inputs
 * @param isoString - ISO date string
 * @param timezone - IANA timezone identifier (defaults to device timezone)
 * @returns Object with date and time strings for form inputs
 */
export function isoToLocalComponents(isoString: string, timezone?: string): { date: string; time: string } {
  const tz = timezone || getDeviceTimezone();
  const dateObj = new Date(isoString);
  const localDate = new Date(dateObj.toLocaleString('en-US', { timeZone: tz }));

  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  const hours = String(localDate.getHours()).padStart(2, '0');
  const minutes = String(localDate.getMinutes()).padStart(2, '0');

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

// ============================================
// Legacy PST functions (for backward compatibility)
// These are deprecated and should be replaced with the new functions
// ============================================

/** @deprecated Use getDeviceTimezone() or pass timezone explicitly */
export const COMPANY_TIMEZONE = 'America/Los_Angeles';

/** @deprecated Use createDateInTimezone() instead */
export function createPSTDate(dateString: string, timeString: string): string {
  return createDateInTimezone(dateString, timeString, COMPANY_TIMEZONE);
}

/** @deprecated Use formatDateInTimezone() instead */
export function formatPSTDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return formatDateInTimezone(date, options, COMPANY_TIMEZONE);
}

/** @deprecated Use formatLocalDateOnly() instead */
export function formatPSTDateOnly(date: Date | string): string {
  return formatLocalDateOnly(date, COMPANY_TIMEZONE);
}

/** @deprecated Use formatLocalTimeOnly() instead */
export function formatPSTTimeOnly(date: Date | string): string {
  return formatLocalTimeOnly(date, COMPANY_TIMEZONE);
}

/** @deprecated Use formatLocalDateTime() instead */
export function formatPSTDateTime(date: Date | string): string {
  return formatLocalDateTime(date, COMPANY_TIMEZONE);
}

/** @deprecated Use getCurrentLocalDate() instead */
export function getCurrentPSTDate(): string {
  return getCurrentLocalDate(COMPANY_TIMEZONE);
}

/** @deprecated Use getCurrentLocalTime() instead */
export function getCurrentPSTTime(): string {
  return getCurrentLocalTime(COMPANY_TIMEZONE);
}

/** @deprecated Use isoToLocalComponents() instead */
export function isoToPSTComponents(isoString: string): { date: string; time: string } {
  return isoToLocalComponents(isoString, COMPANY_TIMEZONE);
}
