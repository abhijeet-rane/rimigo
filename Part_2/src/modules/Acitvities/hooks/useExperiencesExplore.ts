import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchExperiencesByCountry, fetchExperiencesByCity } from '@/modules/Experiences/api/experienceApi'
import { adaptActivitiesCountryExperienceToUI } from '../adapters'
import { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'

interface UseExperiencesExploreParams {
    countryId: string | null
    cityId?: string | null
    limit?: number
    baseCityIds?: string[]
}

interface UseExperiencesExploreReturn {
    topActivities: ExperienceCardData[]
    totalExperiences: number
    isLoading: boolean
    error: Error | null
    hasNextPage: boolean
    isFetchingNextPage: boolean
    fetchNextPage: () => void
}

/**
 * Hook to fetch top activities (experiences) for activities page
 * Fetches experiences with highest priority (typically priority 1 or top-rated)
 * Uses country explore API when countryId is present, otherwise uses city explore API
 */
export const useExperiencesExplore = ({ countryId, cityId, limit = 10, baseCityIds }: UseExperiencesExploreParams): UseExperiencesExploreReturn => {
    // Normalize city IDs for query key
    const normalizedCityIds = baseCityIds && baseCityIds.length > 0 ? [...baseCityIds].sort().join(',') : ''

    const {
        data: experiencesData,
        isLoading,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ['experiencesExplore', countryId, cityId, normalizedCityIds],
        queryFn: async ({ pageParam = 1 }) => {
            // If country_id is present, use country explore API
            if (countryId) {
                // Fetch top activities - using priority 0 for top activities
                const response = await fetchExperiencesByCountry(countryId, pageParam, limit, ['0'], baseCityIds, 10)
                return response
            }
            // If country_id is not present but city_id is, use city explore API
            if (cityId) {
                // Fetch top activities - using priority 0 for top activities
                const response = await fetchExperiencesByCity(cityId, pageParam, limit, ['0'], 10)
                return response
            }
            return null
        },
        getNextPageParam: (lastPage) => {
            if (!lastPage || !lastPage.has_more) return undefined
            return lastPage.page + 1
        },
        initialPageParam: 1,
        enabled: !!countryId || !!cityId, // Enable when either countryId or cityId is present
        refetchOnWindowFocus: false
    })

    // Transform experiences data to UI format using Activities adapter
    const topActivities = experiencesData?.pages
        ? experiencesData.pages.flatMap((page) => page?.data || []).map(adaptActivitiesCountryExperienceToUI)
        : []

    // Get total experiences count from first page
    const totalExperiences = experiencesData?.pages[0]?.total_experiences ?? 0

    return {
        topActivities,
        totalExperiences,
        isLoading,
        error: error as Error | null,
        hasNextPage: hasNextPage ?? false,
        isFetchingNextPage,
        fetchNextPage
    }
}
