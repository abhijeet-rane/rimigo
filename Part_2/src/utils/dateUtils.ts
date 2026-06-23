/**
 * Check if a date string (YYYY-MM-DD format) is in the past compared to current date
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns true if the date is in the past (before today), false otherwise
 */
export const isPastDate = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false

    try {
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) return false

        // Set time to midnight for accurate comparison
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        date.setHours(0, 0, 0, 0)

        // Return true if date is before today
        return date < today
    } catch {
        return false
    }
}

/**
 * Format a Date object to YYYY-MM-DD string format
 * @param date - Date object to format (can be null)
 * @returns Date string in YYYY-MM-DD format, or null if date is invalid or null
 */
export const formatDateToYMD = (date: Date | null): string | null => {
    if (!date || isNaN(date.getTime())) return null
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

/**
 * Format a date string to YYYY-MM-DD format
 * @param dateStr - Date string (any format) or Date object
 * @returns Date string in YYYY-MM-DD format, or null if date is invalid
 */
export const formatDateStringToYMD = (dateStr: string | Date | null | undefined): string | null => {
    if (!dateStr) return null
    
    try {
        const date = dateStr instanceof Date ? dateStr : new Date(dateStr)
        return formatDateToYMD(date)
    } catch {
        return null
    }
}

/**
 * Format a Date object as an ISO string anchored at 12:00 UTC for the date's
 * local calendar day. `.toISOString()` on a local-midnight Date slips one day
 * back in any positive UTC offset (IST: 2026-05-14 → 2026-05-13T18:30Z); anchoring
 * at noon UTC keeps the calendar day stable across ±12h timezone shifts when
 * the backend extracts `.date()` from the resulting string.
 */
export const toNoonUtcIso = (date: Date | null | undefined): string | null => {
    if (!date || isNaN(date.getTime())) return null
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}T12:00:00Z`
}

/**
 * Get tomorrow's date in YYYY-MM-DD format
 * @returns Date string in YYYY-MM-DD format for tomorrow
 */
export const getTomorrowDate = (): string => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    return formatDateToYMD(tomorrow) || ''
}

/**
 * Get day after tomorrow's date in YYYY-MM-DD format
 * @returns Date string in YYYY-MM-DD format for day after tomorrow
 */
export const getDayAfterTomorrowDate = (): string => {
    const dayAfter = new Date()
    dayAfter.setDate(dayAfter.getDate() + 2)
    dayAfter.setHours(0, 0, 0, 0)
    return formatDateToYMD(dayAfter) || ''
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
const MONTHS_LONG = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
] as const

/** "13 Jun". Returns the input on invalid dates. */
export const formatShortMonthDay = (iso: string): string => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

/** "13 June 2025". Returns the input on invalid dates. */
export const formatLongMonthDayYear = (iso: string): string => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
}
