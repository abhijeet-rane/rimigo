import type { ContentCollection, Section } from '../types/contentCollection'

export interface OverviewImageData {
    id: string
    url: string
    description?: string
}

export interface OverviewInfoCards {
    bestMonths?: string
    idealDuration?: string
    estimatedWeather?: string
    approxCost?: string
    seasonalInfo?: Array<{
        label: string
        description: string
    }>
}

export interface HighlightsData {
    countries?: number
    cities?: number
    flights?: number
    activities?: number
    stays?: number
    restaurants?: number
    tripHighlights?: Array<{
        label: string
        description: string
    }>
}

export interface YouTubeVideoData {
    videoUrl?: string
    videoId?: string
    title?: string
    description?: string
}

export interface CreatorData {
    profileImageUrl?: string
    name?: string
    handle?: string
    instagramFollowers?: string
    countriesVisited?: number
}

export interface TripUnlockData {
    previewImages?: string[]
    price?: string
    rating?: number
    reviewCount?: number
    /** Drives the "N+ loved this" pill; sourced from collection.metadata.loved_count. */
    lovedCount?: number
}

export interface TripRouteCity {
    id: string
    name: string
    nights: number
}

export interface OverviewData {
    images: OverviewImageData[]
    portraitImages?: OverviewImageData[]
    landscapeImages?: OverviewImageData[]
    title?: string
    description?: string
    infoCards?: OverviewInfoCards
    highlights?: HighlightsData
    youtubeVideo?: YouTubeVideoData
    youtubeShorts?: Array<{
        id: string
        url: string
        metadata?: Record<string, unknown>
    }>
    tripRoute?: TripRouteCity[]
    creatorData?: CreatorData
    unlockData?: TripUnlockData
    rimigoVideos?: Array<{
        id: string
        url: string
        metadata?: Record<string, unknown>
    }>
    instagramReels?: Array<{
        id: string
        url: string
        metadata?: Record<string, unknown>
    }>
}

/**
 * Extract images from collection sections
 * Combines images from all sections (experiences, stays, etc.)
 */
export const adaptCollectionToOverviewData = (collection: ContentCollection | null): OverviewData => {
    if (!collection) {
        return {
            images: [],
            title: '',
            description: ''
        }
    }

    const images: OverviewImageData[] = []
    const imageUrlSet = new Set<string>() // To avoid duplicates

    // Add cover image if available
    if (collection.cover_image && !imageUrlSet.has(collection.cover_image)) {
        images.push({
            id: `cover-${collection.id || 'default'}`,
            url: collection.cover_image,
            description: `${collection.name} cover image`
        })
        imageUrlSet.add(collection.cover_image)
    }

    // Extract images from all sections
    if (collection.sections) {
        collection.sections.forEach((section: Section) => {
            // Extract from metadata.display_props.landscape_image
            if (section.metadata?.display_props?.landscape_image) {
                const imageUrl = section.metadata.display_props.landscape_image
                if (!imageUrlSet.has(imageUrl)) {
                    images.push({
                        id: `section-${section.id || 'default'}-landscape`,
                        url: imageUrl,
                        description: section.title || undefined
                    })
                    imageUrlSet.add(imageUrl)
                }
            }

            // Extract from metadata.content.verified_photos
            if (section.metadata?.content?.verified_photos) {
                const verifiedPhotos = section.metadata.content.verified_photos as Array<{
                    id: string
                    url: string
                    description?: string
                }>
                verifiedPhotos.forEach((photo) => {
                    if (photo.url && !imageUrlSet.has(photo.url)) {
                        images.push({
                            id: photo.id || `photo-${images.length}`,
                            url: photo.url,
                            description: photo.description || section.title || undefined
                        })
                        imageUrlSet.add(photo.url)
                    }
                })
            }
        })
    }

    // Extract info cards data from collection metadata or context
    const infoCards: OverviewInfoCards = {}
    
    // Extract best months from seasonal information or context
    // This would come from collection metadata or aggregated from sections
    if (collection.context) {
        // You can extract best months from context or metadata
        // For now, we'll leave it empty and let it be populated from API
    }

    // Extract info cards and highlights from collection metadata
    const collectionMetadata = collection as {
        metadata?: {
            ideal_duration?: string
            best_months?: string
            estimated_weather?: string
            approx_cost?: string
            highlights?: {
                countries?: number
                cities?: number
                flights?: number
                activities?: number
                stays?: number
                restaurants?: number
            }
        }
    }

    // Extract info cards from metadata
    if (collectionMetadata.metadata) {
        if (collectionMetadata.metadata.best_months) {
            infoCards.bestMonths = collectionMetadata.metadata.best_months
        }
        if (collectionMetadata.metadata.ideal_duration) {
            infoCards.idealDuration = collectionMetadata.metadata.ideal_duration
        }
        if (collectionMetadata.metadata.estimated_weather) {
            infoCards.estimatedWeather = collectionMetadata.metadata.estimated_weather
        }
        if (collectionMetadata.metadata.approx_cost) {
            infoCards.approxCost = collectionMetadata.metadata.approx_cost
        }
    }

    // Extract highlights data from collection
    // Count countries, cities, flights, activities, stays, restaurants from sections
    const highlights: HighlightsData = {}
    
    // Count unique countries from context
    if (collection.context?.country_id) {
        const countryIds = Array.isArray(collection.context.country_id)
            ? collection.context.country_id
            : [collection.context.country_id]
        highlights.countries = new Set(countryIds.filter(Boolean)).size
    }

    // Count unique cities from context
    if (collection.context?.city_id) {
        const cityIds = Array.isArray(collection.context.city_id)
            ? collection.context.city_id
            : [collection.context.city_id]
        highlights.cities = new Set(cityIds.filter(Boolean)).size
    }

    // Count sections by type
    if (collection.sections) {
        const sectionTypeCounts = new Map<string, number>()
        collection.sections.forEach((section: Section) => {
            const sectionType = section.section_type
            if (sectionType) {
                sectionTypeCounts.set(sectionType, (sectionTypeCounts.get(sectionType) || 0) + 1)
            }
        })

        // Map section types to highlights
        highlights.activities = sectionTypeCounts.get('experience') || 0
        highlights.stays = sectionTypeCounts.get('stays') || 0
        // Flights and restaurants would come from other section types or metadata
        highlights.flights = sectionTypeCounts.get('flights') || 0
        highlights.restaurants = sectionTypeCounts.get('restaurants') || 0
    }

    // Override with metadata highlights if available (metadata takes precedence)
    if (collectionMetadata.metadata?.highlights) {
        Object.assign(highlights, collectionMetadata.metadata.highlights)
    }

    // Extract YouTube video data from collection metadata
    const youtubeVideo: YouTubeVideoData | undefined = (() => {
        const videoMetadata = collection as {
            metadata?: {
                youtube_video?: {
                    url?: string
                    video_id?: string
                    title?: string
                    description?: string
                }
            }
        }

        if (videoMetadata.metadata?.youtube_video) {
            const videoData = videoMetadata.metadata.youtube_video
            return {
                videoUrl: videoData.url,
                videoId: videoData.video_id,
                title: videoData.title,
                description: videoData.description
            }
        }

        return undefined
    })()

    // Extract creator data from collection publisher/trip source
    const creatorData: CreatorData | undefined = (() => {
        const publisher = collection.publisher
        if (!publisher) return undefined

        // Try to get from publisher metadata or trip source
        const publisherMetadata = publisher.metadata as {
            profile_image_url?: string
            instagram_followers?: string
            countries_visited?: number
        } | undefined

        return {
            profileImageUrl: publisherMetadata?.profile_image_url,
            name: publisher.name,
            handle: publisher.name?.startsWith('@') ? publisher.name.slice(1) : publisher.name,
            instagramFollowers: publisherMetadata?.instagram_followers,
            countriesVisited: publisherMetadata?.countries_visited
        }
    })()

    // Format currency helper
    const formatCurrency = (amount: number, currency: string): string => {
        if (!amount) return ''
        const rounded = Math.round(amount)
        const formatted = rounded.toLocaleString('en-IN') // adds commas like 1,23,456
        if (currency === 'INR') return `₹${formatted}`

        const symbolMap: Record<string, string> = {
            USD: '$',
            EUR: '€',
            GBP: '£',
            JPY: '¥'
        }
        const symbol = symbolMap[currency] || currency
        return `${symbol}${formatted}`
    }

    // Extract unlock data from collection pricing and metadata
    const unlockData: TripUnlockData | undefined = (() => {
        // First, try to get price from collection.pricing
        let formattedPrice: string | undefined
        if (collection.pricing) {
            formattedPrice = formatCurrency(collection.pricing.amount, collection.pricing.currency)
        }

        // `loved_count` is collection-level (set from the Features tab);
        // rating/reviews/previews still come from the legacy `unlock` sub-object.
        const unlockMetadata = collection as {
            metadata?: {
                loved_count?: number | string
                unlock?: {
                    preview_images?: string[]
                    price?: string
                    rating?: number
                    review_count?: number
                }
            }
        }

        const rawLoved = unlockMetadata.metadata?.loved_count
        const parsedLoved = typeof rawLoved === 'string' ? Number(rawLoved) : rawLoved
        const lovedCount =
            typeof parsedLoved === 'number' && Number.isFinite(parsedLoved) ? parsedLoved : undefined

        // If we have pricing from collection.pricing, use it; otherwise use metadata
        if (formattedPrice || unlockMetadata.metadata?.unlock || lovedCount !== undefined) {
            const unlock = unlockMetadata.metadata?.unlock
            return {
                previewImages: unlock?.preview_images,
                price: formattedPrice || unlock?.price, // Prioritize formatted price from collection.pricing
                rating: unlock?.rating,
                reviewCount: unlock?.review_count,
                lovedCount
            }
        }

        // If only pricing exists without metadata unlock, return just the price
        if (formattedPrice) {
            return {
                price: formattedPrice
            }
        }

        return undefined
    })()

    return {
        images,
        title: collection.name || '',
        description: collection.description || undefined,
        infoCards: Object.keys(infoCards).length > 0 ? infoCards : undefined,
        highlights: Object.keys(highlights).length > 0 ? highlights : undefined,
        youtubeVideo,
        creatorData,
        unlockData
    }
}

/**
 * Convert content collection metadata API response to OverviewData
 */
export const adaptMetadataToOverviewData = (metadataResponse: {
    data: {
        id: string
        metadata: {
            source?: string
            [key: string]: unknown
        }
        portrait_images: Array<{
            id: string
            url: string
            metadata?: Record<string, unknown>
        }>
        landscape_images: Array<{
            id: string
            url: string
            metadata?: Record<string, unknown>
        }>
        reels: Array<{
            id: string
            url: string
            metadata?: Record<string, unknown>
        }>
        rimigo_videos: Array<{
            id: string
            url: string
            metadata?: Record<string, unknown>
        }>
        youtube_shorts: Array<{
            id: string
            url: string
            video_id?: string
            title?: string
            metadata?: Record<string, unknown>
        }>
        youtube_videos: Array<{
            id: string
            url: string
            video_id?: string
            title?: string
            metadata?: Record<string, unknown>
        }>
        created_at: string
        updated_at: string
    }
} | null): OverviewData => {
    if (!metadataResponse?.data) {
        return {
            images: [],
            title: '',
            description: ''
        }
    }

    const { data } = metadataResponse
    const portraitImages: OverviewImageData[] = []
    const landscapeImages: OverviewImageData[] = []

    // Add portrait images
    if (data.portrait_images && data.portrait_images.length > 0) {
        data.portrait_images.forEach((img) => {
            if (img.url) {
                portraitImages.push({
                    id: img.id,
                    url: img.url,
                    description: undefined
                })
            }
        })
    }

    // Add landscape images
    if (data.landscape_images && data.landscape_images.length > 0) {
        data.landscape_images.forEach((img) => {
            if (img.url) {
                landscapeImages.push({
                    id: img.id,
                    url: img.url,
                    description: undefined
                })
            }
        })
    }

    // Combine all images for backward compatibility
    const images: OverviewImageData[] = [...portraitImages, ...landscapeImages]

    // Extract YouTube video from youtube_videos (prefer regular videos over shorts)
    let youtubeVideo: YouTubeVideoData | undefined
    if (data.youtube_videos && data.youtube_videos.length > 0) {
        const firstVideo = data.youtube_videos[0]
        youtubeVideo = {
            videoUrl: firstVideo.url,
            videoId: firstVideo.video_id,
            title: firstVideo.title
        }
    } else if (data.youtube_shorts && data.youtube_shorts.length > 0) {
        const firstShort = data.youtube_shorts[0]
        youtubeVideo = {
            videoUrl: firstShort.url,
            videoId: firstShort.video_id,
            title: firstShort.title
        }
    }

    // Extract YouTube shorts array
    const youtubeShorts = data.youtube_shorts && data.youtube_shorts.length > 0
        ? data.youtube_shorts.map((short) => ({
            id: short.id,
            url: short.url,
            metadata: short.metadata || {}
        }))
        : undefined

    const rimigoVideos = data.rimigo_videos && data.rimigo_videos.length > 0
    ? data.rimigo_videos.map((video) => ({
        id: video.id,
        url: video.url,
        metadata: video.metadata || {}
    }))
    : undefined

    const instagramReels = data.reels && data.reels.length > 0
        ? data.reels
              .filter((reel) => reel.url)
              .map((reel) => ({
                  id: reel.id,
                  url: reel.url,
                  metadata: reel.metadata || {}
              }))
        : undefined

    // Extract info cards and highlights from metadata if available
    const infoCards: OverviewInfoCards = {}
    const highlights: HighlightsData = {}

    const metadata = data.metadata as {
        seasonal_info?: Array<{
            label: string
            description: string
        }>
        trip_highlights?: Array<{
            label: string
            description: string
        }>
        trip_route?: Array<{
            id: string
            name: string
            nights: number
        }>
        best_months?: string
        ideal_duration?: string
        estimated_weather?: string
        approx_cost?: string
        highlights?: {
            countries?: number
            cities?: number
            flights?: number
            activities?: number
            stays?: number
            restaurants?: number
        }
        [key: string]: unknown
    } | undefined

    if (metadata) {
        // Extract seasonal_info array directly if available
        if (metadata.seasonal_info && Array.isArray(metadata.seasonal_info) && metadata.seasonal_info.length > 0) {
            infoCards.seasonalInfo = metadata.seasonal_info.map((item) => ({
                label: item.label || '',
                description: item.description || ''
            }))
        } else {
            // Fallback to direct metadata fields if seasonal_info is not available
            if (metadata.best_months) {
                infoCards.bestMonths = metadata.best_months
            }
            if (metadata.ideal_duration) {
                infoCards.idealDuration = metadata.ideal_duration
            }
            if (metadata.estimated_weather) {
                infoCards.estimatedWeather = metadata.estimated_weather
            }
            if (metadata.approx_cost) {
                infoCards.approxCost = metadata.approx_cost
            }
        }
        
        // Extract trip_highlights array directly if available
        if (metadata.trip_highlights && Array.isArray(metadata.trip_highlights) && metadata.trip_highlights.length > 0) {
            highlights.tripHighlights = metadata.trip_highlights.map((item) => ({
                label: item.label || '',
                description: item.description || ''
            }))
        } else if (metadata.highlights) {
            // Fallback to direct metadata fields if trip_highlights is not available
            Object.assign(highlights, metadata.highlights)
        }
    }

    // Extract trip_route from metadata
    let tripRoute: TripRouteCity[] | undefined
    if (metadata?.trip_route && Array.isArray(metadata.trip_route) && metadata.trip_route.length > 0) {
        tripRoute = metadata.trip_route.map((city) => ({
            id: city.id || '',
            name: city.name || '',
            nights: city.nights || 0
        }))
    }

    return {
        images,
        portraitImages: portraitImages.length > 0 ? portraitImages : undefined,
        landscapeImages: landscapeImages.length > 0 ? landscapeImages : undefined,
        infoCards: Object.keys(infoCards).length > 0 ? infoCards : undefined,
        highlights: Object.keys(highlights).length > 0 ? highlights : undefined,
        youtubeVideo,
        youtubeShorts,
        rimigoVideos,
        instagramReels: instagramReels && instagramReels.length > 0 ? instagramReels : undefined,
        tripRoute: tripRoute && tripRoute.length > 0 ? tripRoute : undefined
    }
}
