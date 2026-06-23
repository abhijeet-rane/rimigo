import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchExperiencesByCountry } from '../api/experienceApi'
import { adaptCountryExperienceToUI } from '../adapters'
import { ExperienceCardData } from '../types/experienceCardTypes'

interface UseMustDoExperiencesParams {
    countryId: string | null
    limit?: number
    baseCityIds?: string[]
}

interface UseMustDoExperiencesReturn {
    experiences: ExperienceCardData[]
    isLoading: boolean
    error: Error | null
    hasNextPage: boolean
    isFetchingNextPage: boolean
    fetchNextPage: () => void
}

export const useMustDoExperiences = ({ countryId, limit = 20, baseCityIds }: UseMustDoExperiencesParams): UseMustDoExperiencesReturn => {
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
        queryKey: ['mustDoExperiences', countryId, normalizedCityIds],
        queryFn: async ({ pageParam = 1 }) => {
            if (!countryId) return null
            // Fetch experiences with suggestion_priority=0
            const response = await fetchExperiencesByCountry(countryId, pageParam, limit, ['0'], baseCityIds)
            return response
        },
        getNextPageParam: (lastPage) => {
            if (!lastPage || !lastPage.has_more) return undefined
            return lastPage.page + 1
        },
        initialPageParam: 1,
        enabled: !!countryId
    })

    // Transform experiences data to UI format
    const experiences = experiencesData?.pages ? experiencesData.pages.flatMap((page) => page?.experiences || []).map(adaptCountryExperienceToUI) : []

    return {
        experiences,
        isLoading,
        error: error as Error | null,
        hasNextPage: hasNextPage ?? false,
        isFetchingNextPage,
        fetchNextPage
    }
}
