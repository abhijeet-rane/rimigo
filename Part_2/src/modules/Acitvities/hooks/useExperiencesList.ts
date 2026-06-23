import { useState, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { fetchExperiencesByCountry, fetchExperiencesByCity } from '@/modules/Experiences/api/experienceApi'
import { adaptCountryExperienceToUI } from '@/modules/Experiences/adapters'
import { bulkUpsertTripExperiences } from '@/modules/Experiences/api/experienceShortlistAPI'
import { dispatchOpenTripCreationModal } from '@/lib/events/tripCreationModalEvents'
import { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import { useShortlistedExperiences } from '../context/ShortlistedExperiencesContext'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { useLoginModal } from '@/modules/Onboarding/context/LoginModalContext'

interface UseExperiencesListParams {
    countryId: string | null
    cityId: string | null
    activeTripId: string | null
    priorities?: string[]
    preferences?: string[]
    sortByPriority?: boolean
    enabled?: boolean
}

interface UseExperiencesListReturn {
    experiences: ExperienceCardData[]
    totalExperiences: number
    isLoading: boolean
    error: unknown
    hasNextPage: boolean
    isFetchingNextPage: boolean
    fetchNextPage: () => void
    shortlistState: Record<string, { experienceId: string; isShortlisted: boolean }>
    shortlistLoadingIds: Record<string, boolean>
    handleExperienceClick: (experienceId: string) => void
    handleShortlistToggle: (experienceId: string) => Promise<void>
}

export const useExperiencesList = ({
    countryId,
    cityId,
    activeTripId,
    priorities = [],
    preferences = [],
    sortByPriority = false,
    enabled = true
}: UseExperiencesListParams): UseExperiencesListReturn => {
    const [searchParams] = useSearchParams()
    const { shortlistState, refreshShortlist } = useShortlistedExperiences()
    const [shortlistLoadingIds, setShortlistLoadingIds] = useState<Record<string, boolean>>({})
    const { isAuthenticated } = useAuth()
    const { openLoginModal } = useLoginModal()

    // Fetch experiences using infinite query
    // Use city explore API when country_id is not present, otherwise use country explore API
    const {
        data: experiencesData,
        isLoading,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ['experiences', countryId, cityId, JSON.stringify(priorities.sort()), JSON.stringify(preferences.sort()), sortByPriority],
        queryFn: async ({ pageParam = 1 }) => {
            // If country_id is present, use country explore API
            if (countryId) {
                const cityIds = cityId ? [cityId] : []
                const response = await fetchExperiencesByCountry(
                    countryId,
                    pageParam,
                    20,
                    priorities,
                    cityIds,
                    undefined,
                    preferences,
                    sortByPriority
                )
                return response
            }
            // If country_id is not present but city_id is, use city explore API
            if (cityId) {
                const response = await fetchExperiencesByCity(cityId, pageParam, 20, priorities, undefined, preferences, sortByPriority)
                return response
            }
            return null
        },
        getNextPageParam: (lastPage) => {
            if (!lastPage || !lastPage.has_more) return undefined
            return lastPage.page + 1
        },
        initialPageParam: 1,
        enabled: enabled && (!!countryId || !!cityId),
        refetchOnWindowFocus: false
    })

    // Transform experiences data to UI format
    const experiences = experiencesData?.pages ? experiencesData.pages.flatMap((page) => page?.data || []).map(adaptCountryExperienceToUI) : []
    const totalExperiences = experiencesData?.pages[0]?.total_experiences ?? 0

    // Handle experience click
    const handleExperienceClick = useCallback(
        (experienceId: string) => {
            const url = `/experiences/${experienceId}/?${searchParams.toString()}`
            window.open(url)
        },
        [searchParams]
    )

    // Handle shortlist toggle
    const handleShortlistToggle = useCallback(
        async (experienceId: string) => {
            if (!experienceId) {
                return
            }

            // Auth gate: unauthenticated viewers see the shared login
            // modal (same one used at the end of tripboard creation)
            // instead of falling through to the no-active-trip branch,
            // which would dispatch the trip-creation modal and ignore
            // the underlying problem (no JWT for the shortlist API).
            if (!isAuthenticated) {
                openLoginModal({ redirectAfterLogin: false })
                return
            }

            if (!activeTripId) {
                dispatchOpenTripCreationModal({ source: 'experiences-card' })
                return
            }

            const existingEntry = shortlistState[experienceId]
            const nextState = !(existingEntry?.isShortlisted ?? false)

            setShortlistLoadingIds((prev) => ({ ...prev, [experienceId]: true }))

            try {
                await bulkUpsertTripExperiences(activeTripId, {
                    trip_id: activeTripId,
                    experiences: [
                        {
                            experience_id: experienceId,
                            is_traveler_shortlisted: nextState
                        }
                    ]
                })

                // Refresh shortlist state from context
                await refreshShortlist()

                toast.success(nextState ? 'Added to wishlist' : 'Removed from wishlist')
            } catch {
                toast.error('Failed to update wishlist')
            } finally {
                setShortlistLoadingIds((prev) => {
                    const updated = { ...prev }
                    delete updated[experienceId]
                    return updated
                })
            }
        },
        [activeTripId, shortlistState, refreshShortlist, isAuthenticated, openLoginModal]
    )

    return {
        experiences,
        totalExperiences,
        isLoading,
        error,
        hasNextPage: hasNextPage ?? false,
        isFetchingNextPage,
        fetchNextPage,
        shortlistState,
        shortlistLoadingIds,
        handleExperienceClick,
        handleShortlistToggle
    }
}
