import { useMemo, useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import SearchHeader from '@/components/common/SearchHeader'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { bulkUpsertTripExperiences } from '@/modules/Experiences/api/experienceShortlistAPI'
import { dispatchOpenTripCreationModal } from '@/lib/events/tripCreationModalEvents'
import { toast } from 'sonner'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import SneakPeekModal from '../components/SneakPeakModal/SneakPeekModal'
import ListCard from '@/components/ListCard'
import ShortlistButton from '@/components/common/ShortlistButton'
import { formatPrice } from '@/modules/Experiences/utils/priceFormatter'
import { getCategoryIcon, createCategoryIconMap } from '../utils/categoryIconMapper'
import { useCuratedExperiences } from '@/modules/Experiences/hooks/useCuratedExperiences'
import { getExperiencePreferencesWithFallback } from '@/modules/Onboarding/adapters/experiencePreferenceAdapters'
import { getCountryExperienceType, getCityExperienceType } from '@/modules/Experiences/api/experienceApi'
import { getActivitiesByGroupTypeSectionTitle } from '../components/utils/activitiesByGroupTypeSectinTitle'
import LoadingMoreExperiences from '@/modules/Experiences/components/ExperiencesExploreLandingPage/LoadingMoreExperiences'
import EndOfList from '@/modules/Experiences/components/ExperiencesExploreLandingPage/EndOfList'
import Divider from '@/components/shared/Divider/Divider'
import RimigoFooter from '@/components/Footer/RimigoFooter'
import { useShortlistedExperiences } from '../context/ShortlistedExperiencesContext'
import MobileCompleteHeaderWithSearch from '@/components/MobileCompleteHeaderWithSearch'

const ActivitiesListByFilterDetailpage = () => {
    const { countryId, cityId, filterId } = useParams<{ countryId: string; cityId: string; filterId: string }>()
    const [searchParams] = useSearchParams()
    const [sneakPeekExperienceId, setSneakPeekExperienceId] = useState<string | null>(null)
    const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
    const sentinelRef = useRef<HTMLDivElement>(null)
    // Get trip traveler context for shortlisting and group type
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const activeTripId = activeTrip?.trip_id ?? null

    // Get group type from query params or trip
    const groupTypeFromQuery = searchParams.get('groupType')
    const groupTypeFromTrip = activeTrip?.tripProfile?.group_type || null
    const groupType = groupTypeFromQuery || groupTypeFromTrip || null

    // Get group type preferences from active trip
    const groupTypePreferences = useMemo(() => {
        return activeTrip?.trip_preference?.experiences_preferences || []
    }, [activeTrip])

    // Get city IDs from query params
    const urlCityIds = useMemo(() => {
        const cityIdsParam = searchParams.get('city_ids')?.split(',').filter(Boolean) ?? []
        const combined = [...cityIdsParam]
        if (cityId) {
            combined.push(cityId)
        }
        return Array.from(new Set(combined))
    }, [searchParams, cityId])

    // Fetch experience preferences for icon mapping
    const { data: experiencePreferences } = useQuery({
        queryKey: ['experiencePreferences', countryId, cityId],
        queryFn: () => {
            if (cityId) {
                // THIS API CALL IS NOT USED ANYWHERE IN THE APP
                //  TODO: Remove
                return getExperiencePreferencesWithFallback(() => getCityExperienceType(cityId))
            }
            return getExperiencePreferencesWithFallback(() => getCountryExperienceType(countryId ?? ''))
        },
        enabled: !!countryId || !!cityId
    })

    // Create preference metadata map for icon lookup
    const preferenceMetadataMap = useMemo(() => createCategoryIconMap(experiencePreferences), [experiencePreferences])

    // Fetch experiences filtered by group type
    const {
        experiences,
        isLoading: isExperiencesLoading,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage
    } = useCuratedExperiences({
        cityId: cityId || null,
        countryId: null,
        preferences: groupTypePreferences,
        limit: 20,
        groupType: groupType,
        baseCityIds: urlCityIds.length > 0 ? urlCityIds : undefined
    })

    // Get shortlisted experiences from context
    const { shortlistState, refreshShortlist } = useShortlistedExperiences()
    const [shortlistLoadingIds, setShortlistLoadingIds] = useState<Record<string, boolean>>({})

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
        [activeTripId, shortlistState, refreshShortlist]
    )

    // Handle sneak peek click
    const handleSneakPeekClick = useCallback((e: React.MouseEvent, experienceId: string) => {
        e.stopPropagation()
        setSneakPeekExperienceId(experienceId)
    }, [])

    // Handle close sneak peek modal
    const handleCloseSneakPeek = useCallback(() => {
        setSneakPeekExperienceId(null)
    }, [])

    // Get filter title based on filterId
    const filterTitle = useMemo(() => {
        if (filterId === 'groupType' && groupType) {
            return getActivitiesByGroupTypeSectionTitle(groupType).title
        }
        return 'Activities'
    }, [filterId, groupType])

    // Get filter icon based on filterId
    const filterIcon = useMemo(() => {
        if (filterId === 'groupType' && groupType) {
            return getActivitiesByGroupTypeSectionTitle(groupType).titleIcon
        }
        return undefined
    }, [filterId, groupType])

    // Infinite scroll using Intersection Observer
    useEffect(() => {
        if (!hasNextPage || isFetchingNextPage || isExperiencesLoading) return

        const sentinel = sentinelRef.current
        if (!sentinel) return

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries
                if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage()
                }
            },
            {
                root: null, // Use viewport as root
                rootMargin: '200px', // Trigger 200px before the element comes into view
                threshold: 0.1
            }
        )

        observer.observe(sentinel)

        return () => {
            observer.disconnect()
        }
    }, [hasNextPage, isFetchingNextPage, isExperiencesLoading, fetchNextPage])

    // Loading state
    if (isExperiencesLoading && experiences.length === 0) {
        return (
            <div className="min-h-screen bg-white">
                <SearchHeader
                    pageName="Activities"
                    ishidden={true}
                />
                <MobileCompleteHeaderWithSearch
                    title={'Activities'}
                    headerType={'experiences'}
                />
                <div className="w-full max-w-[1320px] mx-auto px-4 py-8">
                    <div className="text-center">Loading activities...</div>
                </div>
            </div>
        )
    }

    // Don't render if no filter or no location
    if (!filterId || (!countryId && !cityId)) {
        return (
            <div className="min-h-screen bg-white">
                <SearchHeader
                    pageName="Activities"
                    ishidden={true}
                />
                <MobileCompleteHeaderWithSearch
                    title={'Activities'}
                    headerType={'experiences'}
                />{' '}
                <div className="w-full max-w-[1320px] mx-auto px-4 py-8">
                    <div className="text-center text-red-500">Invalid filter or location</div>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="min-h-screen bg-white">
                <SearchHeader
                    pageName="Activities"
                    breadcrumbsConfig={{ enabled: true, className: 'mb-6' }}
                    ishidden={true}
                />
                <div className="md:hidden sticky top-0 z-20">
                    <MobileCompleteHeaderWithSearch
                        title={'Activities'}
                        headerType={'experiences'}
                    />{' '}
                </div>
                <div className="w-full max-w-[1320px] mx-auto px-4 py-8">
                    {/* Breadcrumb Navigation */}
                    <div className="mb-6">
                        <Breadcrumbs searchParams={searchParams} />
                    </div>

                    {/* Header Section - Title */}
                    <div className="">
                        <div className="flex items-center gap-2">
                            {filterIcon && (
                                <img
                                    className="w-8 h-8"
                                    src={filterIcon}
                                    alt={filterTitle}
                                />
                            )}
                            <p className="text-[24px] font-red-hat-display font-[467] leading-[100%] tracking-[-2%] text-grey-0">
                                Best things to do for {filterTitle}
                            </p>
                        </div>
                    </div>

                    <Divider className="my-6" />

                    {/* Experiences Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-15 items-start">
                        {experiences.map((experience) => {
                            const experienceId = experience.id
                            const shortlistEntry = shortlistState[experienceId]
                            const isShortlisted = shortlistEntry?.isShortlisted ?? false
                            const isShortlisting = Boolean(shortlistLoadingIds[experienceId])

                            // Format price
                            const { lower_bound, upper_bound, currency } = experience.price
                            const formattedPrice = formatPrice(lower_bound || 0, upper_bound || 0, currency || '')

                            // Get first verified photo for sneak peek button
                            const firstVerifiedPhoto = experience.images && experience.images.length > 1 ? experience.images[1] : undefined

                            // Map categories to their icons for tags
                            const categoryIconsMap: Record<string, string | undefined> | undefined = (() => {
                                if (!experience.categories || experience.categories.length === 0) return undefined
                                const iconsMap: Record<string, string | undefined> = {}
                                experience.categories.forEach((cat) => {
                                    iconsMap[cat] = getCategoryIcon(cat, preferenceMetadataMap)
                                })
                                return iconsMap
                            })()

                            const isHovered = hoveredCardId === experienceId

                            return (
                                <div
                                    key={experience.id}
                                    className="relative w-full"
                                    onMouseEnter={() => setHoveredCardId(experienceId)}
                                    onMouseLeave={() => setHoveredCardId(null)}>
                                    {/* Invisible placeholder to maintain grid cell size */}
                                    <div className={isHovered ? 'invisible' : 'visible'}>
                                        <ListCard
                                            image={experience.image}
                                            images={experience.images}
                                            imageAlt={experience.name || experience.title}
                                            fullHeight={true}
                                            className="group w-full"
                                            onClick={() => handleExperienceClick(experienceId)}
                                            topBadge={undefined}
                                            title={experience.name || experience.title}
                                            price={formattedPrice}
                                            category={undefined}
                                            categoryIcon={undefined}
                                            categories={undefined}
                                            categoryIconsMap={undefined}
                                            showShortlistButton={false}
                                            showSneakPeekButton={false}
                                            onSneakPeekClick={undefined}
                                            sneakPeekUserImage={undefined}
                                        />
                                    </div>
                                    {/* Absolutely positioned card on hover */}
                                    {isHovered && (
                                        <div className="absolute left-0 top-0 w-full z-20 shadow-2xl rounded-2xl">
                                            <ListCard
                                                image={experience.image}
                                                images={experience.images}
                                                imageAlt={experience.name || experience.title}
                                                fullHeight={true}
                                                className="group w-full"
                                                onClick={() => handleExperienceClick(experienceId)}
                                                topBadge={undefined}
                                                title={experience.name || experience.title}
                                                price={formattedPrice}
                                                category={undefined}
                                                categoryIcon={undefined}
                                                categories={undefined}
                                                categoryIconsMap={categoryIconsMap}
                                                showShortlistButton={false}
                                                showSneakPeekButton={!!handleSneakPeekClick}
                                                onSneakPeekClick={handleSneakPeekClick ? (e) => handleSneakPeekClick(e, experienceId) : undefined}
                                                sneakPeekUserImage={firstVerifiedPhoto}
                                            />
                                            {/* Shortlist Button - positioned absolutely over the card */}
                                            <div className="absolute right-3 top-3 z-10">
                                                <ShortlistButton
                                                    ariaLabel="Save to shortlist"
                                                    isShortlisted={isShortlisted}
                                                    onShortlist={async () => {
                                                        await handleShortlistToggle(experienceId)
                                                    }}
                                                    isLoading={isShortlisting}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {/* Shortlist Button - for non-hovered state */}
                                    {!isHovered && (
                                        <div className="absolute right-3 top-3 z-10">
                                            <ShortlistButton
                                                ariaLabel="Save to shortlist"
                                                isShortlisted={isShortlisted}
                                                onShortlist={async () => {
                                                    await handleShortlistToggle(experienceId)
                                                }}
                                                isLoading={isShortlisting}
                                            />
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    {/* Sentinel element for infinite scroll */}
                    {hasNextPage && (
                        <div
                            ref={sentinelRef}
                            className="h-10 w-full"
                        />
                    )}

                    {/* Infinite scroll loading indicator */}
                    {isFetchingNextPage && <LoadingMoreExperiences />}

                    {/* End of results indicator */}
                    {!hasNextPage && experiences.length > 0 && <EndOfList />}

                    {/* Sneak Peek Modal */}
                    {sneakPeekExperienceId && (
                        <SneakPeekModal
                            isOpen={!!sneakPeekExperienceId}
                            onClose={handleCloseSneakPeek}
                            experienceId={sneakPeekExperienceId}
                        />
                    )}
                </div>
            </div>
            <RimigoFooter />
        </>
    )
}

export default ActivitiesListByFilterDetailpage
