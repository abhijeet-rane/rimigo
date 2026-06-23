import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { OccupanciesConfig } from '@/types/occupancy'
import { decodeOccupancies, guestsDataToOccupancies, normalizeOccupancies, DEFAULT_OCCUPANCIES } from '@/types/occupancy'
import type { GroupSetup } from '@/api/tripPreferencesAPI/tripPreferencesAPI'

/**
 * Derives OccupanciesConfig from URL params or trip preferences.
 * Priority: occupancies URL param > legacy adults/children/rooms params > trip group_setup > default
 */
export function useStaysOccupancies(tripGroupSetup?: GroupSetup | null): OccupanciesConfig {
    const [searchParams] = useSearchParams()
    return useMemo<OccupanciesConfig>(() => {
        // Priority 1: explicit occupancies param
        const occupanciesParam = searchParams.get('occupancies')
        if (occupanciesParam) {
            return normalizeOccupancies(decodeOccupancies(occupanciesParam))
        }
        // Priority 2: legacy flat params
        const hasLegacyParams = searchParams.has('adults')
        const rooms = parseInt(searchParams.get('rooms') || '1', 10) || 1
        if (hasLegacyParams) {
            const adults = Math.max(1, parseInt(searchParams.get('adults') || '2', 10))
            const children = parseInt(searchParams.get('children') || '0', 10)
            const childrenAge = (searchParams.get('children_age') || '')
                .split(',')
                .map(Number)
                .filter((age) => !isNaN(age))
            return guestsDataToOccupancies({ adults, children, children_age: childrenAge }, rooms)
        }
        // Priority 3: trip group_setup
        if (tripGroupSetup) {
            // Prefer the saved per-room breakdown (set by the guests modal "Save in trip"
            // action) so we restore the exact split — 4 + 2, not a merged 6.
            if (tripGroupSetup.rooms && tripGroupSetup.rooms.length > 0) {
                return normalizeOccupancies(
                    tripGroupSetup.rooms.map((r) => ({
                        numOfAdults: Math.max(1, r.adults || 1),
                        childAges: Array.isArray(r.child_ages) ? [...r.child_ages] : [],
                    }))
                )
            }
            return guestsDataToOccupancies(
                {
                    adults: tripGroupSetup.adults || 2,
                    children: tripGroupSetup.children || 0,
                    children_age: tripGroupSetup.children_age || []
                },
                rooms
            )
        }
        return DEFAULT_OCCUPANCIES
    }, [searchParams, tripGroupSetup])
}
