/**
 * Timezone utilities for business operations
 * Business operates in America/Bogota timezone (Jamaica timezone, UTC-5)
 */

const BUSINESS_TIMEZONE = 'America/Bogota';

/**
 * Get current date in business timezone (YYYY-MM-DD format)
 * Used for blob storage paths and "today" operations
 * @param {Date|string} date - Optional date to convert (defaults to now)
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getBusinessDate(date = null) {
  const dateObj = date ? new Date(date) : new Date();
  
  // Convert to business timezone and format as YYYY-MM-DD
  // Using 'en-CA' locale gives us YYYY-MM-DD format directly
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  return formatter.format(dateObj);
}

/**
 * Format a UTC date/time to business timezone for display
 * @param {Date|string} date - UTC date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string in business timezone
 */
export function formatBusinessDateTime(date, options = {}) {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  const defaultOptions = {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    ...options
  };
  
  return new Intl.DateTimeFormat('en-US', defaultOptions).format(dateObj);
}

/**
 * Get start and end of business day (in UTC) for a given date in business timezone
 * Useful for querying "today's" records from database
 * Note: America/Bogota is UTC-5 (no DST), so midnight Bogota = 05:00 UTC
 * @param {string} date - Date string in YYYY-MM-DD format (business timezone), defaults to today
 * @returns {object} { start: Date, end: Date } in UTC
 */
export function getBusinessDayRange(date = null) {
  const businessDate = date || getBusinessDate();
  const [year, month, day] = businessDate.split('-').map(Number);
  
  // America/Bogota is UTC-5 (no daylight saving time)
  // Midnight in Bogota = 05:00 UTC
  const startUTC = new Date(Date.UTC(year, month - 1, day, 5, 0, 0));
  const endUTC = new Date(startUTC);
  endUTC.setUTCDate(endUTC.getUTCDate() + 1);
  
  return { start: startUTC, end: endUTC };
}

