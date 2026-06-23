import { useQuery } from '@tanstack/react-query'
import { fetchExperiencesByCountry } from '@/modules/Experiences/api/experienceApi'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import type { CountryExploreExperience } from '@/modules/Experiences/types/experienceType'

interface UseImageShowCaseParams {
    countryId?: string | null
    enabled?: boolean
    limit?: number
}

interface ImageShowCase {
    destinations: string[] // Card 1 handled externally; keep for API contract
    experiences: string[] // Card 2: landscape images
    stays: string[] // Card 3: static (handled separately)
}

/**
 * Hook to fetch images for hero cards
 * - Card 1 (destinations): Fetches experiences with shorts and extracts YouTube thumbnails
 * - Card 2 (experiences): Fetches experiences and uses landscape_image
 * - Card 3 (stays): Returns empty array (static images handled in component)
 */
export const useImageShowCase = ({
    countryId,
    enabled = true,
    limit = 3 
}: UseImageShowCaseParams = {}): {
    images: ImageShowCase
    totalExperiences?: number
    isLoading: boolean
    error: Error | null
} => {
    // Fetch experiences for card 2 (experiences)
    const { data: experiencesData, isLoading: isLoadingExperiences, error: experiencesError } = useQuery({
        queryKey: ['heroCardExperiences', countryId, limit],
        queryFn: async () => {
            if (!countryId) throw new Error('Country ID is required')
            return await fetchExperiencesByCountry(countryId, 1, limit) // Used limit instead of hardcoded 3
        },
        enabled: enabled && !!countryId,
        staleTime: HOURS_24,
        retry: 1
    })

    // Process images
    const images: ImageShowCase = {
        destinations: [],
        experiences: [],
        stays: []
    }

    // Card 2: Extract landscape images (same pattern as ExperiencesListPage)
    if (experiencesData?.data && Array.isArray(experiencesData.data)) {
        images.experiences = experiencesData.data
            .slice(0, limit) // Used limit instead of hardcoded 3
            .map((exp: CountryExploreExperience) => {
                // Same pattern as adaptCountryExperienceToUI
                return exp.display_props?.landscape_image || ''
            })
            .filter((img: string) => Boolean(img))
    }

    return {
        images,
        totalExperiences: experiencesData?.total_experiences,
        isLoading: isLoadingExperiences,
        error: experiencesError as Error | null
    }
}

