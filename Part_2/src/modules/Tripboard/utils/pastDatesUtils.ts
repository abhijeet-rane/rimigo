/**
 * Past-dates helpers for the tripboard.
 *
 * If a trip's itinerary first day is before today, we (a) prompt the user to
 * shift dates via PastDatesTakeover, (b) fetch stay rates against a future
 * window so requests don't error on past dates, and (c) surface the future
 * window in the existing ExploringDatesBanner.
 */

import { formatDateToYMD, formatDateStringToYMD } from '@/utils/dateUtils'
import { STAYS_EXP_PARAMS } from '@/modules/ContentCollection/utils/cityDateFilter'

/** Days from today the rates fallback / shift anchors at. */
export const PAST_DATES_FALLBACK_OFFSET_DAYS = 30

/**
 * True when the itinerary's first day is strictly before today. Day-of-
 * departure (firstDay === today) is treated as "trip starting now" — no
 * modal, no shift. Reads from itinerary days (not preferred_travel_time)
 * so it works on older trips with empty prefs.
 */
export const isItineraryStartedOrPast = (
    days?: Array<{ date?: string | null }> | null,
): boolean => {
    const firstRaw = days?.[0]?.date
    if (!firstRaw) return false
    const firstYmd = formatDateStringToYMD(firstRaw)
    if (!firstYmd) return false
    const todayYmd = formatDateToYMD(new Date()) ?? ''
    return !!todayYmd && firstYmd < todayYmd
}

/**
 * True when the itinerary's LAST day is strictly before today — i.e. the
 * whole trip is over. A trip that has started but not yet ended (last day
 * is today or later) returns false. Gates the past-dates modal, which
 * should only appear once dates have genuinely "passed". The rates
 * fallback keeps using isItineraryStartedOrPast, since mid-trip cities
 * still carry past dates that would error on rates lookups.
 */
export const isItineraryFullyPast = (
    days?: Array<{ date?: string | null }> | null,
): boolean => {
    const lastRaw = days?.[days.length - 1]?.date
    if (!lastRaw) return false
    const lastYmd = formatDateStringToYMD(lastRaw)
    if (!lastYmd) return false
    const todayYmd = formatDateToYMD(new Date()) ?? ''
    return !!todayYmd && lastYmd < todayYmd
}

/** Future window: `today + offset` → `+ tripLengthDays` (min 1). */
export const computePastDatesFallbackWindow = (
    tripLengthDays: number,
    offsetDays = PAST_DATES_FALLBACK_OFFSET_DAYS,
): { checkIn: string; checkOut: string } => {
    const checkInDate = new Date()
    checkInDate.setHours(0, 0, 0, 0)
    checkInDate.setDate(checkInDate.getDate() + offsetDays)
    const checkOutDate = new Date(checkInDate)
    checkOutDate.setDate(checkOutDate.getDate() + Math.max(1, tripLengthDays || 1))
    return {
        checkIn: formatDateToYMD(checkInDate) ?? '',
        checkOut: formatDateToYMD(checkOutDate) ?? '',
    }
}

/** Day count between two YMD strings (start inclusive, end exclusive). */
export const daysBetweenYmd = (startYmd: string, endYmd: string): number => {
    if (!startYmd || !endYmd) return 0
    const parse = (s: string) => {
        const [y, m, d] = s.split('-').map((v) => parseInt(v, 10))
        return new Date(y, (m || 1) - 1, d || 1).getTime()
    }
    const start = parse(startYmd)
    const end = parse(endYmd)
    if (Number.isNaN(start) || Number.isNaN(end)) return 0
    return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)))
}

/**
 * Write `stays_exp_*` URL params so resolveEffectiveStaysDates serves the
 * fallback window to the explore rates call and ExploringDatesBanner shows.
 * The carousel chips keep showing original itinerary dates.
 */
export const writeStaysExpFallbackParams = (
    next: URLSearchParams,
    fallback: { checkIn: string; checkOut: string },
): void => {
    if (!fallback.checkIn || !fallback.checkOut) return
    next.set(STAYS_EXP_PARAMS.checkIn, fallback.checkIn)
    next.set(STAYS_EXP_PARAMS.checkOut, fallback.checkOut)
}

const shiftYmd = (ymd: string, days: number): string => {
    if (!ymd) return ymd
    const [y, m, d] = ymd.split('-').map((v) => parseInt(v, 10))
    const dt = new Date(y, (m || 1) - 1, d || 1)
    dt.setDate(dt.getDate() + days)
    return formatDateToYMD(dt) ?? ymd
}

/**
 * Shift a list of city windows forward so the earliest checkIn lands at
 * `today + offsetDays`. Per-window length and inter-city gaps are preserved.
 * Used for per-stay rates lookups when the itinerary is past — without this,
 * useStayPrices queries with past dates and every stay returns "no rates".
 */
export const shiftItineraryCitiesToFuture = <
    T extends { checkIn: string; checkOut: string },
>(
    cities: T[] | null | undefined,
    offsetDays = PAST_DATES_FALLBACK_OFFSET_DAYS,
): T[] | null | undefined => {
    if (!cities || cities.length === 0) return cities
    const earliest = cities.reduce<string | null>((min, c) => {
        if (!c.checkIn) return min
        return !min || c.checkIn < min ? c.checkIn : min
    }, null)
    if (!earliest) return cities
    const target = new Date()
    target.setHours(0, 0, 0, 0)
    target.setDate(target.getDate() + offsetDays)
    const targetYmd = formatDateToYMD(target) ?? ''
    if (!targetYmd) return cities
    const shiftDays = daysBetweenYmd(earliest, targetYmd)
    if (shiftDays <= 0) return cities
    return cities.map((c) => ({
        ...c,
        checkIn: c.checkIn ? shiftYmd(c.checkIn, shiftDays) : c.checkIn,
        checkOut: c.checkOut ? shiftYmd(c.checkOut, shiftDays) : c.checkOut,
    }))
}
