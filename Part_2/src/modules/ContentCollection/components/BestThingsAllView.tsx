import { useEffect, useMemo, useRef } from 'react'
import { ChevronRight } from 'lucide-react'
import { useCuratedExperiences } from '@/modules/Experiences/hooks/useCuratedExperiences'
import { useExperiencesList } from '@/modules/Acitvities/hooks/useExperiencesList'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { getActivitiesByGroupTypeSectionTitle } from '@/modules/Acitvities/components/utils/activitiesByGroupTypeSectinTitle'
import ListCard from '@/components/ListCard'
import CardShortlistOverlay from '@/modules/Acitvities/components/CardShortlistOverlay'
import ItineraryAddButton from '@/modules/Acitvities/components/ItineraryAddButton'
import ExperiencesListShimmer from '@/modules/Acitvities/components/ExperiencesListShimmer'
import LoadingMoreExperiences from '@/modules/Experiences/components/ExperiencesExploreLandingPage/LoadingMoreExperiences'
import EndOfList from '@/modules/Experiences/components/ExperiencesExploreLandingPage/EndOfList'
import { formatPrice } from '@/modules/Experiences/utils/priceFormatter'
import { useIsMobile } from '@/hooks/use-mobile'

interface BestThingsAllViewProps {
    countryId: string | null
    cityId: string | null
    /** Group type whose experiences we're listing (couple, solo_traveler, etc.).
     *  Falls back to "couple" the same way the carousel header does. */
    groupType: string | null
    /** Called when the user taps the "All" crumb to return to the explore view. */
    onBack: () => void
    onSneakPeekClick?: (e: React.MouseEvent, experienceId: string) => void
    onCardClick?: (experienceId: string) => void
}

/**
 * Inline "See All" landing for the Best Things to do for <group> carousel.
 * Opened by clicking SEE ALL inside the Tripboard Activities tab — replaces
 * the Explore sub-view content (the sticky city/date chip + Explore/heart
 * row above remain untouched).
 */
const BestThingsAllView: React.FC<BestThingsAllViewProps> = ({
    countryId,
    cityId,
    groupType,
    onBack,
    onSneakPeekClick,
    onCardClick
}) => {
    const isMobile = useIsMobile()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const activeTripId = activeTrip?.trip_id ?? null

    // Group-type preferences from the active trip — same data the carousel
    // version uses, so the See All list matches the upstream carousel content.
    const groupTypePreferences = useMemo(
        () => activeTrip?.trip_preference?.experiences_preferences ?? [],
        [activeTrip]
    )

    const {
        experiences,
        isLoading,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage
    } = useCuratedExperiences({
        cityId,
        countryId,
        preferences: groupTypePreferences,
        limit: 20,
        groupType
    })

    // Shortlist state shared with the rest of the Activities tab so the
    // heart on a See-All card stays in sync with the same card in the
    // carousel / All Activities listing.
    const { shortlistState, shortlistLoadingIds, handleShortlistToggle } = useExperiencesList({
        countryId,
        cityId,
        activeTripId,
        priorities: [],
        preferences: [],
        enabled: !!countryId || !!cityId
    })

    // Infinite-scroll sentinel — mirrors ExperiencesListSection's pattern so
    // the page paginates naturally as the user reaches the bottom.
    const sentinelRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!hasNextPage || isFetchingNextPage || isLoading) return
        const sentinel = sentinelRef.current
        if (!sentinel) return
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) fetchNextPage()
            },
            { rootMargin: '200px', threshold: 0.1 }
        )
        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage])

    const groupTitle = getActivitiesByGroupTypeSectionTitle(groupType).title

    return (
        <div className="px-4 md:px-0">
            {/* Breadcrumb — leading back-arrow + "All > Best things to do for
                <group>". Both the arrow and "All" pop back to the Explore
                subview so the affordance is unambiguous on touch. */}
            <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-2 text-[14px] font-red-hat-display py-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="font-semibold text-grey-1 hover:text-primary-default transition-colors cursor-pointer">
                    All
                </button>
                <ChevronRight className="w-4 h-4 text-grey-2" />
                <span className="font-bold text-grey-0">Best things to do for {groupTitle}</span>
            </nav>

            {isLoading && experiences.length === 0 ? (
                <ExperiencesListShimmer count={4} />
            ) : experiences.length === 0 ? (
                <p className="py-8 text-center text-grey-1 text-[14px] font-red-hat-display">No activities to show yet.</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-6 items-start mt-2 md:mt-4">
                    {experiences.map((experience) => {
                        const experienceId = experience.id
                        const shortlistEntry = shortlistState[experienceId]
                        const isShortlisted = shortlistEntry?.isShortlisted ?? false
                        const isShortlisting = Boolean(shortlistLoadingIds[experienceId])
                        const { lower_bound, upper_bound, currency } = experience.price
                        const formattedPrice = formatPrice(lower_bound || 0, upper_bound || 0, currency || '')
                        const firstVerifiedPhoto =
                            experience.images && experience.images.length > 1 ? experience.images[1] : undefined
                        const displayTitle = experience.name || experience.title

                        return (
                            <div
                                key={experienceId}
                                className="relative w-full">
                                <ListCard
                                    image={experience.image}
                                    images={experience.images}
                                    imageAlt={displayTitle}
                                    fullHeight={!isMobile}
                                    className="group w-full"
                                    onClick={() => onCardClick?.(experienceId)}
                                    title={displayTitle}
                                    city={experience.city_name}
                                    price={formattedPrice}
                                    showShortlistButton={false}
                                    showSneakPeekButton={!!onSneakPeekClick}
                                    onSneakPeekClick={onSneakPeekClick ? (e) => onSneakPeekClick(e, experienceId) : undefined}
                                    sneakPeekUserImage={firstVerifiedPhoto}
                                    sneakPeekButtonLabel="Watch Reel"
                                    titleTrailing={
                                        <ItineraryAddButton
                                            experienceId={experienceId}
                                            experienceName={displayTitle}
                                            experienceImage={experience.image}
                                        />
                                    }
                                />
                                <CardShortlistOverlay
                                    isShortlisted={isShortlisted}
                                    isShortlisting={isShortlisting}
                                    onToggle={() => handleShortlistToggle(experienceId)}
                                />
                            </div>
                        )
                    })}
                </div>
            )}

            {hasNextPage && (
                <div
                    ref={sentinelRef}
                    className="h-10 w-full"
                />
            )}
            {isFetchingNextPage && <LoadingMoreExperiences />}
            {!hasNextPage && experiences.length > 0 && <EndOfList />}
        </div>
    )
}

export default BestThingsAllView
