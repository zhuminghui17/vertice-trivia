'use client'

import { useState, useEffect } from 'react'
import { 
  getUserTimezone, 
  formatAsUserLocalTime, 
  getUserTimezoneAbbr 
} from '@/lib/timezone'

export function useUserTimezone() {
  const [userTimezone, setUserTimezone] = useState<string>('UTC')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get user's timezone on client side only
    const timezone = getUserTimezone()
    setUserTimezone(timezone)
    setIsLoading(false)
  }, [])

  // Helper function to format timestamps with user's timezone
  const formatTimestamp = (
    timestamp: string | Date,
    options?: {
      includeDate?: boolean
      includeTime?: boolean
      includeSeconds?: boolean
      use12Hour?: boolean
      includeTimezone?: boolean
    }
  ) => {
    return formatAsUserLocalTime(timestamp, {
      ...options,
      userTimezone
    })
  }

  // Get timezone abbreviation for user
  const getTimezoneAbbr = (date?: Date) => {
    return getUserTimezoneAbbr(date, userTimezone)
  }

  return {
    userTimezone,
    isLoading,
    formatTimestamp,
    getTimezoneAbbr
  }
} 