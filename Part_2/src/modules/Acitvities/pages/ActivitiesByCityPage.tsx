import { useMemo, useState, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import SearchHeader from '@/components/common/SearchHeader'
import ActivitiesCountryHero from '../components/ActivitiesCountryHero'
import TopActivitiesSection from '../sections/TopActivitiesSection'
import { convertToLowerCase } from '../utils/textUtils'
import { useActivitiesSearchByCityPage } from '../hooks/useActivitiesSearchByCityPage'
import { useExperiencesWithShorts } from '@/modules/Experiences/hooks/useExperiencesWithShorts'
import { DiscoverWatchAlongPanel } from '@/pages/Landing/Components/DiscoverWatchAlongPanel'
import ShortsModal from '@/modules/WatchAlong/components/ShortsModal'
import { CollectionSection } from '@/components/Collection'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useCityBasicInfo } from '../hooks/useCityBasicInfo'
import { useExperiencesList } from '../hooks/useExperiencesList'
import ExperiencesListSection from '../components/ExperiencesListSection'
import FilterCarousel from '../components/FilterCarousel'
import { getExperiencePreferencesWithFallback } from '@/modules/Onboarding/adapters/experiencePreferenceAdapters'
import { getCountryExperienceType } from '@/modules/Experiences/api/experienceApi'
import SneakPeekModal from '../components/SneakPeakModal/SneakPeekModal'
import ActivitiesByGroupTypeSection from '../sections/ActivitiesByGroupTypeSection'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { FERRIS_WHEEL_ICON } from '@/constants/thiingsIcons'
import { fetchCityPrompts, type CityPromptRequestBody, type CityPromptResponse } from '@/pages/Stays/Apis/promptsAPI'
import { getAgentBySpace } from '@/api/ataAPI/ataApi'
import SmartSearchSection from '@/modules/Experiences/components/ExperiencesExploreLandingPage/SmartSearchSection'
import { useFilterAndSort } from '../hooks/useFilterAndSort'
import ActivitiesSortModal from '../components/FilterCarousel/ActivitiesSortModal'
import ActivitiesFilterModal from '../components/FilterCarousel/ActivitiesFilterModal'
import type { SortMetadata, SortInitialData, SortResult, FilterMetadata, FilterInitialData, FilterResult } from '../types/filterAndSortTypes'
import type { FilterAndSortConfig } from '../components/FilterCarousel/FilterCarousel'
import RimigoFooter from '@/components/Footer/RimigoFooter'
import { DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE } from '@/routes/routes'
import ReactHelmet from '@/components/shared/React-Helmet/ReactHelmet'
import { useCountryItineraryStatus } from '@/modules/Itinerary/hooks/ItineraryHook'
import MobileCompleteHeaderWithSearch from '@/components/MobileCompleteHeaderWithSearch'
import { ENABLE_SMART_SEARCH } from '../constants/activitesConst'
import { useAuth } from '@/lib/auth/providers/AuthProviders'

const ActivitiesByCityPage = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [isShortsModalOpen, setIsShortsModalOpen] = useState(false)
    const [selectedShortIndex, setSelectedShortIndex] = useState(0)
    const [sneakPeekExperienceId, setSneakPeekExperienceId] = useState<string | null>(null)
    const [isSmartSearchActive, setIsSmartSearchActive] = useState(false)
    const { isAuthenticated } = useAuth()
    // Refs for filter and sort buttons (to position modals)
    const filterButtonRef = useRef<HTMLButtonElement | null>(null)
    const sortButtonRef = useRef<HTMLButtonElement | null>(null)

    // Use page-specific hook for everything: month, cityId, countryId, search configs, and search functionality
    const {
        monthName,
        cityId,
        countryId,
        searchHeaderInitialValues: baseSearchHeaderInitialValues,
        whereConfig,
        whenConfig,
        preferencesConfig,
        onSearch,
        wishlistConfig
    } = useActivitiesSearchByCityPage()
    const currentMonthLowerCase = convertToLowerCase(monthName)

    const urlCityIds = useMemo(() => {
        const cityIdsParam = searchParams.get('city_ids')?.split(',').filter(Boolean) ?? []
        const combined = [...cityIdsParam]
        // Always use cityId if available
        if (cityId) {
            combined.push(cityId)
        }
        return Array.from(new Set(combined))
    }, [searchParams, cityId])

    // Fetch experiences with shorts
    const {
        experiences: watchAlongShorts,
        isLoading: isLoadingWatchAlong,
        hasMore: hasMoreWatchAlong,
        isLoadingMore: isLoadingMoreWatchAlong,
        loadMore: loadMoreWatchAlong
    } = useExperiencesWithShorts({
        countryId: null,
        cityId: cityId || null,
        baseCityIds: urlCityIds.length > 0 ? urlCityIds : undefined,
        limit: 12,
        enabled: !!countryId || !!cityId, // Enable when either countryId or cityId is present
        suggestionPriority: '0'
    })

    // Get trip traveler context for source_id
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const activeTripId = activeTrip?.trip_id ?? null
    const sourceId = activeTrip?.tripProfile?.trip_source || null

    // Search functionality is now handled by useActivitiesSearchByCityPage hook above

    // Get city name from query params first, then from API if not present
    const cityNameFromUrl = useMemo(() => {
        return searchParams.get('city_name') || null
    }, [searchParams])

    // Get city name from hero data (only fetch if not in URL)
    const { data: cityBasicInfo } = useCityBasicInfo({
        cityId: cityId || null,
        currentMonth: currentMonthLowerCase
    })
    const cityNameFromApi = cityBasicInfo?.name || null

    // Priority: URL params > API fetch
    const cityName = cityNameFromUrl || cityNameFromApi

    // Get country name from URL search params or use null
    const countryName = useMemo(() => {
        const countryNameParam = searchParams.get('country_name')
        if (countryNameParam) {
            // Convert from URL format (e.g., "united-states") to display format (e.g., "United States")
            return countryNameParam.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
        }
        return null
    }, [searchParams])

    // Merge cityName into searchHeaderInitialValues once cityBasicInfo is loaded
    const searchHeaderInitialValues = useMemo(() => {
        // If we have cityId and cityName, update initialWhereData to include city
        if (cityId && cityName) {
            return {
                ...baseSearchHeaderInitialValues,
                initialWhereData: [
                    {
                        id: cityId,
                        name: cityName
                    }
                ]
            }
        }
        return baseSearchHeaderInitialValues
    }, [baseSearchHeaderInitialValues, cityId, cityName])

    // Override configs with initial values from URL
    const whereConfigWithInitial = useMemo(() => {
        if (!searchHeaderInitialValues.initialWhereData) {
            return whereConfig
        }
        return {
            ...whereConfig,
            initialData: searchHeaderInitialValues.initialWhereData
        }
    }, [whereConfig, searchHeaderInitialValues.initialWhereData])

    const whenConfigWithInitial = useMemo(() => {
        if (!searchHeaderInitialValues.initialMonth && !searchHeaderInitialValues.initialYear) {
            return whenConfig
        }
        return {
            ...whenConfig,
            initialMonth: searchHeaderInitialValues.initialMonth,
            initialYear: searchHeaderInitialValues.initialYear,
            initialMonthYear: searchHeaderInitialValues.initialYear // For month_year type
        }
    }, [whenConfig, searchHeaderInitialValues.initialMonth, searchHeaderInitialValues.initialYear])

    const preferencesConfigWithInitial = useMemo(() => {
        if (!searchHeaderInitialValues.initialGroupType && !searchHeaderInitialValues.initialTravelPurpose) {
            return preferencesConfig
        }
        return {
            ...preferencesConfig,
            initialGroupType: searchHeaderInitialValues.initialGroupType,
            initialTravelPurpose: searchHeaderInitialValues.initialTravelPurpose
        }
    }, [preferencesConfig, searchHeaderInitialValues.initialGroupType, searchHeaderInitialValues.initialTravelPurpose])

    // Fetch experience preferences for the city
    const { data: experiencePreferences } = useQuery({
        queryKey: ['experiencePreferences', countryId],
        queryFn: () => getExperiencePreferencesWithFallback(() => getCountryExperienceType(countryId ?? '')),
        enabled: !!countryId,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    // Fetch agent ID for experience smart search agent (only when smart search is enabled)
    const { data: experienceSmartSearchAgentId } = useQuery<string>({
        queryKey: ['experienceSmartSearchAgentId'],
        queryFn: () => getAgentBySpace('experience_smart_search_agent'),
        enabled: ENABLE_SMART_SEARCH && isAuthenticated,
        refetchOnWindowFocus: false
    })

    // Filter state for priorities and preferences
    const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])
    const [selectedPreferences, setSelectedPreferences] = useState<string[]>([])

    // Helper function to convert city name to slug
    const toSlug = useCallback((value: string) => {
        return value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
    }, [])

    // Get city slug for prompts API
    const promptCitySlug = useMemo(() => {
        if (cityName && cityName.trim().length > 0) {
            return toSlug(cityName)
        }
        return null
    }, [cityName, toSlug])

    // Helper to get dates from month/year or use defaults
    const getDateRangeFromMonthYear = useCallback((month?: number, year?: number) => {
        const today = new Date()
        const currentYear = year || today.getFullYear()
        const currentMonth = month !== undefined ? month : today.getMonth() + 1

        // First day of the month
        const startDate = new Date(currentYear, currentMonth - 1, 1)
        // Last day of the month
        const endDate = new Date(currentYear, currentMonth, 0)

        return {
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
        }
    }, [])

    // Create prompt request payload
    const promptRequestPayload = useMemo<CityPromptRequestBody | null>(() => {
        if (!promptCitySlug) return null

        // Try to get dates from search params first (if available from trip)
        const startDate = searchParams.get('check_in')
        const endDate = searchParams.get('check_out')

        let finalStartDate: string
        let finalEndDate: string

        if (startDate && endDate) {
            finalStartDate = startDate
            finalEndDate = endDate
        } else {
            // Use month/year to create date range
            const month = searchHeaderInitialValues.initialMonth
            const year = searchHeaderInitialValues.initialYear
            const dateRange = getDateRangeFromMonthYear(month, year)
            finalStartDate = dateRange.start_date
            finalEndDate = dateRange.end_date
        }

        const parseNumber = (value: string | null, fallback: number) => {
            if (!value) return fallback
            const parsed = Number(value)
            return Number.isNaN(parsed) || parsed < 0 ? fallback : parsed
        }

        // Get group setup from trip or use defaults
        const tripGroupSetup = activeTrip?.trip_preference?.group_setup
        const adults = tripGroupSetup?.adults ?? parseNumber(searchParams.get('adults'), 1)
        const children = tripGroupSetup?.children ?? parseNumber(searchParams.get('children'), 0)
        const infants = tripGroupSetup?.infants ?? parseNumber(searchParams.get('infants'), 0)
        const childAges =
            tripGroupSetup?.children_age ??
            ((searchParams.get('children_age') || '')
                .split(',')
                .map((age) => Number(age))
                .filter((age) => !Number.isNaN(age) && age >= 0) ||
                [])

        // Get group type and travel purpose
        const groupTypeRaw =
            searchHeaderInitialValues.initialGroupType || activeTrip?.tripProfile?.group_type || searchParams.get('groupType') || 'solo_traveler'

        const purposeTypeRaw =
            searchHeaderInitialValues.initialTravelPurpose ||
            activeTrip?.tripProfile?.travel_purpose ||
            searchParams.get('travelPurpose') ||
            'leisure_relaxation'

        // Map group types (same as stays)
        const PROMPT_GROUP_TYPE_MAP: Record<string, string> = {
            solo_traveler: 'solo_traveler',
            couple: 'couple',
            couple_with_children: 'family_with_kids',
            friends_group: 'friends_group',
            immediate_family: 'family_group'
        }

        // Map purpose types (same as stays)
        const PROMPT_PURPOSE_TYPE_MAP: Record<string, string> = {
            leisure_relaxation: 'leisure',
            family_vacation: 'family_vacation',
            honeymoon: 'honeymoon',
            anniversary_trip: 'anniversary',
            birthday_celebration: 'celebration',
            solo_escape: 'solo_escape'
        }

        const mappedGroupType = PROMPT_GROUP_TYPE_MAP[groupTypeRaw] ?? groupTypeRaw
        const mappedPurposeType = PROMPT_PURPOSE_TYPE_MAP[purposeTypeRaw] ?? purposeTypeRaw

        const payload: CityPromptRequestBody = {
            start_date: finalStartDate,
            end_date: finalEndDate,
            group_setup: {
                adults,
                children,
                infants,
                child_ages: childAges
            },
            group_type: mappedGroupType,
            purpose_type: mappedPurposeType
        }

        return payload
    }, [promptCitySlug, searchParams, searchHeaderInitialValues, activeTrip, getDateRangeFromMonthYear])

    // Prompt query signature for caching
    const promptPayloadSignature = useMemo(() => (promptRequestPayload ? JSON.stringify(promptRequestPayload) : null), [promptRequestPayload])
    const promptQueryEnabled = Boolean(promptCitySlug && promptRequestPayload)

    // Fetch city prompts (only when smart search is enabled; prompts drive floating questions for smart search)
    const promptQuery = useQuery<CityPromptResponse, Error>({
        queryKey: ['cityPrompts', 'experiences', promptCitySlug, promptPayloadSignature],
        queryFn: () => fetchCityPrompts(promptCitySlug!, 'experiences', promptRequestPayload!),
        enabled: ENABLE_SMART_SEARCH && promptQueryEnabled,
        refetchInterval: (query) => {
            const currentData = query.state.data
            if (!currentData) return 2000
            return currentData.status === 'completed' || currentData.status === 'failed' ? false : 2000
        },
        refetchIntervalInBackground: true,
        staleTime: 0,
        gcTime: 0
    })

    const promptResponse = promptQuery.data
    const promptQuestions = promptResponse?.result?.floating_prompt_questions ?? []

    // Map prompts to FilterCarousel format
    const floatingPrompts = useMemo(() => {
        return promptQuestions.map((question) => ({
            text: question,
            onClick: () => {
                // Trigger smart search with the prompt question
                // The FilterCarousel will handle this through onSmartSearch callback
            }
        }))
    }, [promptQuestions])

    // Handle priority filter toggle
    const handlePriorityToggle = useCallback((filterId: string) => {
        setSelectedPriorities((prev) => {
            if (prev.includes(filterId)) {
                return prev.filter((id) => id !== filterId)
            } else {
                return [...prev, filterId]
            }
        })
    }, [])

    // Handle preference filter toggle
    const handlePreferenceToggle = useCallback((filterId: string) => {
        setSelectedPreferences((prev) => {
            if (prev.includes(filterId)) {
                return prev.filter((id) => id !== filterId)
            } else {
                return [...prev, filterId]
            }
        })
    }, [])

    // Handle sneak peek click
    const handleSneakPeekClick = useCallback((e: React.MouseEvent, experienceId: string) => {
        e.stopPropagation()
        setSneakPeekExperienceId(experienceId)
    }, [])

    // Handle close sneak peek modal
    const handleCloseSneakPeek = useCallback(() => {
        setSneakPeekExperienceId(null)
    }, [])

    // Get query params string for navigation (preserve existing params)
    const queryParamsString = useMemo(() => {
        const params = new URLSearchParams(searchParams)
        const queryString = params.toString()
        return queryString ? `?${queryString}` : ''
    }, [searchParams])

    // Sort options - Only Popular for now
    const sortMetadata: SortMetadata = useMemo(
        () => ({
            options: [
                {
                    id: 'popular',
                    label: 'Popular',
                    value: 'popular'
                }
            ]
        }),
        []
    )

    // Get current sort from URL or state
    const sortInitialData: SortInitialData = useMemo(() => {
        const isPopular = searchParams.get('sort_by_priority') === 'true'
        return {
            selectedSortId: isPopular ? 'popular' : undefined // Only show selected if sort_by_priority is true
        }
    }, [searchParams])

    // Filter metadata - placeholder for future API integration
    const filterMetadata: FilterMetadata | undefined = undefined // Will come from filter API

    // Filter initial data - placeholder for future API integration
    const filterInitialData: FilterInitialData | undefined = undefined // Will come from current state/URL

    // Compute group type and purpose type for smart search (same logic as prompt request)
    const smartSearchGroupType = useMemo(() => {
        const groupTypeRaw =
            searchHeaderInitialValues.initialGroupType || activeTrip?.tripProfile?.group_type || searchParams.get('groupType') || 'solo_traveler'
        const PROMPT_GROUP_TYPE_MAP: Record<string, string> = {
            solo_traveler: 'solo_traveler',
            couple: 'couple',
            couple_with_children: 'family_with_kids',
            friends_group: 'friends_group',
            immediate_family: 'family_group'
        }
        return PROMPT_GROUP_TYPE_MAP[groupTypeRaw] ?? groupTypeRaw
    }, [searchHeaderInitialValues.initialGroupType, activeTrip?.tripProfile?.group_type, searchParams])

    const smartSearchPurposeType = useMemo(() => {
        const purposeTypeRaw =
            searchHeaderInitialValues.initialTravelPurpose ||
            activeTrip?.tripProfile?.travel_purpose ||
            searchParams.get('travelPurpose') ||
            'leisure_relaxation'
        const PROMPT_PURPOSE_TYPE_MAP: Record<string, string> = {
            leisure_relaxation: 'leisure',
            family_vacation: 'family_vacation',
            honeymoon: 'honeymoon',
            anniversary_trip: 'anniversary',
            birthday_celebration: 'celebration',
            solo_escape: 'solo_escape'
        }
        return PROMPT_PURPOSE_TYPE_MAP[purposeTypeRaw] ?? purposeTypeRaw
    }, [searchHeaderInitialValues.initialTravelPurpose, activeTrip?.tripProfile?.travel_purpose, searchParams])

    // Use filter and sort hook to manage state and handlers
    const { isFilterOpen, isSortOpen, openFilter, openSort, closeFilter, closeSort, filterConfig, sortConfig } = useFilterAndSort<
        FilterMetadata,
        FilterInitialData,
        FilterResult,
        SortMetadata,
        SortInitialData,
        SortResult
    >({
        filterConfig: {
            enabled: false, // Disabled for now
            type: 'activities',
            label: 'Filter',
            metadata: filterMetadata,
            initialData: filterInitialData,
            onApply: () => {
                // Handle filter apply - commit filters to URL or state
                // TODO: Implement filter application logic when filter API is ready
            },
            onClear: () => {
                // Handle filter clear
                setSelectedPriorities([])
                setSelectedPreferences([])
                // TODO: Clear filters from URL or state
            }
        },
        sortConfig: {
            enabled: true,
            type: 'activities',
            label: 'Sort',
            metadata: sortMetadata,
            initialData: sortInitialData,
            onApply: (result: SortResult) => {
                // Handle sort apply - commit sort to URL
                const newSearchParams = new URLSearchParams(searchParams)
                const currentSortByPriority = searchParams.get('sort_by_priority') === 'true'

                if (result.sortValue === 'popular') {
                    // Toggle: if already selected, remove it; otherwise, set it
                    if (currentSortByPriority) {
                        newSearchParams.delete('sort_by_priority')
                    } else {
                        newSearchParams.set('sort_by_priority', 'true')
                    }
                } else {
                    newSearchParams.delete('sort_by_priority')
                }
                navigate(`?${newSearchParams.toString()}`, { replace: true })
            }
        }
    })

    // Determine if filter/sort buttons should show as active
    const isFilterActive = useMemo(() => {
        return selectedPriorities.length > 0 || selectedPreferences.length > 0
    }, [selectedPriorities, selectedPreferences])

    // Get sort_by_priority from URL
    const sortByPriority = useMemo(() => {
        return searchParams.get('sort_by_priority') === 'true'
    }, [searchParams])

    const isSortActive = useMemo(() => {
        return sortByPriority
    }, [sortByPriority])

    // Fetch experiences list using hook
    const {
        experiences,
        totalExperiences,
        isLoading: isExperiencesLoading,
        error: experiencesError,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        shortlistState,
        shortlistLoadingIds,
        handleExperienceClick,
        handleShortlistToggle
    } = useExperiencesList({
        countryId: null,
        cityId: cityId || null,
        activeTripId,
        priorities: selectedPriorities,
        preferences: selectedPreferences,
        sortByPriority: sortByPriority,
        enabled: !!cityId // Enable when either countryId or cityId is present
    })

    if (!countryId && !cityId) {
        return null
    }

    // Fetch country itinerary status to determine if smart search is enabled (skip API when smart search is disabled)
    const { data: countryStatusData } = useCountryItineraryStatus(ENABLE_SMART_SEARCH && countryId ? [countryId] : undefined)

    // Check if smart search is enabled based on country live status
    const isSmartSearchEnabled = useMemo(() => {
        if (!ENABLE_SMART_SEARCH) return false

        return countryId ? countryStatusData?.data?.[countryId] === true : false
    }, [countryId, countryStatusData])

    return (
        <>
            <ReactHelmet title={`Activities ${cityName ? `in ${cityName}` : ''} | Rimigo `} />
            <div className="min-h-screen bg-white">
                <div className="md:hidden sticky top-0 z-20">
                    <MobileCompleteHeaderWithSearch
                        title="Activities"
                        iconSrc={FERRIS_WHEEL_ICON}
                        onSearch={onSearch}
                        whereConfig={whereConfigWithInitial}
                        whenConfig={whenConfigWithInitial}
                        preferencesConfig={preferencesConfigWithInitial}
                        wishlistConfig={wishlistConfig}
                        headerType={'experiences'}
                    />
                </div>
                <SearchHeader
                    pageName="Activities"
                    ishidden={true}
                    iconSrc={FERRIS_WHEEL_ICON}
                    onSearch={onSearch}
                    whereConfig={whereConfigWithInitial}
                    whenConfig={whenConfigWithInitial}
                    preferencesConfig={preferencesConfigWithInitial}
                    filterConfig={{ enabled: false }}
                    sortConfig={{ enabled: false }}
                    wishlistConfig={wishlistConfig}
                    assistantConfig={{ enabled: false }}
                />

                {/* Floating Prompts Chips */}
                <div className="w-full max-w-[1320px] mx-auto">
                    <ActivitiesCountryHero
                        city_id={cityId}
                        currentMonthLowerCase={currentMonthLowerCase}
                    />

                    <TopActivitiesSection
                        countryId={null}
                        cityId={cityId}
                        cityIds={urlCityIds}
                        experiencePreferences={experiencePreferences}
                        showSeeAllButton={true}
                        experiencesListSectionId="experiences-list-section"
                    />

                    {/* WatchAlong Panel */}
                    {(isLoadingWatchAlong || watchAlongShorts.length > 0) && (
                        <div className="md:py-12">
                            <DiscoverWatchAlongPanel
                                shorts={watchAlongShorts}
                                isLoading={isLoadingWatchAlong}
                                hasMore={hasMoreWatchAlong}
                                onLoadMore={loadMoreWatchAlong}
                                isLoadingMore={isLoadingMoreWatchAlong}
                                onShortClick={(index) => {
                                    setSelectedShortIndex(index)
                                    setIsShortsModalOpen(true)
                                }}
                                PageName='activites_details_page'
                            />
                        </div>
                    )}

                    {/* Activities by Group Type Section */}
                    <ActivitiesByGroupTypeSection
                        cityId={cityId}
                        countryId={null}
                        countryName={countryName}
                        urlCityIds={urlCityIds}
                        groupTypeFromQuery={searchParams.get('groupType')}
                        onSneakPeekClick={handleSneakPeekClick}
                    />

                    {/* Collections Section by City */}
                    <div className="w-full max-w-[1320px] mx-auto">
                        <CollectionSection
                            showDivider={true}
                            cityId={cityId}
                            enabled={!!cityId}
                            title="Curated collections"
                            onViewAll={(collectionId) => {
                                if (countryId && cityId && collectionId) {
                                    navigate(
                                        `${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/country/${countryId}/city/${cityId}/collection/${collectionId}${queryParamsString}`
                                    )
                                }
                            }}
                            onItemClick={(_collectionId, itemId) => {
                                // Navigate to experience detail using experience_id (itemId)
                                if (itemId) {
                                    window.open(`/experiences/${itemId}${queryParamsString}`)
                                }
                            }}
                        />
                    </div>

                    {/* Creator Collections Section by Source */}
                    {sourceId && (
                        <div className="w-full max-w-[1320px] mx-auto">
                            <CollectionSection
                                cityId={cityId}
                                sourceId={sourceId}
                                title="Curated collections, from your favourite creators"
                                enabled={!!sourceId}
                                onViewAll={(collectionId) => {
                                    if (countryId && cityId && collectionId) {
                                        navigate(
                                            `${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/country/${countryId}/city/${cityId}/collection/${collectionId}${queryParamsString}`
                                        )
                                    }
                                }}
                                onItemClick={(_collectionId, itemId) => {
                                    // Navigate to experience detail using experience_id (itemId)
                                    if (itemId) {
                                        window.open(`/experiences/${itemId}${queryParamsString}`)
                                    }
                                }}
                            />
                        </div>
                    )}

                    {/* Filter Carousel */}
                    <div className="w-full max-md:bg-grey-5 max-md:sticky max-md:top-[160px] max-md:z-16">
                        <FilterCarousel
                            selectedPriorities={selectedPriorities}
                            selectedPreferences={selectedPreferences}
                            onPriorityToggle={handlePriorityToggle}
                            onPreferenceToggle={handlePreferenceToggle}
                            experiencePreferences={experiencePreferences}
                            smartSearchConfig={{ enabled: isSmartSearchEnabled }}
                            floatingPrompts={floatingPrompts}
                            isSmartSearchActive={isSmartSearchActive}
                            onSmartSearchToggle={setIsSmartSearchActive}
                            onSmartSearch={(query) => {
                                // Handle smart search query
                                // TODO: Implement smart search functionality with the query
                                // This will be called when user clicks search button or selects a floating prompt
                                if (query) {
                                    // Placeholder for smart search implementation
                                }
                            }}
                            filterAndSortConfig={
                                {
                                    filterConfig: filterConfig,
                                    sortConfig: sortConfig,
                                    onFilterClick: openFilter,
                                    onSortClick: openSort,
                                    isFilterActive: isFilterActive,
                                    isSortActive: isSortActive,
                                    filterButtonRef: (element) => {
                                        filterButtonRef.current = element
                                    },
                                    sortButtonRef: (element) => {
                                        sortButtonRef.current = element
                                    }
                                } as FilterAndSortConfig<FilterMetadata, FilterInitialData, FilterResult, SortMetadata, SortInitialData, SortResult>
                            }
                        />
                    </div>

                    {/* Smart Search Section */}
                    {isSmartSearchActive && experienceSmartSearchAgentId && (cityId || countryId) && (
                        <SmartSearchSection
                            agentId={experienceSmartSearchAgentId}
                            cityId={cityId}
                            cityName={cityName}
                            countryId={countryId}
                            countryName={countryName}
                            month={monthName}
                            groupType={smartSearchGroupType}
                            purposeType={smartSearchPurposeType}
                            preferences={selectedPreferences}
                            tripId={activeTripId}
                            floatingPrompts={floatingPrompts}
                            shortlistState={shortlistState}
                            shortlistLoadingIds={shortlistLoadingIds}
                            onShortlistToggle={handleShortlistToggle}
                            onExperienceClick={handleExperienceClick}
                            onSneakPeekClick={handleSneakPeekClick}
                            onSearch={(query) => {
                                // Handle smart search query
                                if (query) {
                                    // Smart search is now handled internally by SmartSearchSection
                                }
                            }}
                            onClose={() => setIsSmartSearchActive(false)}
                        />
                    )}

                    {/* Experiences List Section */}
                    {!isSmartSearchActive && (
                        <ExperiencesListSection
                            id="experiences-list-section"
                            experiences={experiences}
                            totalExperiences={totalExperiences}
                            locationName={cityName || undefined}
                            isLoading={isExperiencesLoading}
                            error={experiencesError}
                            hasNextPage={hasNextPage}
                            isFetchingNextPage={isFetchingNextPage}
                            fetchNextPage={fetchNextPage}
                            shortlistState={shortlistState}
                            shortlistLoadingIds={shortlistLoadingIds}
                            onExperienceClick={handleExperienceClick}
                            onShortlistToggle={handleShortlistToggle}
                            onSneakPeekClick={handleSneakPeekClick}
                            experiencePreferences={experiencePreferences}
                            selectedPreferences={selectedPreferences}
                            selectedPriorities={selectedPriorities}
                        />
                    )}
                </div>

                <RimigoFooter />

                {/* Shorts Modal */}
                <ShortsModal
                    isOpen={isShortsModalOpen}
                    onClose={() => setIsShortsModalOpen(false)}
                    experiences={watchAlongShorts}
                    initialIndex={selectedShortIndex}
                    hasMore={hasMoreWatchAlong}
                    onLoadMore={loadMoreWatchAlong}
                    isLoadingMore={isLoadingMoreWatchAlong}
                />

                {/* Sneak Peek Modal */}
                {sneakPeekExperienceId && (
                    <SneakPeekModal
                        isOpen={!!sneakPeekExperienceId}
                        onClose={handleCloseSneakPeek}
                        experienceId={sneakPeekExperienceId}
                    />
                )}

                {/* Filter Modal - Currently disabled/placeholder */}
                <ActivitiesFilterModal
                    isOpen={isFilterOpen}
                    onClose={closeFilter}
                    anchorElement={filterButtonRef.current}
                    metadata={filterMetadata}
                    initialData={filterInitialData}
                    onApply={(result: FilterResult) => {
                        if (filterConfig.onApply) {
                            filterConfig.onApply(result)
                        }
                    }}
                    onClear={() => {
                        if (filterConfig.onClear) {
                            filterConfig.onClear()
                        }
                    }}
                />

                {/* Sort Modal */}
                <ActivitiesSortModal
                    isOpen={isSortOpen}
                    onClose={closeSort}
                    anchorElement={sortButtonRef.current}
                    metadata={sortMetadata}
                    initialData={sortInitialData}
                    onApply={(result: SortResult) => {
                        if (sortConfig.onApply) {
                            sortConfig.onApply(result)
                        }
                    }}
                />
            </div>
        </>
    )
}

export default ActivitiesByCityPage
