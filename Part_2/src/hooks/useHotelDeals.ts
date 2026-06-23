import { useState, useCallback, useRef } from 'react'
import {
    buildRoomsFromFlat,
    fetchHotelPriceCompare,
    type HotelPriceCompareRequest,
    type PlatformPrice,
    type RoomOccupancy
} from '@/api/hotelPriceCompare/hotelPriceCompareAPI'
import { useCollectionId } from '@/modules/Tripboard/context/TripCollectionRecommendationsContext'

export interface HotelDealsState {
    deals: Record<string, PlatformPrice[]>
    loading: Record<string, boolean>
}

export interface HotelToFetch {
    zentrumHubId: string
    hotelName: string
    /** Per-hotel overrides for batches that span multiple cities / date ranges
     *  (e.g. a multi-city trip's stays on the Bookings tab). Each hotel must be
     *  priced for its own city + check-in/out, otherwise the compare SERP lookup
     *  mismatches and returns no platforms. Falls back to the batch-level
     *  city/checkIn/checkOut when omitted. */
    city?: string
    checkIn?: string
    checkOut?: string
}

export interface FetchDealsParams {
    hotels: HotelToFetch[]
    city: string
    checkIn: string
    checkOut: string
    adults: number
    children: number
    childAges: number[]
    tripId: string
    currency?: string
    noOfRooms?: number
    rimigoPrice?: boolean
    /** Per-room occupancy. When provided, wins over flat adults/children/childAges/noOfRooms. */
    rooms?: RoomOccupancy[]
}

/**
 * Hook for fetching hotel deals using SSE-based compare API.
 * Provides state management, loading states, and deduplication.
 */
export function useHotelDeals(collectionIdOverride?: string | null) {
    const [deals, setDeals] = useState<Record<string, PlatformPrice[]>>({})
    const [loading, setLoading] = useState<Record<string, boolean>>({})
    const inFlightRef = useRef(false)
    const lastKeyRef = useRef('')

    // Collection (TravelerCollection or ContentCollection) ObjectId in scope;
    // forwarded to /compare so BE captures the surface in the AttributionContext.
    // Caller override wins — useful when a page's `useStayPrices` runs OUTSIDE
    // the provider it mounts in its own JSX (hooks run before children render,
    // so `useCollectionId()` from the page body reads `null` even when a
    // TripCollectionRecommendationsProvider wraps the rendered tree). Falls
    // back to context otherwise. Ref so useCallback deps don't churn.
    const collectionIdFromCtx = useCollectionId()
    const collectionId = collectionIdOverride ?? collectionIdFromCtx
    const collectionIdRef = useRef<string | null>(collectionId)
    collectionIdRef.current = collectionId

    /**
     * Clear all deals and reset state
     */
    const clearDeals = useCallback(() => {
        setDeals({})
        setLoading({})
        lastKeyRef.current = ''
        inFlightRef.current = false
    }, [])

    /**
     * Fetch deals for multiple hotels.
     * Uses SSE for real-time progress, falls back gracefully.
     */
    const fetchDeals = useCallback(async (params: FetchDealsParams): Promise<void> => {
        const { hotels, city, checkIn, checkOut, adults, children, childAges, tripId, currency = 'INR', noOfRooms, rimigoPrice = true, rooms } = params

        // `tripId` is optional — the `/api/compare/` endpoint accepts an empty
        // string and is auth-bypassed in sancus, so logged-out viewers on the
        // public `/hotel/<slug>` landing page still get price comparisons.
        if (!checkIn || !checkOut || hotels.length === 0) {
            return
        }

        // Build key for deduplication — fold in each hotel's effective
        // city/dates so a multi-city batch refetches when any leg changes
        // (not just when the first stay's dates change).
        const sig = hotels
            .map((h) => `${h.zentrumHubId}:${h.city ?? city}:${h.checkIn ?? checkIn}:${h.checkOut ?? checkOut}`)
            .sort()
            .join(',')
        const key = `${tripId}|${adults}|${children}|${childAges.join(',')}|${sig}`

        // Skip if already fetching for same key
        if (inFlightRef.current) return
        if (lastKeyRef.current === key) return

        lastKeyRef.current = key
        inFlightRef.current = true

        // Set loading state for all hotels
        const initialLoading: Record<string, boolean> = {}
        hotels.forEach((h) => {
            initialLoading[h.zentrumHubId] = true
        })
        setLoading((prev) => ({ ...prev, ...initialLoading }))

        // Clamp children ages helper
        const clampChildrenAges = (count: number, ages: number[]): number[] => {
            const next = ages.slice(0, count)
            while (next.length < count) next.push(5)
            return next
        }

        // Fetch deals for all hotels in parallel
        const promises = hotels.map(async (hotel) => {
            const clampedAges = clampChildrenAges(children, childAges)
            const effectiveRooms = noOfRooms && noOfRooms > 0 ? noOfRooms : 1
            const roomsPayload = rooms && rooms.length > 0
                ? rooms
                : buildRoomsFromFlat(adults, clampedAges, effectiveRooms)
            const baseRequest: HotelPriceCompareRequest = {
                zentrum_hub_id: hotel.zentrumHubId,
                hotel_name: hotel.hotelName,
                city: hotel.city ?? city,
                check_in: hotel.checkIn ?? checkIn,
                check_out: hotel.checkOut ?? checkOut,
                currency,
                trip_id: tripId,
                rimigo_price: rimigoPrice,
                rooms: roomsPayload,
            }

            try {
                const result = await fetchHotelPriceCompare(baseRequest, {
                    travelerCollectionId: collectionIdRef.current
                })
                if (result.type === 'error') throw result.error
                return { zentrumHubId: hotel.zentrumHubId, platforms: result.data }
            } catch (error) {
                const isTimeout = error instanceof Error && error.message.includes('Timeout')
                if (isTimeout) {
                    try {
                        const retry = await fetchHotelPriceCompare(baseRequest, {
                            travelerCollectionId: collectionIdRef.current
                        })
                        if (retry.type !== 'error') {
                            return { zentrumHubId: hotel.zentrumHubId, platforms: retry.data }
                        }
                    } catch {
                        // retry failed
                    }
                }
                console.error('Failed to fetch deals for hotel', hotel.zentrumHubId, error)
                return { zentrumHubId: hotel.zentrumHubId, platforms: [] as PlatformPrice[] }
            }
        })

        try {
            const results = await Promise.all(promises)

            // Only apply if still the active request
            if (lastKeyRef.current !== key) return

            // Update deals state
            const newDeals: Record<string, PlatformPrice[]> = {}
            results.forEach(({ zentrumHubId, platforms }) => {
                if (platforms.length > 0) {
                    newDeals[zentrumHubId] = platforms
                }
            })
            setDeals((prev) => ({ ...prev, ...newDeals }))
        } finally {
            // Clear loading states
            setLoading((prev) => {
                const next = { ...prev }
                hotels.forEach((h) => {
                    delete next[h.zentrumHubId]
                })
                return next
            })
            inFlightRef.current = false
        }
    }, [])

    /**
     * Fetch deal for a single hotel.
     * Simpler API for single-hotel use cases.
     * Fallback logic: if response is empty OR doesn't have Agoda/Trip.com, try fallback request.
     */
    const fetchSingleDeal = useCallback(
        async (params: {
            zentrumHubId: string
            kayakStayId?: string
            hotelName: string
            city: string
            checkIn: string
            checkOut: string
            adults: number
            children: number
            childAges: number[]
            tripId: string
            currency?: string
            noOfRooms?: number
            rimigoPrice?: boolean
            /** Per-room occupancy. When provided, wins over flat adults/children/childAges/noOfRooms. */
            rooms?: RoomOccupancy[]
        }): Promise<PlatformPrice[]> => {
            const {
                zentrumHubId,
                kayakStayId,
                hotelName,
                city,
                checkIn,
                checkOut,
                adults,
                children,
                childAges,
                tripId,
                currency = 'INR',
                noOfRooms,
                rimigoPrice = true,
                rooms
            } = params

            // `tripId` is optional — public hotel pages (/hotel/<slug>) fire this
            // for logged-out viewers. Backend `/api/compare/` handles an empty
            // trip_id; sancus has it auth-bypassed.
            if (!checkIn || !checkOut) {
                return []
            }

            setLoading((prev) => ({ ...prev, [zentrumHubId]: true }))

            const clampChildrenAges = (count: number, ages: number[]): number[] => {
                const next = ages.slice(0, count)
                while (next.length < count) next.push(5)
                return next
            }

            const clampedAges = clampChildrenAges(children, childAges)
            const effectiveRooms = noOfRooms && noOfRooms > 0 ? noOfRooms : 1
            const roomsPayload = rooms && rooms.length > 0
                ? rooms
                : buildRoomsFromFlat(adults, clampedAges, effectiveRooms)
            const baseRequest: HotelPriceCompareRequest = {
                zentrum_hub_id: zentrumHubId,
                kayak_stay_id: kayakStayId,
                hotel_name: hotelName,
                city,
                check_in: checkIn,
                check_out: checkOut,
                currency,
                trip_id: tripId,
                rimigo_price: rimigoPrice,
                rooms: roomsPayload,
            }

            try {
                const result = await fetchHotelPriceCompare(baseRequest, {
                    travelerCollectionId: collectionIdRef.current
                })
                if (result.type === 'error') throw result.error
                setDeals((prev) => ({ ...prev, [zentrumHubId]: result.data }))
                return result.data
            } catch (error) {
                console.error('Failed to fetch deal for hotel', zentrumHubId, error)
                return []
            } finally {
                setLoading((prev) => {
                    const next = { ...prev }
                    delete next[zentrumHubId]
                    return next
                })
            }
        },
        []
    )

    return {
        deals,
        loading,
        fetchDeals,
        fetchSingleDeal,
        clearDeals,
        // Expose refs for advanced use (like StaysExplore)
        inFlightRef,
        lastKeyRef,
        setDeals,
        setLoading
    }
}

export type { PlatformPrice }
