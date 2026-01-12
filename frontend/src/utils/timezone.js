/**
 * Frontend timezone utilities
 * Business operates in America/Bogota timezone (Jamaica timezone, UTC-5)
 */

const BUSINESS_TIMEZONE = 'America/Bogota';

/**
 * Get current date in business timezone (YYYY-MM-DD format)
 * @param {Date|string} date - Optional date to convert (defaults to now)
 * @returns {string} Date string in YYYY-MM-DD format
 */
export function getBusinessDate(date = null) {
  const dateObj = date ? new Date(date) : new Date();
  
  // Convert to business timezone and format as YYYY-MM-DD
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
  if (!date) return 'N/A';
  
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
 * Format date only (no time) in business timezone
 * @param {Date|string} date - UTC date to format
 * @returns {string} Formatted date string
 */
export function formatBusinessDate(date) {
  return formatBusinessDateTime(date, {
    hour: undefined,
    minute: undefined,
    second: undefined,
    hour12: undefined
  });
}

