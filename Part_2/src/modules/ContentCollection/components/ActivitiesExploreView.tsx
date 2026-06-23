import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useScrollResetOnFlag } from '@/hooks/useScrollResetOnFlag'
import { useExperiencesList } from '@/modules/Acitvities/hooks/useExperiencesList'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import {
    ShortlistedExperiencesProvider,
    useOptionalShortlistedExperiences
} from '@/modules/Acitvities/context/ShortlistedExperiencesContext'
import { useShortlistHidden } from '@/modules/Acitvities/context/ShortlistDisplayContext'
import TopActivitiesSection from '@/modules/Acitvities/sections/TopActivitiesSection'
import SneakPeekModal from '@/modules/Acitvities/components/SneakPeakModal/SneakPeekModal'
import Divider from '@/components/shared/Divider/Divider'
import ExperiencesListSection from '@/modules/Acitvities/components/ExperiencesListSection'
import BestThingsForLeisureSection from './BestThingsForLeisureSection'
import BestThingsAllView from './BestThingsAllView'
import InspirationBanner from './InspirationBanner'
import ExperiencesListHeader from '@/modules/Experiences/components/ExperiencesExploreLandingPage/ExperiencesListHeader'
import WatchDiscoverFloatingButton from '@/modules/Acitvities/components/WatchDiscoverFloatingButton'
import ActivityExploreReelsView from '@/modules/Acitvities/components/SneakPeakModal/ActivityExploreReelsView'
import SingleExperienceReelsView from '@/modules/Acitvities/components/SneakPeakModal/SingleExperienceReelsView'
import ReelVideoLoader from '@/modules/Acitvities/components/SneakPeakModal/ReelVideoLoader'
import { useFirstShortsForExperiences } from '@/modules/Acitvities/hooks/useFirstShortsForExperiences'
import { useIsMobile } from '@/hooks/use-mobile'
import { useOptionalItineraryAdd } from '@/modules/Acitvities/context/ItineraryAddContext'
import FilterCarousel from '@/modules/Acitvities/components/FilterCarousel'
import SortButton from '@/modules/Acitvities/components/FilterCarousel/SortButton'
import ActivitiesFilterModal from '@/modules/Acitvities/components/FilterCarousel/ActivitiesFilterModal'
import ActivitiesSortModal from '@/modules/Acitvities/components/FilterCarousel/ActivitiesSortModal'
import type { FilterAndSortConfig } from '@/modules/Acitvities/components/FilterCarousel/FilterCarousel'
import { useFilterAndSort } from '@/modules/Acitvities/hooks/useFilterAndSort'
import { getExperiencePreferencesWithFallback } from '@/modules/Onboarding/adapters/experiencePreferenceAdapters'
import { getCountryExperienceType } from '@/modules/Experiences/api/experienceApi'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import type {
    SortMetadata,
    SortInitialData,
    SortResult,
    FilterMetadata,
    FilterInitialData,
    FilterResult
} from '@/modules/Acitvities/types/filterAndSortTypes'

interface ActivitiesExploreViewProps {
    countryId: string | null
    selectedCityId?: string | null
    selectedCityName?: string | null
    /** Trip id is forwarded for posthog/shortlist context. */
    tripId?: string
    /** Forwarded to nested polling — disables fetches when tab is hidden. */
    isActive?: boolean
}

const ALL_ACTIVITIES_SECTION_ID = 'activities-tab-all-listing'

/**
 * Activities tab → Explore sub-view. Renders the four spec sections in order:
 *
 *   1. Top 10 Highlights        (ListCard with +Add affordance)
 *   2. Quick Bites              (dark variant of DiscoverWatchAlongPanel)
 *   3. Best Things for Leisure  (group-type carousel + Help me choose)
 *   4. All Activities listing   (existing ExperiencesListSection)
 *
 * Section 4 is preceded by the shared `FilterCarousel` (priority chips +
 * Filter + Sort) — the same component used on the standalone Activities
 * page — so users can refine the list before they scroll through it.
 *
 * The view is intentionally city-scoped: the parent ExperienceTab's selected
 * city flows in via `selectedCityId`. When null we fall back to country-wide
 * data so first-load still shows content.
 */
/**
 * Public wrapper. Ensures a ShortlistedExperiencesProvider exists above the
 * inner view — the underlying useExperiencesList/useExperiencesExplore hooks
 * call useShortlistedExperiences (the throwing variant) and the Tripboard
 * route doesn't currently mount the provider. When a parent has already
 * provided it (e.g. the standalone /activities page) we skip re-wrapping.
 */
const ActivitiesExploreView: React.FC<ActivitiesExploreViewProps> = (props) => {
    const existingShortlistCtx = useOptionalShortlistedExperiences()
    if (existingShortlistCtx) {
        return <ActivitiesExploreViewInner {...props} />
    }
    return (
        <ShortlistedExperiencesProvider>
            <ActivitiesExploreViewInner {...props} />
        </ShortlistedExperiencesProvider>
    )
}

const ActivitiesExploreViewInner: React.FC<ActivitiesExploreViewProps> = ({
    countryId,
    selectedCityId,
    selectedCityName,
    tripId,
    isActive = true
}) => {
    const readOnlyShortlist = useShortlistHidden()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const activeTripId = activeTrip?.trip_id ?? null
    // Pulled here so the reels footer (View Details / heart / + add) can
    // hand the +Add tap up to the same itinerary-insert flow the grid
    // cards use. `null` when the provider isn't mounted (read-only).
    const itineraryAddCtx = useOptionalItineraryAdd()

    const isMobile = useIsMobile()
    const [sneakPeekExperienceId, setSneakPeekExperienceId] = useState<string | null>(null)
    // Per-card "Watch Reel" on mobile opens the tapped activity's OWN
    // videos (Best Things, the All-Activities listing, and the See-All
    // page all share this). Desktop keeps the SneakPeekModal fallback.
    const [reelsExperienceId, setReelsExperienceId] = useState<string | null>(null)

    // Inline "See All" landing for Best Things to do. Backed by a URL
    // search param so the state survives reloads and the browser back
    // button returns to the Explore subview instead of leaving the tab.
    const [searchParams, setSearchParams] = useSearchParams()
    const isBestThingsAllOpen = searchParams.get('activities_section') === 'best_things'
    const openBestThingsAll = useCallback(() => {
        const next = new URLSearchParams(searchParams)
        next.set('activities_section', 'best_things')
        setSearchParams(next, { replace: false })
    }, [searchParams, setSearchParams])
    const closeBestThingsAll = useCallback(() => {
        const next = new URLSearchParams(searchParams)
        next.delete('activities_section')
        setSearchParams(next, { replace: false })
    }, [searchParams, setSearchParams])

    // Group type powering the Best Things carousel — same precedence the
    // section itself uses (URL > trip profile > null). Replicated here so
    // BestThingsAllView can fetch matching experiences without prop-drilling.
    const groupTypeFromQuery = searchParams.get('groupType')
    const groupType = groupTypeFromQuery || activeTrip?.tripProfile?.group_type || null

    // Land at the breadcrumb when See All / VIEW ALL opens its inline view.
    useScrollResetOnFlag(isBestThingsAllOpen)

    // Per-section visibility flags. Children report up; dividers are
    // only inserted between sections that are actually rendering content,
    // so a hidden section can't leave an orphan divider in the layout.
    // Start optimistic (true) so the first paint doesn't briefly omit
    // dividers while the queries fetch.
    const [topVisible, setTopVisible] = useState(true)
    const [bestThingsVisible, setBestThingsVisible] = useState(true)

    // Filter + sort local state (kept in-component — Tripboard URL is
    // already busy with `act_*` params; bleeding filter state into it
    // would complicate deep-links and isn't required by the spec).
    const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])
    const [selectedPreferences, setSelectedPreferences] = useState<string[]>([])
    const [sortByPriority, setSortByPriority] = useState<boolean>(false)
    const filterButtonRef = useRef<HTMLButtonElement | null>(null)
    const sortButtonRef = useRef<HTMLButtonElement | null>(null)

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
        countryId: countryId || null,
        cityId: selectedCityId || null,
        activeTripId,
        priorities: selectedPriorities,
        preferences: selectedPreferences,
        sortByPriority,
        enabled: !!countryId && isActive
    })

    // Watch & Discover floating CTA — mobile-only "discover the city"
    // entry point. The button shows a random city experience's image
    // (panned via CSS) as the background. Tapping it opens a cross-
    // experience reels feed across every city experience.
    //
    // Source is `experiences` from useExperiencesList (the same list that
    // powers the All-Activities listing — typically ~40 items for a city)
    // so the reels feed spans the full discovery set; experiences without
    // a YouTube short still appear in the feed using their hero image so
    // the count matches the listing.
    const [isWatchDiscoverOpen, setIsWatchDiscoverOpen] = useState(false)

    // 1) Eager-load all listing pages once the reels open — the All-Activities
    //    listing paginates (~20/page) so the first hit only has ~20 items;
    //    the reels need every item so the "1/N" counter matches what the user
    //    sees in the grid (e.g. 41). The effect chains itself: each new page
    //    triggers another fetch until `hasExperiencesNextPage` flips false.
    useEffect(() => {
        if (!isWatchDiscoverOpen) return
        if (hasExperiencesNextPage && !isFetchingExperiencesNextPage) {
            fetchExperiencesNextPage()
        }
    }, [
        isWatchDiscoverOpen,
        experiences.length,
        hasExperiencesNextPage,
        isFetchingExperiencesNextPage,
        fetchExperiencesNextPage
    ])

    // 2) Sliding shorts-fetch window so we don't fan out 41 API calls on
    //    open. Initial window covers reels [0..4]; expands by 4 as the
    //    user advances. Once cached, never shrinks — already-fetched
    //    shorts stay available in `watchDiscoverShorts`.
    const SHORTS_PREFETCH = 4
    const [shortsWindowEnd, setShortsWindowEnd] = useState(SHORTS_PREFETCH + 1)
    useEffect(() => {
        // Reset window when reels closes so the next open starts fresh.
        if (!isWatchDiscoverOpen) setShortsWindowEnd(SHORTS_PREFETCH + 1)
    }, [isWatchDiscoverOpen])
    const handleReelsActiveIndexChange = useCallback((index: number) => {
        setShortsWindowEnd((prev) => Math.max(prev, index + SHORTS_PREFETCH + 1))
    }, [])

    const watchDiscoverExperienceList = useMemo(
        () =>
            experiences
                .slice(0, Math.min(shortsWindowEnd, experiences.length))
                .map((a) => ({ id: a.id, name: a.title })),
        [experiences, shortsWindowEnd]
    )
    const { firstShorts: watchDiscoverShorts, isLoading: isWatchDiscoverLoading } = useFirstShortsForExperiences({
        experiences: watchDiscoverExperienceList,
        enabled: isWatchDiscoverOpen
    })
    // Map experiences → reel items. Includes every experience: ones with
    // a YouTube short get their video; ones without get their hero image
    // as a static slot. Each reel carries its own shortlist + view-details
    // + add-to-itinerary bindings so the action row at the bottom of the
    // reels view drives the same flows as the grid cards.
    const watchDiscoverReelItems = useMemo(() => {
        if (!isWatchDiscoverOpen) return []
        return experiences.map((exp) => {
            const shortInfo = watchDiscoverShorts.find((s) => s.experienceId === exp.id)
            const shortlistEntry = shortlistState[exp.id]
            const displayTitle = exp.title || exp.name
            return {
                // STABLE key per experience — must NOT change when the short
                // data arrives, otherwise the reel's DOM node remounts, the
                // IntersectionObserver loses it, and `activeIndex` freezes
                // (which stalls the prefetch window so later videos never
                // load). The video swaps in via `url` on the same node.
                id: `wd-${exp.id}`,
                url: shortInfo?.shortUrl ?? '',
                // All of this experience's shorts (in order). The reels view
                // plays the first and auto-advances to the next on a YouTube
                // embed error (e.g. 150 — restricted on cookieless mobile
                // Safari), only falling back to "Watch on YouTube" once every
                // candidate has failed.
                urls: shortInfo?.shortUrls ?? (shortInfo?.shortUrl ? [shortInfo.shortUrl] : []),
                // Loading until this experience's short has resolved. Reels
                // beyond the current prefetch window (`shortInfo` undefined)
                // or mid-fetch show the buffering spinner over the poster.
                isLoadingShort: !shortInfo || shortInfo.isLoading,
                imageUrl: exp.image,
                experienceName: displayTitle,
                duration: shortInfo?.duration ?? null,
                bestMonths: shortInfo?.bestMonths ?? null,
                valueForMoney: shortInfo?.valueForMoney ?? null,
                walkingRequired: shortInfo?.walkingRequired ?? null,
                isShortlisted: shortlistEntry?.isShortlisted ?? false,
                isShortlisting: Boolean(shortlistLoadingIds[exp.id]),
                onShortlistToggle: () => {
                    void handleShortlistToggle?.(exp.id)
                },
                onViewDetails: () => {
                    // Layer the sneak peek ON TOP of the reels feed so
                    // closing the sheet returns the user to the reel they
                    // were on. The sheet uses elevated z-[10001]/[10002]
                    // (via `stackedAboveReels`) to clear the reels' z-9999.
                    setSneakPeekExperienceId(exp.id)
                },
                // Match the card affordance rules: when the provider is
                // configured with `hideAddAffordance` (Explore subview),
                // suppress the "+ Add" button on the reel too. The green
                // "In your itinerary" pill at the top still shows for
                // already-added activities, so users still see what's in
                // the trip — they just can't add from Explore. Adding
                // happens via Shortlist.
                onAddToItinerary:
                    itineraryAddCtx && !itineraryAddCtx.hideAddAffordance
                        ? () => itineraryAddCtx.onAddToItinerary(exp.id, displayTitle ?? 'Activity', exp.image ?? null)
                        : undefined,
                isInItinerary: itineraryAddCtx?.itineraryExperienceIds.has(exp.id) ?? false
            }
        })
    }, [isWatchDiscoverOpen, experiences, watchDiscoverShorts, shortlistState, shortlistLoadingIds, handleShortlistToggle, itineraryAddCtx])
    // Background image for the button — pick a random experience (NOT
    // the first one, which already anchors the top of the listing /
    // Top-10 carousel, so the bg doesn't visually duplicate what the
    // user already sees on the page). Memoised on the experience-ids
    // array so the choice stays stable across re-renders but reshuffles
    // when the city changes.
    const watchDiscoverButtonImage = useMemo(() => {
        if (experiences.length === 0) return null
        if (experiences.length === 1) return experiences[0]?.image ?? null
        // Pool excludes index 0; pick one at random.
        const pool = experiences.slice(1)
        const idx = Math.floor(Math.random() * pool.length)
        return pool[idx]?.image ?? null
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [experiences.map((e) => e.id).join(',')])

    // Experience preferences metadata for the filter chips. Keyed on
    // country since the API is country-scoped.
    const { data: experiencePreferences } = useQuery({
        queryKey: ['experiencePreferences', countryId],
        queryFn: () => getExperiencePreferencesWithFallback(() => getCountryExperienceType(countryId ?? '')),
        enabled: !!countryId,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    const handlePriorityToggle = useCallback((filterId: string) => {
        setSelectedPriorities((prev) => (prev.includes(filterId) ? prev.filter((id) => id !== filterId) : [...prev, filterId]))
    }, [])

    const handlePreferenceToggle = useCallback((filterId: string) => {
        setSelectedPreferences((prev) => (prev.includes(filterId) ? prev.filter((id) => id !== filterId) : [...prev, filterId]))
    }, [])

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

    const sortInitialData: SortInitialData = useMemo(
        () => ({
            selectedSortId: sortByPriority ? 'popular' : undefined
        }),
        [sortByPriority]
    )

    // Filter modal API integration is shared with ActivitiesByCityPage —
    // metadata/initialData come from the filter API once wired up.
    const filterMetadata: FilterMetadata | undefined = undefined
    const filterInitialData: FilterInitialData | undefined = undefined

    const isFilterActive = useMemo(
        () => selectedPriorities.length > 0 || selectedPreferences.length > 0,
        [selectedPriorities, selectedPreferences]
    )

    const { isFilterOpen, isSortOpen, openFilter, openSort, closeFilter, closeSort, filterConfig, sortConfig } = useFilterAndSort<
        FilterMetadata,
        FilterInitialData,
        FilterResult,
        SortMetadata,
        SortInitialData,
        SortResult
    >({
        filterConfig: {
            enabled: false,
            type: 'activities',
            label: 'Filter',
            metadata: filterMetadata,
            initialData: filterInitialData,
            onApply: () => {
                // TODO: wire filter API once metadata is available
            },
            onClear: () => {
                setSelectedPriorities([])
                setSelectedPreferences([])
            }
        },
        sortConfig: {
            enabled: true,
            type: 'activities',
            label: 'Sort',
            metadata: sortMetadata,
            initialData: sortInitialData,
            onApply: (result: SortResult) => {
                setSortByPriority((prev) => (result.sortValue === 'popular' ? !prev : false))
            }
        }
    })

    const { trackButtonClickCustom } = usePostHog()

    const handleSneakPeekClick = useCallback((e: React.MouseEvent, experienceId: string) => {
        e.stopPropagation()
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_EXPLORE_LISTING_SNEAKPEEK_OPEN,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { experienceId }
        })
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_SNEAK_PEEK,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_SNEAK_PEEK_OPEN,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { experienceId, source: 'activities_explore_listing' }
        })
        // Mobile: open the tapped activity's own videos in the fullscreen
        // reels view. Desktop: the SneakPeekModal (reels are mobile-only).
        if (isMobile) {
            setReelsExperienceId(experienceId)
            return
        }
        setSneakPeekExperienceId(experienceId)
    }, [trackButtonClickCustom, isMobile])

    const handleCloseSneakPeek = useCallback(() => setSneakPeekExperienceId(null), [])

    // Desktop "Watch & Discover" → a cross-experience sneak-peek tour. Reels
    // are mobile-only, so on desktop the button instead walks the user through
    // every city experience's SneakPeekModal one at a time (arrows + counter).
    // `null` = not touring; otherwise the current index into `experiences`.
    const [sneakPeekTourIndex, setSneakPeekTourIndex] = useState<number | null>(null)
    const isSneakPeekTour = sneakPeekTourIndex !== null
    // While touring, the modal shows the experience at the tour index;
    // otherwise it shows whatever single card was opened.
    const activeSneakPeekId = isSneakPeekTour ? (experiences[sneakPeekTourIndex]?.id ?? null) : sneakPeekExperienceId
    const startSneakPeekTour = useCallback(() => {
        if (experiences.length > 0) setSneakPeekTourIndex(0)
    }, [experiences.length])
    const sneakPeekTourPrev = useCallback(() => {
        setSneakPeekTourIndex((i) => (i === null ? i : Math.max(0, i - 1)))
    }, [])
    const sneakPeekTourNext = useCallback(() => {
        setSneakPeekTourIndex((i) => (i === null ? i : Math.min(experiences.length - 1, i + 1)))
    }, [experiences.length])
    const closeMainSneakPeek = useCallback(() => {
        setSneakPeekExperienceId(null)
        setSneakPeekTourIndex(null)
    }, [])

    // Per-card reels (Best Things / listing / See-All). Mirrors the
    // Watch & Discover action bindings so the bottom row drives the same
    // shortlist + view-details + add-to-itinerary flows as the grid cards.
    const reelsExp = useMemo(() => experiences.find((e) => e.id === reelsExperienceId) ?? null, [experiences, reelsExperienceId])
    const singleReelsView = reelsExperienceId ? (
        <SingleExperienceReelsView
            isOpen
            onClose={() => setReelsExperienceId(null)}
            experienceId={reelsExperienceId}
            experienceName={reelsExp?.title}
            fallbackImageUrl={reelsExp?.image}
            isShortlisted={shortlistState[reelsExperienceId]?.isShortlisted ?? false}
            isShortlisting={Boolean(shortlistLoadingIds[reelsExperienceId])}
            onShortlistToggle={
                readOnlyShortlist
                    ? undefined
                    : () => {
                          void handleShortlistToggle(reelsExperienceId)
                      }
            }
            onViewDetails={() => {
                // Keep the per-card reels open and stack the sneak peek
                // sheet ABOVE them — closing the sheet returns the user
                // to the same reel. The sheet renders at elevated
                // z-[10001]/[10002] via `stackedAboveReels` so it clears
                // the reels' z-9999.
                setSneakPeekExperienceId(reelsExperienceId)
            }}
            onAddToItinerary={
                // Same rule as the Watch & Discover binding above — in the
                // Explore subview the provider sets `hideAddAffordance`,
                // so the "+ add to itinerary" button drops off the reel.
                // The "In your itinerary" pill still surfaces for added
                // activities so users still see what's on the trip.
                itineraryAddCtx && !itineraryAddCtx.hideAddAffordance
                    ? () => itineraryAddCtx.onAddToItinerary(reelsExperienceId, reelsExp?.title ?? 'Activity', reelsExp?.image ?? null)
                    : undefined
            }
            isInItinerary={itineraryAddCtx?.itineraryExperienceIds.has(reelsExperienceId) ?? false}
        />
    ) : null

    // Card click in the Activities tab opens the SneakPeekModal inline
    // (tips + booking links) instead of yanking the user to a new tab.
    const trackedListingCardClick = useCallback(
        (experienceId: string) => {
            trackButtonClickCustom?.({
                buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
                buttonName: POSTHOG_EVENTS.ACTIVITIES_EXPLORE_LISTING_CARD_CLICK,
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: { experienceId }
            })
            setSneakPeekExperienceId(experienceId)
        },
        [trackButtonClickCustom]
    )

    const trackedListingShortlist = useCallback(
        async (experienceId: string) => {
            const wasShortlisted = shortlistState[experienceId]?.isShortlisted ?? false
            trackButtonClickCustom?.({
                buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
                buttonName: POSTHOG_EVENTS.ACTIVITIES_EXPLORE_LISTING_SHORTLIST_TOGGLE,
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: { experienceId, next: wasShortlisted ? 'removed' : 'added' }
            })
            await handleShortlistToggle(experienceId)
        },
        [shortlistState, handleShortlistToggle, trackButtonClickCustom]
    )

    if (!countryId) return null

    // Inline "See All" landing for Best Things. The sticky city/date chip
    // and Explore/heart row above this view are owned by ExperienceTab, so
    // swapping the content here keeps the rest of the header untouched.
    if (isBestThingsAllOpen) {
        return (
            <>
                <BestThingsAllView
                    countryId={countryId}
                    cityId={selectedCityId || null}
                    groupType={groupType}
                    onBack={closeBestThingsAll}
                    onSneakPeekClick={handleSneakPeekClick}
                    onCardClick={setSneakPeekExperienceId}
                />
                {sneakPeekExperienceId && (
                    <SneakPeekModal
                        isOpen={!!sneakPeekExperienceId}
                        onClose={handleCloseSneakPeek}
                        experienceId={sneakPeekExperienceId}
                        triggerType="activities_tab_best_things_all"
                        tripId={tripId ?? activeTripId ?? undefined}
                        // Same rationale as the other SneakPeekModal below —
                        // stack above any open reels (Watch & Discover /
                        // per-card Watch Reel) so closing returns to the reel.
                        stackedAboveReels={isWatchDiscoverOpen || reelsExperienceId !== null}
                    />
                )}
                {singleReelsView}
            </>
        )
    }

    // Dividers only render between sections that are actually visible.
    // No `beforeFilter` divider — `FilterCarousel` ships its own.
    const sectionsAbove = {
        beforeBestThings: topVisible
    }

    // Mobile gap-0 lets section colours touch; desktop keeps 24px breathing room.
    return (
        <div className="flex flex-col max-md:gap-0 md:gap-6 pb-12">
            {/* Nudge banner is now mounted INSIDE the sticky header
                (see ExperienceTab.renderStickyHeader) so it pins along
                with the chip carousel and renders edge-to-edge. */}
            {/* 1. Top 10 Highlights. No "See All" in the tripboard activities tab —
                users scroll to the full list further down on the same surface. */}
            {/* `md:pt-8` adds breathing room between the sticky sub-header
                (chip carousel + Explore/Shortlisted toggle, owned by
                ExperienceTab) and the first carousel below. Without it
                the trophy icon sat flush against the sub-header divider
                on desktop. Mobile keeps no top pad — the sub-header
                already collapses on scroll-down so the section never
                feels glued to it. */}
            <div className="order-1 md:pt-8">
                <TopActivitiesSection
                    countryId={countryId}
                    cityId={selectedCityId || undefined}
                    cityIds={selectedCityId ? [selectedCityId] : undefined}
                    experiencesListSectionId={ALL_ACTIVITIES_SECTION_ID}
                    triggerType="activities_tab_top10"
                    reelsModeOnMobile
                    tripId={tripId}
                    onContentVisibilityChange={setTopVisible}
                />
            </div>

            {/* 2. Quick Bites — hidden from the Tripboard Activities tab per spec.
                The DiscoverWatchAlongPanel still drives the ShortsModal below
                and the underlying `watchAlongShorts` fetch is left in place so
                future surfaces can re-enable this slot without re-plumbing. */}

            {/* 3. Best Things To Do — desktop slot 3, mobile slot 2. */}
            <div className="flex flex-col gap-6 md:order-3 max-md:order-2">
                {/* Divider desktop-only; mobile relies on Best Things' own background contrast. */}
                {bestThingsVisible && sectionsAbove.beforeBestThings && (
                    <Divider className="hidden md:block" />
                )}
                <BestThingsForLeisureSection
                    cityId={selectedCityId || undefined}
                    countryId={countryId}
                    countryName={selectedCityName ?? null}
                    urlCityIds={selectedCityId ? [selectedCityId] : []}
                    onSneakPeekClick={handleSneakPeekClick}
                    onCardClick={setSneakPeekExperienceId}
                    onSeeAllClickOverride={openBestThingsAll}
                    allActivitiesSectionId={ALL_ACTIVITIES_SECTION_ID}
                    onContentVisibilityChange={setBestThingsVisible}
                    sneakPeekButtonLabel="Watch Reel"
                />
            </div>

            {/* Curated creator collections moved to the country overview
                (ActivitiesCountryOverviewView) — collections are curated
                per country, so they live on the country view now. The
                InspirationBanner CTA (build an itinerary from a video /
                reel / PDF) stays here in the city view. */}
            <div className="md:order-4 max-md:order-3 pt-8 pb-8 md:pt-10 md:pb-0 px-4 md:px-0 flex flex-col gap-6">
                <Divider className="hidden md:block" />
                <InspirationBanner />
            </div>

            {/* FilterCarousel ships its own top divider — no need for one here. */}

            {/* 4. Filter carousel + All Activities Listing — wrapped so the
                listing + modals inherit the `order-5` slot. Without the
                wrapper the listing + modals would fall back to `order-0`
                and get yanked to the top of the flex flow. */}
            <div className="order-5 flex flex-col gap-6">
            {/* Mobile-only: tight, full-width filter block — thin dividers
                top + bottom, generous breathing room around the heading
                and the Filter/Sort pill row. Matches the spec mock.
                Desktop keeps the heading inside ExperiencesListSection. */}
            <div className="md:hidden">
                <div className="h-px bg-grey-4" />
                <div className="px-5 pt-4 pb-3">
                    <ExperiencesListHeader
                        locationName={selectedCityName || ''}
                        totalExperiences={totalExperiences}
                        selectedPreferences={selectedPreferences}
                        selectedPriorities={selectedPriorities}
                        experiencePreferences={experiencePreferences}
                    />
                </div>
                <div className="pb-4">
                    <FilterCarousel
                        selectedPriorities={selectedPriorities}
                        selectedPreferences={selectedPreferences}
                        onPriorityToggle={handlePriorityToggle}
                        onPreferenceToggle={handlePreferenceToggle}
                        experiencePreferences={experiencePreferences}
                        smartSearchConfig={{ enabled: false }}
                        mobileCollapsibleChips
                        hideTrailingDivider
                        onClearAllFilters={() => {
                            setSelectedPriorities([])
                            setSelectedPreferences([])
                        }}
                        filterAndSortConfig={
                            {
                                filterConfig,
                                sortConfig,
                                onFilterClick: openFilter,
                                onSortClick: openSort,
                                isFilterActive,
                                isSortActive: sortByPriority,
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
                <div className="h-px bg-grey-4" />
            </div>
            {/* Desktop spec layout (sketch): heading → divider → filter
                chips (chips only — no inline Filter/Sort pills) → divider →
                "N activities" count on the left + Sort pill on the right →
                the grid. The section's own header is suppressed
                (`hideHeader`) since the heading lives up here now. */}
            {/* `pt-4` tops up the parent's gap-6 so the heading gets clear
                separation from the Best Things section above (the old
                layout's 48px came from FilterCarousel's default mt-12).
                Inside the block the rhythm is a tight, even ~12px:
                heading →12→ divider →8(+chip py)→ chips →8→ divider →12→
                count/Sort row. */}
            <div className="hidden md:block w-full pt-4">
                <div className="text-[18px] leading-[100%] font-semibold font-red-hat-display text-grey-0">
                    Explore all activities{selectedCityName ? ` in ${selectedCityName}` : ''}
                </div>
                <FilterCarousel
                    selectedPriorities={selectedPriorities}
                    selectedPreferences={selectedPreferences}
                    onPriorityToggle={handlePriorityToggle}
                    onPreferenceToggle={handlePreferenceToggle}
                    experiencePreferences={experiencePreferences}
                    smartSearchConfig={{ enabled: false }}
                    mobileCollapsibleChips
                    topDividerClassName="mt-3 mb-2"
                    hideTrailingDivider
                    onClearAllFilters={() => {
                        setSelectedPriorities([])
                        setSelectedPreferences([])
                    }}
                />
                <Divider className="mt-2" />
                {/* No pb — the parent's `gap-6` owns the spacing to the grid. */}
                <div className="flex items-center justify-between pt-3">
                    <span className="text-[14px] font-semibold font-manrope text-grey-1">
                        {totalExperiences.toLocaleString()} activities
                    </span>
                    <SortButton
                        ref={(element) => {
                            sortButtonRef.current = element
                        }}
                        label={sortConfig.label ?? 'Sort'}
                        isActive={sortByPriority}
                        onClick={openSort}
                        /* White pill + tighter padding so it matches the
                           filter chips' look instead of the grey explore-
                           page variant. */
                        className="md:bg-white md:p-2.5"
                    />
                </div>
            </div>

            <ExperiencesListSection
                id={ALL_ACTIVITIES_SECTION_ID}
                experiences={experiences}
                totalExperiences={totalExperiences}
                locationName={selectedCityName || ''}
                isLoading={isExperiencesLoading}
                error={experiencesError}
                hasNextPage={hasExperiencesNextPage}
                isFetchingNextPage={isFetchingExperiencesNextPage}
                fetchNextPage={fetchExperiencesNextPage}
                shortlistState={readOnlyShortlist ? {} : shortlistState}
                shortlistLoadingIds={readOnlyShortlist ? {} : shortlistLoadingIds}
                onExperienceClick={trackedListingCardClick}
                onShortlistToggle={readOnlyShortlist ? async () => {} : trackedListingShortlist}
                onSneakPeekClick={handleSneakPeekClick}
                experiencePreferences={experiencePreferences}
                selectedPreferences={selectedPreferences}
                selectedPriorities={selectedPriorities}
                showCity
                sneakPeekButtonLabel="Watch Reel"
                hideHeader
            />

            {activeSneakPeekId && (
                <SneakPeekModal
                    isOpen={!!activeSneakPeekId}
                    onClose={closeMainSneakPeek}
                    experienceId={activeSneakPeekId}
                    triggerType="activities_tab_best_things"
                    tripId={tripId ?? activeTripId ?? undefined}
                    // When the sheet is opened from inside a reels feed
                    // (Watch & Discover or per-card Watch Reel), bump it
                    // above the reels' z-9999 so it stacks over them.
                    // Closing the sheet then returns to the same reel.
                    stackedAboveReels={isWatchDiscoverOpen || reelsExperienceId !== null}
                    // Desktop sneak-peek tour: step through every experience.
                    onPrev={isSneakPeekTour ? sneakPeekTourPrev : undefined}
                    onNext={isSneakPeekTour ? sneakPeekTourNext : undefined}
                    prevDisabled={isSneakPeekTour && sneakPeekTourIndex === 0}
                    nextDisabled={isSneakPeekTour && sneakPeekTourIndex === experiences.length - 1}
                    tourPositionLabel={isSneakPeekTour ? `${(sneakPeekTourIndex ?? 0) + 1} / ${experiences.length}` : undefined}
                />
            )}

            {/* Per-card "Watch Reel" → tapped activity's own videos (mobile). */}
            {singleReelsView}

            {/* Mobile-only Watch & Discover floating CTA — opens the
                cross-experience reels feed for the selected city. */}
            {/* Mount only when the Activities tab is the visible tab.
                TripboardPage keeps every tab in the DOM under
                `display: none`, so without the `isActive` guard the
                button just sits there at its final state and the user
                never sees the entrance animation when they return to
                this tab. Tying mount to `isActive` lets React unmount
                on tab-switch-away and remount on return — the entrance
                animation then replays every time.

                Also gated on `!isWatchDiscoverOpen`: while the reels feed is
                open the button is hidden behind it anyway, and unmounting it
                guarantees a fresh mount (correct bottom-pinned position +
                replayed entrance) when the user closes the reels — instead of
                inheriting any stale position left by the reels' body-scroll
                lifecycle. The fullscreen loading scrim below covers the
                hydrate gap, so no on-button spinner is needed. */}
            {!readOnlyShortlist && experiences.length > 0 && isActive && !isWatchDiscoverOpen && (
                <WatchDiscoverFloatingButton
                    backgroundImageUrl={watchDiscoverButtonImage}
                    onClick={() => setIsWatchDiscoverOpen(true)}
                />
            )}

            {/* Desktop Watch & Discover → opens the cross-experience
                sneak-peek tour (reels are mobile-only). Hidden while a tour
                is already running so it doesn't sit on top of the modal. */}
            {!readOnlyShortlist && experiences.length > 0 && isActive && !isSneakPeekTour && (
                <WatchDiscoverFloatingButton
                    variant="desktop"
                    backgroundImageUrl={watchDiscoverButtonImage}
                    onClick={startSneakPeekTour}
                />
            )}

            {/* Cross-experience reels feed — fired by Watch & Discover.
                Mirrors the same loading scrim TopActivitiesSection uses
                while shorts hydrate so the user doesn't see a brief
                empty state. */}
            {isWatchDiscoverOpen && watchDiscoverReelItems.length > 0 && (
                <ActivityExploreReelsView
                    isOpen={isWatchDiscoverOpen}
                    onClose={() => setIsWatchDiscoverOpen(false)}
                    shorts={watchDiscoverReelItems}
                    experienceName={watchDiscoverReelItems[0]?.experienceName ?? ''}
                    initialIndex={0}
                    onActiveIndexChange={handleReelsActiveIndexChange}
                />
            )}
            {isWatchDiscoverOpen && watchDiscoverReelItems.length === 0 && isWatchDiscoverLoading && (
                <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
                    <button
                        type="button"
                        onClick={() => setIsWatchDiscoverOpen(false)}
                        className="absolute top-4 right-4 h-9 w-9 rounded-full bg-black/55 backdrop-blur-sm flex items-center justify-center"
                        aria-label="Close">
                        <span className="text-white text-xl leading-none">×</span>
                    </button>
                    <ReelVideoLoader />
                </div>
            )}

            {/* Filter modal — wired up but disabled until metadata API
                lands. Mirrors ActivitiesByCityPage's wiring exactly so
                the day metadata is available, no glue code changes here. */}
            <ActivitiesFilterModal
                isOpen={isFilterOpen}
                onClose={closeFilter}
                anchorElement={filterButtonRef.current}
                metadata={filterMetadata}
                initialData={filterInitialData}
                onApply={(result: FilterResult) => {
                    filterConfig.onApply?.(result)
                }}
                onClear={() => {
                    filterConfig.onClear?.()
                }}
            />

            <ActivitiesSortModal
                isOpen={isSortOpen}
                onClose={closeSort}
                anchorElement={sortButtonRef.current}
                metadata={sortMetadata}
                initialData={sortInitialData}
                onApply={(result: SortResult) => {
                    sortConfig.onApply?.(result)
                }}
            />
            </div>
        </div>
    )
}

export default ActivitiesExploreView
