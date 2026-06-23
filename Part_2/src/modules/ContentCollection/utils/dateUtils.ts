/**
 * Compute a "Day N" label from a YYYY-MM-DD date relative to a trip start date.
 * Returns "Day 1", "Day 2", etc. For a range, returns "Day 1 - Day 3".
 */
export const formatDayLabel = (
    startDate: string | null | undefined,
    endDate: string | null | undefined,
    tripStartDate: string | null | undefined
): string => {
    if (!tripStartDate) return 'Day 1'

    const parseYMD = (s: string): Date => {
        const [y, m, d] = s.split('-').map(Number)
        return new Date(y, (m || 1) - 1, d || 1)
    }
    const tripStart = parseYMD(tripStartDate)

    if (!startDate) return 'Day 1'
    const start = parseYMD(startDate)
    const startDay = Math.max(1, Math.floor((start.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1)

    if (!endDate || endDate === startDate) return `Day ${startDay}`

    const end = parseYMD(endDate)
    const endDay = Math.max(startDay, Math.floor((end.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1)

    if (endDay === startDay) return `Day ${startDay}`
    return `Day ${startDay} - Day ${endDay}`
}

/**
 * Compute the earliest start_date (YYYY-MM-DD) from a collection of section metadata maps.
 * Used as the "trip start" for Day N computation.
 */
export const computeTripStartDate = (
    sectionMetadataMap: Map<string, { [key: string]: unknown } | undefined> | undefined
): string | null => {
    if (!sectionMetadataMap) return null
    let earliest: string | null = null
    sectionMetadataMap.forEach((metadata) => {
        const startDate = (metadata as { start_date?: string | null })?.start_date
        if (startDate && typeof startDate === 'string') {
            const ymd = startDate.split('T')[0]
            if (!earliest || ymd < earliest) earliest = ymd
        }
    })
    return earliest
}

/**
 * Format date heading from start_date and end_date
 * If no dates are present, show current date
 */
export const formatDateHeading = (startDate: string | null | undefined, endDate: string | null | undefined): string => {
    const formatDate = (dateStr: string): string => {
        try {
            const date = new Date(dateStr)
            if (isNaN(date.getTime())) return dateStr
            return date.toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            })
        } catch {
            return dateStr
        }
    }

    // If both dates are present, show range
    if (startDate && endDate) {
        return `${formatDate(startDate)} - ${formatDate(endDate)}`
    }
    // If only start date is present
    else if (startDate) {
        return formatDate(startDate)
    }
    // If only end date is present
    else if (endDate) {
        return formatDate(endDate)
    }
    // If no dates are present, show current date
    else {
        const today = new Date()
        return formatDate(today.toISOString().split('T')[0])
    }
}

