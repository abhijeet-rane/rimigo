import { AdaptedTourResponseType, Tour, ToursResponseType } from '../types/toursResponseTypes'

/** Title-case a tour name: capitalise the first letter of every word. */
const toTitleCase = (text: string): string => text.toLowerCase().replace(/(?:^|\s|[-/&(])\S/g, (ch) => ch.toUpperCase())

const getCancellationPolicy = (cancellation_policy: { is_refundable: boolean; description: string } | null): string | null => {
    if (!cancellation_policy) return null
    if (cancellation_policy.is_refundable) {
        return 'Refundable'
    } else {
        return 'Non-refundable'
    }
}

export const adaptToursToUI = (tours: ToursResponseType): AdaptedTourResponseType[] => {
    return tours.tours.map((tour: Tour) => ({
        id: tour.id,
        name: tour.name ? toTitleCase(tour.name) : null,
        platform_name: tour.platform,
        is_recommended: tour.is_recommended ?? null,
        is_personally_recommended: tour.is_personally_recommended ?? null,
        personal_recommendation_reason: tour.personal_recommendation_reason ?? null,
        duration: normalizeDuration(tour.platform_product_details?.duration),
        rating: tour.platform_product_details?.rating?.rating ?? null,
        link: tour.link,
        price: {
            min_price: tour.platform_product_details?.price?.min_price ?? null,
            max_price: tour.platform_product_details?.price?.max_price ?? null,
            currency: formatCurrency(tour.platform_product_details?.price?.currency ?? null),
            price_type: formatPriceType(tour.platform_product_details?.price?.price_type ?? null)
        },
        cancellation_policy: getCancellationPolicy(tour.platform_product_details?.cancellation_policy) ?? null,
        // Internal-only fields — passed through verbatim. Absent on non-internal payloads.
        mapping_id: tour.mapping_id ?? null,
        visibility_info: tour.visibility_info ?? null,
        recommendation_info: tour.recommendation_info ?? null
    })) as AdaptedTourResponseType[]
}

const formatCurrency = (currency: string | null): string => {
    if (!currency) return ''
    switch (currency) {
        case 'INR':
            return '₹'
        case 'USD':
            return '$'
        case 'EUR':
            return '€'
    }
    return ''
}

const formatPriceType = (price_type: string | null): string => {
    if (!price_type) return ''
    switch (price_type) {
        case 'per_person':
            return 'per person'
        case 'per_group':
            return 'per group'
        case 'per_vehicle':
            return 'per vehicle'
        default:
            return price_type
    }
}

const normalizeDuration = (
    duration: { min_duration: number | null; max_duration: number | null; unit: string | null } | null | undefined
): { min_duration: number | null; max_duration: number | null; unit: string | null } => {
    if (!duration || duration.min_duration == null || duration.max_duration == null) {
        return { min_duration: null, max_duration: null, unit: null }
    }

    let min = duration.min_duration
    let max = duration.max_duration
    let unit = duration.unit

    // Normalize to minutes for UI formatting
    if (unit === 'milliseconds') {
        min = min / 60000
        max = max / 60000
        unit = 'minutes'
    } else if (unit === 'seconds') {
        min = min / 60
        max = max / 60
        unit = 'minutes'
    }

    return { min_duration: min, max_duration: max, unit }
}
