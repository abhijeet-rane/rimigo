import { useMemo } from 'react'
import type { RouteSummaryResponse } from '@/api/itineraryApi'
import type { StaysTabProps } from '../types/staysTabTypes'
import {
    computeItineraryWindows,
    type ItineraryCityWindow,
} from '../utils/itineraryWindows'

export type ItineraryCity = ItineraryCityWindow

export type UseItineraryCitiesArgs = {
    fallbackMode?: StaysTabProps['fallbackMode']
    itineraryDays?: StaysTabProps['itineraryDays']
    availableCities: Array<{ id: string; name: string }>
    routeSummary?: RouteSummaryResponse
}

export type UseItineraryCitiesResult = {
    // Per-stay windows. Cities can repeat (return trips A → B → A produce
    // two A entries). Sorted by checkIn ascending — drives the carousel.
    itineraryCities: ItineraryCityWindow[] | null
    // Unique-by-id city list for the filter dropdown / external-add modal.
    // Combines itinerary cities with any saved-stay cities not in the itinerary.
    // Home-city orphans (a shortlisted stay in the user's origin city) are
    // dropped via the route_chain bookends.
    effectiveCities: Array<{ id: string; name: string }>
}

export function useItineraryCities({
    fallbackMode: _fallbackMode,
    itineraryDays,
    availableCities,
    routeSummary,
}: UseItineraryCitiesArgs): UseItineraryCitiesResult {
    // Route_summary chip windows work across all surfaces — tripboard,
    // traveler-collection detail, and public collection. The hook stays
    // mode-agnostic; surface-specific behaviors (date editor / exp_*
    // overlay) live in the consumer.
    void _fallbackMode
    const itineraryCities = useMemo<ItineraryCityWindow[] | null>(() => {
        // Primary source: route-summary endpoint. RLE'd by sleep_city, so
        // origin/destination bookend cities (nights=0) are absent — the home
        // city naturally drops out of the carousel.
        const summaryStays = routeSummary?.stays
        if (summaryStays && summaryStays.length > 0) {
            return summaryStays.map((s) => ({
                id: s.city.id,
                name: s.city.name,
                checkIn: s.from_date,
                checkOut: s.to_date,
            }))
        }
        // Fallback: FE-derived windows from itinerary days. Used while the
        // route-summary fetch is in flight, errored, or unavailable.
        if (!itineraryDays || itineraryDays.length === 0) return null
        const windows = computeItineraryWindows(itineraryDays)
        return windows.length === 0 ? null : windows
    }, [itineraryDays, routeSummary?.stays])

    // route_chain bookends: origin is hop[0] with nights=0 / arrived_via=null;
    // final destination is hop[-1] with nights=0. Both represent the user's
    // home city in a standard round-trip. We exclude their ids from
    // `effectiveCities` so a shortlisted hotel in the home city does not
    // surface its own chip.
    const homeCityIds = useMemo<Set<string>>(() => {
        const ids = new Set<string>()
        const chain = routeSummary?.route_chain
        if (!chain || chain.length === 0) return ids
        const first = chain[0]
        const last = chain[chain.length - 1]
        if (first && first.nights === 0 && first.city?.id) ids.add(first.city.id)
        if (last && last !== first && last.nights === 0 && last.city?.id) ids.add(last.city.id)
        return ids
    }, [routeSummary?.route_chain])

    const effectiveCities = useMemo(() => {
        const filteredAvailable = homeCityIds.size > 0
            ? availableCities.filter((c) => !homeCityIds.has(c.id))
            : availableCities
        if (!itineraryCities) return filteredAvailable
        const cityMap = new Map<string, { id: string; name: string }>()
        for (const c of itineraryCities) {
            if (!cityMap.has(c.id)) cityMap.set(c.id, { id: c.id, name: c.name })
        }
        for (const c of filteredAvailable) {
            if (!cityMap.has(c.id)) cityMap.set(c.id, c)
        }
        return Array.from(cityMap.values())
    }, [itineraryCities, availableCities, homeCityIds])

    return { itineraryCities, effectiveCities }
}
