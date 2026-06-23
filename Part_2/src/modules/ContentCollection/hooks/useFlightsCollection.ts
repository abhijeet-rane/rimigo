import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FIVE_MINUTES, HOURS_24 } from '@/constants/commons/tanstackConstants'
import { travelerCollectionApi } from '@/modules/ContentCollection/api/travelerCollectionApi'
import type { ApiResponse, ContentCollection } from '@/modules/ContentCollection/types/contentCollection'

/**
 * Flights-section collection that backs the Flights tab. Its metadata carries the
 * BE-derived legs (`_derive_legs_from_slots`, where `leg.id === slot.reference_id` —
 * the "in your itinerary" anchor card is looked up by that id).
 *
 * Cache bridge: a flight add invalidates `['itineraryCompleted', id]` but NOT this
 * `traveler-collection` query (different key prefix), so without help the legs stay
 * stale until `staleTime` lapses or a reload. We mirror `useItineraryRouteSummary`:
 * subscribe to `itineraryCompleted` writes for this itinerary and invalidate this
 * query, so the BE re-derives the legs (with the right ids) and they refresh at once.
 *   • `invalidate` — explicit invalidateQueries call-sites (chat assistant, date
 *     shift, version revert, flight tab, etc.).
 *   • `success`    — setQueryData writes from the slot/day mutation hooks that never
 *     invalidate (useAddSlot, useUpdateSlot, …).
 */
export const useFlightsCollection = (identifier: string | null | undefined, itineraryId: string | null | undefined) => {
    const queryClient = useQueryClient()

    useEffect(() => {
        if (!identifier || !itineraryId) return
        return queryClient.getQueryCache().subscribe((event) => {
            if (event.type !== 'updated') return
            if (event.action.type !== 'invalidate' && event.action.type !== 'success') return
            const key = event.query.queryKey
            if (!Array.isArray(key) || key[0] !== 'itineraryCompleted') return
            // Predicate invalidators fire one event per matched query — match only ours.
            if (key[1] !== itineraryId) return
            queryClient.invalidateQueries({ queryKey: ['traveler-collection', identifier, 'flights'] })
        })
    }, [queryClient, identifier, itineraryId])

    return useQuery({
        queryKey: ['traveler-collection', identifier, 'flights'],
        queryFn: async () => {
            if (!identifier) {
                return { data: { sections: [], identifier: '', name: '' } } as ApiResponse<ContentCollection>
            }
            return await travelerCollectionApi.getByIdentifier(identifier, 'flights')
        },
        enabled: !!identifier,
        staleTime: FIVE_MINUTES,
        gcTime: HOURS_24
    })
}
