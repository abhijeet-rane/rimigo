import type { StaysTabProps } from '../types/staysTabTypes'
import { formatDateStringToYMD } from '@/utils/dateUtils'
import type { ItineraryCityWindow } from './itineraryWindows'

type StayLike = StaysTabProps['staysData'][number]
type StayMetadataMap = StaysTabProps['stayMetadataMap']

export type StaysViewMode = 'for_you' | 'shortlist'

// Resolve the Stays "For You" / "Shortlist" toggle. Explicit URL value wins;
// otherwise default to 'shortlist' when the active city already has saved
// stays, else 'for_you'. Shared between StaysTab (drives the rendered UI) and
// TripboardPage (gates the map's viewport API). Keeping these in lockstep
// prevents the map from firing viewport calls while the user sees Shortlist.
export function resolveStaysViewMode(
    rawParam: string | null,
    cityId: string | null,
    staysData: StayLike[],
    stayMetadataMap: StayMetadataMap,
): StaysViewMode {
    if (rawParam === 'shortlist') return 'shortlist'
    if (rawParam === 'for_you') return 'for_you'
    if (!cityId || staysData.length === 0) return 'for_you'
    for (const stay of staysData) {
        const meta = stayMetadataMap.get(stay.zentrum_hub_id || stay.id)
        if (meta?.city_id === cityId) return 'shortlist'
    }
    return 'for_you'
}

// Count of shortlisted stays scoped to a selected city. When no city is
// selected, returns the total. Drives the "Shortlisted" chip count.
export function countShortlistForCity(
    staysData: StayLike[],
    stayMetadataMap: StayMetadataMap,
    selectedCityId: string | null,
): number {
    if (staysData.length === 0) return 0
    if (!selectedCityId) return staysData.length
    let count = 0
    for (const stay of staysData) {
        const meta = stayMetadataMap.get(stay.zentrum_hub_id || stay.id)
        if (meta?.city_id === selectedCityId) count++
    }
    return count
}

// Count shortlisted stays scoped to a single (city, itinerary window). Needed
// for return-trip cities (A → B → A) so each visit's chip shows only its own
// shortlisted stays instead of the city-wide total. Window assignment matches
// buildCorrectedDatesMap / getDatesForStayFromItinerary: the stay belongs to
// the window whose [checkIn, checkOut) range contains the section start_date,
// otherwise it falls back to the first window for that city.
export function countShortlistForCityWindow(
    staysData: StayLike[],
    stayMetadataMap: StayMetadataMap,
    staySectionMap: Map<string, string> | undefined,
    staySectionMetadataMap: Map<string, { [key: string]: unknown } | undefined> | undefined,
    selectedCityId: string | null,
    selectedWindow: { checkIn: string; checkOut: string } | null,
    allWindowsForCity: ItineraryCityWindow[],
): number {
    if (!selectedCityId || !selectedWindow || allWindowsForCity.length === 0) {
        return countShortlistForCity(staysData, stayMetadataMap, selectedCityId)
    }
    if (allWindowsForCity.length === 1) {
        // Single-window cities can short-circuit — every shortlisted stay
        // for that city belongs to its only window.
        return countShortlistForCity(staysData, stayMetadataMap, selectedCityId)
    }
    let count = 0
    for (const stay of staysData) {
        const key = stay.zentrum_hub_id || stay.id
        const meta = stayMetadataMap.get(key)
        if (meta?.city_id !== selectedCityId) continue
        const sectionId = staySectionMap?.get(key)
        const sectionMeta = sectionId ? staySectionMetadataMap?.get(sectionId) : undefined
        const rawStart = (sectionMeta as { start_date?: string | null } | undefined)?.start_date
        const startYMD = rawStart ? formatDateStringToYMD(rawStart) : null
        const containing = startYMD
            ? allWindowsForCity.find((w) => startYMD >= w.checkIn && startYMD < w.checkOut)
            : null
        const assigned = containing ?? allWindowsForCity[0]
        if (assigned.checkIn === selectedWindow.checkIn && assigned.checkOut === selectedWindow.checkOut) {
            count++
        }
    }
    return count
}
