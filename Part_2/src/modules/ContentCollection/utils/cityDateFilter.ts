/**
 * City-Date Filter Utilities
 *
 * Centralizes all logic for:
 * - Extracting city ID from group keys
 * - Computing fallback dates per page type
 * - Correcting dates with fallback tracking
 *
 * Used by StaysTab, ExperienceTab, and parent pages
 * (ViewContentCollection, TripboardPage, TravelerCollectionDetailsPage).
 */

import { isPastDate, getTomorrowDate, formatDateStringToYMD, formatDateToYMD } from '@/utils/dateUtils'

// ── Types ────────────────────────────────────────────────────────────

/**
 * Controls how fallback dates are computed when metadata dates are missing or past.
 * - 'public'   : ViewContentCollection (public tripboards) — fallback = today + 30 days
 * - 'traveler' : TravelerCollectionDetailsPage — fallback = tomorrow
 * - 'tripboard': TripboardPage — fallback = tomorrow
 */
export type FallbackMode = 'public' | 'traveler' | 'tripboard'

export interface FallbackDateInfo {
    checkIn: string
    checkOut: string
    /** true if dates were generated from fallback (not from actual metadata) */
    isFallback: boolean
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Add N days to a YYYY-MM-DD string. Returns YYYY-MM-DD.
 */
function addDaysYMD(ymd: string, days: number): string {
    const [y, m, d] = ymd.split('-').map((v) => parseInt(v, 10))
    const dt = new Date(y, (m || 1) - 1, d || 1)
    dt.setDate(dt.getDate() + days)
    return formatDateToYMD(dt) || ''
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Extract the cityId portion from a group key.
 * Group key format: "cityId::dateLabel" (e.g. "67a31ecc::Mar 4 - Mar 6")
 */
export function getCityIdFromGroupKey(groupKey: string): string {
    return groupKey.split('::')[0]
}

/**
 * Get fallback check-in and check-out dates based on page type.
 * All page types use today + 30 days for stays so hotel rates are always available.
 */
export function getFallbackDates(_mode: FallbackMode): FallbackDateInfo {
    const today = new Date()
    const offset = 30
    const checkInDate = new Date(today)
    checkInDate.setDate(checkInDate.getDate() + offset)
    const checkIn = formatDateToYMD(checkInDate) || getTomorrowDate()
    const checkOut = addDaysYMD(checkIn, 1)
    return { checkIn, checkOut, isFallback: true }
}

/**
 * Compute corrected check-in/check-out dates from raw metadata values.
 * Applies fallback logic based on FallbackMode when dates are missing or in the past.
 * Returns an `isFallback` flag so the UI can show "approximate dates" messages.
 */
export function getCorrectedDatesWithFallback(
    rawStart: string | null | undefined,
    rawEnd: string | null | undefined,
    mode: FallbackMode
): FallbackDateInfo {
    const fallback = getFallbackDates(mode)

    // Public collections: a visitor has no relationship to the creator's saved
    // travel dates, so stays always use today + 30 (everywhere on the public
    // Stays tab — card chips, grouping headers, hotel detail page URLs).
    if (mode === 'public') {
        return fallback
    }

    let isFallback = false

    // Parse raw start date
    const parsedStart = rawStart ? formatDateStringToYMD(rawStart) : undefined

    // Determine check-in: use parsed start if valid and not past, else fallback
    let checkIn: string
    if (parsedStart && !isPastDate(parsedStart)) {
        checkIn = parsedStart
    } else {
        checkIn = fallback.checkIn
        isFallback = true
    }

    // Parse raw end date
    const parsedEnd = rawEnd ? formatDateStringToYMD(rawEnd) : undefined

    // Determine check-out: use parsed end if valid, not past, and after check-in
    let checkOut: string
    if (parsedEnd && !isPastDate(parsedEnd) && parsedEnd > checkIn) {
        checkOut = parsedEnd
    } else {
        checkOut = addDaysYMD(checkIn, 1)
        isFallback = true
    }

    return { checkIn, checkOut, isFallback }
}

// ── URL param helpers ────────────────────────────────────────────────
// Instead of storing the raw group key (e.g. "cityId::Mar 4 - Mar 6") in the URL
// which gets ugly when URL-encoded, we store clean separate params:
//   stays_city, stays_checkin, stays_checkout
//   act_city, act_checkin, act_checkout
// The group key is reconstructed internally from these params.

/** URL param names for stays tab */
export const STAYS_PARAMS = { city: 'stays_city', checkIn: 'stays_checkin', checkOut: 'stays_checkout' } as const
/** URL param names for activities tab */
export const ACTIVITIES_PARAMS = { city: 'act_city', checkIn: 'act_checkin', checkOut: 'act_checkout' } as const

// Exploration-date overlay (tripboard only). These exist independently of
// stays_checkin/stays_checkout so the city+date chip can keep mirroring
// itinerary dates while the user explores other dates downstream
// (rates, viewport, shortlist, add-to-itinerary). When unset, all
// downstream consumers fall back to the itinerary window for stays_city.
export const STAYS_EXP_PARAMS = { checkIn: 'stays_exp_checkin', checkOut: 'stays_exp_checkout', window: 'stays_window' } as const

export type ItinWindowLite = { id: string; checkIn: string; checkOut: string }

/**
 * Pick the itinerary window for a given cityId, optionally disambiguated by
 * a window index (for return trips A → B → A producing two A windows).
 * Returns null when no window matches.
 */
export function pickItineraryWindow(
    itineraryCities: ItinWindowLite[] | null | undefined,
    cityId: string | null,
    windowIndex: number,
): ItinWindowLite | null {
    if (!itineraryCities || !cityId) return null
    const windows = itineraryCities.filter((c) => c.id === cityId)
    if (windows.length === 0) return null
    return windows[Math.min(Math.max(windowIndex, 0), windows.length - 1)]
}

/**
 * Resolve the dates the stays surface should actually use. Itinerary window
 * dates are the default; stays_exp_* params override when set (and both must
 * be present to count as a valid override).
 */
export function resolveEffectiveStaysDates(
    searchParams: URLSearchParams,
    itineraryCities: ItinWindowLite[] | null | undefined,
): { checkIn: string; checkOut: string; isExploration: boolean; window: ItinWindowLite | null } {
    const cityId = searchParams.get(STAYS_PARAMS.city)
    const windowIndex = Number(searchParams.get(STAYS_EXP_PARAMS.window) || '0') || 0
    const window = pickItineraryWindow(itineraryCities, cityId, windowIndex)
    const expIn = searchParams.get(STAYS_EXP_PARAMS.checkIn)
    const expOut = searchParams.get(STAYS_EXP_PARAMS.checkOut)
    if (expIn && expOut) {
        return { checkIn: expIn, checkOut: expOut, isExploration: true, window }
    }
    return {
        checkIn: window?.checkIn ?? '',
        checkOut: window?.checkOut ?? '',
        isExploration: false,
        window,
    }
}

export type TabParamKeys = typeof STAYS_PARAMS | typeof ACTIVITIES_PARAMS

/**
 * Write a group key's city + dates to URL search params.
 * Group key format: "cityId::dateLabel"
 * Also stores the raw checkIn/checkOut YYYY-MM-DD from correctedDatesMap for the first stay in the group.
 */
export function writeGroupToParams(
    next: URLSearchParams,
    paramKeys: TabParamKeys,
    cityId: string,
    checkIn?: string,
    checkOut?: string
): void {
    next.set(paramKeys.city, cityId)
    if (checkIn) next.set(paramKeys.checkIn, checkIn)
    else next.delete(paramKeys.checkIn)
    if (checkOut) next.set(paramKeys.checkOut, checkOut)
    else next.delete(paramKeys.checkOut)
}

/**
 * Read city + dates from URL search params and reconstruct the group key.
 * Returns null if city param is missing.
 */
export function readGroupFromParams(
    searchParams: URLSearchParams,
    paramKeys: TabParamKeys
): { cityId: string; checkIn: string | null; checkOut: string | null } | null {
    const cityId = searchParams.get(paramKeys.city)
    if (!cityId) return null
    return {
        cityId,
        checkIn: searchParams.get(paramKeys.checkIn),
        checkOut: searchParams.get(paramKeys.checkOut)
    }
}

/**
 * Find the matching group key from cityDateGroups based on URL params.
 * Uses formatCompactDateRange to reconstruct the dateLabel from checkIn/checkOut params,
 * then matches against the group's dateLabel.
 * Falls back to first group for that city if no exact date match.
 */
export function findGroupKeyFromParams(
    searchParams: URLSearchParams,
    paramKeys: TabParamKeys,
    groups: Array<{ key: string; cityId: string; dateLabel: string }>,
    formatDateRange: (checkIn?: string | null, checkOut?: string | null) => string
): string | null {
    const params = readGroupFromParams(searchParams, paramKeys)
    if (!params) return null

    // If we have dates, reconstruct dateLabel and find exact match
    if (params.checkIn) {
        const dateLabel = formatDateRange(params.checkIn, params.checkOut)
        const exactMatch = groups.find((g) => g.cityId === params.cityId && g.dateLabel === dateLabel)
        if (exactMatch) return exactMatch.key
    }

    // Fallback: match by city only (first group for this city)
    const cityMatch = groups.find((g) => g.cityId === params.cityId)
    return cityMatch?.key ?? null
}
