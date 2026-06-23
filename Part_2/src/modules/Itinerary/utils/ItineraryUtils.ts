// src/utils/dateUtils.ts

export const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date

    const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }

    return d.toLocaleDateString('en-US', options)
}

export const getMonthLabel = (date: Date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

export const getRangeLabel = (start: Date, end: Date) => `${formatDate(start)} – ${formatDate(end)}`
// src/utils/dateDisplay.ts

export const getDayNameShortUpper = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()

export const getMonthNameShortUpper = (date: Date) => date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()

export const getDayOfMonth = (date: Date) => date.getDate()

export const getDateCardParts = (date: Date) => ({
    dayName: getDayNameShortUpper(date),
    monthName: getMonthNameShortUpper(date),
    day: getDayOfMonth(date)
})