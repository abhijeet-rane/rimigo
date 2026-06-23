import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useScrollResetOnFlag } from '@/hooks/useScrollResetOnFlag'
import { useExperiencesList } from '@/modules/Acitvities/hooks/useExperiencesList'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import {
    ShortlistedExperiencesProvider,
    useOptionalShortlistedExperiences
} from '@/modules/Acitvities/context/ShortlistedExperiencesContext'
import { useShortlistHidden } from '@/modules/Acitvities/context/ShortlistDisplayContext'
import ActivitiesCountryHero from '@/modules/Acitvities/components/ActivitiesCountryHero'
import TopActivitiesSection from '@/modules/Acitvities/sections/TopActivitiesSection'
import TopCitiesSection from '@/modules/Acitvities/sections/TopCitiesSection'
import AllCitiesSection from '@/modules/Acitvities/sections/AllCitiesSection'
import ExperiencesListSection from '@/modules/Acitvities/components/ExperiencesListSection'
import SneakPeekModal from '@/modules/Acitvities/components/SneakPeakModal/SneakPeekModal'
import WatchDiscover from '@/modules/Acitvities/components/WatchDiscover'
import Divider from '@/components/shared/Divider/Divider'
import CuratedCollectionsSection from './CuratedCollections/CuratedCollectionsSection'
import CollectionDetailAllView from './CuratedCollections/CollectionDetailAllView'
import type { CollectionListItem } from '@/modules/ContentCollection/api/contentCollectionApi'

interface ActivitiesCountryOverviewViewProps {
    countryId: string
    countryName: string | null
    /** Trip id forwarded for posthog/shortlist context. */
    tripId?: string
    /** Disables nested fetches when the Activities tab is hidden. */
    isActive?: boolean
    /** First itinerary day date — takes priority over trip preferred_travel_time for month display. */
    itineraryStartDate?: string | Date | null
    /** City card taps (Top Cities / All Cities). The Tripboard wires this to
     *  the in-tab city navigation (drill into the city view for itinerary
     *  cities, external-city header otherwise) instead of the sections'
     *  default redirect to the standalone explore pages. */
    onCityClick?: (cityId: string, cityName?: string) => void
}

const ALL_ACTIVITIES_SECTION_ID = 'activities-tab-country-all-listing'

// Shared heading typography for every section on this view — identical to
// the city tab's "Explore all activities in <city>" heading. Passed into
// each section's title override so the whole overview reads as one type
// system. `tracking-normal` neutralises the carousels' default negative
// tracking.
const SECTION_HEADING_CLASS = 'text-[18px] leading-[100%] font-semibold font-red-hat-display text-grey-0 tracking-normal'

/**
 * Activities tab → country overview (multi-country trips). Mirrors the
 * standalone `/experiences?country_id=` page's country content, in order:
 *
 *   1. Country hero            (description + cost/weather/crowd stats)
 *   2. Top 10 Highlights       (country-wide)
 *   3. Top Cities              (carousel)
 *   4. Curated Collections     (creator collections — lives HERE, not in
 *                               the per-city Explore view)
 *   5. All Cities              (grid)
 *   6. All Activities listing  (country-wide)
 *
 * The standalone page's Quick Bites (DiscoverWatchAlongPanel) is dropped
 * per spec. Card taps open the SneakPeekModal inline (tripboard
 * convention) instead of redirecting to the experience details page.
 */
const ActivitiesCountryOverviewView: React.FC<ActivitiesCountryOverviewViewProps> = (props) => {
    // Same defensive wrap as ActivitiesExploreView — the experiences-list
    // hook requires the shortlist context; skip re-wrapping when a parent
    // (ExperienceTab on tripboard) already mounts it.
    const existingShortlistCtx = useOptionalShortlistedExperiences()
    if (existingShortlistCtx) {
        return <ActivitiesCountryOverviewViewInner {...props} />
    }
    return (
        <ShortlistedExperiencesProvider>
            <ActivitiesCountryOverviewViewInner {...props} />
        </ShortlistedExperiencesProvider>
    )
}

const ActivitiesCountryOverviewViewInner: React.FC<ActivitiesCountryOverviewViewProps> = ({
    countryId,
    countryName,
    tripId,
    isActive = true,
    itineraryStartDate,
    onCityClick
}) => {
    const readOnlyShortlist = useShortlistHidden()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const activeTripId = activeTrip?.trip_id ?? null

    const [sneakPeekExperienceId, setSneakPeekExperienceId] = useState<string | null>(null)
    const [searchParams, setSearchParams] = useSearchParams()

    // Priority: itinerary first day → trip preferred_travel_time → current month
    const currentMonthLowerCase = useMemo(() => {
        const raw = itineraryStartDate ?? activeTrip?.preferred_travel_time?.startDate
        const d = raw ? new Date(raw) : new Date()
        const valid = Number.isNaN(d.getTime()) ? new Date() : d
        return valid.toLocaleString('en-US', { month: 'long' }).toLowerCase()
    }, [itineraryStartDate, activeTrip?.preferred_travel_time?.startDate])

    // Country-wide listing (no city filter).
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
        handleShortlistToggle
    } = useExperiencesList({
        countryId,
        cityId: null,
        activeTripId,
        priorities: [],
        preferences: [],
        enabled: !!countryId && isActive
    })

    // In-tab "All > <collection name>" view, URL-persisted so reload and
    // browser-back land where the user was (same pattern the per-city
    // Explore view used before the section moved here).
    const isCollectionDetailOpen = searchParams.get('activities_section') === 'collection'
    const detailCollectionId = isCollectionDetailOpen ? searchParams.get('collection_id') : null
    // Full list item for the open collection detail — carries the creator
    // (source_details) for the "from {name}'s tripboard" bar, which the URL
    // params don't hold.
    const [detailCollectionItem, setDetailCollectionItem] = useState<CollectionListItem | null>(null)
    const openCollectionDetail = useCallback(
        (collection: CollectionListItem) => {
            setDetailCollectionItem(collection)
            const next = new URLSearchParams(searchParams)
            next.set('activities_section', 'collection')
            next.set('collection_id', collection.identifier)
            // Stash name → breadcrumb paints before the fetch lands.
            next.set('collection_name', collection.name)
            setSearchParams(next, { replace: false })
        },
        [searchParams, setSearchParams]
    )
    const closeCollectionDetail = useCallback(() => {
        setDetailCollectionItem(null)
        const next = new URLSearchParams(searchParams)
        next.delete('activities_section')
        next.delete('collection_id')
        next.delete('collection_name')
        setSearchParams(next, { replace: false })
    }, [searchParams, setSearchParams])
    useScrollResetOnFlag(isCollectionDetailOpen)

    const handleSneakPeekClick = useCallback((e: React.MouseEvent, experienceId: string) => {
        e.stopPropagation()
        setSneakPeekExperienceId(experienceId)
    }, [])
    const handleCloseSneakPeek = useCallback(() => setSneakPeekExperienceId(null), [])

    if (!countryId) return null

    if (isCollectionDetailOpen && detailCollectionId) {
        return (
            <>
                <CollectionDetailAllView
                    identifier={detailCollectionId}
                    collectionName={searchParams.get('collection_name') ?? ''}
                    countryId={countryId}
                    tripId={tripId ?? activeTripId}
                    onBack={closeCollectionDetail}
                    onSneakPeekClick={handleSneakPeekClick}
                    onCardClick={setSneakPeekExperienceId}
                    isActive={isActive}
                    sourceDetails={
                        detailCollectionItem?.identifier === detailCollectionId ? detailCollectionItem?.source_details ?? null : null
                    }
                />
                {sneakPeekExperienceId && (
                    <SneakPeekModal
                        isOpen={!!sneakPeekExperienceId}
                        onClose={handleCloseSneakPeek}
                        experienceId={sneakPeekExperienceId}
                        triggerType="activities_tab_curated_collection"
                        tripId={tripId ?? activeTripId ?? undefined}
                    />
                )}
            </>
        )
    }

    return (
        <div className="flex flex-col pb-12 px-0 md:px-0">
            {/* White card (vs the default grey-5) so the hero doesn't read
                as a second surface against the tab's white background; no
                divider between the hero and Top 10 per spec. */}
            <ActivitiesCountryHero
                country_id={countryId}
                currentMonthLowerCase={currentMonthLowerCase}
                cardClassName="bg-white"
            />

            <TopActivitiesSection
                countryId={countryId}
                showSeeAllButton
                experiencesListSectionId={ALL_ACTIVITIES_SECTION_ID}
                triggerType="activities_tab_country_top10"
                reelsModeOnMobile
                tripId={tripId}
            />

            {/* No divider before Top Cities (spec). TopCitiesSection's own
                GenericCard already supplies the 20px left inset on every
                breakpoint, so the heading and cards align with the other
                sections without any extra `pl-5`/`ml-5` (which previously
                double-padded them). */}
            <div className="pt-2 md:pt-4">
                <TopCitiesSection
                    countryId={countryId}
                    onCityClick={onCityClick}
                    titleClassName={SECTION_HEADING_CLASS}
                />
            </div>

            {/* Curated creator collections — country-scoped. Moved here from
                the per-city Explore view: collections are curated per country,
                so they belong on the country overview. Self-hides when the
                fetch comes back empty. */}
            <div className="pt-8 pb-2 md:pt-10 md:pb-0 px-4 md:px-0 flex flex-col gap-6">
                <Divider className="hidden md:block" />
                <CuratedCollectionsSection
                    countryIds={[countryId]}
                    countryName={countryName}
                    onViewAllCollection={openCollectionDetail}
                    titleClassName={SECTION_HEADING_CLASS}
                    /* All Cities below ships its own top divider — keeping
                       the section's trailing one painted two stacked lines. */
                    hideTrailingDivider
                />
            </div>

            {/* No mobile `px-4` here — AllCitiesSection's own GenericCard
                supplies the 20px left inset; the extra wrapper padding pushed
                the heading out of line with the other sections. */}
            <div className="md:px-0 pt-6 md:pt-8">
                <AllCitiesSection
                    countryId={countryId}
                    onCityClick={onCityClick}
                    titleClassName={SECTION_HEADING_CLASS}
                    containerClassName="bg-transparent"
                />
            </div>

            <Divider className="md:mb-8 mb-6 md:mt-8 mt-6" />

            <ExperiencesListSection
                id={ALL_ACTIVITIES_SECTION_ID}
                experiences={experiences}
                totalExperiences={totalExperiences}
                locationName={countryName ?? ''}
                isLoading={isExperiencesLoading}
                error={experiencesError}
                hasNextPage={hasExperiencesNextPage}
                isFetchingNextPage={isFetchingExperiencesNextPage}
                fetchNextPage={fetchExperiencesNextPage}
                shortlistState={readOnlyShortlist ? {} : shortlistState}
                shortlistLoadingIds={readOnlyShortlist ? {} : shortlistLoadingIds}
                onExperienceClick={setSneakPeekExperienceId}
                onShortlistToggle={readOnlyShortlist ? async () => {} : handleShortlistToggle}
                onSneakPeekClick={handleSneakPeekClick}
                showCity
            />

            {sneakPeekExperienceId && (
                <SneakPeekModal
                    isOpen={!!sneakPeekExperienceId}
                    onClose={handleCloseSneakPeek}
                    experienceId={sneakPeekExperienceId}
                    triggerType="activities_tab_country_overview"
                    tripId={tripId ?? activeTripId ?? undefined}
                />
            )}

            {/* Watch & Discover — country-wide video feed (mobile reels /
                desktop sneak-peek tour) over every experience in the country. */}
            <WatchDiscover
                experiences={experiences}
                shortlistState={readOnlyShortlist ? {} : shortlistState}
                shortlistLoadingIds={readOnlyShortlist ? {} : shortlistLoadingIds}
                onShortlistToggle={readOnlyShortlist ? undefined : handleShortlistToggle}
                isActive={isActive}
                readOnlyShortlist={readOnlyShortlist}
                tripId={tripId ?? activeTripId}
                triggerType="activities_tab_country_watch_discover"
                totalCount={totalExperiences}
                hasNextPage={hasExperiencesNextPage}
                isFetchingNextPage={isFetchingExperiencesNextPage}
                fetchNextPage={fetchExperiencesNextPage}
            />
        </div>
    )
}

export default ActivitiesCountryOverviewView
