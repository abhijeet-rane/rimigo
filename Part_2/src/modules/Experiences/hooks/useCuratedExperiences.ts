import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchCuratedExperiences } from '../api/experienceApi'
import { adaptCuratedExperienceToUI } from '../adapters'
import type { ExperienceCardData } from '../types/experienceCardTypes'

interface UseCuratedExperiencesParams {
    cityId?: string | null
    countryId?: string | null
    preferences: string[]
    limit?: number
    tripMonth?: string | number | null
    groupType?: string | null
    baseCityIds?: string[]
}

interface UseCuratedExperiencesReturn {
    experiences: ExperienceCardData[]
    isLoading: boolean
    error: Error | null
    hasNextPage: boolean
    isFetchingNextPage: boolean
    fetchNextPage: () => Promise<unknown>
}

export const useCuratedExperiences = ({
    countryId,
    cityId,
    preferences,
    limit = 20,
    tripMonth = null,
    groupType = null,
    baseCityIds
}: UseCuratedExperiencesParams): UseCuratedExperiencesReturn => {
    const normalizedPreferences = useMemo(() => [...preferences].sort(), [preferences])
    const preferencesKey = normalizedPreferences.join(',')
    const normalizedTripMonth = tripMonth ?? null
    const normalizedGroupType = groupType ?? null
    const normalizedBaseCityIds = useMemo(() => (baseCityIds && baseCityIds.length > 0 ? [...baseCityIds].sort() : undefined), [baseCityIds])
    const baseCityIdsKey = normalizedBaseCityIds?.join(',') || ''

    const {
        data: curatedExperiencesData,
        isLoading,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ['curatedExperiences', countryId, cityId, preferencesKey, limit, normalizedTripMonth, normalizedGroupType, baseCityIdsKey],
        queryFn: async ({ pageParam = 1 }) => {
            if (!countryId && !cityId) return null
            const response = await fetchCuratedExperiences(
                countryId,
                cityId,
                pageParam,
                limit,
                normalizedPreferences,
                normalizedTripMonth,
                normalizedGroupType,
                normalizedBaseCityIds
            )
            return response
        },
        getNextPageParam: (lastPage) => {
            if (!lastPage) return undefined
            // Use total_pages to determine if there are more pages
            if (lastPage.total_pages && lastPage.page < lastPage.total_pages) {
                return lastPage.page + 1
            }
            return undefined
        },
        initialPageParam: 1,
        enabled: !!countryId || !!cityId,
        refetchOnWindowFocus: false
    })

    const experiences = curatedExperiencesData?.pages
        ? curatedExperiencesData.pages.flatMap((page) => page?.experiences || []).map(adaptCuratedExperienceToUI)
        : []

    return {
        experiences,
        isLoading,
        error: error as Error | null,
        hasNextPage: hasNextPage ?? false,
        isFetchingNextPage,
        fetchNextPage
    }
}
