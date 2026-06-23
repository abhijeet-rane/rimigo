import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { importCompletedItinerary } from '@/modules/Itinerary/hooks/ItineraryHook'
import { FIVE_MINUTES } from '@/constants/commons/tanstackConstants'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { travelerCollectionApi } from '../api/travelerCollectionApi'

/**
 * Detect if a tripboard (content/traveler collection) is stale relative to its linked itinerary.
 *
 * Fetches the collection with section_type=itinerary to find the linked itinerary entity_id,
 * then compares `itinerary.updated_at` against `collection.metadata.itinerary_synced_at`.
 *
 * Staleness updates near-instantly when slots are modified because the itinerary query
 * shares the same cache key ['itineraryCompleted', itineraryId] used by slot mutation hooks.
 *
 * After a successful sync, call `markSynced()` to suppress the stale indicator until the
 * itinerary is modified again (i.e. its `updated_at` moves past the client-side marker).
 */
export function useTripboardStaleness(
    identifier: string | undefined,
    collectionType: 'content' | 'traveler'
) {
    const api = collectionType === 'content' ? contentCollectionApi : travelerCollectionApi

    // Client-side timestamp set when sync succeeds — survives until a newer itinerary change
    const [clientSyncedAt, setClientSyncedAt] = useState<number | null>(null)

    // Fetch collection with section_type=itinerary to get the itinerary section entity_id + metadata
    const { data: itineraryCollectionResponse } = useQuery({
        queryKey: [`${collectionType}-collection-itinerary`, identifier],
        queryFn: () => api.getByIdentifier(identifier!, 'itinerary'),
        enabled: !!identifier,
        staleTime: FIVE_MINUTES,
        refetchOnWindowFocus: false,
        retry: 1
    })

    const collection = itineraryCollectionResponse?.data
    const itinerarySection = collection?.sections?.find(
        (s) => s.section_type === 'itinerary' && s.entity_id
    )
    const itineraryId = itinerarySection?.entity_id || ''
    const hasItinerary = !!itineraryId

    // Shares cache key ['itineraryCompleted', itineraryId] with useItineraryCompletedData
    // and slot mutations — invalidations from edits still refetch this observer immediately.
    // staleTime must match useItineraryCompletedData (24h); without it, mount-time
    // re-fetches duplicate the parent's /complete call when this hook mounts after it.
    const {
        data: itinerary,
        isLoading
    } = useQuery({
        queryKey: ['itineraryCompleted', itineraryId],
        queryFn: () => importCompletedItinerary(itineraryId),
        enabled: hasItinerary,
        staleTime: 24 * 60 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1
    })

    // Compare timestamps
    // Server returns updated_at without "Z" suffix but the value IS UTC (from MongoDB).
    // JS parses timestamps without timezone indicator as local time, so we must
    // normalise both values to UTC before comparing.
    const toUTC = (ts: string) => (ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z')

    const itinerarySyncedAt = collection?.metadata?.itinerary_synced_at as string | undefined
    const itineraryUpdatedAt = itinerary?.updated_at

    // Use the most recent sync marker: server metadata OR client-side override
    const serverSyncMs = itinerarySyncedAt ? new Date(toUTC(itinerarySyncedAt)).getTime() : 0
    const effectiveSyncMs = Math.max(serverSyncMs, clientSyncedAt ?? 0)

    let isStale = false
    if (hasItinerary && itineraryUpdatedAt) {
        const updatedMs = new Date(toUTC(itineraryUpdatedAt)).getTime()
        isStale = updatedMs > effectiveSyncMs
    }

    /**
     * Call after a successful sync to immediately suppress the stale indicator.
     * The red dot will only reappear when `itinerary.updated_at` moves past this timestamp.
     */
    const markSynced = useCallback(() => {
        setClientSyncedAt(Date.now())
    }, [])

    return {
        isStale,
        isLoading,
        hasItinerary,
        itineraryId,
        markSynced
    }
}
