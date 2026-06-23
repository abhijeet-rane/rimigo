import type { AccommodationMetadataItem } from '@/pages/Stays/Apis/accommodationsAPI'
import type { ItineraryStay } from '@/api/itineraryApi'
import { formatDateHeading } from '../utils'
import { formatDateStringToYMD } from '@/utils/dateUtils'
import { getCorrectedDatesWithFallback, type FallbackMode } from './cityDateFilter'
import { addDaysToYMD, type ItineraryCityWindow } from './itineraryWindows'

export interface StayCorrectedDates {
    checkIn: string | undefined
    checkOut: string | undefined
    /** true if dates were computed from fallback (metadata had no valid dates) */
    isFallback: boolean
}

export type StaysDateGroup = [string, AccommodationMetadataItem[]]

/**
 * Inside `window`, subtract every itinerary stay's [check_in_date, check_out_date)
 * sub-range and return the largest remaining contiguous gap. Returns null when the
 * window is fully covered. Half-open like the rest of the system.
 */
export function computeUncoveredWindowGap(
    window: ItineraryCityWindow,
    itineraryStaysInWindow: ItineraryStay[],
): { checkIn: string; checkOut: string } | null {
    const ranges: Array<[string, string]> = []
    for (const s of itineraryStaysInWindow) {
        const ci = s.check_in_date ? s.check_in_date.slice(0, 10) : null
        const co = s.check_out_date ? s.check_out_date.slice(0, 10) : null
        if (!ci || !co) continue
        const clippedIn = ci < window.checkIn ? window.checkIn : ci
        const clippedOut = co > window.checkOut ? window.checkOut : co
        if (clippedIn < clippedOut) ranges.push([clippedIn, clippedOut])
    }
    ranges.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))

    const gaps: Array<[string, string]> = []
    let cursor = window.checkIn
    for (const [ci, co] of ranges) {
        if (ci > cursor) gaps.push([cursor, ci])
        if (co > cursor) cursor = co
    }
    if (cursor < window.checkOut) gaps.push([cursor, window.checkOut])

    if (gaps.length === 0) return null
    let best: [string, string] = gaps[0]!
    let bestLen = ymdSpanDays(best[0], best[1])
    for (let i = 1; i < gaps.length; i++) {
        const len = ymdSpanDays(gaps[i]![0], gaps[i]![1])
        if (len > bestLen) {
            best = gaps[i]!
            bestLen = len
        }
    }
    return { checkIn: best[0], checkOut: best[1] }
}

function ymdSpanDays(start: string, end: string): number {
    let days = 0
    let cur = start
    while (cur < end) {
        cur = addDaysToYMD(cur, 1)
        days++
        if (days > 366) break
    }
    return days
}

/**
 * Compute corrected check-in / check-out for every stay.
 * Returns a Map keyed by `zentrum_hub_id || id`.
 *
 * @param fallbackMode - Controls fallback date behavior per page type.
 *   'public' = +30 days (ViewContentCollection), 'traveler'/'tripboard' = +1 day.
 *   Defaults to 'traveler'.
 */
export function buildCorrectedDatesMap(
    stays: AccommodationMetadataItem[],
    staySectionMap?: Map<string, string>,
    staySectionMetadataMap?: Map<string, { [key: string]: unknown } | undefined>,
    fallbackMode: FallbackMode = 'traveler',
    // When provided (tripboard mode), itinerary windows are the source of truth
    // for stay dates. Each stay is matched to the window whose span contains
    // its section start_date; the window's checkIn/checkOut override saved
    // section dates so the carousel chip reflects the itinerary, not whatever
    // was prefilled at save time.
    stayMetadataMap?: Map<string, { city_id?: string } | undefined>,
    itineraryCities?: ItineraryCityWindow[] | null,
    // Tripboard-only. When the matched stay is in the itinerary, use its saved
    // sub-range (Hotel A → Day 1–2) instead of the whole window. When the stay
    // is collection-only but the window has partial itinerary coverage, fall
    // back to the largest uncovered gap so the user sees rates for the dates
    // they can actually fill.
    itineraryStays?: ItineraryStay[] | null,
): Map<string, StayCorrectedDates> {
    const datesMap = new Map<string, StayCorrectedDates>()

    const itineraryByZentrum = new Map<string, ItineraryStay>()
    const itineraryByCity = new Map<string, ItineraryStay[]>()
    if (itineraryStays && itineraryStays.length > 0) {
        for (const s of itineraryStays) {
            if (s.zentrum_hub_id) itineraryByZentrum.set(String(s.zentrum_hub_id), s)
            if (s.city_id) {
                const list = itineraryByCity.get(s.city_id) || []
                list.push(s)
                itineraryByCity.set(s.city_id, list)
            }
        }
    }

    stays.forEach((stay) => {
        const key = stay.zentrum_hub_id || stay.id
        const sectionId = staySectionMap?.get(key)
        const sectionMetadataFull = sectionId ? staySectionMetadataMap?.get(sectionId) : undefined
        const metadata = sectionMetadataFull as { start_date?: string | null; end_date?: string | null } | undefined

        const rawStart = metadata?.start_date ? formatDateStringToYMD(metadata.start_date) : undefined
        const rawEnd = metadata?.end_date ? formatDateStringToYMD(metadata.end_date) : undefined

        if (itineraryCities && itineraryCities.length > 0) {
            const cityId = stayMetadataMap?.get(key)?.city_id
            const windows = cityId ? itineraryCities.filter((c) => c.id === cityId) : []
            if (windows.length > 0) {
                // Saved in the itinerary → use its actual sub-range.
                const matched = stay.zentrum_hub_id ? itineraryByZentrum.get(String(stay.zentrum_hub_id)) : undefined
                if (matched?.check_in_date && matched?.check_out_date) {
                    datesMap.set(key, {
                        checkIn: matched.check_in_date.slice(0, 10),
                        checkOut: matched.check_out_date.slice(0, 10),
                        isFallback: false,
                    })
                    return
                }

                const containing = rawStart
                    ? windows.find((w) => rawStart >= w.checkIn && rawStart < w.checkOut)
                    : null
                const chosen = containing ?? windows[0]

                // Collection-only stay → if part of this city's window is already
                // booked by itinerary stays, prefer the uncovered gap.
                if (cityId && itineraryByCity.has(cityId)) {
                    const stayInWindow = itineraryByCity.get(cityId)!.filter((s) => {
                        if (!s.check_in_date || !s.check_out_date) return false
                        const ci = s.check_in_date.slice(0, 10)
                        const co = s.check_out_date.slice(0, 10)
                        return ci < chosen.checkOut && co > chosen.checkIn
                    })
                    if (stayInWindow.length > 0) {
                        const gap = computeUncoveredWindowGap(chosen, stayInWindow)
                        if (gap) {
                            datesMap.set(key, { checkIn: gap.checkIn, checkOut: gap.checkOut, isFallback: false })
                            return
                        }
                        // Window fully covered (multi-hotel city: Hotel A 1-3,
                        // Hotel B 3-5). Don't fall back to the full window —
                        // that produces a duplicate "1-5" chip alongside the
                        // sub-range chips. Bucket the orphan into the covering
                        // stay whose range contains its section start_date,
                        // else the first covering stay (chronologically).
                        const sortedCovering = stayInWindow.slice().sort((a, b) => {
                            const ai = (a.check_in_date || '').slice(0, 10)
                            const bi = (b.check_in_date || '').slice(0, 10)
                            return ai < bi ? -1 : ai > bi ? 1 : 0
                        })
                        const targetByStart = rawStart
                            ? sortedCovering.find((s) => {
                                  const ci = (s.check_in_date || '').slice(0, 10)
                                  const co = (s.check_out_date || '').slice(0, 10)
                                  return rawStart >= ci && rawStart < co
                              })
                            : undefined
                        const target = targetByStart ?? sortedCovering[0]
                        if (target?.check_in_date && target?.check_out_date) {
                            datesMap.set(key, {
                                checkIn: target.check_in_date.slice(0, 10),
                                checkOut: target.check_out_date.slice(0, 10),
                                isFallback: false,
                            })
                            return
                        }
                    }
                }

                datesMap.set(key, { checkIn: chosen.checkIn, checkOut: chosen.checkOut, isFallback: false })
                return
            }
        }

        const corrected = getCorrectedDatesWithFallback(rawStart, rawEnd, fallbackMode)

        datesMap.set(key, {
            checkIn: corrected.checkIn,
            checkOut: corrected.checkOut,
            isFallback: corrected.isFallback
        })
    })

    return datesMap
}

/**
 * Group stays by their corrected date heading string.
 * Returns a sorted array of `[dateHeading, stays[]]` pairs (earliest first).
 */
export function groupStaysByDate(
    stays: AccommodationMetadataItem[],
    correctedDatesMap: Map<string, StayCorrectedDates>,
    formatHeading?: (startDate: string | null | undefined, endDate: string | null | undefined) => string
): StaysDateGroup[] {
    const groups = new Map<string, AccommodationMetadataItem[]>()
    const formatter = formatHeading || formatDateHeading

    stays.forEach((stay) => {
        const key = stay.zentrum_hub_id || stay.id
        const dates = correctedDatesMap.get(key)
        const dateKey = formatter(dates?.checkIn ?? null, dates?.checkOut ?? null)
        if (!groups.has(dateKey)) {
            groups.set(dateKey, [])
        }
        groups.get(dateKey)!.push(stay)
    })

    // Sort groups chronologically by the first date/day number in the heading
    return Array.from(groups.entries()).sort(([dateA], [dateB]) => {
        // Handle "Day N" format sorting
        const dayNumMatch = (s: string) => s.match(/^Day (\d+)/)
        const dayAMatch = dayNumMatch(dateA)
        const dayBMatch = dayNumMatch(dateB)
        if (dayAMatch && dayBMatch) return parseInt(dayAMatch[1]) - parseInt(dayBMatch[1])

        try {
            const parseDate = (dateStr: string): Date => {
                if (dateStr.includes(' - ')) {
                    return new Date(dateStr.split(' - ')[0])
                }
                return new Date(dateStr)
            }
            return parseDate(dateA).getTime() - parseDate(dateB).getTime()
        } catch {
            return dateA.localeCompare(dateB)
        }
    })
}

/**
 * Collect all section IDs for stays belonging to a given date group.
 * Used to bulk-update dates for every stay in a group.
 */
export function getSectionIdsForGroup(
    groupStays: AccommodationMetadataItem[],
    staySectionMap?: Map<string, string>
): string[] {
    if (!staySectionMap) return []
    const ids: string[] = []
    groupStays.forEach((stay) => {
        const key = stay.zentrum_hub_id || stay.id
        const sectionId = staySectionMap.get(key)
        if (sectionId) ids.push(sectionId)
    })
    return ids
}
