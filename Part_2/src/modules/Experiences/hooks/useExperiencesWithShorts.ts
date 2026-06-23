import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { getExperiencesWithShorts, getExperiencesWithShortsByCity, ExperienceWithShort } from '@/modules/WatchAlong/api/watchAlongApi'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'

interface UseExperiencesWithShortsParams {
    countryId: string | null
    cityId?: string | null
    baseCityIds?: string[]
    limit?: number
    enabled?: boolean
    suggestionPriority?: string
}

interface UseExperiencesWithShortsReturn {
    experiences: ExperienceWithShort[]
    isLoading: boolean
    isError: boolean
    hasMore: boolean
    isLoadingMore: boolean
    loadMore: () => void
    reset: () => void
}

export const useExperiencesWithShorts = ({
    countryId,
    cityId,
    baseCityIds,
    limit = 20,
    enabled = true,
    suggestionPriority = '0'
}: UseExperiencesWithShortsParams): UseExperiencesWithShortsReturn => {
    const [page, setPage] = useState(1)
    const [experiences, setExperiences] = useState<ExperienceWithShort[]>([])
    const [hasMore, setHasMore] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)

    // Normalize city IDs for query key
    const normalizedCityIds = useMemo(() => (baseCityIds && baseCityIds.length > 0 ? [...baseCityIds].sort().join(',') : ''), [baseCityIds])

    // Track previous country/city key to detect changes and reset pagination
    const countryCityKey = useMemo(() => `${countryId || ''}-${cityId || ''}-${normalizedCityIds}`, [countryId, cityId, normalizedCityIds])
    const prevCountryCityKeyRef = useRef<string>(countryCityKey)

    // Reset pagination to page 1 when country or cities change
    useEffect(() => {
        if (prevCountryCityKeyRef.current !== countryCityKey) {
            // Country or cities changed - reset to page 1
            // React Query will automatically fetch new data due to query key change
            setPage(1)
            setIsLoadingMore(false)
            prevCountryCityKeyRef.current = countryCityKey
        }
    }, [countryCityKey])

    // Fetch experiences with shorts
    const {
        data: shortsData,
        isFetching,
        isError
    } = useQuery({
        queryKey: ['experiencesWithShorts', countryId, cityId, normalizedCityIds, page],
        queryFn: () => {
            // If country_id is present, use country explore-with-shorts API
            if (countryId) {
                return getExperiencesWithShorts(countryId, page, limit, true, baseCityIds, suggestionPriority)
            }
            // If country_id is not present but city_id is, use city explore-with-shorts API
            if (cityId) {
                return getExperiencesWithShortsByCity(cityId, page, limit, true, suggestionPriority)
            }
            return null
        },
        enabled: enabled && (!!countryId || !!cityId), // Enable when either countryId or cityId is present
        staleTime: HOURS_24, // 5 minutes
        refetchOnWindowFocus: false
    })

    // Update experiences when data is fetched
    useEffect(() => {
        if (!shortsData) return

        if (shortsData.data && shortsData.data.length > 0) {
            if (page === 1) {
                // First page - replace experiences (this handles country/city changes via query key)
                setExperiences(shortsData.data)
            } else {
                // Append new experiences for pagination (avoid duplicates)
                setExperiences((prev) => {
                    const existingIds = new Set(prev.map((exp) => exp.id))
                    const newExperiences = shortsData.data.filter((exp) => !existingIds.has(exp.id))
                    return newExperiences.length > 0 ? [...prev, ...newExperiences] : prev
                })
            }
            // Calculate has_more based on pagination
            const hasMoreData = shortsData.page * shortsData.limit < shortsData.total_experiences
            setHasMore(hasMoreData)
        } else {
            // No experiences in response
            if (page === 1) {
                setExperiences([])
            }
            setHasMore(false)
        }
    }, [shortsData, page])

    // Update loading state when fetch completes
    useEffect(() => {
        if (!isFetching) {
            setIsLoadingMore(false)
        }
    }, [isFetching])

    // Load more experiences
    const loadMore = useCallback(() => {
        if (isLoadingMore || !hasMore || isFetching) return
        setIsLoadingMore(true)
        setPage((prev) => prev + 1)
    }, [isLoadingMore, hasMore, isFetching])

    // Reset to first page
    const reset = useCallback(() => {
        setPage(1)
        setExperiences([])
        setHasMore(false)
        setIsLoadingMore(false)
    }, [])

    return {
        experiences,
        isLoading: isFetching && page === 1,
        isError,
        hasMore,
        isLoadingMore,
        loadMore,
        reset
    }
}
