import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FIFTEEN_MINUTES } from '@/constants/commons/tanstackConstants'
import { useHotelDeals, type PlatformPrice } from '@/hooks/useHotelDeals'

interface StayLike {
    id: string
    zentrum_hub_id?: string | null
    name?: string | null
    rate_per_night?: number | null
}

interface StayMetadataLike {
    city_name?: string
    kayak_hotel_id?: string
}

export interface StayPriceEntry {
    displayPrice: number
    platforms: PlatformPrice[]
    isPriceLoading: boolean
    isPriceUnavailable: boolean
}

interface UseStayPricesParams {
    stays: StayLike[]
    stayMetadataMap: Map<string, StayMetadataLike>
    // Per-stay dates may be undefined when section metadata hasn't been resolved
    // and no itinerary window matched. The query is gated below by `!!checkIn`
    // / `!!checkOut`, so undefineds simply skip the fetch.
    staysDatesMap: Map<string, { checkIn: string | undefined; checkOut: string | undefined }>
    staysDates: { checkIn: string; checkOut: string }
    guestsData: { adults: number; children: number; children_age: number[] }
    /** Optional per-room payload. When provided, wins over roomsCount. */
    roomsPayload?: Array<{ adults: number; child_ages: number[] }>
    /** Optional flat room count when roomsPayload isn't available. */
    roomsCount?: number
    rimigoPrice: boolean
    tripId: string | undefined
    /** Caller-controlled gate (e.g. activeTab === 'stays'). */
    enabled: boolean
    /** Optional per-stay extra gate (e.g. wait for section metadata). Both gates must be true to enable a query. */
    isStayReady?: (stay: StayLike) => boolean
    /** Collection (TC or CC) ObjectId in scope — forwarded to /compare so BE
     *  captures the surface on the minted AttributionContext. Pages must pass
     *  this explicitly: `useStayPrices` runs in the page body, OUTSIDE the
     *  TripCollectionRecommendationsProvider the page mounts in its own JSX,
     *  so the in-hook `useCollectionId()` would read `null` from context. */
    collectionId?: string | null
}

const FALLBACK_TRIP_ID = 'rimigo_demo'

function buildGuestsKey(g: { adults: number; children: number; children_age: number[] }): string {
    return `${g.adults}-${g.children}-${(g.children_age || []).join(',')}`
}

function buildRoomsKey(payload?: Array<{ adults: number; child_ages: number[] }>, count?: number): string {
    if (payload && payload.length > 0) return JSON.stringify(payload)
    return `count:${count ?? 1}`
}

export function useStayPrices({
    stays,
    stayMetadataMap,
    staysDatesMap,
    staysDates,
    guestsData,
    roomsPayload,
    roomsCount,
    rimigoPrice,
    tripId,
    enabled,
    isStayReady,
    collectionId,
}: UseStayPricesParams) {
    const { fetchSingleDeal } = useHotelDeals(collectionId)
    const finalTripId = tripId || FALLBACK_TRIP_ID
    const guestsKey = buildGuestsKey(guestsData)
    const roomsKey = buildRoomsKey(roomsPayload, roomsCount)

    const stayPriceQueries = useQueries({
        queries: stays.map((stay) => {
            const stayKey = stay.zentrum_hub_id || stay.id
            const metadata = stayMetadataMap.get(stayKey)
            const cityName = metadata?.city_name || ''
            const kayakStayId = metadata?.kayak_hotel_id
            const zentrumHubId = stay.zentrum_hub_id || undefined

            const dates = staysDatesMap.get(stayKey) || staysDates
            const checkIn = dates.checkIn
            const checkOut = dates.checkOut

            const stayReady = isStayReady ? isStayReady(stay) : true
            const shouldEnable =
                enabled &&
                stayReady &&
                (!!zentrumHubId || !!kayakStayId) &&
                !!checkIn &&
                !!checkOut &&
                !!cityName

            return {
                queryKey: [
                    'stay-price',
                    stayKey,
                    zentrumHubId || '',
                    kayakStayId || '',
                    checkIn,
                    checkOut,
                    guestsKey,
                    roomsKey,
                    rimigoPrice,
                    finalTripId,
                ],
                queryFn: async () => {
                    if ((!zentrumHubId && !kayakStayId) || !checkIn || !checkOut) {
                        return { stayKey, platforms: [] as PlatformPrice[], displayPrice: stay.rate_per_night || 0 }
                    }
                    try {
                        const platforms = await fetchSingleDeal({
                            zentrumHubId: zentrumHubId || '',
                            kayakStayId,
                            hotelName: stay.name || 'Hotel',
                            city: cityName,
                            checkIn,
                            checkOut,
                            adults: guestsData.adults,
                            children: guestsData.children,
                            childAges: guestsData.children_age,
                            tripId: finalTripId,
                            currency: 'INR',
                            noOfRooms: roomsCount,
                            rooms: roomsPayload,
                            rimigoPrice,
                        })
                        const cheapestDeal =
                            platforms.length > 0
                                ? platforms.reduce((cheapest, current) =>
                                      current.price < cheapest.price ? current : cheapest
                                  )
                                : null
                        const displayPrice = cheapestDeal?.price ?? (stay.rate_per_night || 0)
                        return { stayKey, platforms, displayPrice }
                    } catch (error) {
                        toast.error(error as string)
                        return { stayKey, platforms: [] as PlatformPrice[], displayPrice: stay.rate_per_night || 0 }
                    }
                },
                enabled: shouldEnable,
                staleTime: FIFTEEN_MINUTES,
                gcTime: FIFTEEN_MINUTES,
                retry: 1,
            }
        }),
    })

    const stayPricesMap = useMemo(() => {
        const pricesMap = new Map<string, StayPriceEntry>()
        stayPriceQueries.forEach((query, index) => {
            const stay = stays[index]
            if (!stay) return
            const stayKey = stay.zentrum_hub_id || stay.id
            const queryData = query.data

            // fetchStatus 'idle' = not started / disabled. Treat both initial load
            // and refetch as loading; only show "unavailable" after a settled fetch.
            const hasNeverFetched = !queryData && query.fetchStatus === 'idle'
            const isStillLoading = query.isLoading || query.isFetching || hasNeverFetched

            if (queryData) {
                pricesMap.set(stayKey, {
                    displayPrice: queryData.displayPrice,
                    platforms: queryData.platforms,
                    isPriceLoading: query.isFetching,
                    isPriceUnavailable: !query.isFetching && queryData.platforms.length === 0 && !stay.rate_per_night,
                })
            } else {
                pricesMap.set(stayKey, {
                    displayPrice: stay.rate_per_night || 0,
                    platforms: [],
                    isPriceLoading: isStillLoading,
                    isPriceUnavailable: !isStillLoading && !stay.rate_per_night,
                })
            }
        })
        return pricesMap
    }, [stayPriceQueries, stays])

    const isAnyPriceLoading = stayPriceQueries.some((q) => q.isLoading)

    return { stayPricesMap, isAnyPriceLoading }
}
