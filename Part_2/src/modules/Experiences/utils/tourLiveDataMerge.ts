/**
 * Shared merge + platform-rating helpers used by every tour-live-data
 * surface (legacy poll path, batch SSE path, scoped batch SSE path). Kept in
 * one place so all paths produce byte-identical `AdaptedTourResponseType`
 * output.
 */

import { getPlatformLogoURL } from '@/constants/icons/platformIcons'
import type { Tour, TourLiveDataItem } from '@/modules/Experiences/types/toursResponseTypes'

export type PlatformRating = {
    platform: string
    rating: number
    reviewCount: number
    logoUrl: string
    url: string
}

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
    tripadvisor: 'Tripadvisor',
    klook: 'Klook',
    getyourguide: 'GetYourGuide',
    headout: 'Headout',
    viator: 'Viator',
    booking: 'Booking.com',
    google: 'Google',
}

export const formatPlatformName = (platform: string): string => {
    const normalized = platform.toLowerCase()
    return PLATFORM_DISPLAY_NAMES[normalized] || platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase()
}

export const mergeTourWithLiveData = (tour: Tour, live: TourLiveDataItem | undefined): Tour => {
    if (!live) return tour
    const details = { ...tour.platform_product_details }

    if (live.price) {
        if (live.price.status === 'not_available') {
            details.price = null
        } else if (live.price.min_price !== undefined) {
            details.price = {
                min_price: live.price.min_price,
                max_price: live.price.max_price ?? live.price.min_price,
                currency: live.price.currency ?? '',
                price_type: details.price?.price_type ?? 'per_person',
            }
        }
    }

    if (live.duration) {
        details.duration = {
            min_duration: live.duration.start_duration,
            max_duration: live.duration.end_duration,
            unit: live.duration.unit ?? 'minutes',
        }
    }

    if (live.rating) {
        details.rating = {
            rating: live.rating.rating,
            no_of_reviews: live.rating.reviews,
        }
    }

    return { ...tour, platform_product_details: details }
}

export const extractPlatformRatings = (tours: Tour[]): PlatformRating[] => {
    const platformMap = new Map<string, { ratings: number[]; reviewCounts: number[]; urls: string[] }>()

    tours.forEach((tour) => {
        const platform = tour.platform
        const rating = tour.platform_product_details?.rating?.rating
        const reviewCount = tour.platform_product_details?.rating?.no_of_reviews
        const url = tour.link

        if (!platform) return

        if (!platformMap.has(platform)) {
            platformMap.set(platform, { ratings: [], reviewCounts: [], urls: [] })
        }
        const data = platformMap.get(platform)!
        if (rating !== null && rating !== undefined) data.ratings.push(rating)
        if (reviewCount !== null && reviewCount !== undefined) data.reviewCounts.push(reviewCount)
        if (url) data.urls.push(url)
    })

    return Array.from(platformMap.entries())
        .map(([platform, data]) => {
            const avgRating = data.ratings.length > 0 ? data.ratings.reduce((s, r) => s + r, 0) / data.ratings.length : 0
            const totalReviews = data.reviewCounts.reduce((s, c) => s + c, 0)
            if (avgRating === 0 || totalReviews === 0) return null
            const logoUrl = getPlatformLogoURL(platform)
            const url = data.urls[0]
            if (!logoUrl || !url) return null
            return {
                platform: formatPlatformName(platform),
                rating: avgRating,
                reviewCount: totalReviews,
                logoUrl,
                url,
            } as PlatformRating
        })
        .filter((r): r is PlatformRating => r !== null)
        .sort((a, b) => b.reviewCount - a.reviewCount)
}
