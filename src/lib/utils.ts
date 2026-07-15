import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a date string and optionally expand it to start/end of day.
 * Used for date range queries in accounting and reporting APIs.
 *
 * @param val - Date string (YYYY-MM-DD or any valid date string)
 * @param endOfDay - If true, returns 23:59:59.999; if false, returns 00:00:00.000
 */
export function parseRangeDate(val: string, endOfDay: boolean): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return endOfDay ? new Date(`${val}T23:59:59.999`) : new Date(`${val}T00:00:00`);
  }
  return new Date(val);
}
