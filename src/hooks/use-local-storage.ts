'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for syncing state with localStorage
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // Get initial value from localStorage or use provided initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage when state changes
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove from localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook for storing recent searches
 */
export function useRecentSearches(key: string, maxItems: number = 5) {
  const [searches, setSearches, clearSearches] = useLocalStorage<string[]>(key, []);

  const addSearch = useCallback(
    (term: string) => {
      if (!term.trim()) return;

      setSearches((prev) => {
        const filtered = prev.filter((s) => s.toLowerCase() !== term.toLowerCase());
        return [term, ...filtered].slice(0, maxItems);
      });
    },
    [setSearches, maxItems]
  );

  const removeSearch = useCallback(
    (term: string) => {
      setSearches((prev) => prev.filter((s) => s !== term));
    },
    [setSearches]
  );

  return {
    searches,
    addSearch,
    removeSearch,
    clearSearches,
  };
}

/**
 * Hook for storing user preferences
 */
export function usePreferences<T extends Record<string, any>>(
  key: string,
  defaultPreferences: T
) {
  const [preferences, setPreferences, resetPreferences] = useLocalStorage<T>(
    key,
    defaultPreferences
  );

  const updatePreference = useCallback(
    <K extends keyof T>(prefKey: K, value: T[K]) => {
      setPreferences((prev) => ({
        ...prev,
        [prefKey]: value,
      }));
    },
    [setPreferences]
  );

  return {
    preferences,
    setPreferences,
    updatePreference,
    resetPreferences,
  };
}
