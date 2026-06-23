import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
// Distance-to-nearest-activity badges on stay cards are disabled.
import type { ActivityPoint as SharedActivityPoint } from '../utils/nearestActivityUtils'
// import {
//     buildDistanceLocationTag,
//     findNearestActivity,
// } from '../utils/nearestActivityUtils'
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import Typography from '@/components/shared/Typography'
import StaysCardSkeleton from '@/pages/Stays/Components/StaysCardSkeleton'
import StaysCardWrapper from './StaysCardWrapper'
import TripboardExploreMoreCard from './TripboardExploreMoreCard'
import {
    getAccommodations,
} from '@/pages/Stays/Apis/accommodationsAPI'
import { fetchRatesHistogram } from '@/pages/Stays/Services/RatesHistogram'
import { useCollectionId } from '@/modules/Tripboard/context/TripCollectionRecommendationsContext'
import {
    buildRoomsFromFlat,
    fetchHotelPriceCompare,
    type PlatformPrice,
    type RoomOccupancy as ApiRoomOccupancy,
} from '@/api/hotelPriceCompare/hotelPriceCompareAPI'
import type { OccupanciesConfig } from '@/types/occupancy'
import type {
    Accommodation,
} from '@/pages/Stays/Types/accommodationTypes'
import type { GuestsData } from '@/components/common/SearchBar/modals/GuestsModal'
import { buildStaysExploreQueryString } from '../utils/tripboardExploreLinks'
import Divider from '@/components/shared/Divider/Divider'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { HOURS_12, HOURS_24 } from '@/constants/commons/tanstackConstants'

/** Re-exported for consumers that already import from this file. */
export type ActivityPoint = SharedActivityPoint

interface StaysExploreSectionProps {
    cityId: string
    cityName: string
    checkIn: string
    checkOut: string
    budgetRange?: { min: number; max: number }
    groupType: string
    travelPurpose: string
    cityPreferences?: string[]
    guestsData: GuestsData
    rooms: number
    occupancies?: OccupanciesConfig
    /** Whether to request Rimigo's own price (true for internal/premium/pro users). */
    rimigoPrice?: boolean
    tripId: string
    collectionIdentifier: string
    savedStayIds: Set<string>
    onAddStay: (stay: Accommodation) => Promise<void>
    onRemoveStay?: (zentrumHubId: string) => Promise<void>
    onAccommodationsLoaded?: (accommodations: Accommodation[]) => void
    /** Invoked when the user clicks "Change dates" from an empty-rates /
     *  timeout terminal state. Parent is expected to open a date picker
     *  seeded with the current `checkIn`/`checkOut` and update the URL
     *  params. No-op if omitted. */
    onRequestDateChange?: () => void
    /** Filters forwarded into the accommodations request. */
    propertyTypes?: string[]
    amenities?: string[]
    isVerified?: boolean | null
    isB2bDealAvailable?: boolean | null
    /** Star-rating filter (3, 4, 5). Applied client-side — backend has no field. */
    starRatings?: number[]
    /** Activities in the current city, used to compute nearest-activity distance. */
    activities?: ActivityPoint[]
    /**
     * When true, the activity-enrichment call is still in flight — show a
     * shimmer in the locationTag slot on each card until data arrives. Once
     * false, cards with a resolved nearest-activity show the distance badge;
     * cards without fall through to no text at all (we don't surface the
     * generic "Near <city>" fallback when we're in distance mode).
     */
    isActivitiesLoading?: boolean
}

// Stable references for the "no data yet" state. Without this, `?? []` at
// call sites creates a fresh empty array each render, which makes downstream
// useMemos/useEffects recompute unnecessarily and cascades into an
// `onAccommodationsLoaded` render loop with the parent.
const EMPTY_ACCOMMODATIONS: Accommodation[] = []

const TOTAL_DISPLAY_LIMIT = 12 // list + map share one capped result set
const DEFAULT_MIN_MATCH_SCORE = 0
const FALLBACK_IMAGE = 'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/hotel.png'
const DEFAULT_CITY_PREFERENCES = ['station_nearby', 'nightlife', 'city_center']

/**
 * Expand a budget window outward in `width` steps, starting from the next
 * window above the user's range. Step 1 = [max+1, max+width+1].
 */
function expandBudget(
    original: { min: number; max: number } | undefined,
    step: number
): { min: number; max: number } | undefined {
    if (!original) return undefined
    const width = Math.max(1, original.max - original.min)
    return {
        min: original.max + 1 + width * (step - 1),
        max: original.max + width * step + 1,
    }
}

/** Map raw Accommodation from API to StaysCard props */
function mapAccommodationToCard(
    acc: Accommodation,
    index: number,
    cityId: string,
    cityName: string,
    checkIn: string,
    checkOut: string,
    travelPurpose: string,
    groupType: string,
    guestsData: GuestsData,
    occupancies?: OccupanciesConfig,
) {
    return {
        id: index + 1,
        title: acc.name || 'Hotel',
        price: Math.round(acc.rate_per_night || 0),
        image: acc.content?.[0] || FALLBACK_IMAGE,
        platformReviews: acc.review_data?.platform_reviews || [],
        locationTag: acc.review_data?.location_tags?.[0] || '',
        curatedLabels: acc.curated_labels || [],
        overallRating: acc.overall_rating,
        zentrumHubId: acc.zentrum_hub_id || undefined,
        cityId,
        cityName,
        checkIn,
        checkOut,
        travelPurpose,
        groupType,
        preferences: [] as string[],
        guestsData,
        occupancies,
        reviewType: 'complete' as const,
    }
}

const StaysExploreSection: React.FC<StaysExploreSectionProps> = ({
    cityId,
    cityName,
    checkIn,
    checkOut,
    budgetRange,
    groupType,
    travelPurpose,
    cityPreferences = DEFAULT_CITY_PREFERENCES,
    guestsData,
    rooms,
    occupancies,
    rimigoPrice = false,
    tripId,
    collectionIdentifier,
    savedStayIds,
    onAddStay,
    onRemoveStay,
    onAccommodationsLoaded,
    onRequestDateChange,
    propertyTypes,
    amenities,
    isVerified,
    isB2bDealAvailable,
    starRatings,
    // Activities prop retained on the interface (still passed by callers)
    // but unused now that distance-to-nearest-activity badges are disabled.
    activities: _activities = [],
    isActivitiesLoading = false,
}) => {
    void _activities
    const queryClient = useQueryClient()
    const [addingIds, setAddingIds] = useState<Set<string>>(new Set())
    const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
    const [localSavedIds, setLocalSavedIds] = useState<Set<string>>(new Set())
    const [localRemovedIds, setLocalRemovedIds] = useState<Set<string>>(new Set())

    const allSavedIds = useMemo(() => {
        const merged = new Set(savedStayIds)
        localSavedIds.forEach((id) => merged.add(id))
        localRemovedIds.forEach((id) => merged.delete(id))
        return merged
    }, [savedStayIds, localSavedIds, localRemovedIds])

    // Reset local saved-ids when collection context changes, so the "added"
    // badge reflects the latest trip state.
    useEffect(() => {
        setLocalSavedIds(new Set())
    }, [collectionIdentifier, tripId])

    const hasCityContext = !!cityId && !!checkIn && !!checkOut

    // Backend's `_get_score_rankings` fallback crashes on empty city_preferences;
    // enforce the default at the call boundary so no empty array ever reaches the API.
    const safeCityPreferences = useMemo(
        () => (cityPreferences && cityPreferences.length > 0 ? cityPreferences : DEFAULT_CITY_PREFERENCES),
        [cityPreferences]
    )

    // ── Rates histogram (SSE under the hood via fetchRatesHistogram) ─────────
    // Accepts both `completed` and `estimated` as "ready". React Query key
    // includes cityId + dates + guests so switching city fires a fresh query
    // in parallel rather than cancelling the prior city's in-flight stream.
    const ratesQuery = useQuery({
        queryKey: [
            'explore-rates',
            cityId,
            checkIn,
            checkOut,
            guestsData.adults,
            guestsData.children,
            guestsData.infants,
            (guestsData.children_age ?? []).join(','),
        ],
        queryFn: () =>
            fetchRatesHistogram({
                cityId,
                check_in: checkIn,
                check_out: checkOut,
                num_adults: guestsData.adults,
                child_ages: guestsData.children_age,
                num_infants: guestsData.infants,
            }),
        enabled: hasCityContext,
        staleTime: HOURS_12,
        gcTime: HOURS_12,
        retry: 2,
    })

    const ratesStatus = ratesQuery.data?.data?.status
    // Permissive gate: viewport fires as soon as SSE returns either 'estimated'
    // (per-hotel cached rates → fast first paint) or 'completed' (real Zentrum
    // rates). The refetch effect below upgrades the viewport when the SSE
    // later transitions estimated → completed, so cards swap stale rates for
    // real ones in place without a skeleton flash.
    const isRatesReady = !ratesQuery.isLoading && (ratesStatus === 'completed' || ratesStatus === 'estimated')

    // When rates resolve to 'estimated', kick off a background refetch so we
    // upgrade to 'completed' without blocking rendering.
    useEffect(() => {
        if (ratesStatus !== 'estimated') return
        if (!hasCityContext) return
        const t = setTimeout(() => {
            queryClient.invalidateQueries({
                queryKey: ['explore-rates', cityId, checkIn, checkOut],
            })
        }, 1500)
        return () => clearTimeout(t)
    }, [ratesStatus, hasCityContext, cityId, checkIn, checkOut, queryClient])

    // ── City-scoped list query ──────────────────────────────────────────────
    // No bbox is sent: server ranks by match_score and we render top 12.
    // Map markers come from a separate viewport endpoint, so the list staying
    // city-scoped keeps cache keys shareable across pans/users.
    const viewportQuery = useQuery({
        queryKey: [
            'explore-viewport',
            cityId,
            checkIn,
            checkOut,
            groupType,
            travelPurpose,
            JSON.stringify(budgetRange ?? null),
            JSON.stringify(safeCityPreferences),
            JSON.stringify(propertyTypes ?? []),
            JSON.stringify(amenities ?? []),
            JSON.stringify(starRatings ?? []),
            isVerified ?? null,
            isB2bDealAvailable ?? null,
        ],
        queryFn: async () => {
            if (!cityId) return [] as Accommodation[]
            const firstPassBudget = budgetRange
            const baseParams = {
                cityId,
                travel_purpose: travelPurpose,
                group_type: groupType,
                check_in_date: checkIn,
                check_out_date: checkOut,
                city_preferences: safeCityPreferences,
                include_hot_picks: true,
                page: 1,
                limit: TOTAL_DISPLAY_LIMIT,
                min_match_score: DEFAULT_MIN_MATCH_SCORE,
                order_by: { match_score: -1 as const },
                exclude_unpriced: true,
                ...(propertyTypes && propertyTypes.length > 0 ? { property_types: propertyTypes } : {}),
                ...(amenities && amenities.length > 0 ? { amenities } : {}),
                ...(starRatings && starRatings.length > 0 ? { star_ratings: starRatings } : {}),
                ...(isVerified === true ? { is_verified: true } : {}),
                ...(isB2bDealAvailable === true ? { is_b2b_deal_available: true } : {}),
            }
            const firstPass = await getAccommodations({ ...baseParams, budget_range: firstPassBudget })
            const firstItems = firstPass.data?.data ?? []
            if (firstItems.length > 0 || !firstPassBudget) {
                return firstItems as Accommodation[]
            }

            // Zero results + budget set → one expanded-window retry, then
            // drop the budget filter entirely. Inventory-sparse cities
            // (e.g. only premium stays exist) should still surface *something*
            // rather than show an empty state.
            const expanded = expandBudget(firstPassBudget, 1)
            const retry = await getAccommodations({ ...baseParams, budget_range: expanded })
            const retryItems = retry.data?.data ?? []
            if (retryItems.length > 0) {
                return retryItems as Accommodation[]
            }

            // Final fallback: no budget filter at all.
            const noBudget = await getAccommodations({ ...baseParams })
            return (noBudget.data?.data ?? []) as Accommodation[]
        },
        enabled: hasCityContext && isRatesReady,
        staleTime: HOURS_12,
        gcTime: HOURS_12,
    })

    // Cards painted on `estimated` show per-hotel-cache rates (date-agnostic,
    // possibly slightly stale). On the SSE upgrade to `completed`, refetch
    // the viewport so cards swap to real Zentrum rates for the user's dates
    // — queryKey stays the same, data merges in place, no skeleton flash.
    const prevRatesStatusRef = useRef<string | undefined>(undefined)
    useEffect(() => {
        const prev = prevRatesStatusRef.current
        prevRatesStatusRef.current = ratesStatus
        if (prev === 'estimated' && ratesStatus === 'completed' && hasCityContext) {
            void viewportQuery.refetch()
        }
    }, [ratesStatus, hasCityContext, viewportQuery])

    // `EMPTY_ACCOMMODATIONS` sentinel keeps the reference stable during loads.
    // Star-rating filter is applied server-side — see star_ratings param above.
    const allAccommodations = viewportQuery.data ?? EMPTY_ACCOMMODATIONS

    // Stays already attached to the active itinerary for this city.
    // Used both to (a) inject a synthetic Accommodation when the backend
    // ranking doesn't surface the user's chosen hotel in the top N, and
    // (b) drive rank-0 in the display sort so it's always the first card.
    const travelerTripsCtx = useOptionalTravelerTrips()
    const itineraryStaysInCity = useMemo(() => {
        if (!cityId) return []
        const activeTripId = travelerTripsCtx?.activeTrip?.trip_id
        const itin = activeTripId ? travelerTripsCtx?.tripItineraries?.[activeTripId] : null
        return (itin?.stays ?? []).filter((s) => s.city_id === cityId && s.zentrum_hub_id)
    }, [cityId, travelerTripsCtx?.activeTrip?.trip_id, travelerTripsCtx?.tripItineraries])

    const itineraryHubIdsInCity = useMemo(() => {
        const set = new Set<string>()
        for (const s of itineraryStaysInCity) set.add(s.zentrum_hub_id)
        return set
    }, [itineraryStaysInCity])

    // Split into the "list" (top N) and the "map" (all). One source of truth.
    // Also prepends a synthetic Accommodation for any itinerary hotel the
    // backend ranking didn't include, so the card is always rendered.
    const listAccommodations = useMemo(() => {
        const base =
            allAccommodations.length > 0 ? allAccommodations.slice(0, TOTAL_DISPLAY_LIMIT) : EMPTY_ACCOMMODATIONS
        if (itineraryStaysInCity.length === 0) return base
        const presentHubs = new Set(base.map((a) => a.zentrum_hub_id).filter(Boolean))
        const missing = itineraryStaysInCity.filter((s) => !presentHubs.has(s.zentrum_hub_id))
        if (missing.length === 0) return base
        const injected: Accommodation[] = missing.map((s) => ({
            id: s.accommodation_id || s.stay_id,
            name: s.hotel_name || 'Hotel',
            zentrum_hub_id: s.zentrum_hub_id,
            serp_search_name: '',
            serp_property_token: '',
            base_city_info: { id: s.city_id || cityId, name: cityName },
            category: null,
            month_wise_pricing: {},
            review_data: {
                zentrum_hub_id: s.zentrum_hub_id,
                overall_score: 0,
                platform_reviews: [],
                location_tags: [],
                suitability: {},
                review_status: 'unknown',
            },
            content: s.hotel_image_url ? [s.hotel_image_url] : [],
            score_map: {},
            rate_per_night: 0,
            curated_labels: [],
            geo_location: {
                lat: s.latitude != null ? String(s.latitude) : '',
                long: s.longitude != null ? String(s.longitude) : '',
            },
            overall_rating: 0,
        }))
        return [...injected, ...base]
    }, [allAccommodations, itineraryStaysInCity, cityId, cityName])

    // Distance-to-nearest-activity badges disabled — kept commented for
    // easy re-enable if we bring the badge back.
    // const nearestActivityByStayId = useMemo(() => {
    //     const out = new Map<string, { km: number; activity: ActivityPoint }>()
    //     if (!activities || activities.length === 0) return out
    //     for (const acc of allAccommodations) {
    //         const key = acc.zentrum_hub_id || acc.id
    //         if (!key) continue
    //         const lat = parseFloat(acc.geo_location?.lat ?? '')
    //         const lng = parseFloat(acc.geo_location?.long ?? '')
    //         const nearest = findNearestActivity({ lat, lng }, activities)
    //         if (nearest) out.set(String(key), nearest)
    //     }
    //     return out
    // }, [allAccommodations, activities])

    // Propagate the displayed list (top N) to parent so map markers exactly
    // match the cards shown. Ref-dedup on hub IDs to avoid re-notifying on
    // identity churn.
    const lastNotifiedKeyRef = useRef<string>('')
    useEffect(() => {
        if (!onAccommodationsLoaded) return
        const key = listAccommodations.map((a) => a.zentrum_hub_id || a.id).join('|')
        if (key === lastNotifiedKeyRef.current) return
        lastNotifiedKeyRef.current = key
        onAccommodationsLoaded(listAccommodations)
    }, [listAccommodations, onAccommodationsLoaded])

    // ── Per-hotel price compare, keyed by zentrum_hub_id ──────────────────────
    // Survives city switches; hotels appearing across multiple cities don't refetch.
    // We compare only the top-6 listed hotels (no need to fetch prices for
    // markers that don't have cards).
    const priceKeys = useMemo(
        () =>
            listAccommodations
                .map((acc) => acc.zentrum_hub_id)
                .filter((id): id is string => Boolean(id)),
        [listAccommodations]
    )

    const priceResults = useBatchPriceCompare({
        hubIds: priceKeys,
        combined: listAccommodations,
        cityName,
        checkIn,
        checkOut,
        guestsData,
        rooms,
        occupancies,
        rimigoPrice,
        tripId,
    })

    // ── Card mappings (single list, capped at TOTAL_DISPLAY_LIMIT) ────────────
    const listCards = useMemo(
        () =>
            listAccommodations.map((acc, i) =>
                mapAccommodationToCard(
                    acc,
                    i,
                    cityId,
                    cityName,
                    checkIn,
                    checkOut,
                    travelPurpose,
                    groupType,
                    guestsData,
                    occupancies
                )
            ),
        [listAccommodations, cityId, cityName, checkIn, checkOut, travelPurpose, groupType, guestsData, occupancies]
    )

    // Stable 3-way partition: stays already in the itinerary first, then
    // stays with resolved prices, then everything else. Priced stays
    // float up as `useBatchPriceCompare` streams results in; original
    // order is preserved within each bucket.
    const displayOrder = useMemo(() => {
        const rank = (acc: Accommodation): number => {
            const hub = acc.zentrum_hub_id
            if (hub && itineraryHubIdsInCity.has(hub)) return 0
            const price = hub ? priceResults.get(hub) : undefined
            if (price && !price.isLoading && price.platforms.length > 0) return 1
            return 2
        }
        return listAccommodations
            .map((acc, i) => ({ i, r: rank(acc) }))
            .sort((a, b) => (a.r === b.r ? a.i - b.i : a.r - b.r))
            .map(({ i }) => i)
    }, [listAccommodations, priceResults, itineraryHubIdsInCity])

    // ── Add stay handler ──────────────────────────────────────────────────────
    const handleAddStay = useCallback(
        async (acc: Accommodation) => {
            const key = acc.zentrum_hub_id
            if (!key || !collectionIdentifier) return
            setAddingIds((prev) => new Set(prev).add(key))
            try {
                await onAddStay(acc)
                setLocalSavedIds((prev) => new Set(prev).add(key))
                // Clear from removed set in case this is a re-shortlist after un-shortlisting.
                setLocalRemovedIds((prev) => { const n = new Set(prev); n.delete(key); return n })
                // Do NOT invalidate here. The parent's collection query is shared
                // across multiple features (Itinerary inline picker, stayPricesMap,
                // etc.), so triggering it immediately causes an unnecessary re-render
                // storm while the user is browsing For You. The parent (StaysTab)
                // will invalidate lazily the moment the user switches to Shortlist.
                toast.success('Stay added to your tripboard')
            } catch {
                toast.error('Failed to add stay. Please try again.')
            } finally {
                setAddingIds((prev) => {
                    const next = new Set(prev)
                    next.delete(key)
                    return next
                })
            }
        },
        [collectionIdentifier, onAddStay, queryClient]
    )

    // ── Remove stay handler (un-shortlist from For You) ──────────────────────
    const handleRemoveStay = useCallback(
        async (acc: Accommodation) => {
            const key = acc.zentrum_hub_id
            if (!key || !onRemoveStay) return
            setRemovingIds((prev) => new Set(prev).add(key))
            // Optimistic removal: unfill heart immediately and clear from saved set.
            setLocalRemovedIds((prev) => new Set(prev).add(key))
            setLocalSavedIds((prev) => { const n = new Set(prev); n.delete(key); return n })
            try {
                await onRemoveStay(key)
                toast.success('Stay removed from tripboard')
            } catch {
                // Revert optimistic removal on failure
                setLocalRemovedIds((prev) => {
                    const next = new Set(prev)
                    next.delete(key)
                    return next
                })
                toast.error('Failed to remove stay. Please try again.')
            } finally {
                setRemovingIds((prev) => {
                    const next = new Set(prev)
                    next.delete(key)
                    return next
                })
            }
        },
        [onRemoveStay]
    )


    // ── Shared UI fragments ───────────────────────────────────────────────────
    // Reuse the single canonical list-view skeleton so every loading
    // phase (rates histogram → accommodations viewport → enrichment)
    // renders the same shape. Two back-to-back shimmers used to render
    // different layouts which looked like the UI was "switching skeletons".
    const cardShimmer = (
        <StaysCardSkeleton viewType="list" />
    )

    const exploreAllLink = useMemo(() => {
        if (!cityId || !cityName || !checkIn || !checkOut) return null
        const qs = buildStaysExploreQueryString({
            cityId,
            cityName,
            checkIn,
            checkOut,
            adults: String(guestsData.adults),
            children: String(guestsData.children),
            infants: String(guestsData.infants),
            childrenAge: guestsData.children_age?.length ? guestsData.children_age.join(',') : undefined,
        })
        return `/stays?${qs}`
    }, [cityId, cityName, checkIn, checkOut, guestsData])

    // ── Card renderer ─────────────────────────────────────────────────────────
    const renderCard = useCallback(
        (card: ReturnType<typeof mapAccommodationToCard>, acc: Accommodation) => {
            const key = card.zentrumHubId || String(card.id)
            const isSaved = allSavedIds.has(key)
            const isAdding = addingIds.has(key)
            const isRemoving = removingIds.has(key)
            const priceData = card.zentrumHubId ? priceResults.get(card.zentrumHubId) : undefined
            // const nearest = nearestActivityByStayId.get(String(acc.zentrum_hub_id || acc.id))
            // const distanceNode = buildDistanceLocationTag(nearest ?? null)
            const distanceNode: React.ReactNode = null
            // Fall back to the accommodation's own `location_tags[0]` (e.g.
            // "Near Orchard Road") since the distance-to-activity badge is
            // disabled. Previously this was hard-null'd which hid the tag
            // entirely — `card.locationTag` comes from
            // `mapAccommodationToCard` → `acc.review_data?.location_tags?.[0]`.
            const resolvedLocationTag: React.ReactNode = card.locationTag || null

            return (
                <div key={key} className="relative">
                    <StaysCardWrapper
                        stay={{
                            id: acc.id,
                            name: acc.name,
                            rate_per_night: acc.rate_per_night,
                            banner_img: acc.content?.[0] || '',
                            zentrum_hub_id: acc.zentrum_hub_id,
                        } as any}
                        index={card.id - 1}
                        locationTag={resolvedLocationTag}
                        locationTagLoading={isActivitiesLoading && !distanceNode}
                        imageUrl={card.image}
                        images={acc.content}
                        platformReviews={acc.review_data?.platform_reviews}
                        starRating={acc.star_rating}
                        zentrumHubId={card.zentrumHubId || ''}
                        checkIn={card.checkIn}
                        checkOut={card.checkOut}
                        cityId={card.cityId}
                        cityName={card.cityName}
                        travelPurpose={card.travelPurpose}
                        groupType={card.groupType}
                        preferences={card.preferences}
                        guestsData={card.guestsData}
                        occupancies={card.occupancies}
                        viewType="list"
                        curatedLabels={card.curatedLabels}
                        category={acc.category}
                        buttonPage="tripboard_explore"
                        priceData={(() => {
                            // Fallback: when compare API (Kayak / Rimigo / etc) returns no
                            // platforms, fall back to acc.rate_per_night from the list endpoint
                            // — same pattern useStayPriceAndDeals uses for Rimigo missing.
                            const ratePerNightFallback = typeof acc.rate_per_night === 'number' && acc.rate_per_night > 0
                                ? acc.rate_per_night
                                : 0
                            if (!priceData) {
                                return ratePerNightFallback > 0
                                    ? { displayPrice: ratePerNightFallback, platforms: [], isPriceLoading: false, isPriceUnavailable: false }
                                    : undefined
                            }
                            const platformsCount = priceData.platforms?.length ?? 0
                            const cheapest = priceData.platforms?.find((p) => p.is_cheapest)?.price ?? priceData.platforms?.[0]?.price
                            const displayPrice = cheapest ?? ratePerNightFallback
                            return {
                                displayPrice,
                                platforms: priceData.platforms,
                                isPriceLoading: priceData.isLoading,
                                isPriceUnavailable:
                                    !priceData.isLoading && platformsCount === 0 && ratePerNightFallback === 0,
                            }
                        })()}
                        isShortlisted={isSaved}
                        isShortlisting={isAdding || isRemoving}
                        onToggleShortlist={
                            isSaved
                                ? onRemoveStay ? () => void handleRemoveStay(acc) : undefined
                                : () => void handleAddStay(acc)
                        }
                        onAddToCollection={false as any}
                        isAvailableOnAirbnb={acc.is_available_on_airbnb || false}
                        onView3D={(() => {
                            const lat = parseFloat(acc.geo_location?.lat || '0')
                            const lng = parseFloat(acc.geo_location?.long || '0')
                            const hasValidGeo =
                                acc.geo_location?.lat &&
                                acc.geo_location?.long &&
                                !isNaN(lat) && !isNaN(lng) &&
                                !(lat === 0 && lng === 0) &&
                                (!cityId || acc.base_city_info?.id === cityId)
                            return hasValidGeo
                                ? () => {
                                      window.dispatchEvent(
                                          new CustomEvent('collection:focusMarker', {
                                              detail: { id: `explore-${acc.zentrum_hub_id}` },
                                          })
                                      )
                                  }
                                : undefined
                        })()}
                    />
                </div>
            )
        },
        [allSavedIds, addingIds, removingIds, priceResults, handleAddStay, handleRemoveStay, onRemoveStay, cityId, isActivitiesLoading]
    )

    // ── Render states ────────────────────────────────────────────────────────

    // City not yet resolved (auto-select still computing, or trip has no cities)
    // — render skeleton, NEVER empty text.
    if (!hasCityContext) {
        return (
            <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i}>{cardShimmer}</div>
                ))}
            </div>
        )
    }

    // Rates terminal failure — unified for error / timeout / empty.
    // Evaluated BEFORE the loading shimmer so these settled-but-unusable
    // states don't get eaten by the `!isRatesReady` shimmer gate.
    // Backend signals three distinct failure modes:
    //   1. `ratesQuery.isError`      — network/fetch threw
    //   2. `status: "timeout"`       — polling exhausted its window
    //   3. `data: null` / total=0    — SSE completed but found 0 hotels
    // UX-wise all three mean the same thing: user can't see stays with
    // the current (city, dates) combo and needs to retry or pick new
    // dates. Collapse into a single branch to avoid the "which empty
    // state is this?" confusion.
    const ratesPayload = ratesQuery.data?.data ?? null
    const ratesTimedOut = ratesPayload?.status === 'timeout'
    const ratesEmpty =
        !ratesQuery.isLoading &&
        (ratesQuery.isError ||
            (ratesQuery.isFetched && ratesPayload == null) ||
            ratesPayload?.total_hotels === 0 ||
            ratesTimedOut)
    if (ratesEmpty) {
        return (
            <div className="flex flex-col gap-3">
                <div className="text-center py-8">
                    <Typography size="16" weight="semibold" color="grey-0">
                        Unable to load stays
                    </Typography>
                    <div className="mt-1">
                        <Typography size="14" weight="medium" color="grey-2">
                            Try a different date range to see available stays.
                        </Typography>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => ratesQuery.refetch()}
                            className="px-4 py-2 rounded-md border border-grey-4 text-grey-0 hover:bg-grey-5 transition-colors text-sm">
                            Retry
                        </button>
                        {onRequestDateChange && (
                            <button
                                type="button"
                                onClick={onRequestDateChange}
                                className="px-4 py-2 rounded-md bg-primary-default text-white hover:bg-primary-dark transition-colors text-sm">
                                Change dates
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Rates in flight. Shimmer until the SSE returns either "estimated" (fast
    // first paint via per-hotel cached rates) or "completed" (real Zentrum).
    // When estimated lands the viewport fires; the refetch effect above then
    // upgrades cards in place once SSE transitions to completed.
    if (ratesQuery.isLoading || (!isRatesReady && !ratesQuery.isError)) {
        return (
            <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i}>{cardShimmer}</div>
                ))}
            </div>
        )
    }

    // Initial viewport query pending
    if (viewportQuery.isLoading && allAccommodations.length === 0) {
        return (
            <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i}>{cardShimmer}</div>
                ))}
            </div>
        )
    }

    // Query settled but produced zero results (budget fallback also exhausted)
    if (allAccommodations.length === 0) {
        if (viewportQuery.isError) {
            return (
                <div className="flex flex-col gap-3">
                    <Divider className="my-1" />
                    <div className="text-center py-8">
                        <Typography size="14" weight="medium" color="grey-2">
                            Unable to load stays. Please try again.
                        </Typography>
                        <button
                            type="button"
                            onClick={() => viewportQuery.refetch()}
                            className="mt-3 px-4 py-2 rounded-md border border-grey-4 text-grey-0 hover:bg-grey-5 transition-colors text-sm">
                            Retry
                        </button>
                    </div>
                </div>
            )
        }

        return (
            <div className="flex flex-col gap-3">
                <Divider className="my-1" />
                <Typography size="16" weight="semibold" color="grey-0">
                    Explore Stays
                </Typography>
                <div className="text-center py-8">
                    <Typography size="14" weight="medium" color="grey-2">
                        No stays found in this area.
                    </Typography>
                </div>
                {exploreAllLink && (
                    <TripboardExploreMoreCard
                        variant="stays"
                        subtitle={`Discover more stays in ${cityName} tailored to your trip`}
                        to={exploreAllLink}
                    />
                )}
            </div>
        )
    }

    // Happy path — render up to TOTAL_DISPLAY_LIMIT (12) stays from the viewport result.
    return (
        <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:gap-x-6 sm:gap-y-4 items-start">
                {displayOrder.map((i) => renderCard(listCards[i], listAccommodations[i]))}
            </div>

            {exploreAllLink && (
                <TripboardExploreMoreCard
                    variant="stays"
                    subtitle={`Discover more stays in ${cityName} tailored to your trip`}
                    to={exploreAllLink}
                />
            )}
        </div>
    )
}

/**
 * Batched per-hotel price-compare, backed by React Query so results are cached
 * by `zentrum_hub_id + dates + guests + rooms` and survive city switches.
 * Returns a Map<hubId, { platforms, isLoading }> for the caller.
 */
function useBatchPriceCompare(args: {
    hubIds: string[]
    combined: Accommodation[]
    cityName: string
    checkIn: string
    checkOut: string
    guestsData: GuestsData
    rooms: number
    occupancies?: OccupanciesConfig
    rimigoPrice?: boolean
    tripId: string
}): Map<string, { platforms: PlatformPrice[]; isLoading: boolean }> {
    const { hubIds, combined, cityName, checkIn, checkOut, guestsData, rooms, occupancies, rimigoPrice = false, tripId } = args

    // Collection (TC or CC) ObjectId in scope — forwarded to /compare so BE
    // captures the surface on the minted AttributionContext.
    const collectionIdForAttribution = useCollectionId()

    const hotelByHub = useMemo(() => {
        const m = new Map<string, Accommodation>()
        for (const acc of combined) {
            if (acc.zentrum_hub_id) m.set(acc.zentrum_hub_id, acc)
        }
        return m
    }, [combined])

    const roomsPayload = useMemo<ApiRoomOccupancy[]>(() => {
        if (occupancies && occupancies.length > 0) {
            return occupancies.map((r) => ({ adults: r.numOfAdults, child_ages: r.childAges }))
        }
        return buildRoomsFromFlat(
            guestsData.adults,
            guestsData.children_age ?? [],
            rooms || 1,
        )
    }, [occupancies, guestsData.adults, guestsData.children_age, rooms])
    const roomsKey = useMemo(() => JSON.stringify(roomsPayload), [roomsPayload])

    // Dynamic list of parallel queries. `useQueries` is the idiomatic pattern
    // here — it subscribes the component to each query's cache, so results
    // re-render automatically without any manual forceUpdate / cache
    // subscription. Replacing the previous hand-rolled approach that caused a
    // render loop in "For You" mode.
    const queries = useQueries({
        queries: hubIds.map((hubId) => ({
            queryKey: ['stay-price-compare', hubId, checkIn, checkOut, roomsKey, rimigoPrice] as const,
            queryFn: async (): Promise<PlatformPrice[]> => {
                const acc = hotelByHub.get(hubId)
                if (!acc) return []
                const result = await fetchHotelPriceCompare({
                    zentrum_hub_id: hubId,
                    hotel_name: acc.name,
                    city: cityName,
                    check_in: checkIn,
                    check_out: checkOut,
                    currency: 'INR',
                    trip_id: tripId,
                    rimigo_price: rimigoPrice,
                    rooms: roomsPayload,
                }, {
                    travelerCollectionId: collectionIdForAttribution
                })
                if (result.type === 'error') throw result.error
                return result.data as PlatformPrice[]
            },
            enabled: Boolean(hubId && checkIn && checkOut),
            staleTime: HOURS_12,
            gcTime: HOURS_24,
        })),
    })

    return useMemo(() => {
        const map = new Map<string, { platforms: PlatformPrice[]; isLoading: boolean }>()
        hubIds.forEach((hubId, i) => {
            const q = queries[i]
            map.set(hubId, {
                platforms: q?.data ?? [],
                isLoading: q?.isLoading ?? false,
            })
        })
        return map
        // `queries` reference changes with every cache update for any of the
        // subscribed keys — that's the signal we need to rebuild the map.
    }, [hubIds, queries])
}

export default StaysExploreSection
