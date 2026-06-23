import type { ItineraryStay } from '@/api/itineraryApi'

const dateOnly = (value: string | null | undefined): string => {
    if (!value) return ''
    return value.slice(0, 10)
}

/**
 * Derive which day index maps to which stay_id by intersecting each
 * day's date with the stays' date ranges. ``check_in_date`` is inclusive,
 * ``check_out_date`` is exclusive (the morning after the last night).
 *
 * Pure date intersection — no city check. The backend reconcile pass
 * uses sleep_city semantics, so a stay's range already covers exactly
 * the days the traveller actually sleeps in its city, including the
 * arrival-transit night where ``day.base_city`` is still the origin.
 * If we filtered by ``day.base_city.id === stay.city_id`` here, Day 1
 * of an "Origin → Destination" trip would miss the destination's hotel
 * pill even though the traveller slept there.
 *
 * Stays are sorted by check-in date; the earliest-check-in stay wins on
 * any contested day. Backend truncates conflicting stays before save,
 * so on the wire ranges are already non-overlapping.
 *
 * @returns A Map where key = day index (0-based), value = stay_id string.
 *          Days without a covering stay are absent from the map.
 */
export function deriveDayStayMap(
    days: Array<{ date?: string | null; base_city?: { id: string } | null }>,
    stays: ItineraryStay[]
): Map<number, string> {
    const result = new Map<number, string>()
    if (!days?.length || !stays?.length) return result

    const sortedStays = stays
        .filter((s) => s.check_in_date && s.check_out_date)
        .slice()
        .sort((a, b) => {
            const ai = dateOnly(a.check_in_date)
            const bi = dateOnly(b.check_in_date)
            return ai < bi ? -1 : ai > bi ? 1 : 0
        })

    for (let i = 0; i < days.length; i++) {
        const day = days[i]
        const dayDate = dateOnly(day?.date)
        if (!dayDate) continue
        for (const stay of sortedStays) {
            const ci = dateOnly(stay.check_in_date)
            const co = dateOnly(stay.check_out_date)
            if (ci <= dayDate && dayDate < co) {
                result.set(i, stay.stay_id)
                break
            }
        }
    }

    return result
}

/**
 * Convenience: get the stay_id for a specific day index.
 */
export function getStayIdForDay(dayStayMap: Map<number, string>, dayIndex: number): string | null {
    return dayStayMap.get(dayIndex) ?? null
}
