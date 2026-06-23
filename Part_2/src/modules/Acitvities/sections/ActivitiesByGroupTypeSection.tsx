import { useEffect, useMemo, useCallback, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useCuratedExperiences } from '@/modules/Experiences/hooks/useCuratedExperiences'
import { useExperiencesList } from '../hooks/useExperiencesList'
import { getActivitiesByGroupTypeSectionTitle } from '../components/utils/activitiesByGroupTypeSectinTitle'
import CarouselWithSeeAll from '@/modules/Experiences/components/CarouselWithSeeAll'
import ListCard from '@/components/ListCard'
import CardShortlistOverlay from '../components/CardShortlistOverlay'
import ItineraryAddTickChip from '../components/ItineraryAddTickChip'
import { formatPrice } from '@/modules/Experiences/utils/priceFormatter'
import { DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE } from '@/routes/routes'
import { useIsMobile } from '@/hooks/use-mobile'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'


interface ActivitiesByGroupTypeSectionProps {
    cityId?: string | null
    countryId: string | null
    countryName: string | null
    urlCityIds: string[]
    groupTypeFromQuery?: string | null // Group type from query params
    onSneakPeekClick?: (e: React.MouseEvent, experienceId: string) => void
    /** When provided, overrides the default card-click (which navigates to the
     *  experience page). Tripboard Activities tab passes a handler that opens
     *  the SneakPeekModal inline instead. */
    onCardClick?: (experienceId: string) => void
    /** Override for the SEE ALL link. Default navigates to the filter detail
     *  page. Tripboard Activities tab uses this to open the inline
     *  Best-Things-All sub-view without leaving the page. */
    onSeeAllClickOverride?: () => void
    /** Optional node rendered inside the section header, left of "SEE ALL".
     *  Used by the Tripboard Activities tab to slot a "Help me choose"
     *  pill. Other callers (standalone activity pages) leave it unset. */
    headerTrailing?: React.ReactNode
    /** Optional node rendered next to the mobile-only bottom "SEE ALL". */
    mobileFooterTrailing?: React.ReactNode
    /** Label override for the sneak peek button on cards. Defaults to "Sneak Peek". */
    sneakPeekButtonLabel?: string
    /** Reports up to the parent whether this section will render content.
     *  Used by ActivitiesExploreView to skip dividers around empty
     *  sections (no group-type data for a city, etc.). */
    onContentVisibilityChange?: (visible: boolean) => void
}

const ActivitiesByGroupTypeSection: React.FC<ActivitiesByGroupTypeSectionProps> = ({
    cityId,
    countryId,
    countryName,
    urlCityIds,
    groupTypeFromQuery,
    onSneakPeekClick,
    onCardClick,
    onSeeAllClickOverride,
    headerTrailing,
    mobileFooterTrailing,
    sneakPeekButtonLabel,
    onContentVisibilityChange
}) => {
    const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const isMobile = useIsMobile()

    // Get trip traveler context for groupType and preferences
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const activeTripId = activeTrip?.trip_id ?? null

    // Priority: query params > trip > null
    const groupTypeFromTrip = activeTrip?.tripProfile?.group_type || null
    const groupType = groupTypeFromQuery || groupTypeFromTrip || null

    // Get group type preferences from active trip
    const groupTypePreferences = useMemo(() => {
        return activeTrip?.trip_preference?.experiences_preferences || []
    }, [activeTrip])

    // // Fetch experience preferences for icon mapping
    // const { data: experiencePreferences } = useQuery({
    //     queryKey: ['experiencePreferences', countryId, cityId],
    //     queryFn: () => {
    //         if (cityId) {
    //             return getExperiencePreferencesWithFallback(() => getCityExperienceType(cityId))
    //         }
    //         return getExperiencePreferencesWithFallback(() => getCountryExperienceType(countryId ?? ''))
    //     },
    //     enabled: !!countryId || !!cityId
    // })

    // Create preference metadata map for icon lookup
    // const preferenceMetadataMap = useMemo(() => createCategoryIconMap(experiencePreferences), [experiencePreferences])

    // Fetch experiences filtered by group type
    const { experiences: groupTypeExperiences, isLoading: isGroupTypeExperiencesLoading } = useCuratedExperiences({
        cityId: cityId || null,
        countryId: countryId || null,
        preferences: groupTypePreferences,
        limit: 20,
        groupType: groupType,
        baseCityIds: urlCityIds.length > 0 ? urlCityIds : undefined
    })

    // Get shortlist state and handlers from useExperiencesList hook
    const { shortlistState, shortlistLoadingIds, handleExperienceClick, handleShortlistToggle } = useExperiencesList({
        countryId: countryId || null,
        cityId: cityId || null,
        activeTripId,
        priorities: [],
        preferences: [],
        enabled: !!countryId || !!cityId
    })

    const { trackButtonClickCustom } = usePostHog()

    const trackedCardClick = useCallback(
        (experienceId: string) => {
            trackButtonClickCustom?.({
                buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
                buttonName: POSTHOG_EVENTS.ACTIVITIES_EXPLORE_BEST_THINGS_CARD_CLICK,
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: { experienceId, groupType }
            })
            if (onCardClick) {
                onCardClick(experienceId)
                return
            }
            handleExperienceClick(experienceId)
        },
        [handleExperienceClick, groupType, trackButtonClickCustom, onCardClick]
    )

    const trackedShortlistToggle = useCallback(
        async (experienceId: string) => {
            const wasShortlisted = shortlistState[experienceId]?.isShortlisted ?? false
            trackButtonClickCustom?.({
                buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
                buttonName: POSTHOG_EVENTS.ACTIVITIES_EXPLORE_BEST_THINGS_SHORTLIST_TOGGLE,
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: { experienceId, groupType, next: wasShortlisted ? 'removed' : 'added' }
            })
            await handleShortlistToggle(experienceId)
        },
        [shortlistState, handleShortlistToggle, groupType, trackButtonClickCustom]
    )

    // Handle sneak peek click
    const handleSneakPeekClick = useCallback(
        (e: React.MouseEvent, experienceId: string) => {
            e.stopPropagation()
            onSneakPeekClick?.(e, experienceId)
        },
        [onSneakPeekClick]
    )

    // Handle see all click. Callers can override the default navigation —
    // the Tripboard Activities tab does this to open the inline list view
    // (BestThingsAllView) instead of leaving the page.
    const handleSeeAllClick = useCallback(() => {
        if (onSeeAllClickOverride) {
            onSeeAllClickOverride()
            return
        }
        if (!groupType || !cityId) {
            return
        }

        // Build the filter detail page URL
        // Route: ${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/country/:countryId/city/:cityId/filter/:filterId
        const filterId = 'groupType' // For now, send filterId as "groupType"

        // Get all current query params
        const params = new URLSearchParams(searchParams)

        // Get countryId from props or searchParams as fallback
        const finalCountryId = countryId || searchParams.get('country_id')

        // Build the path - need both countryId and cityId
        if (finalCountryId && cityId) {
            const path = `${DEFAULT_ACTIVITIES_EXPLORE_LANDING_PAGE_ROUTE}/country/${finalCountryId}/city/${cityId}/filter/${filterId}`
            const queryString = params.toString()
            navigate(queryString ? `${path}?${queryString}` : path)
        }
    }, [groupType, countryId, cityId, searchParams, navigate, onSeeAllClickOverride])

    // Report visibility to parent so the surrounding section dividers
    // can be suppressed when this section is empty.
    const isVisible =
        Boolean(groupType) &&
        (Boolean(countryId) || Boolean(cityId)) &&
        (isGroupTypeExperiencesLoading || groupTypeExperiences.length > 0)
    useEffect(() => {
        onContentVisibilityChange?.(isVisible)
    }, [isVisible, onContentVisibilityChange])

    if (!isVisible) {
        return null
    }

    return (
        <CarouselWithSeeAll
            gradientEndColor="transparent"
            gradientStartColor="var(--color-primary-default-80)"
            rightGradientStyle={''}
            customTitle={
                // `pl-4` — the heading owns its left inset now that the
                // container is unpadded (see containerClassName below).
                <p className="flex items-center gap-1 pl-4">
                    <span className="text-grey-0 font-[467] font-red-hat-display text-[18px] leading-[100%] tracking-[-2%]">
                        Best things to do for{' '}
                    </span>
                    <span className="flex items-center gap-0.5">
                        <img
                            className="w-6 h-6"
                            src={getActivitiesByGroupTypeSectionTitle(groupType).titleIcon}
                            alt={getActivitiesByGroupTypeSectionTitle(groupType).title}
                        />
                        <span className="text-grey-0 font-[645] font-red-hat-display text-[18px] leading-[100%] tracking-[-2%]">
                            {getActivitiesByGroupTypeSectionTitle(groupType).title}
                        </span>
                    </span>
                </p>
            }
            /* No horizontal padding on the container — the base classes'
               pl-4/sm:pl-6/lg:pl-4 inset the scroll viewport, which CLIPPED
               cards at the padding edge mid-scroll inside this bordered
               panel. The inset moves INSIDE the scroll container instead
               (scrollContainerClassName below) so cards start aligned with
               the heading but scroll flush to the panel's edges. */
            containerClassName="
  bg-primary-default-80
  w-full mx-0 pr-0 pl-0 sm:pl-0 lg:pl-0

  border-t border-b border-primary-default
  md:border md:rounded-[16px]
"
            scrollContainerClassName="px-4"
            groupType={groupType ?? undefined}
            countryId={countryId}
            countryName={countryName}
            isLoading={isGroupTypeExperiencesLoading}
            onSeeAllClick={handleSeeAllClick}
            headerTrailing={headerTrailing}
            mobileFooterTrailing={mobileFooterTrailing}
            centerMobileSeeAll={!mobileFooterTrailing}>
            {groupTypeExperiences.map((experience) => {
                const experienceId = experience.id
                const shortlistEntry = shortlistState[experienceId]
                const isShortlisted = shortlistEntry?.isShortlisted ?? false
                const isShortlisting = Boolean(shortlistLoadingIds[experienceId])

                // Format price
                const { lower_bound, upper_bound, currency } = experience.price
                const formattedPrice = formatPrice(lower_bound || 0, upper_bound || 0, currency || '')

                // Category icon is already set in adapter, but can override with preference map if available
                // const categoryIcon = experience.categoryIcon || getCategoryIcon(experience.categoryBackendValue ?? null, preferenceMetadataMap)

                // Get first verified photo for sneak peek button
                // Images array has landscape_image at index 0, then verified_photos starting at index 1
                // So first verified photo is at index 1 (if it exists)
                const firstVerifiedPhoto = experience.images && experience.images.length > 1 ? experience.images[1] : undefined

                // Map categories to their icons for tags
                // const categoryIconsMap: Record<string, string | undefined> | undefined = (() => {
                //     if (!experience.categories || experience.categories.length === 0) return undefined
                //     const iconsMap: Record<string, string | undefined> = {}
                //     experience.categories.forEach((cat) => {
                //         iconsMap[cat] = getCategoryIcon(cat, preferenceMetadataMap)
                //     })
                //     return iconsMap
                // })()

                const isHovered = hoveredCardId === experienceId || isMobile

                return (
                    <div
                        key={experience.id}
                        className="shrink-0 w-[280px] h-full relative"
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
                                onClick={() => trackedCardClick(experienceId)}
                                topBadge={undefined}
                                title={experience.name || experience.title}
                                price={formattedPrice}
                                category={undefined} // Don't show category in placeholder
                                categoryIcon={undefined} // Don't show category icon in placeholder
                                categories={undefined} // Don't show categories in placeholder
                                categoryIconsMap={undefined} // Don't show category icons in placeholder
                                showShortlistButton={false}
                                showSneakPeekButton={false} // Don't show sneak peek button in placeholder
                                onSneakPeekClick={undefined}
                                sneakPeekUserImage={undefined}
                            />
                        </div>
                        {/* Absolutely positioned card on hover */}
                        {isHovered && (
                            <div className="absolute left-0 top-0 w-full z-10 shadow-xs rounded-2xl">
                                <ListCard
                                    image={experience.image}
                                    images={experience.images}
                                    imageAlt={experience.name || experience.title}
                                    fullHeight={true}
                                    className="group w-full"
                                    onClick={() => trackedCardClick(experienceId)}
                                    topBadge={undefined}
                                    title={experience.name || experience.title}
                                    price={formattedPrice}
                                    category={undefined}
                                    categoryIcon={undefined}
                                    categories={undefined} // Show categories as tags
                                    categoryIconsMap={undefined} // Icons for category tags
                                    showShortlistButton={false}
                                    showSneakPeekButton={!!onSneakPeekClick}
                                    onSneakPeekClick={onSneakPeekClick ? (e) => handleSneakPeekClick(e, experienceId) : undefined}
                                    sneakPeekUserImage={firstVerifiedPhoto}
                                    sneakPeekButtonLabel={sneakPeekButtonLabel}
                                />
                                <CardShortlistOverlay
                                    isShortlisted={isShortlisted}
                                    isShortlisting={isShortlisting}
                                    onToggle={() => trackedShortlistToggle(experienceId)}
                                    leading={<ItineraryAddTickChip experienceId={experienceId} experienceName={experience.name || experience.title} experienceImage={experience.image} />}
                                />
                            </div>
                        )}
                        {!isHovered && (
                            <CardShortlistOverlay
                                isShortlisted={isShortlisted}
                                isShortlisting={isShortlisting}
                                onToggle={() => trackedShortlistToggle(experienceId)}
                                leading={<ItineraryAddTickChip experienceId={experienceId} experienceName={experience.name || experience.title} experienceImage={experience.image} />}
                            />
                        )}
                    </div>
                )
            })}
        </CarouselWithSeeAll>
    )
}

export default ActivitiesByGroupTypeSection
