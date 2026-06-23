import { useState, useMemo, useCallback } from 'react'
import SearchHeader from '@/components/common/SearchHeader'
import ActivitiesCountryHero from '../components/ActivitiesCountryHero'
import { useSearchParams } from 'react-router-dom'
import TopActivitiesSection from '../sections/TopActivitiesSection'
import TopCitiesSection from '../sections/TopCitiesSection'
import AllCitiesSection from '../sections/AllCitiesSection'
import Divider from '@/components/shared/Divider/Divider'
import { useExperiencesWithShorts } from '@/modules/Experiences/hooks/useExperiencesWithShorts'
import { DiscoverWatchAlongPanel } from '@/pages/Landing/Components/DiscoverWatchAlongPanel'
import { DiscoverSection } from '@/pages/Landing/Components/DiscoverSection'
import ShortsModal from '@/modules/WatchAlong/components/ShortsModal'
import { useActivitiesSearchExplorePage } from '../hooks/useActivitiesSearchExplorePage'
import { FERRIS_WHEEL_ICON } from '@/constants/thiingsIcons'
import RimigoFooter from '@/components/Footer/RimigoFooter'
import ReactHelmet from '@/components/shared/React-Helmet/ReactHelmet'
import { useCountryLiveStatus } from '@/hooks/useCountryLiveStatus'
import { NotLiveCountryMessage } from '@/pages/Landing/Components/NotLiveCountryMessage'
import ExperiencesListSection from '../components/ExperiencesListSection'
import { useExperiencesList } from '../hooks/useExperiencesList'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import SneakPeekModal from '../components/SneakPeakModal/SneakPeekModal'
import MobileCompleteHeaderWithSearch from '@/components/MobileCompleteHeaderWithSearch'
import { useAuth } from '@/lib/auth/providers/AuthProviders'

interface ActivitiesExplorePageProps {
    country_id: string | null
    city_id: string | null
    currentMonthLowerCase: string
}

const ActivitiesExplorePage = ({ country_id, city_id, currentMonthLowerCase }: ActivitiesExplorePageProps) => {
    const [searchParams] = useSearchParams()
    const { isAuthenticated } = useAuth()
    const [isShortsModalOpen, setIsShortsModalOpen] = useState(false)
    const [selectedShortIndex, setSelectedShortIndex] = useState(0)
    const [sneakPeekExperienceId, setSneakPeekExperienceId] = useState<string | null>(null)

    // Get trip traveler context for activeTripId
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const activeTripId = activeTrip?.trip_id ?? null

    const isTripPlanned = Boolean(activeTrip?.final_destination_countries && activeTrip.final_destination_countries.length > 0)
    const shouldUsePrioritized = isAuthenticated && isTripPlanned

    // Use page-specific hook as single source of truth for all search configs
    const { whereConfig, whenConfig, preferencesConfig, onSearch, wishlistConfig } = useActivitiesSearchExplorePage(country_id, city_id)

    const urlCityIds = useMemo(() => {
        return searchParams.get('city_ids')?.split(',').filter(Boolean) || []
    }, [searchParams])
    // Fetch experiences with shorts
    const {
        experiences: watchAlongShorts,
        isLoading: isLoadingWatchAlong,
        hasMore: hasMoreWatchAlong,
        isLoadingMore: isLoadingMoreWatchAlong,
        loadMore: loadMoreWatchAlong
    } = useExperiencesWithShorts({
        countryId: country_id || null,
        baseCityIds: urlCityIds.length > 0 ? urlCityIds : undefined,
        limit: 12,
        enabled: !!country_id,
        suggestionPriority: '0'
    })

    const country_name = searchParams.get('country_name')
    // captialize first word
    const capitalizedCountryName = country_name ? country_name.charAt(0).toUpperCase() + country_name.slice(1) : ''

    const { isCountryLive, selectedCountry } = useCountryLiveStatus({
        countryId: country_id,
        shouldUsePrioritized
    })

    // Fetch all experiences for the country
    const {
        experiences,
        totalExperiences,
        isLoading: isExperiencesLoading,
        error: experiencesError,
        hasNextPage: hasExperiencesNextPage,
        isFetchingNextPage: isFetchingExperiencesNextPage,
        fetchNextPage: fetchExperiencesNextPage,
        shortlistState,
        shortlistLoadingIds,
        handleExperienceClick,
        handleShortlistToggle
    } = useExperiencesList({
        countryId: country_id || null,
        cityId: null, // Show all cities' experiences
        activeTripId,
        priorities: [],
        preferences: [],
        enabled: !!country_id && isCountryLive !== false
    })

    // Handle sneak peek click
    const handleSneakPeekClick = useCallback((e: React.MouseEvent, experienceId: string) => {
        e.stopPropagation()
        setSneakPeekExperienceId(experienceId)
    }, [])

    // Handle close sneak peek modal
    const handleCloseSneakPeek = useCallback(() => {
        setSneakPeekExperienceId(null)
    }, [])

    if (!country_id && !city_id) {
        return null
    }
    return (
        <>
            {/* country name  */}
            <ReactHelmet title={`Activities  ${capitalizedCountryName ? `in ${capitalizedCountryName}` : ''} | Rimigo `} />
            <div className="min-h-screen bg-white ">
                <div className="md:hidden sticky top-0 z-20">
                    <MobileCompleteHeaderWithSearch
                        title="Activities"
                        headerType={'experiences'}
                        iconSrc={FERRIS_WHEEL_ICON}
                        onSearch={onSearch}
                        whereConfig={whereConfig}
                        whenConfig={whenConfig}
                        preferencesConfig={preferencesConfig}
                        wishlistConfig={wishlistConfig}
                    />
                </div>
                <SearchHeader
                    pageName="Activities"
                    iconSrc={FERRIS_WHEEL_ICON}
                    onSearch={onSearch}
                    ishidden={true}
                    whereConfig={whereConfig}
                    whenConfig={whenConfig}
                    preferencesConfig={preferencesConfig}
                    filterConfig={{ enabled: false }}
                    sortConfig={{ enabled: false }}
                    wishlistConfig={wishlistConfig}
                    assistantConfig={{ enabled: false }}
                />
                <div className="w-full max-w-[1320px] mx-auto">
                    {isCountryLive === false ? (
                        <NotLiveCountryMessage
                            countryName={selectedCountry?.country_name}
                            nonLiveClassName="ml-20"
                            descriptionText="This destination isn’t live yet, you can still search and explore other live countries using the search."
                        />
                    ) : (
                        <>
                            <ActivitiesCountryHero
                                country_id={country_id}
                                city_id={city_id}
                                currentMonthLowerCase={currentMonthLowerCase}
                            />
                            <Divider className="mb-4" />

                            <TopActivitiesSection
                                countryId={country_id}
                                cityIds={urlCityIds}
                                showSeeAllButton={true}
                                experiencesListSectionId="experiences-list-section"
                                triggerType='experience_listing_sneak_peek'
                            />

                            <Divider className="md:mt-8" />

                            {/* <div className="pt-6 md:hidden"></div> */}
                            <TopCitiesSection countryId={country_id} />

                            {(isLoadingWatchAlong || watchAlongShorts.length > 0) && (
                                <div className="max-md:pb-0">
                                    <DiscoverSection
                                        sectionId="discover-section"
                                        onTitleClick={() => {
                                            document.getElementById('discover-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                        }}>
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
                                            PageName='acitivites_explore_page'
                                        />
                                    </DiscoverSection>
                                </div>
                            )}

                            <AllCitiesSection countryId={country_id} />

                            <Divider className="md:mb-8 mb-6" />

                            {/* All Activities List Section */}
                            <ExperiencesListSection
                                id="experiences-list-section"
                                experiences={experiences}
                                totalExperiences={totalExperiences}
                                locationName={capitalizedCountryName}
                                isLoading={isExperiencesLoading}
                                error={experiencesError}
                                hasNextPage={hasExperiencesNextPage}
                                isFetchingNextPage={isFetchingExperiencesNextPage}
                                fetchNextPage={fetchExperiencesNextPage}
                                shortlistState={shortlistState}
                                shortlistLoadingIds={shortlistLoadingIds}
                                onExperienceClick={handleExperienceClick}
                                onShortlistToggle={handleShortlistToggle}
                                onSneakPeekClick={handleSneakPeekClick}
                                showCity={true}
                            />
                        </>
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
                    triggerType='experience_quick_bites'
                />

                {/* Sneak Peek Modal */}
                {sneakPeekExperienceId && (
                    <SneakPeekModal
                        isOpen={!!sneakPeekExperienceId}
                        onClose={handleCloseSneakPeek}
                        experienceId={sneakPeekExperienceId}
                        triggerType='experience_listing_sneak_peak'
                    />
                )}
            </div>
        </>
    )
}

export default ActivitiesExplorePage
