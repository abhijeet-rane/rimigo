import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getLocationHeroImages } from '@/api/curation/locationPersonalizationAPI'
import { HOURS_1 } from '@/constants/commons/tanstackConstants'

interface UseHeroImagesForCountryParams {
    countryIds: string[]
    prioritizedCountryIds?: string[]
}

export const useHeroImagesForCountry = ({ countryIds, prioritizedCountryIds = [] }: UseHeroImagesForCountryParams) => {
    const sortedCountryIds = useMemo(() => {
        return countryIds.length ? [...countryIds].sort() : []
    }, [countryIds])

    const { data: heroImages, isLoading: isLoadingHeroImages } = useQuery({
        queryKey: ['landingHeroImages', sortedCountryIds],
        queryFn: () => getLocationHeroImages(sortedCountryIds),
        enabled: sortedCountryIds.length > 0,
        staleTime: HOURS_1
    })

    const heroBackgroundImage = useMemo(() => {
        if (!heroImages?.length) {
            return null
        }

        // Show fallback image when there are more than 1 countries in response
        if (heroImages.length > 1) {
            return null
        }

        // If prioritized country IDs are provided, try to find a match
        if (prioritizedCountryIds.length > 0) {
            for (const countryId of prioritizedCountryIds) {
                const match = heroImages.find((item) => item.country_id === countryId && item.tripboard_hero_image_url)
                if (match?.tripboard_hero_image_url) {
                    return match.tripboard_hero_image_url
                }
            }
        }

        // Fallback to first available hero image
        const fallback = heroImages.find((item) => item.tripboard_hero_image_url)
        return fallback?.tripboard_hero_image_url ?? null
    }, [heroImages, prioritizedCountryIds])

    return {
        heroBackgroundImage,
        isLoading: isLoadingHeroImages && sortedCountryIds.length > 0
    }
}
