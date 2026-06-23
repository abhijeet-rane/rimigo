import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import GenericCard from '@/components/shared/GenericCard.tsx/GenericCard'
import GenericCarouselTopButton from '@/components/shared/Carousel/GenericCarouselTopButton'
import ListCard from '@/components/ListCard'
import CardShortlistOverlay from '../components/CardShortlistOverlay'
import ItineraryAddButton from '../components/ItineraryAddButton'
import { useExperiencesExplore } from '../hooks/useExperiencesExplore'
import { PRIZE_CUP_ICON } from '@/constants/thiingsIcons'
import type { ExperiencePreferenceUI } from '@/modules/Onboarding/adapters/experiencePreferenceAdapters'
// import { createCategoryIconMap, getCategoryIcon } from '../utils/categoryIconMapper'
import SneakPeekModal from '../components/SneakPeakModal/SneakPeekModal'
import SingleExperienceReelsView from '../components/SneakPeakModal/SingleExperienceReelsView'
import { formatIdentifierToTitle } from '../utils/textUtils'
import { useExperiencesList } from '../hooks/useExperiencesList'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import CustomShimmer from '@/components/shared/Shimmer'
import { useIsMobile } from '@/hooks/use-mobile'
import { scrollIntoViewWithHeaderGuard } from '@/hooks/useHideOnScrollDown'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

interface TopActivitiesSectionProps {
    countryId: string | null
    cityId?: string | null
    cityIds?: string[]
    experiencePreferences?: ExperiencePreferenceUI[] // Added for category icon mapping
    showSeeAllButton?: boolean // Show "See All" button
    experiencesListSectionId?: string // ID of the experiences list section to scroll to
    triggerType?:string
    /** Pass through to the internal SneakPeekModal â€” see SneakPeekModal docs. */
    reelsModeOnMobile?: boolean
    /** Section title override. Defaults to "Top N highlights". */
    titleOverride?: string
    /** Trip id forwarded to SneakPeekModal so its wishlist action still
     *  works when the global activeTrip context isn't populated. */
    tripId?: string
    /** Reports up to the parent whether this section will render content.
     *  Used by ActivitiesExploreView to skip dividers around empty
     *  sections (no Top 10 for a city, etc.). */
    onContentVisibilityChange?: (visible: boolean) => void
}

const TopActivitiesSection: React.FC<TopActivitiesSectionProps> = ({
    countryId,
    cityId,
    cityIds,
    showSeeAllButton = false,
    experiencesListSectionId,
    triggerType,
    reelsModeOnMobile,
    titleOverride,
    tripId,
    onContentVisibilityChange
}) => {
    const filteredCityIds = cityIds?.filter((id) => id !== 'all')
    const [sneakPeekExperienceId, setSneakPeekExperienceId] = useState<string | null>(null)
    const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)
    const isMobile = useIsMobile()
    const { trackButtonClickCustom } = usePostHog()

    // Get trip traveler context for activeTripId
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const activeTripId = activeTrip?.trip_id ?? null

    // Create preference metadata map for icon lookup using utility function
    // const preferenceMetadataMap = useMemo(() => createCategoryIconMap(experiencePreferences), [experiencePreferences])

    // Get shortlist state and handlers from useExperiencesList hook
    const { shortlistState, shortlistLoadingIds, handleExperienceClick, handleShortlistToggle } = useExperiencesList({
        countryId: countryId || null,
        cityId: cityId || (filteredCityIds && filteredCityIds.length > 0 ? filteredCityIds[0] : undefined) || null,
        activeTripId,
        priorities: [],
        preferences: [],
        enabled: !!countryId
    })

    // Fetch top activities
    const {
        topActivities,
        totalExperiences,
        isLoading: isTopActivitiesLoading,
        hasNextPage: hasTopActivitiesNextPage,
        isFetchingNextPage: isFetchingTopActivitiesNextPage,
        fetchNextPage: fetchTopActivitiesNextPage
    } = useExperiencesExplore({
        countryId,
        cityId: cityId || (filteredCityIds && filteredCityIds.length > 0 ? filteredCityIds[0] : undefined),
        limit: 10,
        baseCityIds: filteredCityIds && filteredCityIds.length > 0 ? filteredCityIds : undefined
    })

    // Infinite scroll for top activities
    const topActivitiesCarouselRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!hasTopActivitiesNextPage || isFetchingTopActivitiesNextPage || !topActivitiesCarouselRef.current) return

        const carousel = topActivitiesCarouselRef.current
        const handleScroll = () => {
            const { scrollLeft, scrollWidth, clientWidth } = carousel
            const isNearEnd = scrollLeft + clientWidth >= scrollWidth - 100

            if (isNearEnd && hasTopActivitiesNextPage && !isFetchingTopActivitiesNextPage) {
                fetchTopActivitiesNextPage()
            }
        }

        carousel.addEventListener('scroll', handleScroll)
        return () => carousel.removeEventListener('scroll', handleScroll)
    }, [hasTopActivitiesNextPage, isFetchingTopActivitiesNextPage, fetchTopActivitiesNextPage])

    // Handle top activity click.
    //   - Tripboard activities tab (reelsModeOnMobile): open the SneakPeekModal
    //     so the user gets tips/booking info inline instead of being yanked to
    //     a new tab.
    //   - Anywhere else: keep the legacy navigate behaviour.
    const handleTopActivityClick = useCallback(
        (activityId: string) => {
            trackButtonClickCustom?.({
                buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
                buttonName: POSTHOG_EVENTS.ACTIVITIES_EXPLORE_TOP10_CARD_CLICK,
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: { activityId }
            })
            if (reelsModeOnMobile) {
                setSneakPeekExperienceId(activityId)
                return
            }
            handleExperienceClick(activityId)
        },
        [handleExperienceClick, trackButtonClickCustom, reelsModeOnMobile]
    )

    // Track shortlist heart toggles on Top 10 cards.
    const trackedShortlistToggle = useCallback(
        async (activityId: string) => {
            const wasShortlisted = shortlistState[activityId]?.isShortlisted ?? false
            trackButtonClickCustom?.({
                buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
                buttonName: POSTHOG_EVENTS.ACTIVITIES_EXPLORE_TOP10_SHORTLIST_TOGGLE,
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: { activityId, next: wasShortlisted ? 'removed' : 'added' }
            })
            await handleShortlistToggle(activityId)
        },
        [shortlistState, handleShortlistToggle, trackButtonClickCustom]
    )

    // Mobile reels â€” shows the tapped highlight's OWN videos (an activity
    // can have several). State holds the experience id the user opened.
    const [reelsExperienceId, setReelsExperienceId] = useState<string | null>(null)
    // Reels view is mobile-only. On desktop, "Watch Reel" falls back to the
    // standard SneakPeekModal (the fullscreen reels UX doesn't work in the
    // desktop column).
    const isReelsOpen = reelsExperienceId !== null && !!reelsModeOnMobile && isMobile

    // Resolve the opened highlight so the reels view gets its title,
    // poster and shortlist binding.
    const reelsActivity = useMemo(
        () => topActivities.find((a) => a.id === reelsExperienceId) ?? null,
        [topActivities, reelsExperienceId]
    )
    const reelsActivityName = reelsActivity
        ? reelsActivity.identifier
            ? formatIdentifierToTitle(reelsActivity.identifier)
            : reelsActivity.title
        : ''

    // Handle "Watch Reel" / Sneak Peek button click.
    //   - Mobile + Tripboard activities tab (reelsModeOnMobile): open the
    //     single-activity reels view with that activity's own videos.
    //   - Desktop / anywhere else: open the legacy single-experience
    //     SneakPeekModal — the reels view is fullscreen-mobile-only.
    const handleSneakPeekClick = useCallback(
        (e: React.MouseEvent | undefined, activityId: string) => {
            e?.stopPropagation()
            if (reelsModeOnMobile && isMobile) {
                setReelsExperienceId(activityId)
                return
            }
            setSneakPeekExperienceId(activityId)
        },
        [reelsModeOnMobile, isMobile]
    )

    // Handle close sneak peek modal
    const handleCloseSneakPeek = () => {
        setSneakPeekExperienceId(null)
    }

    const handleCloseReels = useCallback(() => setReelsExperienceId(null), [])

    // Handle "See All" button click - scroll to experiences list section.
    // Routed through the header-guarded scroll so the mobile hide-on-scroll
    // sub-header stays visible during the programmatic scroll instead of
    // collapsing and getting stranded hidden.
    const handleSeeAllClick = useCallback(() => {
        if (experiencesListSectionId) {
            scrollIntoViewWithHeaderGuard(document.getElementById(experiencesListSectionId))
        }
    }, [experiencesListSectionId])

    // Report visibility to parent so dividers around empty sections
    // can be suppressed. Loading counts as "visible" â€” we don't want
    // the layout to flicker between divider/no-divider while the
    // initial fetch is in flight.
    const isVisible = isTopActivitiesLoading || topActivities.length > 0
    useEffect(() => {
        onContentVisibilityChange?.(isVisible)
    }, [isVisible, onContentVisibilityChange])

    // Don't render if no data and not loading
    if (!isVisible) {
        return null
    }

    return (
        <GenericCard className="pb-5 md:pb-0 pr-0">
            {isTopActivitiesLoading && topActivities.length === 0 ? (
                <div className="p-4 ">
                    <div className="flex gap-4 overflow-x-auto scrollbar-hide">
                        {[...Array(5)].map((_, i) => (
                            <CustomShimmer
                                key={i}
                                className="min-w-[280px] h-[350px]"
                                height={350}
                            />
                        ))}
                    </div>
                </div>
            ) : topActivities.length > 0 ? (
                <div ref={topActivitiesCarouselRef}>
                    <GenericCarouselTopButton
                        title={titleOverride ?? `Top ${totalExperiences} highlights`}
                        titleIcon={PRIZE_CUP_ICON}
                        fontFamily="caveat"
                        titleSize="28px"
                        className="pb-0"
                        caraouselContainerClassName="pb-1 md:pb-4"
                        gap={16}
                        showSeeAllButton={showSeeAllButton}
                        onSeeAllClick={handleSeeAllClick}>
                        {topActivities.map((activity, index) => {
                            const activityId = activity.id
                            const headingText = (index + 1).toString()

                            // Category icon is already set in adapter, but can override with preference map if available
                            // const categoryIcon = activity.categoryIcon || getCategoryIcon(activity.categoryBackendValue, preferenceMetadataMap)

                            // Get first verified photo for sneak peek button
                            // Images array has landscape_image at index 0, then verified_photos starting at index 1
                            // So first verified photo is at index 1 (if it exists)
                            const firstVerifiedPhoto = activity.images && activity.images.length > 1 ? activity.images[1] : undefined

                            // For top activities, use identifier (formatted) as title
                            const displayTitle = activity.identifier ? formatIdentifierToTitle(activity.identifier) : activity.title

                            // Get shortlist state
                            const shortlistEntry = shortlistState[activityId]
                            const isShortlisted = shortlistEntry?.isShortlisted ?? false
                            const isShortlisting = Boolean(shortlistLoadingIds[activityId])

                            // Map categories to their icons for tags
                            // const categoryIconsMap: Record<string, string | undefined> | undefined = (() => {
                            //     if (!activity.categories || activity.categories.length === 0) return undefined
                            //     const iconsMap: Record<string, string | undefined> = {}
                            //     activity.categories.forEach((cat) => {
                            //         iconsMap[cat] = getCategoryIcon(cat, preferenceMetadataMap)
                            //     })
                            //     return iconsMap
                            // })()

                            const isHovered = hoveredCardId === activityId || isMobile

                            return (
                                <div
                                    key={activity.id}
                                    className="w-[312px] h-full relative"
                                    onMouseEnter={() => setHoveredCardId(activityId)}
                                    onMouseLeave={() => setHoveredCardId(null)}>
                                    {/* Invisible placeholder to maintain grid cell size */}
                                    <div className={isHovered ? 'invisible' : 'visible'}>
                                        <ListCard
                                            image={activity.image}
                                            images={activity.images}
                                            imageAlt={displayTitle}
                                            title={displayTitle}
                                            city={undefined}
                                            price={undefined}
                                            showShortlistButton={false}
                                            showSneakPeekButton={false}
                                            onSneakPeekClick={undefined}
                                            sneakPeekUserImage={undefined}
                                            shortDescription={activity.short_description ?? null}
                                            showDescriptionAsHeading={true}
                                            onClick={() => handleTopActivityClick(activityId)}
                                            headingText={headingText}
                                            category={undefined}
                                            categoryIcon={undefined}
                                            categories={undefined}
                                            categoryIconsMap={undefined}
                                            titleTrailing={<ItineraryAddButton experienceId={activityId} experienceName={displayTitle} experienceImage={activity.image} />}
                                        />
                                    </div>
                                    {/* Absolutely positioned card on hover */}
                                    {isHovered && (
                                        <div className="absolute left-0 top-0 w-full z-10 shadow-xs rounded-2xl">
                                            <ListCard
                                                image={activity.image}
                                                images={activity.images}
                                                imageAlt={displayTitle}
                                                title={displayTitle}
                                                city={undefined}
                                                price={undefined}
                                                showShortlistButton={false}
                                                showSneakPeekButton={true}
                                                onSneakPeekClick={(e) => handleSneakPeekClick(e, activityId)}
                                                sneakPeekUserImage={firstVerifiedPhoto}
                                                sneakPeekButtonLabel={reelsModeOnMobile ? 'Watch Reel' : undefined}
                                                shortDescription={activity.short_description ?? null}
                                                showDescriptionAsHeading={true}
                                                onClick={() => handleTopActivityClick(activityId)}
                                                headingText={headingText}
                                                category={undefined}
                                                categoryIcon={undefined}
                                                categories={undefined}
                                                categoryIconsMap={undefined}
                                                titleTrailing={<ItineraryAddButton experienceId={activityId} experienceName={displayTitle} experienceImage={activity.image} />}
                                            />
                                            <CardShortlistOverlay
                                                isShortlisted={isShortlisted}
                                                isShortlisting={isShortlisting}
                                                onToggle={() => trackedShortlistToggle(activityId)}
                                                topClassName="top-18"
                                            />
                                        </div>
                                    )}
                                    {!isHovered && (
                                        <CardShortlistOverlay
                                            isShortlisted={isShortlisted}
                                            isShortlisting={isShortlisting}
                                            onToggle={() => handleShortlistToggle(activityId)}
                                            topClassName="top-18"
                                        />
                                    )}
                                </div>
                            )
                        })}
                        {/* Spacer for proper end padding */}
                        <div
                            className="w-1 shrink-0"
                            aria-hidden="true"
                        />
                        {/* Loading indicator for pagination */}
                        {isFetchingTopActivitiesNextPage && (
                            <div className="min-w-[280px] max-w-[280px] flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-default"></div>
                            </div>
                        )}
                    </GenericCarouselTopButton>
                </div>
            ) : null}

            {/* Sneak Peek Modal â€” single-experience fallback (desktop +
                non-reels surfaces). On mobile-with-reels we open the
                cross-highlight reel list below instead. */}
            {sneakPeekExperienceId && (
                <SneakPeekModal
                    isOpen={!!sneakPeekExperienceId}
                    onClose={handleCloseSneakPeek}
                    experienceId={sneakPeekExperienceId}
                    triggerType={triggerType}
                    tripId={tripId ?? activeTripId ?? undefined}
                    // When this sheet opens FROM the reels view, stack it
                    // above the reels' z-9999 so the sheet shows on top
                    // instead of being clipped behind it.
                    stackedAboveReels={reelsExperienceId !== null}
                />
            )}

            {/* Mobile reels â€” the tapped highlight's own videos. */}
            {isReelsOpen && reelsExperienceId && (
                <SingleExperienceReelsView
                    isOpen={isReelsOpen}
                    onClose={handleCloseReels}
                    experienceId={reelsExperienceId}
                    experienceName={reelsActivityName}
                    fallbackImageUrl={reelsActivity?.image}
                    isShortlisted={shortlistState[reelsExperienceId]?.isShortlisted ?? false}
                    isShortlisting={Boolean(shortlistLoadingIds[reelsExperienceId])}
                    onShortlistToggle={() => {
                        void handleShortlistToggle(reelsExperienceId)
                    }}
                    // Wire View Details: opens the SneakPeekModal for the
                    // highlight on top of the still-open reels feed. Without
                    // this the button rendered disabled.
                    onViewDetails={() => setSneakPeekExperienceId(reelsExperienceId)}
                />
            )}

        </GenericCard>
    )
}

export default TopActivitiesSection
