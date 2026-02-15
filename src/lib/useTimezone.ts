'use client';

import { useState, useEffect } from 'react';
import { getDeviceTimezone, getTimezoneAbbreviation } from './timezone';

/**
 * React hook for accessing device timezone information
 * Handles hydration correctly by starting with a fallback and updating after mount
 */
export function useTimezone() {
  const [timezone, setTimezone] = useState<string>('America/Los_Angeles');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Only run on client side after hydration
    setTimezone(getDeviceTimezone());
    setIsClient(true);
  }, []);

  /**
   * Get the timezone abbreviation for a given date
   */
  const getAbbreviation = (date: Date | string = new Date()) => {
    return getTimezoneAbbreviation(date, timezone);
  };

  return {
    /**
     * The user's device timezone (IANA format, e.g., "America/New_York")
     */
    timezone,

    /**
     * Whether we're on the client side (useful for conditional rendering)
     */
    isClient,

    /**
     * Get timezone abbreviation for a date (e.g., "EST", "PST")
     */
    getAbbreviation,
  };
}
