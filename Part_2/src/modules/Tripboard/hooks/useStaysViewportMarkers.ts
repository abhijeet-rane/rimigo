import { useCallback, useEffect, useRef } from 'react'
import { getViewportAccommodations } from '@/pages/Stays/Apis/accommodationsAPI'
import type { ViewportStay } from '@/components/shared/Map/GenericMap'
import type { GuestsData } from '@/components/common/SearchBar/modals/GuestsModal'

interface UseStaysViewportMarkersParams {
    /** Active stays city id from the URL. Null → hook is a no-op. */
    cityId: string | null
    /** Trip check-in (YYYY-MM-DD). Null → dates omitted; backend uses defaults. */
    checkIn: string | null
    /** Trip check-out (YYYY-MM-DD). Null → dates omitted; backend uses defaults. */
    checkOut: string | null
    /**
     * Zentrum hub IDs already rendered as list markers. Passed as
     * `exclude_ids` to the viewport endpoint so the backend skips them —
     * avoids fetching + drawing duplicates on top of the list pins.
     */
    excludeHubIds: string[]
    /**
     * Trip's nightly-rate budget. When set, the backend drops priced stays
     * outside this range (unpriced stays are kept). Null / undefined → no
     * budget filter. Frontend's {min:0, max:9999999} default is treated as
     * no-op by the backend.
     */
    budgetRange?: { min: number; max: number } | null
    /**
     * Trip guest config. Not used to filter the viewport response — forwarded
     * to the backend's async rates warm-up task (same guest config keeps the
     * warmed rates aligned with the list/price-compare flow). Optional.
     */
    guestsData?: GuestsData | null
    /** For You filters — mirrored from the list query so map markers match the list. */
    propertyTypes?: string[]
    amenities?: string[]
    starRatings?: number[]
    isVerified?: boolean | null
    isB2bDealAvailable?: boolean | null
    /** Master gate — typically `stays tab && for_you view && !!cityId`. */
    enabled: boolean
    /** Viewport fetch page size. Defaults to 50 (endpoint caps at this too). */
    limit?: number
}

interface UseStaysViewportMarkersReturn {
    /** Stable fetcher to pass to `<GenericMap fetchViewportStays={...} />`. */
    fetchViewportStays: (bounds: {
        north: number
        south: number
        east: number
        west: number
    }) => Promise<ViewportStay[]>
    /** Pass to `<GenericMap viewportMarkersEnabled={...} />`. */
    viewportMarkersEnabled: boolean
}

/**
 * Hook encapsulating the pan/zoom-driven viewport marker fetch for the
 * Tripboard Stays For You map. Uses the lightweight `/accommodations/viewport/`
 * endpoint — designed for map pins, no scoring or review enrichment.
 *
 * The returned `fetchViewportStays` callback has a stable identity across
 * renders (reads live params from a ref) so `GenericMap` doesn't rebind
 * its `moveend` handler every time the user types or navigates.
 */
export function useStaysViewportMarkers({
    cityId,
    checkIn,
    checkOut,
    excludeHubIds,
    budgetRange,
    guestsData,
    propertyTypes,
    amenities,
    starRatings,
    isVerified,
    isB2bDealAvailable,
    enabled,
    limit = 50,
}: UseStaysViewportMarkersParams): UseStaysViewportMarkersReturn {
    // Keep current params in a ref so the fetcher reference stays stable.
    // This is essential: GenericMap's `moveend` effect re-binds when the
    // `fetchViewportStays` identity changes, which would reset debounces and
    // clear in-flight requests every time URL params update.
    const paramsRef = useRef({
        cityId, checkIn, checkOut, excludeHubIds, budgetRange, guestsData,
        propertyTypes, amenities, starRatings, isVerified, isB2bDealAvailable, limit,
    })
    useEffect(() => {
        paramsRef.current = {
            cityId, checkIn, checkOut, excludeHubIds, budgetRange, guestsData,
            propertyTypes, amenities, starRatings, isVerified, isB2bDealAvailable, limit,
        }
    }, [cityId, checkIn, checkOut, excludeHubIds, budgetRange, guestsData,
        propertyTypes, amenities, starRatings, isVerified, isB2bDealAvailable, limit])

    const fetchViewportStays = useCallback(
        async (bounds: {
            north: number
            south: number
            east: number
            west: number
        }): Promise<ViewportStay[]> => {
            const {
                cityId: currentCityId,
                checkIn: currentCheckIn,
                checkOut: currentCheckOut,
                excludeHubIds: currentExclude,
                budgetRange: currentBudget,
                guestsData: currentGuests,
                propertyTypes: currentPropertyTypes,
                amenities: currentAmenities,
                starRatings: currentStarRatings,
                isVerified: currentIsVerified,
                isB2bDealAvailable: currentIsB2b,
                limit: currentLimit,
            } = paramsRef.current
            if (!currentCityId) return []
            try {
                // Note: list-side hub IDs are NOT sent as exclude_ids — keeping them
                // out of the request preserves a stable PATH_QUERY cache key across
                // users (each user's list differs). De-dupe is done client-side below.
                const response = await getViewportAccommodations({
                    cityId: currentCityId,
                    north: bounds.north,
                    south: bounds.south,
                    east: bounds.east,
                    west: bounds.west,
                    check_in_date: currentCheckIn || undefined,
                    check_out_date: currentCheckOut || undefined,
                    budget_range: currentBudget || undefined,
                    limit: currentLimit,
                    num_adults: currentGuests?.adults,
                    num_infants: currentGuests?.infants,
                    child_ages: currentGuests?.children_age,
                    property_types: currentPropertyTypes && currentPropertyTypes.length > 0 ? currentPropertyTypes : undefined,
                    amenities: currentAmenities && currentAmenities.length > 0 ? currentAmenities : undefined,
                    star_ratings: currentStarRatings && currentStarRatings.length > 0 ? currentStarRatings : undefined,
                    is_verified: currentIsVerified ?? undefined,
                    is_b2b_deal_available: currentIsB2b ?? undefined,
                })
                const stays = (response.data || []) as ViewportStay[]
                if (currentExclude.length === 0) return stays
                const excludeSet = new Set(currentExclude)
                return stays.filter((s) => !s.zentrum_hub_id || !excludeSet.has(s.zentrum_hub_id))
            } catch {
                // Viewport loading is best-effort — a failed fetch just means
                // no extra pills this pan. Swallow and let GenericMap's
                // debounce pick up the next user action.
                return []
            }
        },
        [] // stable — reads via ref
    )

    const viewportMarkersEnabled = enabled && !!cityId

    return { fetchViewportStays, viewportMarkersEnabled }
}
