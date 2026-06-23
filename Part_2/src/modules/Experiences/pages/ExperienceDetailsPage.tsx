import { useState, useEffect, useCallback } from 'react'
import ExperienceDetailsSection from '../components/ExperienceDetails/ExperienceDetailsSection'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getAllCitiesByCountryWithExperiences, getCountryExperienceType, getExperienceDetailsById } from '../api/experienceApi'
import { ExperienceDetailsType } from '../types/experienceDetailTypes'
import { adaptExperienceDetailsToUI } from '../adapters'
import { useSearchParams } from 'react-router-dom'
import { getReviewSummary } from '@/pages/Stays/Apis/staysAPI'
import SearchHeader from '@/components/common/SearchHeader'
import { getLiveCountries, LocationPersonalizationResponse } from '@/api/curation/locationPersonalizationAPI'
import { getExperiencePreferencesWithFallback, ExperiencePreferenceUI } from '@/modules/Onboarding/adapters/experiencePreferenceAdapters'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { getAgentBySpace } from '@/api/ataAPI/ataApi'
import ReactHelmet from '@/components/shared/React-Helmet/ReactHelmet'
import { WEBSITE_CONFIG } from '@/constants/websiteConfig'
import MobileCompleteHeaderWithSearch from '@/components/MobileCompleteHeaderWithSearch'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import AddToCollectionModal from '@/modules/ContentCollection/components/AddToCollectionModal'

interface SummaryData {
    recommendation_details: {
        is_recommended: boolean
        reasoning_for_recommendation: string[]
    }
    tags: string[]
    curated_overall_score?: number
}

const ExperienceDetailsPage = () => {
    // capture experience id
    const { experienceId } = useParams()
    const navigate = useNavigate()
    const ATA_AGENT_SPACE = 'experience_expert_chat'
    const [searchParams, setSearchParams] = useSearchParams()
    const travelerTripsContext = useOptionalTravelerTrips()
    // get trip id from context
    const tripId = travelerTripsContext?.activeTrip?.trip_id || ''
    const { isAuthenticated } = useAuth()
    const [isAddToCollectionModalOpen, setIsAddToCollectionModalOpen] = useState(false)
    // Fetch agent ID by space

    const { data: agentId } = useQuery({
        queryKey: ['agentBySpace', ATA_AGENT_SPACE],
        queryFn: () => getAgentBySpace(ATA_AGENT_SPACE),
        enabled: isAuthenticated,
        staleTime: HOURS_24 // Cache for 24 hours since agent IDs don't change frequently
    })

    // fetch experience details (uses identifier query param for slug/id lookup)
    const { data: experienceDetails, isLoading: isExperienceDetailsLoading } = useQuery({
        queryKey: ['experienceDetails', experienceId],
        queryFn: () => getExperienceDetailsById(experienceId as string, groupTypeParam, travelPurposeParam, preferencesParam),
        enabled: !!experienceId
    })

    // Extract country info from experience details
    const experienceCountryId = experienceDetails?.data?.experience?.base_city?.country?.id
    const experienceCountryName = experienceDetails?.data?.experience?.base_city?.country?.name

    // Get filter params from URL
    const urlPreferences = searchParams.get('preferences')?.split(',').filter(Boolean) || []
    const urlCityIds = searchParams.get('city_ids')?.split(',').filter(Boolean) || []
    const monthParam = searchParams.get('month')
    const yearParam = searchParams.get('year')

    // for experiene details
    const groupTypeParam = searchParams.get('groupType') ?? ''
    const travelPurposeParam = searchParams.get('travelPurpose') ?? ''
    // Not being used
    const preferencesParam = searchParams.get('preferences')?.split(',').filter(Boolean) || []

    // Initialize month from URL if available
    const initialMonth = (() => {
        if (monthParam && yearParam) {
            try {
                const month = parseInt(monthParam, 10) - 1 // Convert to 0-11 for Date constructor
                const year = parseInt(yearParam, 10)
                if (!isNaN(month) && !isNaN(year) && month >= 0 && month <= 11) {
                    return new Date(year, month, 1) // First day of the month
                }
            } catch {
                // Invalid date, ignore
            }
        }
        return null
    })()

    // State for SearchBar
    const [selectedCities, setSelectedCities] = useState<string[]>(urlCityIds)
    const [selectedMonth, setSelectedMonth] = useState<Date | null>(initialMonth)
    const [selectedExperiencePreferences, setSelectedExperiencePreferences] = useState<string[]>(urlPreferences)

    // Fetch countries data
    const { isLoading: isLocationPersonalizationLoading } = useQuery<LocationPersonalizationResponse[]>({
        queryKey: ['locationPersonalization'],
        queryFn: () => getLiveCountries(),
        enabled: true,
        staleTime: HOURS_24
    })

    // Get country ID from experience or URL params
    const urlCountryId = searchParams.get('country_id') || experienceCountryId || ''
    const properCountryName = experienceCountryName || ''

    // Fetch cities for the selected country
    const { data: citiesData, isPending: isCitiesLoading } = useQuery({
        queryKey: ['cities', properCountryName],
        queryFn: () => getAllCitiesByCountryWithExperiences(properCountryName),
        enabled: !!properCountryName && !!urlCountryId
    })

    // Map cities data for SearchBar
    const searchBarCities = citiesData?.results
        ? citiesData.results.map((city: { id: string; name: string }) => ({
              id: city.id,
              name: city.name
          }))
        : []

    // Fetch experience preferences for the country
    const { data: experiencePreferences, isPending: isExperiencePreferencesLoading } = useQuery<ExperiencePreferenceUI[]>({
        queryKey: ['experiencePreferences', urlCountryId],
        queryFn: () => getExperiencePreferencesWithFallback(() => getCountryExperienceType(urlCountryId)),
        enabled: !!urlCountryId,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    // Helper functions
    const modifyCountryName = (countryName: string) => {
        return countryName.replace(/ /g, '-').toLowerCase()
    }

    // Update URL when filters change
    useEffect(() => {
        const newSearchParams = new URLSearchParams(searchParams)

        // Preserve existing params first
        if (urlCountryId) {
            newSearchParams.set('country_id', urlCountryId)
        }
        if (properCountryName) {
            const modifiedCountryName = modifyCountryName(properCountryName)
            newSearchParams.set('country_name', modifiedCountryName)
        }
        if (tripId) {
            newSearchParams.set('trip_id', tripId)
        }

        // Update preferences (experience preferences - stored as "preferences" param)
        const currentPreferences = searchParams.get('preferences') || ''
        const newPreferences = selectedExperiencePreferences.length > 0 ? selectedExperiencePreferences.join(',') : ''
        if (newPreferences !== currentPreferences) {
            if (newPreferences) {
                newSearchParams.set('preferences', newPreferences)
            } else {
                newSearchParams.delete('preferences')
            }
        }

        // Update city_ids
        const currentCityIds = searchParams.get('city_ids') || ''
        const newCityIds = selectedCities.length > 0 ? selectedCities.join(',') : ''
        if (newCityIds !== currentCityIds) {
            if (newCityIds) {
                newSearchParams.set('city_ids', newCityIds)
            } else {
                newSearchParams.delete('city_ids')
            }
        }

        // Update month and year if selected
        const currentMonth = searchParams.get('month')
        const currentYear = searchParams.get('year')
        if (selectedMonth) {
            const month = selectedMonth.getMonth() + 1 // getMonth() returns 0-11, so add 1
            const year = selectedMonth.getFullYear()
            const monthStr = month.toString()
            const yearStr = year.toString()
            if (monthStr !== currentMonth || yearStr !== currentYear) {
                newSearchParams.set('month', monthStr)
                newSearchParams.set('year', yearStr)
            }
        } else if ((currentMonth || currentYear) && !selectedMonth) {
            // State is cleared but URL still has month - clear URL
            newSearchParams.delete('month')
            newSearchParams.delete('year')
        }

        // Only update if something actually changed
        const currentParams = searchParams.toString()
        const newParams = newSearchParams.toString()
        if (currentParams !== newParams) {
            setSearchParams(newSearchParams, { replace: true })
        }
    }, [selectedExperiencePreferences, selectedCities, selectedMonth, searchParams, setSearchParams, urlCountryId, properCountryName, tripId])

    // Handle country selection from SearchHeader
    const handleCountrySelect = useCallback(
        (countryId: string, countryName: string) => {
            const modifiedCountryName = modifyCountryName(countryName)

            // Preserve existing params (month, year, cities, preferences, trip_id)
            const newSearchParams = new URLSearchParams(searchParams)

            // Update country params
            newSearchParams.set('country_name', modifiedCountryName)
            newSearchParams.set('country_id', countryId)

            // Preserve trip_id if present
            if (tripId) {
                newSearchParams.set('trip_id', tripId)
            }

            // Preserve month and year if already selected
            if (selectedMonth) {
                const month = selectedMonth.getMonth() + 1
                const year = selectedMonth.getFullYear()
                newSearchParams.set('month', month.toString())
                newSearchParams.set('year', year.toString())
            }

            // Preserve cities if already selected
            if (selectedCities.length > 0) {
                newSearchParams.set('city_ids', selectedCities.join(','))
            }

            // Preserve preferences if already selected
            if (selectedExperiencePreferences.length > 0) {
                newSearchParams.set('preferences', selectedExperiencePreferences.join(','))
            }

            navigate(`/experiences/?${newSearchParams.toString()}`)
        },
        [navigate, tripId, searchParams, selectedMonth, selectedCities, selectedExperiencePreferences]
    )

    // Handle city multi-select from SearchHeader
    const handleCityMultiSelect = useCallback((cityIds: string[]) => {
        setSelectedCities(cityIds)
    }, [])

    // Handle month selection from SearchHeader
    const handleMonthSelect = useCallback((date: Date) => {
        setSelectedMonth(date)
    }, [])

    // Handle experience preferences toggle from SearchHeader
    const handleExperiencePreferenceToggle = useCallback((value: string) => {
        setSelectedExperiencePreferences((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
    }, [])

    // Polling state for review summary

    const [summaryData, setSummaryData] = useState<SummaryData | null>(null)

    const [isReviewSummaryLoading, setIsReviewSummaryLoading] = useState(true)
    const [, setUseFallback] = useState(false)

    // Polling logic for review summary (similar to MatchSummary)
    useEffect(() => {
        const fetchSummary = async () => {
            // Check if we have summary_request_id from experienceDetails (similar to hotelData.review_data?.summary_request_id)
            // For now, using experienceId directly. If review_data.summary_request_id exists, use that instead

            const summaryRequestId = experienceDetails?.data?.cache_key || ''

            if (!summaryRequestId) {
                setUseFallback(true)
                setIsReviewSummaryLoading(false)
                return
            }

            const pollingIntervals = [3000, 3000, 2000, 2000, 2000, 2000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]
            let attemptCount = 0

            const poll = async () => {
                try {
                    const response = await getReviewSummary(summaryRequestId)

                    if (response.status === 200 && response.data?.data?.status === 'completed') {
                        setSummaryData(response.data.data.result)
                        setIsReviewSummaryLoading(false)
                        setUseFallback(false)
                        return
                    }

                    if (response.status === 202 && attemptCount < pollingIntervals.length) {
                        setTimeout(() => {
                            attemptCount++
                            poll()
                        }, pollingIntervals[attemptCount])
                    } else {
                        // Max attempts reached or unexpected status
                        setUseFallback(true)
                        setIsReviewSummaryLoading(false)
                    }
                } catch (error: unknown) {
                    // If 404 or 5xx error, use fallback

                    const errorStatus = (error as { response?: { status?: number } })?.response?.status

                    if (errorStatus === 404 || (errorStatus !== undefined && errorStatus >= 500 && errorStatus < 600)) {
                        setUseFallback(true)
                        setIsReviewSummaryLoading(false)
                    } else if (attemptCount < pollingIntervals.length) {
                        // Continue polling for other errors
                        setTimeout(() => {
                            attemptCount++
                            poll()
                        }, pollingIntervals[attemptCount])
                    } else {
                        setUseFallback(true)
                        setIsReviewSummaryLoading(false)
                    }
                }
            }

            poll()
        }

        // Only start polling once experienceDetails is loaded
        if (!isExperienceDetailsLoading && experienceDetails) {
            fetchSummary()
        }
    }, [experienceDetails, experienceId, isExperienceDetailsLoading])

    if (isExperienceDetailsLoading || isLocationPersonalizationLoading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>
    }

    if (!experienceDetails) {
        return <div className="flex items-center justify-center h-screen">Experience not found</div>
    }

    const adaptedExperienceDetails = adaptExperienceDetailsToUI(experienceDetails.data.experience as ExperienceDetailsType)
    const floatingQuestionsCacheKey = experienceDetails.data.floating_questions_cache_key ?? null

    // Debug assistant config values
    // const assistantEnabled =
    //     (!isAgentIdLoading && !!agentId && !!experienceId && !!adaptedExperienceDetails?.name) ?? !!adaptedExperienceDetails.ata_agent?.id

    return (
        <>
            <ReactHelmet title={adaptedExperienceDetails.identifier} />
            <div className="min-h-screen bg-white">
                {/* SearchHeader with SearchBar */}
                <div className="md:hidden sticky top-0 z-20">
                    <MobileCompleteHeaderWithSearch
                        title={'Activities'}
                        headerType={'experiences'}
                        countryConfig={{ enabled: false, label: 'Country', placeholder: 'Search countries' }}
                        whereConfig={{ enabled: false }}
                        whenConfig={{ enabled: false }}
                        preferencesConfig={{ enabled: false }}
                    />
                </div>
                <SearchHeader
                    pageName="Activities"
                    // @ts-expect-error - this is a temporary fix to allow the country name to be passed to the SearchHeader
                    formattedCountryName={properCountryName}
                    countryId={urlCountryId}
                    onCountrySelect={handleCountrySelect}
                    showFilters={false}
                    showSort={false}
                    ishidden={true}
                    // Configure segments
                    countryConfig={{ enabled: false, label: 'Country', placeholder: 'Search countries' }}
                    whereConfig={{ enabled: false }}
                    whenConfig={{ enabled: false }}
                    preferencesConfig={{ enabled: false }}
                    cityConfig={{ enabled: false, label: 'Cities', placeholder: 'Add cities' }}
                    monthConfig={{ enabled: false, label: 'Month', placeholder: 'Add month' }}
                    experiencePreferencesConfig={{ enabled: false, label: 'Preferences', placeholder: 'Add preferences' }}
                    filterConfig={{ enabled: false }}
                    sortConfig={{ enabled: false }}
                    // Assistant configuration - only enable if agent ID is loaded and all required fields are present
                    assistantConfig={{
                        enabled: !!(adaptedExperienceDetails.ata_agent?.id ?? agentId) && !!experienceId && !!adaptedExperienceDetails.name,
                        ataId: adaptedExperienceDetails.ata_agent?.id ?? agentId,
                        tripId: tripId || undefined,
                        assistantType: 'ExperienceExpertChat',
                        entityType: 'experience_id',
                        entityId: experienceId || '',
                        inputData: {
                            experienceId: experienceId || '',
                            experienceName: adaptedExperienceDetails.name || ''
                        },
                        // agent name
                        text: WEBSITE_CONFIG.ASSISTANT_BUTTON_TEXT,
                        iconUrl: adaptedExperienceDetails.ata_agent?.icon_url || '',
                        className: ''
                    }}
                    // City props
                    cities={searchBarCities}
                    isLoadingCities={isCitiesLoading}
                    selectedCityIds={selectedCities}
                    onCityMultiSelect={handleCityMultiSelect}
                    // Month props
                    initialMonth={selectedMonth}
                    onMonthSelect={handleMonthSelect}
                    // Experience preferences props
                    initialExperiencePreferences={selectedExperiencePreferences}
                    onExperiencePreferencesToggle={handleExperiencePreferenceToggle}
                    experiencePreferences={experiencePreferences}
                    isLoadingExperiencePreferences={isExperiencePreferencesLoading}
                />
                <div className="flex h-[calc(100vh-80px)]">
                    {/* make the container scrollable */}
                    <div className="w-full overflow-y-auto">
                        <ExperienceDetailsSection
                            experienceDetails={adaptedExperienceDetails}
                            summaryData={summaryData}
                            isSummaryLoading={isReviewSummaryLoading}
                            selectedMonth={selectedMonth}
                            recommendedMode={adaptedExperienceDetails.recommended_mode}
                            tripId={tripId}
                            floatingQuestionsCacheKey={floatingQuestionsCacheKey}
                            onAddToCollection={() => setIsAddToCollectionModalOpen(true)}
                        />
                    </div>
                </div>

                {/* Add to Collection Modal */}
                {experienceId && (
                    <AddToCollectionModal
                        isOpen={isAddToCollectionModalOpen}
                        onClose={() => setIsAddToCollectionModalOpen(false)}
                        experienceId={experienceId}
                        experienceName={adaptedExperienceDetails.name || 'Experience'}
                        entityType="experience"
                    />
                )}
            </div>
        </>
    )
}

export default ExperienceDetailsPage
