/**
 * Timezone utilities for converting UTC timestamps to user's local timezone
 */

/**
 * Get the user's current timezone
 */
export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch (error) {
    // Fallback to UTC if timezone detection fails
    console.warn('Could not detect user timezone, falling back to UTC')
    return 'UTC'
  }
}

/**
 * Convert UTC timestamp to user's local timezone
 */
export function convertUTCToUserTimezone(utcTimestamp: string | Date, userTimezone?: string): Date {
  const date = new Date(utcTimestamp)
  const timezone = userTimezone || getUserTimezone()
  
  // Create formatter for user's timezone
  const userFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  // Get the timezone components
  const parts = userFormatter.formatToParts(date)
  const localDateString = `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}T${parts.find(p => p.type === 'hour')?.value}:${parts.find(p => p.type === 'minute')?.value}:${parts.find(p => p.type === 'second')?.value}`
  
  return new Date(localDateString)
}

/**
 * Convert UTC timestamp to Eastern Time (for backward compatibility)
 * Handles both EST (UTC-5) and EDT (UTC-4) automatically
 */
export function convertUTCToEastern(utcTimestamp: string | Date): Date {
  return convertUTCToUserTimezone(utcTimestamp, 'America/New_York')
}

/**
 * Format UTC timestamp as user's local time string
 */
export function formatAsUserLocalTime(
  utcTimestamp: string | Date, 
  options: {
    includeDate?: boolean
    includeTime?: boolean
    includeSeconds?: boolean
    use12Hour?: boolean
    userTimezone?: string
    includeTimezone?: boolean
  } = {}
): string {
  const {
    includeDate = true,
    includeTime = true,
    includeSeconds = false,
    use12Hour = true,
    userTimezone,
    includeTimezone = false
  } = options
  
  const date = new Date(utcTimestamp)
  const timezone = userTimezone || getUserTimezone()
  
  const formatOptions: Intl.DateTimeFormatOptions = {
    timeZone: timezone
  }
  
  if (includeDate) {
    formatOptions.year = 'numeric'
    formatOptions.month = 'short'
    formatOptions.day = 'numeric'
  }
  
  if (includeTime) {
    formatOptions.hour = '2-digit'
    formatOptions.minute = '2-digit'
    formatOptions.hour12 = use12Hour
    
    if (includeSeconds) {
      formatOptions.second = '2-digit'
    }
    
    if (includeTimezone) {
      formatOptions.timeZoneName = 'short'
    }
  }
  
  return new Intl.DateTimeFormat('en-US', formatOptions).format(date)
}

/**
 * Format UTC timestamp as Eastern time string (for backward compatibility)
 */
export function formatAsEasternTime(
  utcTimestamp: string | Date, 
  options: {
    includeDate?: boolean
    includeTime?: boolean
    includeSeconds?: boolean
    use12Hour?: boolean
  } = {}
): string {
  return formatAsUserLocalTime(utcTimestamp, {
    ...options,
    userTimezone: 'America/New_York'
  })
}

/**
 * Get timezone abbreviation for user's timezone
 */
export function getUserTimezoneAbbr(date: Date = new Date(), userTimezone?: string): string {
  const timezone = userTimezone || getUserTimezone()
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short'
  })
  
  const parts = formatter.formatToParts(date)
  return parts.find(part => part.type === 'timeZoneName')?.value || 'UTC'
}

/**
 * Get timezone abbreviation (EST/EDT) for Eastern time (for backward compatibility)
 */
export function getEasternTimezoneAbbr(date: Date = new Date()): string {
  return getUserTimezoneAbbr(date, 'America/New_York')
}

/**
 * Check if date is in Daylight Saving Time for user's timezone
 */
export function isUserTimezoneDST(date: Date = new Date(), userTimezone?: string): boolean {
  const timezone = userTimezone || getUserTimezone()
  
  // Get timezone offset in January (standard time) and July (daylight time)
  const jan = new Date(date.getFullYear(), 0, 1)
  const jul = new Date(date.getFullYear(), 6, 1)
  
  const janOffset = getTimezoneOffset(jan, timezone)
  const julOffset = getTimezoneOffset(jul, timezone)
  const currentOffset = getTimezoneOffset(date, timezone)
  
  // If current offset is different from standard time offset, we're in DST
  return currentOffset !== Math.max(janOffset, julOffset)
}

/**
 * Check if date is in Daylight Saving Time (EDT) for Eastern timezone
 */
export function isEasternDaylightTime(date: Date = new Date()): boolean {
  return isUserTimezoneDST(date, 'America/New_York')
}

/**
 * Helper function to get timezone offset for a specific date and timezone
 */
function getTimezoneOffset(date: Date, timezone: string): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
  return (utcDate.getTime() - localDate.getTime()) / (1000 * 60)
} 