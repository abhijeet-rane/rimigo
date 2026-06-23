import type { Section } from '../types/contentCollection'
import type { Accommodation, ReviewData } from '@/pages/Stays/Types/accommodationTypes'
import type { PlatformPrice } from '@/api/hotelPriceCompare/hotelPriceCompareAPI'

interface StayMetadata {
    zentrum_hub_id?: string
    city_id?: string
    kayak_hotel_id?: string
    [key: string]: unknown
}

type SectionMetadataShape = {
    location_tag?: string
    zentrum_hub_id?: string
    banner_img?: string
    category?: string
    city_id?: string
    city_name?: string
    curated_labels?: Array<{ label: string; value: string | null }>
    is_verified?: boolean
    is_b2b_deal_available?: boolean
    is_available_on_airbnb?: boolean
}

type KayakSectionMetadata = {
    kayak_images?: Array<{ large?: string; small?: string }>
    kayak_star_rating?: number
}

export interface ResolvedStayCardData {
    lookupKey: string
    zentrumHubId: string | undefined
    locationTag: string | undefined
    imageUrl: string
    kayakImages: Array<{ large?: string; small?: string }> | undefined
    kayakStarRating: number | undefined
    imagesArray: string[] | undefined
    platformReviews: ReviewData['platform_reviews'] | undefined
    /** Star rating from the enriched `/accommodations/` payload. Undefined
     *  when enrichment hasn't loaded yet. */
    starRating: number | string | undefined
    stayCityId: string | undefined
    curatedLabels: Array<{ label: string; value: string | null }>
    category: string | null
    isVerified: boolean
    isB2bDealAvailable: boolean
    isAvailableOnAirbnb: boolean
    stayCheckIn: string | undefined
    stayCheckOut: string | undefined
    priceData: { displayPrice: number; platforms: PlatformPrice[]; isPriceLoading: boolean; isPriceUnavailable: boolean } | undefined
    sectionId: string | undefined
    cityName: string | undefined
}

/**
 * Resolves all display data for a single shortlisted stay card by combining
 * data from the several lookup maps in StaysTab. Review + content data for
 * the card comes from `enrichedStaysMap`, which is populated by
 * `useStaysEnrichment` via `/accommodations/?zentrum_hub_ids=...` — the same
 * source the For You tab uses, so ratings stay consistent across tabs.
 */
export function resolveStayCardData(
    stay: { id: string; zentrum_hub_id?: string; banner_img?: string; content?: string[]; is_verified?: boolean; is_b2b_deal_available?: boolean; is_available_on_airbnb?: boolean },
    stayMetadataMap: Map<string, SectionMetadataShape>,
    staySectionMap: Map<string, string> | undefined,
    staySectionMetadataMap: Map<string, { [key: string]: unknown } | undefined> | undefined,
    enrichedStaysMap: Map<string, Accommodation> | undefined,
    staysWithCorrectedDatesMap: Map<string, { checkIn: string | undefined; checkOut: string | undefined }>,
    stayPricesMap: Map<string, { displayPrice: number; platforms: PlatformPrice[]; isPriceLoading: boolean; isPriceUnavailable: boolean }> | undefined,
): ResolvedStayCardData {
    const lookupKey = stay.zentrum_hub_id || stay.id
    const sectionMetadata = stayMetadataMap.get(lookupKey)
    const locationTag = sectionMetadata?.location_tag || undefined
    const imageUrl = sectionMetadata?.banner_img || stay.banner_img || ''

    const sectionId = staySectionMap?.get(lookupKey)
    const sectionMetadataFull = sectionId ? staySectionMetadataMap?.get(sectionId) : undefined
    const kayakMeta = sectionMetadataFull as KayakSectionMetadata | undefined
    const kayakImages = kayakMeta?.kayak_images
    const kayakStarRating = kayakMeta?.kayak_star_rating

    const zentrumHubId = sectionMetadata?.zentrum_hub_id || stay.zentrum_hub_id
    const enrichedData = zentrumHubId ? enrichedStaysMap?.get(zentrumHubId) : undefined

    const imagesArray =
        enrichedData?.content ??
        (stay.content && stay.content.length > 0 ? stay.content : undefined) ??
        (kayakImages && Array.isArray(kayakImages) && kayakImages.length > 0
            ? kayakImages.map((img) => img.large).filter((url): url is string => Boolean(url))
            : undefined)

    const platformReviews = enrichedData?.review_data?.platform_reviews
    const starRating = enrichedData?.star_rating

    const correctedDates = staysWithCorrectedDatesMap.get(lookupKey) || { checkIn: undefined, checkOut: undefined }

    return {
        lookupKey,
        zentrumHubId,
        locationTag,
        imageUrl,
        kayakImages,
        kayakStarRating,
        imagesArray,
        platformReviews,
        starRating,
        stayCityId: sectionMetadata?.city_id,
        curatedLabels: sectionMetadata?.curated_labels || [],
        category: sectionMetadata?.category || null,
        isVerified: sectionMetadata?.is_verified === true || stay.is_verified === true,
        isB2bDealAvailable: sectionMetadata?.is_b2b_deal_available === true || stay.is_b2b_deal_available === true,
        isAvailableOnAirbnb: sectionMetadata?.is_available_on_airbnb === true || stay.is_available_on_airbnb === true,
        stayCheckIn: correctedDates.checkIn,
        stayCheckOut: correctedDates.checkOut,
        priceData: stayPricesMap?.get(zentrumHubId || stay.id),
        sectionId,
        cityName: sectionMetadata?.city_name,
    }
}

/**
 * Groups saved stay sections by city_id, extracting only stays with zentrum_hub_id.
 * Stay sections store the hub_id as `section.entity_id` (kayak entries carry a
 * different identifier — those are filtered out downstream since no hub_id is
 * resolvable). We consult `metadata.zentrum_hub_id` first, then fall back to
 * `section.entity_id` which is the zentrum_hub_id for all non-kayak stays.
 */
export function groupStaysByCity(
    sections: Section[],
    stayMetadataMap: Map<string, { zentrum_hub_id?: string; city_id?: string; kayak_hotel_id?: string }>
): Map<string, string[]> {
    const cityGroups = new Map<string, string[]>()
    for (const section of sections) {
        if (section.section_type !== 'stays' || !section.entity_id) continue
        const metadata = stayMetadataMap.get(section.entity_id) ?? (section.metadata as StayMetadata | undefined)
        // Prefer explicit metadata hub_id; fall back to entity_id (which is
        // the hub_id for zentrum stays). Skip kayak-only stays whose entity_id
        // is a kayak hotel id.
        const zentrumHubId =
            metadata?.zentrum_hub_id ||
            (metadata?.kayak_hotel_id ? undefined : section.entity_id)
        const cityId = metadata?.city_id
        if (!zentrumHubId || !cityId) continue
        const existing = cityGroups.get(cityId)
        if (existing) {
            existing.push(zentrumHubId)
        } else {
            cityGroups.set(cityId, [zentrumHubId])
        }
    }
    return cityGroups
}
