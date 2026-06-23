import { useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adaptCollectionSectionToExperienceCard } from '../adapter/experienceCardAdapter'
import type { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import type { MapMarker } from '@/components/shared/Map/GenericMap'
import type { Section, ApiResponse, ContentCollection } from '../types/contentCollection'
import type { AccommodationMetadataItem } from '@/pages/Stays/Apis/accommodationsAPI'
import type { Accommodation } from '@/pages/Stays/Types/accommodationTypes'
import type { PlatformPrice } from '@/api/hotelPriceCompare/hotelPriceCompareAPI'
import { formatDateToYMD, getDayAfterTomorrowDate, getTomorrowDate, isPastDate } from '@/utils/dateUtils'
import { useCitiesByIdsForMap } from '@/hooks/useCitiesByIdsForMap'
import { useUserInfo } from '@/hooks/useUserInfo'
import { buildFoodItemsFromItinerary } from '../utils/itineraryFoodAdapter'
import { placePhotoProxyUrl } from '@/modules/Itinerary/utils/mealPlaceImage'
import { FOOD_NAME_KEYWORDS_TO_ICON, FOOD_FALLBACK_ICON } from '@/constants/thiingsIcons'

function getRestaurantIconForName(name: string): string {
    if (!name || typeof name !== 'string') return FOOD_FALLBACK_ICON
    const lower = name.toLowerCase()
    for (const [keyword, iconUrl] of Object.entries(FOOD_NAME_KEYWORDS_TO_ICON)) {
        if (lower.includes(keyword)) return iconUrl
    }
    return FOOD_FALLBACK_ICON
}
import type { IItineraryCompletedResponse } from '@/modules/Itinerary/hooks/ItineraryHook'

interface UseCollectionMapMarkersParams {
    experienceCollectionResponse?: ApiResponse<ContentCollection> | null
    staysCollectionResponse?: ApiResponse<ContentCollection> | null
    staysMetadataResponse?: { data: { data: AccommodationMetadataItem[] } } | null
    stayPricesMap?: Map<string, { displayPrice: number; platforms: PlatformPrice[]; isPriceLoading: boolean; isPriceUnavailable: boolean }>
    cityIdForFilters?: string
    restaurantCollectionResponse?: ApiResponse<ContentCollection> | null
    /** When false, city markers are not included in mapMarkers (default: true) */
    includeCityMarkers?: boolean
    /** When false, map cities API is not called; set true only after experience, stays, and food section responses have completed (default: true) */
    enableMapCitiesApi?: boolean
    /** Explore section accommodations for map markers (distinct from saved stays) */
    exploreAccommodations?: Accommodation[]
    /**
     * When true, saved-stay markers (from `staysCollectionResponse` / metadata)
     * are omitted — only explore accommodations show as stay markers. Used by
     * the Tripboard "For You" view so list + map share one source of truth.
     */
    omitSavedStayMarkers?: boolean
    /**
     * Bulk-fetched experience data keyed by experience_id (from
     * `useExperiencesEnrichment`). When provided, experience markers read
     * lat/lng + city_id from here instead of `section.metadata.location` —
     * enables slim section payloads where metadata only holds dates.
     */
    enrichedExperiencesMap?: Map<string, import('@/modules/Experiences/api/experienceBatchAPI').EnrichedExperience>
    /**
     * When true, experience marker rendering is suppressed until enrichment
     * settles — avoids flashing markers with empty images / wrong locations
     * (legacy section metadata fallback) during the brief window before the
     * batch API response arrives.
     */
    isExperiencesEnrichmentLoading?: boolean
    /**
     * Completed-itinerary payload. Fallback source for restaurant markers
     * when the collection has no `section_type: 'restaurant'` sections —
     * mirrors FoodTabContent's priority chain (collection first, itinerary
     * meal slots second). No additional API calls; purely a view transform.
     */
    itineraryData?: IItineraryCompletedResponse | null
    /**
     * Fallback check-in / check-out used when a stay section has no usable
     * `metadata.start_date` / `end_date`. Callers (Tripboard) pass the
     * trip's itinerary window so map-popup "View deal" links open with the
     * actual trip dates instead of a hardcoded "tomorrow" placeholder.
     */
    tripFallbackDates?: { checkIn: string; checkOut: string }
}

interface UseCollectionMapMarkersReturn {
    mapMarkers: MapMarker[]
    mapCityName: string
    mapCityCenter: { lon: number; lat: number } | null
    mapCities: Array<{ id: string; name: string }>
}

/**
 * Hook to manage map markers for content collections
 * Accepts fetched data as props and creates map markers
 * Uses compare API prices for stay markers (total_price from compare API response)
 */
export const useCollectionMapMarkers = ({
    experienceCollectionResponse,
    staysCollectionResponse,
    staysMetadataResponse,
    stayPricesMap,
    cityIdForFilters,
    restaurantCollectionResponse,
    includeCityMarkers = true,
    enableMapCitiesApi = true,
    exploreAccommodations,
    omitSavedStayMarkers = false,
    enrichedExperiencesMap,
    isExperiencesEnrichmentLoading = false,
    itineraryData,
    tripFallbackDates,
}: UseCollectionMapMarkersParams): UseCollectionMapMarkersReturn => {
    const [searchParams] = useSearchParams()
    const { isRimigoInternal } = useUserInfo()

    // Default check-in/check-out for stay markers' onClickData. Prefer the
    // caller-provided trip window (Tripboard passes itinerary dates) so
    // map-popup deal links land on the right page state. Fall back to
    // tomorrow/day-after only when no trip context is available.
    const defaultDates = useMemo(() => {
        if (tripFallbackDates?.checkIn && tripFallbackDates?.checkOut) {
            return tripFallbackDates
        }
        return {
            checkIn: getTomorrowDate(),
            checkOut: getDayAfterTomorrowDate()
        }
    }, [tripFallbackDates?.checkIn, tripFallbackDates?.checkOut])

    // Extract experiences for map
    const experiencesForMap = useMemo(() => {
        if (!experienceCollectionResponse?.data?.sections) return []
        return experienceCollectionResponse.data.sections
            .filter((section: Section) => section.section_type === 'experience')
            .map(adaptCollectionSectionToExperienceCard)
            .filter(Boolean) as ExperienceCardData[]
    }, [experienceCollectionResponse])

    const staysDataForMap: AccommodationMetadataItem[] = staysMetadataResponse?.data?.data || []

    // Create metadata map for stays (banner_img from kayak_images[0].large for kayak_stay)
    const stayMetadataMapForMap = useMemo(() => {
        const map = new Map<string, { banner_img?: string; zentrum_hub_id?: string; latitude?: number; longitude?: number }>()
        if (!staysCollectionResponse?.data?.sections) return map

        staysCollectionResponse.data.sections
            .filter((section: Section) => section.section_type === 'stays')
            .forEach((section: Section) => {
                if (section.entity_id && section.metadata) {
                    const metadata = section.metadata as {
                        banner_img?: string
                        zentrum_hub_id?: string
                        kayak_images?: Array<{ large?: string }>
                        latitude?: number
                        longitude?: number
                    }
                    const entityType = (section as Section & { entity_type?: string }).entity_type
                    const isKayakStay = entityType === 'kayak_stay'
                    const firstKayakImg = Array.isArray(metadata.kayak_images) ? metadata.kayak_images[0] : undefined
                    const bannerImg = isKayakStay && firstKayakImg?.large ? firstKayakImg.large : metadata.banner_img
                    map.set(section.entity_id, {
                        banner_img: bannerImg,
                        zentrum_hub_id: metadata.zentrum_hub_id,
                        latitude: metadata.latitude,
                        longitude: metadata.longitude
                    })
                }
            })

        return map
    }, [staysCollectionResponse])

    // Normalize section dates to YYYY-MM-DD without timezone surprises
    const normalizeYMD = useCallback((value?: string | null): string | undefined => {
        if (!value) return undefined
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
        try {
            const d = new Date(value)
            if (isNaN(d.getTime())) return undefined
            return d.toISOString().slice(0, 10)
        } catch {
            return undefined
        }
    }, [])

    // Build a per-stay date map from section metadata (start_date/end_date).
    // Mirrors TripboardPage's `staysDatesMap` derivation so map markers and
    // price fetching share one definition of "this stay's dates": past dates
    // are bumped to the trip-fallback window, and `checkOut` is forced to be
    // strictly after `checkIn`.
    const staySectionDatesMap = useMemo(() => {
        const map = new Map<string, { checkIn: string; checkOut: string }>()
        const sections = staysCollectionResponse?.data?.sections || []

        const addDaysYMD = (ymd: string, days: number): string | undefined => {
            const [y, m, d] = ymd.split('-').map((v) => parseInt(v, 10))
            const dt = new Date(y, (m || 1) - 1, d || 1)
            dt.setDate(dt.getDate() + days)
            return formatDateToYMD(dt) || undefined
        }

        sections
            .filter((s: Section) => s.section_type === 'stays' && s.entity_id)
            .forEach((s: Section) => {
                const md = s.metadata as { start_date?: string | null; end_date?: string | null } | undefined
                let checkIn = normalizeYMD(md?.start_date)
                let checkOut = normalizeYMD(md?.end_date)

                if (checkIn && isPastDate(checkIn)) checkIn = undefined
                if (checkOut && isPastDate(checkOut)) checkOut = undefined

                if (checkIn && !checkOut) {
                    checkOut = addDaysYMD(checkIn, 1)
                }
                if (checkIn && checkOut && checkOut <= checkIn) {
                    checkOut = addDaysYMD(checkIn, 1)
                }

                if (s.entity_id && checkIn && checkOut) {
                    map.set(s.entity_id, { checkIn, checkOut })
                }
            })
        return map
    }, [staysCollectionResponse, normalizeYMD])

    // Extract unique city_ids from all sections (for fetching city lat/long)
    const cityIdsForMap = useMemo(() => {
        const ids = new Set<string>()
        const addFromSections = (sections: Section[] | undefined) => {
            sections?.forEach((s: Section) => {
                const metadata = s.metadata as { city_id?: string } | undefined
                if (metadata?.city_id && typeof metadata.city_id === 'string') {
                    ids.add(metadata.city_id)
                }
            })
        }
        addFromSections(experienceCollectionResponse?.data?.sections)
        addFromSections(staysCollectionResponse?.data?.sections)
        addFromSections(restaurantCollectionResponse?.data?.sections)
        return Array.from(ids)
    }, [experienceCollectionResponse, staysCollectionResponse, restaurantCollectionResponse])

    // Fetch city lat/long from map API only after required section responses (experience, stays, food) are completed
    const cityIdsToFetch = enableMapCitiesApi ? cityIdsForMap : []
    const { data: citiesWithLocation = [] } = useCitiesByIdsForMap(cityIdsToFetch)

    // Get active city ID from URL params (for filtering map markers)
    // Tabs use different param names: stays_city for stays, act_city for activities, city_id for restaurant/food
    const activeCityId = useMemo(() => {
        const tab = searchParams.get('tab')
        if (tab === 'stays') return searchParams.get('stays_city')
        if (tab === 'experience') return searchParams.get('act_city')
        if (tab === 'restaurant') return searchParams.get('city_id')
        // Backward compat / other tabs
        return searchParams.get('stays_city') || searchParams.get('act_city') || searchParams.get('city_id')
    }, [searchParams])

    // Experience markers always use act_city for filtering, independent of the active tab.
    // This ensures activities appear on the map even when the user is on the Stays tab.
    const activeExpCityId = useMemo(() => {
        return searchParams.get('act_city') || null
    }, [searchParams])

    // Map center should be the city center (from API response), not derived from marker centroid.
    const mapCityCenter = useMemo(() => {
        const preferredCityId = activeCityId || cityIdForFilters || cityIdsForMap[0] || ''
        if (!preferredCityId) return null
        const match = citiesWithLocation.find((c) => c.city_id === preferredCityId)
        const lat = match?.latitude
        const lon = match?.longitude
        if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) return null
        return { lon, lat }
    }, [activeCityId, cityIdForFilters, cityIdsForMap, citiesWithLocation])

    // Get city name for map (from active city's section metadata)
    const mapCityName = useMemo(() => {
        // If active city is selected, get city name from that city's section
        if (activeCityId) {
            // Try to get from experience section with matching city_id
            if (experienceCollectionResponse?.data?.sections) {
                const citySection = experienceCollectionResponse.data.sections.find(
                    (s: Section) => s.section_type === 'experience' && s.metadata?.city_id === activeCityId
                )
                if (citySection?.metadata) {
                    const metadata = citySection.metadata as { city_name?: string; [key: string]: unknown }
                    if (typeof metadata.city_name === 'string') {
                        return metadata.city_name
                    }
                }
            }

            // Try to get from stay section with matching city_id
            if (staysCollectionResponse?.data?.sections) {
                const citySection = staysCollectionResponse.data.sections.find(
                    (s: Section) => s.section_type === 'stays' && s.metadata?.city_id === activeCityId
                )
                if (citySection?.metadata) {
                    const metadata = citySection.metadata as { city_name?: string; [key: string]: unknown }
                    if (typeof metadata.city_name === 'string') {
                        return metadata.city_name
                    }
                }
            }
        }

        // Fallback: Try to get from first experience city name
        if (experiencesForMap && experiencesForMap.length > 0) {
            const firstExp = experiencesForMap[0]
            if (firstExp?.city_name) {
                return firstExp.city_name
            }
        }

        // Fallback: Try to get from first experience section metadata
        if (experienceCollectionResponse?.data?.sections) {
            const firstExpSection = experienceCollectionResponse.data.sections.find(
                (s: Section) => s.section_type === 'experience' && s.metadata?.city_name
            )
            if (firstExpSection?.metadata) {
                const metadata = firstExpSection.metadata as { city_name?: string; [key: string]: unknown }
                if (typeof metadata.city_name === 'string') {
                    return metadata.city_name
                }
            }
        }

        // Fallback: Try to get from first stay section metadata
        if (staysCollectionResponse?.data?.sections) {
            const firstStaySection = staysCollectionResponse.data.sections.find((s: Section) => s.section_type === 'stays' && s.metadata?.city_name)
            if (firstStaySection?.metadata) {
                const metadata = firstStaySection.metadata as { city_name?: string; [key: string]: unknown }
                if (typeof metadata.city_name === 'string') {
                    return metadata.city_name
                }
            }
        }

        return ''
    }, [activeCityId, experiencesForMap, experienceCollectionResponse, staysCollectionResponse])

    // Transform experiences and stays to MapMarker format (for GenericMap)
    // Filter to only show markers for the active city (if a city is selected)
    const mapMarkers = useMemo(() => {
        const markers: MapMarker[] = []

        // Add experience markers (from collection sections) - only when location is present.
        // Skip entirely while enrichment is still loading — legacy section
        // metadata is now slim (dates only) so we'd emit markers with
        // neither image nor location until the batch API lands. Returning
        // an empty list keeps the map clean until real data arrives.
        const canRenderExperienceMarkers = !isExperiencesEnrichmentLoading
        if (canRenderExperienceMarkers) experiencesForMap.forEach((exp) => {
            if (!exp) return

            const enriched = enrichedExperiencesMap?.get(exp.id)

            const section = experienceCollectionResponse?.data?.sections?.find(
                (s: Section) => s.entity_id === exp.id && s.section_type === 'experience'
            )
            const metadata = section?.metadata as
                | {
                      city_id?: string
                      location?: {
                          latitude?: number
                          longitude?: number
                          address?: string
                      }
                      [key: string]: unknown
                  }
                | undefined

            // Prefer the batch API's location; section-metadata fallback is
            // kept for the short transition window where legacy rows still
            // carry full metadata.
            const enrichedLat = enriched?.location?.latitude ?? undefined
            const enrichedLng = enriched?.location?.longitude ?? undefined
            const fallbackLat = metadata?.location?.latitude
            const fallbackLng = metadata?.location?.longitude
            const latitude = enrichedLat != null ? enrichedLat : fallbackLat
            const longitude = enrichedLng != null ? enrichedLng : fallbackLng
            // Prefer batch-response image + title over adapter output.
            const enrichedImage = enriched?.display_props?.landscape_image || undefined
            const enrichedImages = (enriched?.content?.verified_photos || [])
                .map((p) => p?.url)
                .filter((url): url is string => Boolean(url))
            const markerImage = enrichedImage ?? exp.image ?? ''
            const markerImages = enrichedImages.length > 0
                ? [enrichedImage || enrichedImages[0], ...enrichedImages].filter((u, i, arr) => u && arr.indexOf(u) === i) as string[]
                : (exp.images || [exp.image || ''])

            // Skip activities without valid location (including 0,0) - do not show marker
            if (latitude == null || longitude == null || isNaN(latitude) || isNaN(longitude) || (latitude === 0 && longitude === 0)) {
                return
            }

            // Filter by act_city (always use the activities city param, not the active tab's city).
            // This allows experience markers to appear even when the user is on the Stays tab.
            const expCityId = (enriched?.city_id as string | undefined) || metadata?.city_id || exp.city_id || ''
            const normalizedExpCityId = expCityId ? String(expCityId).trim() : ''
            const normalizedActiveExpCityId = activeExpCityId ? String(activeExpCityId).trim() : ''

            if (normalizedActiveExpCityId !== '') {
                if (!normalizedExpCityId) return
                if (normalizedExpCityId !== normalizedActiveExpCityId) return
            }

            markers.push({
                id: exp.id,
                name: enriched?.name || exp.title || exp.name || '',
                type: 'experience',
                geo_location: {
                    lat: String(latitude),
                    long: String(longitude)
                },
                image: markerImage,
                images: markerImages,
                price: {
                    lower_bound: exp.price?.lower_bound ?? undefined,
                    upper_bound: exp.price?.upper_bound ?? undefined,
                    currency: exp.price?.currency ?? undefined
                },
                experience_id: exp.id,
                onClickData: {
                    experience_id: exp.id,
                    searchParams: searchParams.toString()
                }
            })
        })

        // Add stay markers (from stable data) - only for active city.
        // Omitted entirely for the Stays For You view: list + map there derive
        // from the viewport-accommodations query to stay consistent.
        if (!omitSavedStayMarkers) staysDataForMap.forEach((stay: AccommodationMetadataItem) => {
            // Get section to check city_id - use zentrum_hub_id for lookup
            const lookupKey = stay.zentrum_hub_id || stay.id
            const staySection = staysCollectionResponse?.data?.sections?.find((s: Section) => s.entity_id === lookupKey && s.section_type === 'stays')

            // Extract city_id from section metadata
            const sectionMetadata = staySection?.metadata as
                | {
                      city_id?: string
                      latitude?: number
                      longitude?: number
                      [key: string]: unknown
                  }
                | undefined

            // Filter by active city - only show if city matches or no city is selected
            if (activeCityId && sectionMetadata?.city_id !== activeCityId) {
                return
            }

            const mapMetadata = stayMetadataMapForMap.get(lookupKey)
            const imageUrl = mapMetadata?.banner_img || stay.banner_img || ''
            const zentrumHubId = mapMetadata?.zentrum_hub_id || stay.zentrum_hub_id

            // For kayak_stay use latitude/longitude from section metadata; otherwise use stay.geo_location
            const entityType = staySection ? (staySection as Section & { entity_type?: string }).entity_type : undefined
            const isKayakStay = entityType === 'kayak_stay'
            const lat = isKayakStay && sectionMetadata?.latitude != null ? String(sectionMetadata.latitude) : stay.geo_location?.lat
            const long = isKayakStay && sectionMetadata?.longitude != null ? String(sectionMetadata.longitude) : stay.geo_location?.long

            const latNum = typeof lat === 'string' ? parseFloat(lat) : Number(lat)
            const longNum = typeof long === 'string' ? parseFloat(long) : Number(long)
            if (lat && long && !(latNum === 0 && longNum === 0)) {
                // Use compare API price if available, otherwise use stay.rate_per_night with margin
                const priceData = zentrumHubId ? stayPricesMap?.get(zentrumHubId) : undefined
                let ratePerNightWithMargin: number | undefined

                if (priceData && priceData.platforms.length > 0) {
                    // Get cheapest deal from compare API
                    // PlatformPrice.price is already calculated from total_price / nights in mapApiResponseToPlatforms
                    // So we're using total_price from compare API response (indirectly via price field)
                    const cheapestDeal = priceData.platforms.reduce((cheapest, current) => (current.price < cheapest.price ? current : cheapest))

                    ratePerNightWithMargin = Math.round(cheapestDeal.price)
                }

                markers.push({
                    id: stay.id,
                    name: stay.name,
                    type: 'accommodation',
                    geo_location: {
                        lat: String(lat),
                        long: String(long)
                    },
                    rate_per_night: ratePerNightWithMargin,
                    overall_rating: (stay as { overall_rating?: number }).overall_rating ?? undefined,
                    star_rating: (stay as { star_rating?: number | string }).star_rating ?? undefined,
                    image: imageUrl || undefined,
                    images: imageUrl ? [imageUrl] : undefined,
                    zentrum_hub_id: zentrumHubId,
                    accommodation_id: stay.id,
                    is_verified: isRimigoInternal && ((stay as { is_verified?: boolean }).is_verified || false),
                    is_b2b_deal_available: isRimigoInternal && ((stay as { is_b2b_deal_available?: boolean }).is_b2b_deal_available || false),
                    is_available_on_airbnb: isRimigoInternal && ((stay as { is_available_on_airbnb?: boolean }).is_available_on_airbnb || false),
                    onClickData: {
                        zentrum_hub_id: zentrumHubId,
                        accommodation_id: stay.id,
                        cityId: cityIdForFilters,
                        checkIn: staySectionDatesMap.get(zentrumHubId || stay.id)?.checkIn || defaultDates.checkIn,
                        checkOut: staySectionDatesMap.get(zentrumHubId || stay.id)?.checkOut || defaultDates.checkOut,
                        cityName: mapCityName
                    }
                })
            }
        })

        // Add markers for kayak_stay sections that are not in staysDataForMap (only in sections)
        const stayEntityIdsFromApi = new Set(staysDataForMap.map((s) => s.zentrum_hub_id || s.id).filter(Boolean))
        if (!omitSavedStayMarkers && staysCollectionResponse?.data?.sections) {
            staysCollectionResponse.data.sections
                .filter(
                    (s: Section) =>
                        s.section_type === 'stays' &&
                        (s as Section & { entity_type?: string }).entity_type === 'kayak_stay' &&
                        s.entity_id &&
                        s.metadata &&
                        !stayEntityIdsFromApi.has(s.entity_id)
                )
                .forEach((section: Section) => {
                    const metadata = section.metadata as {
                        city_id?: string
                        latitude?: number
                        longitude?: number
                        kayak_images?: Array<{ large?: string }>
                        zentrum_hub_id?: string
                        [key: string]: unknown
                    }
                    if (activeCityId && metadata.city_id !== activeCityId) return
                    const lat = metadata.latitude
                    const long = metadata.longitude
                    if (lat == null || long == null || isNaN(lat) || isNaN(long) || (lat === 0 && long === 0)) return
                    const firstImg = Array.isArray(metadata.kayak_images) ? metadata.kayak_images[0] : undefined
                    const imageUrl = firstImg?.large
                    // zentrum_hub_id is separate from entity_id; use only metadata.zentrum_hub_id
                    const zentrumHubId = metadata.zentrum_hub_id ?? ''
                    const entityId = section.entity_id!
                    markers.push({
                        id: entityId,
                        name: section.title || 'Stay',
                        type: 'accommodation',
                        geo_location: { lat: String(lat), long: String(long) },
                        image: imageUrl || undefined,
                        images: imageUrl ? [imageUrl] : undefined,
                        zentrum_hub_id: zentrumHubId,
                        accommodation_id: entityId,
                        is_verified: isRimigoInternal && metadata.is_verified === true,
                        is_b2b_deal_available: isRimigoInternal && metadata.is_b2b_deal_available === true,
                        is_available_on_airbnb: isRimigoInternal && metadata.is_available_on_airbnb === true,
                        onClickData: {
                            zentrum_hub_id: zentrumHubId,
                            accommodation_id: entityId,
                            cityId: cityIdForFilters,
                            checkIn: staySectionDatesMap.get(entityId)?.checkIn || defaultDates.checkIn,
                            checkOut: staySectionDatesMap.get(entityId)?.checkOut || defaultDates.checkOut,
                            cityName: mapCityName
                        }
                    })
                })
        }

        // Add explore accommodation markers (distinct style).
        // We trust the API city scope (exploreAccommodations are already
        // filtered server-side by cityId), so we don't apply an extra city
        // filter here — doing so would drop hotels whose `base_city_info` is
        // missing / null in the response (bug we were hitting).
        if (exploreAccommodations && exploreAccommodations.length > 0) {
            const savedHubIds = new Set(staysDataForMap.map((s) => s.zentrum_hub_id).filter(Boolean))
            for (const acc of exploreAccommodations) {
                if (savedHubIds.has(acc.zentrum_hub_id)) continue
                const lat = acc.geo_location?.lat
                const long = acc.geo_location?.long
                if (!lat || !long) continue
                const latNum = parseFloat(lat)
                const longNum = parseFloat(long)
                if (isNaN(latNum) || isNaN(longNum) || (latNum === 0 && longNum === 0)) continue
                markers.push({
                    id: `explore-${acc.zentrum_hub_id}`,
                    name: acc.name,
                    type: 'explore_accommodation',
                    geo_location: { lat, long },
                    overall_rating: acc.overall_rating,
                    star_rating: acc.star_rating ?? undefined,
                    image: acc.content?.[0],
                    images: acc.content?.slice(0, 5),
                    zentrum_hub_id: acc.zentrum_hub_id,
                    accommodation_id: acc.id,
                    is_available_on_airbnb: isRimigoInternal && (acc.is_available_on_airbnb || false),
                    onClickData: {
                        zentrum_hub_id: acc.zentrum_hub_id,
                        accommodation_id: acc.id,
                        cityId: acc.base_city_info?.id,
                        checkIn: defaultDates.checkIn,
                        checkOut: defaultDates.checkOut,
                        cityName: acc.base_city_info?.name || mapCityName
                    }
                })
            }
        }
        // Restaurant markers — collection sections + itinerary meal slots
        // are merged so both saved restaurants and the trip's planned meals
        // appear on the map. Dedup is `${city_id}::${name.toLowerCase()}`,
        // matching the FoodTabContent / itineraryFoodAdapter rule, so a
        // restaurant that appears in both sources renders one pin (collection
        // version wins because it's pushed first). Marker `image` falls back
        // to a name-keyword icon when no photo is available.
        const restaurantSections =
            restaurantCollectionResponse?.data?.sections?.filter(
                (s: Section) => s.section_type === 'restaurant',
            ) ?? []

        const seenRestaurantKey = new Set<string>()
        const markRestaurantSeen = (cityId: string | undefined, name: string) => {
            const key = `${cityId ?? ''}::${name.toLowerCase()}`
            if (seenRestaurantKey.has(key)) return false
            seenRestaurantKey.add(key)
            return true
        }

        restaurantSections.forEach((section: Section) => {
            const linksBlock = section.blocks?.find((b) => b.block_type === 'links')
            if (!linksBlock?.value) return

            const v = linksBlock.value as Record<string, unknown>
            const lat = typeof v.latitude === 'number' ? v.latitude : undefined
            const lng = typeof v.longitude === 'number' ? v.longitude : undefined

            if (lat == null || lng == null || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return

            const sectionMetadata = section.metadata as { city_id?: string } | undefined
            const cityId = typeof sectionMetadata?.city_id === 'string' ? sectionMetadata.city_id : undefined
            const name = section.title || ''
            if (!markRestaurantSeen(cityId, name)) return

            const markerPlaceId = typeof v.place_id === 'string' ? v.place_id.trim() : ''
            const imageUrl =
                (typeof v.image_url === 'string' ? v.image_url : undefined) ||
                (markerPlaceId ? placePhotoProxyUrl(markerPlaceId, 800) : undefined) ||
                (typeof v.photo_url === 'string' ? v.photo_url : undefined)
            const mapsUrl = typeof v.maps_url === 'string' ? v.maps_url : undefined
            const address = typeof v.address === 'string' ? v.address : undefined
            const instagramUrl = typeof v.instagram_url === 'string' ? v.instagram_url : undefined
            const image = imageUrl || getRestaurantIconForName(name)

            markers.push({
                id: section.id || linksBlock.id || String(markers.length),
                name,
                type: 'restaurant',
                geo_location: {
                    lat: String(lat),
                    long: String(lng)
                },
                image,
                images: image ? [image] : undefined,
                onClickData: {
                    maps_url: mapsUrl,
                    address,
                    instagram_url: instagramUrl
                }
            })
        })

        if (itineraryData?.days?.length) {
            for (const item of buildFoodItemsFromItinerary(itineraryData.days)) {
                const lat = item.latitude
                const lng = item.longitude
                if (lat == null || lng == null || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) continue
                const name = item.name || ''
                if (!markRestaurantSeen(item.city_id, name)) continue
                const image = item.image_url || getRestaurantIconForName(name)

                markers.push({
                    id: item.sectionId || `meal-${markers.length}`,
                    name,
                    type: 'restaurant',
                    geo_location: {
                        lat: String(lat),
                        long: String(lng),
                    },
                    image,
                    images: image ? [image] : undefined,
                    onClickData: {
                        maps_url: item.map_link,
                        address: item.address,
                        instagram_url: item.instagram_url,
                    },
                })
            }
        }

        // Add city markers: use lat/long from API response only (location-personalization-cities/map), not geocoding
        if (includeCityMarkers) {
            citiesWithLocation.forEach((city) => {
                const lat = city.latitude
                const lng = city.longitude
                if (lat == null || lng == null || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return

                // Filter by active city when selected (match city_id)
                if (activeCityId && city.city_id !== activeCityId) return

                markers.push({
                    id: `city-${city.city_id}`,
                    name: city.city_name || 'City',
                    type: 'city',
                    geo_location: {
                        lat,
                        long: lng
                    }
                })
            })
        }

        return markers
    }, [
        experiencesForMap,
        experienceCollectionResponse,
        staysDataForMap,
        stayMetadataMapForMap,
        staysCollectionResponse,
        activeCityId,
        activeExpCityId,
        mapCityName,
        cityIdForFilters,
        staySectionDatesMap,
        defaultDates.checkIn,
        defaultDates.checkOut,
        searchParams,
        stayPricesMap,
        restaurantCollectionResponse,
        citiesWithLocation,
        includeCityMarkers,
        exploreAccommodations,
        omitSavedStayMarkers,
        enrichedExperiencesMap,
        isExperiencesEnrichmentLoading,
        itineraryData,
    ])

    // Build unique city list (id + name) from all sections for city switcher
    const mapCities = useMemo(() => {
        const cityMap = new Map<string, string>()
        const addFromSections = (sections: Section[] | undefined) => {
            sections?.forEach((s: Section) => {
                const metadata = s.metadata as { city_id?: string; city_name?: string } | undefined
                if (metadata?.city_id && metadata?.city_name) {
                    cityMap.set(metadata.city_id, metadata.city_name)
                }
            })
        }
        addFromSections(experienceCollectionResponse?.data?.sections)
        addFromSections(staysCollectionResponse?.data?.sections)
        addFromSections(restaurantCollectionResponse?.data?.sections)
        return Array.from(cityMap.entries()).map(([id, name]) => ({ id, name }))
    }, [experienceCollectionResponse, staysCollectionResponse, restaurantCollectionResponse])

    return {
        mapMarkers,
        mapCityName,
        mapCityCenter,
        mapCities
    }
}
