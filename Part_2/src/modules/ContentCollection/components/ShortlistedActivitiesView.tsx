import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import ListCard from '@/components/ListCard'
import CardShortlistOverlay from '@/modules/Acitvities/components/CardShortlistOverlay'
import ItineraryAddButton from '@/modules/Acitvities/components/ItineraryAddButton'
import SingleExperienceReelsView from '@/modules/Acitvities/components/SneakPeakModal/SingleExperienceReelsView'
import { useOptionalItineraryAdd } from '@/modules/Acitvities/context/ItineraryAddContext'
import LoadingMoreExperiences from '@/modules/Experiences/components/ExperiencesExploreLandingPage/LoadingMoreExperiences'
import { FERRIS_WHEEL_ICON } from '@/constants/thiingsIcons'
import {
    bulkUpsertTripExperiences,
    getCityWiseShortlistedExperiences,
    type ShortlistedByTripExperienceResult
} from '@/modules/Experiences/api/experienceShortlistAPI'
import { useOptionalShortlistedExperiences } from '@/modules/Acitvities/context/ShortlistedExperiencesContext'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { useLoginModal } from '@/modules/Onboarding/context/LoginModalContext'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/use-mobile'
import type { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

interface CityWiseExperiences {
    cityKey: string
    cityName: string
    experiences: Array<ExperienceCardData & { initialIsShortlisted: boolean }>
}

const PAGE_SIZE = 10

const toCardData = (item: ShortlistedByTripExperienceResult): ExperienceCardData & { initialIsShortlisted: boolean } => {
    const experience = item.experience
    const experienceId = experience?.id || item.experience_id || ''
    const price = experience?.price ||
        item.price || {
            currency: 'INR',
            lower_bound: 0,
            upper_bound: 0
        }
    const image = experience?.display_props?.landscape_image || item.content?.[0] || ''
    const cityName = experience?.base_city?.name || 'Unknown City'
    const categories = experience?.categories || []

    return {
        id: experienceId,
        title: experience?.name || 'Unnamed Experience',
        city_name: cityName,
        city_id: '',
        price: {
            lower_bound: price.lower_bound ?? null,
            upper_bound: price.upper_bound ?? null,
            currency: price.currency ?? null
        },
        image,
        suggestion_priority: null,
        short_description: experience?.short_description ?? null,
        category: null,
        categoryBackendValue: categories[0] ?? null,
        categories: categories.length > 0 ? categories : null,
        initialIsShortlisted: item.is_traveler_shortlisted ?? true
    }
}

interface ShortlistedActivitiesViewProps {
    tripId: string
    countryId?: string | null
    /** City filter scope — matches the parent ExperienceTab's city chip. */
    selectedCityId?: string | null
    /** Human-readable city name used for filtering (API groups results by city name, not id). */
    selectedCityName?: string | null
    onExperienceClick: (experienceId: string) => void
    onSneakPeekClick?: (e: React.MouseEvent, experienceId: string) => void
    onSwitchToMapTab?: () => void
    /** Whether this view is currently on-screen. Forwarded to each card's
     *  `shouldLoadTours` so the per-card `/tours` + `/tour-data-status`
     *  polling pauses when the user is on a different tab. */
    isActive?: boolean
    /** When the parent has hidden the map column, switch to a 2-col grid
     *  on desktop so cards don't stretch across the full width. */
    isMapHidden?: boolean
    /** Empty-state "Explore activities" CTA — flips the Activities tab back
     *  to the Explore subview without leaving the page. */
    onExploreActivitiesClick?: () => void
    /** Reports the city names the shortlist spans (in load order) so the
     *  parent can build city filter chips — including cities the user
     *  shortlisted outside the trip itinerary. */
    onCitiesChange?: (cityNames: string[]) => void
    /** Reports the count of currently-visible (city-filtered) shortlisted
     *  cards so the parent's heart pill + banner can reflect the selected
     *  city (0 for a city with nothing shortlisted) instead of the trip total. */
    onVisibleCountChange?: (count: number) => void
    /** Bumped by the parent on a confirmed "Add to Day N" hand-off; closes
     *  the Watch-Reel view so the assistant behind it is visible. */
    closeReelsSignal?: number
}

/**
 * Activities tab — "Shortlisted" view.
 *
 * Mirrors /experiences/:tripId/wishlist: city-grouped, infinite-scrolled
 * list of shortlisted experiences. Honors the same city filter as the
 * parent "In your itinerary" view — when a city is selected upstream,
 * we only render that city's group here (API groups results by city
 * name, so we match on name, not id).
 *
 * Heart state is tracked LOCALLY (`localShortlistOverride`) because the
 * backing context's `shortlistState` drops entries after un-shortlist
 * when it refetches from `getShortlistedByTrip`. The local override
 * keeps the heart unfilled on the card until the user navigates away.
 * The API call + "In your itinerary" sync still goes through the shared
 * context handler.
 */
const ShortlistedActivitiesView: React.FC<ShortlistedActivitiesViewProps> = ({
    tripId,
    selectedCityName,
    onExperienceClick,
    onSneakPeekClick,
    isActive: _isActive = true,
    isMapHidden = false,
    onExploreActivitiesClick,
    onCitiesChange,
    onVisibleCountChange,
    closeReelsSignal
}) => {
    void _isActive
    const isMobile = useIsMobile()
    const itineraryAddCtx = useOptionalItineraryAdd()
    const shortlistCtx = useOptionalShortlistedExperiences()
    const refreshShortlistCtx = shortlistCtx?.refreshShortlist
    const queryClient = useQueryClient()
    const { isAuthenticated } = useAuth()
    const { openLoginModal } = useLoginModal()

    const sentinelRef = useRef<HTMLDivElement | null>(null)
    // Local override: bridges the brief window between user click and
    // the list-refetch that drops the un-shortlisted card. Heart visual
    // flips instantly here; the debounced refetch then removes the card
    // cleanly so rapid re-toggles don't thrash the API.
    const [localOverride, setLocalOverride] = useState<Record<string, boolean>>({})
    // Per-id API-in-flight set so the heart shows a pending state without
    // depending on the context (which isn't the API caller here).
    const [inFlight, setInFlight] = useState<Record<string, boolean>>({})
    const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Intentionally NOT passing `country` to the API: the header's
    // shortlist counter is computed by `ShortlistedExperiencesContext`
    // via `getShortlistedByTrip` with no country filter, i.e. across
    // every country the trip touches. If we filter here by countryId
    // (which on a multi-destination trip is just one of several), the
    // API returns 0 even though the counter shows N — exactly the
    // mismatch the user hit. Always fetch the full set so the view
    // and the counter agree.
    const {
        data,
        isLoading,
        error,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ['tripboard-activities-shortlisted', tripId],
        queryFn: async ({ pageParam = 1 }) =>
            getCityWiseShortlistedExperiences({
                tripId,
                page: pageParam,
                limit: PAGE_SIZE
            }),
        getNextPageParam: (lastPage) => (lastPage?.has_more ? lastPage.page + 1 : undefined),
        initialPageParam: 1,
        // Skip the fetch for unauthenticated viewers — the endpoint
        // requires auth. The empty state below prompts them to log in.
        enabled: !!tripId && isAuthenticated
    })

    // Prune local overrides after each refetch so stale flags don't
    // persist on ids that were dropped/re-added server-side.
    useEffect(() => {
        if (!data?.pages) return
        const liveIds = new Set<string>()
        for (const page of data.pages) {
            const results = page.results ?? {}
            for (const items of Object.values(results)) {
                for (const item of items) {
                    const id = item.experience?.id || item.experience_id
                    if (id) liveIds.add(id)
                }
            }
        }
        setLocalOverride((prev) => {
            const next: Record<string, boolean> = {}
            let changed = false
            for (const [id, val] of Object.entries(prev)) {
                if (liveIds.has(id)) {
                    next[id] = val
                } else {
                    changed = true
                }
            }
            return changed ? next : prev
        })
    }, [data])

    // City-grouped list straight from the API. No more itinerary merge —
    // the In-your-itinerary view owns that surface now.
    const cityWiseExperiences = useMemo<CityWiseExperiences[]>(() => {
        const cityMap = new Map<string, CityWiseExperiences>()
        if (!data?.pages) return []
        for (const page of data.pages) {
            const results = page.results ?? {}
            for (const [cityName, items] of Object.entries(results)) {
                const transformed = items.map(toCardData)
                const existing = cityMap.get(cityName)
                if (!existing) {
                    cityMap.set(cityName, { cityKey: cityName, cityName, experiences: transformed })
                    continue
                }
                const existingIds = new Set(existing.experiences.map((e) => e.id))
                const newOnes = transformed.filter((e) => !existingIds.has(e.id))
                cityMap.set(cityName, {
                    ...existing,
                    experiences: [...existing.experiences, ...newOnes]
                })
            }
        }
        return [...cityMap.values()]
    }, [data])

    // Report the spanned city names up so the parent can build filter chips
    // for shortlisted cities (incl. ones outside the itinerary). Keyed on the
    // joined names so it only fires when the set actually changes.
    const cityNamesKey = useMemo(() => cityWiseExperiences.map((c) => c.cityName).join('|'), [cityWiseExperiences])
    useEffect(() => {
        onCitiesChange?.(cityNamesKey ? cityNamesKey.split('|') : [])
    }, [cityNamesKey, onCitiesChange])

    // City scope filter — API returns all cities for the trip; the
    // parent's city chip drives the visible subset. Case-insensitive
    // match so minor normalization differences don't hide results.
    const visibleCities = useMemo(() => {
        if (!selectedCityName) return cityWiseExperiences
        const needle = selectedCityName.toLowerCase()
        return cityWiseExperiences.filter((c) => c.cityName.toLowerCase() === needle)
    }, [cityWiseExperiences, selectedCityName])

    // Flat list of visible experiences for the mobile reels view (one short
    // per shortlisted experience). Order matches the visible card order so
    // the reel that opens lines up with the card the user tapped.
    const flatExperiences = useMemo(
        () => visibleCities.flatMap((c) => c.experiences),
        [visibleCities]
    )

    // Report the visible count up so the heart pill + banner match the
    // selected city (0 when that city has nothing shortlisted).
    useEffect(() => {
        onVisibleCountChange?.(flatExperiences.length)
    }, [flatExperiences.length, onVisibleCountChange])

    // Mobile-only "Watch Reel" reels view — shows the tapped activity's
    // OWN videos. Desktop falls back to the standard SneakPeekModal via
    // the parent's onSneakPeekClick.
    const [reelsExperienceId, setReelsExperienceId] = useState<string | null>(null)
    const isReelsOpen = reelsExperienceId !== null && isMobile

    // Close the reel when the parent confirms an "Add to Day N" hand-off so
    // the assistant behind it shows. Truthy guard keeps mount (0) a no-op.
    useEffect(() => {
        if (closeReelsSignal) setReelsExperienceId(null)
    }, [closeReelsSignal])

    const reelsExperience = useMemo(
        () => flatExperiences.find((e) => e.id === reelsExperienceId) ?? null,
        [flatExperiences, reelsExperienceId]
    )

    const { trackButtonClickCustom } = usePostHog()
    const trackShortlist = (buttonName: string, extra?: Record<string, unknown>) =>
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
            buttonName,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra
        })
    const handleCardClick = useCallback(
        (experienceId: string) => {
            trackShortlist(POSTHOG_EVENTS.ACTIVITIES_SHORTLIST_CARD_CLICK, { experience_id: experienceId })
            onExperienceClick(experienceId)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [onExperienceClick, trackButtonClickCustom]
    )
    const handleWatchReelClick = useCallback(
        (e: React.MouseEvent, experienceId: string) => {
            e.stopPropagation()
            trackShortlist(POSTHOG_EVENTS.ACTIVITIES_SHORTLIST_WATCH_REEL_CLICK, { experience_id: experienceId })
            if (isMobile) {
                setReelsExperienceId(experienceId)
                return
            }
            onSneakPeekClick?.(e, experienceId)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isMobile, onSneakPeekClick, trackButtonClickCustom]
    )


    // Infinite scroll
    useEffect(() => {
        if (!hasNextPage || isFetchingNextPage || isLoading) return
        const sentinel = sentinelRef.current
        if (!sentinel) return
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    void fetchNextPage()
                }
            },
            { root: null, rootMargin: '200px', threshold: 0.1 }
        )
        observer.observe(sentinel)
        return () => observer.disconnect()
    }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage])

    const onToggle = useCallback(
        async (experienceId: string, currentVisual: boolean) => {
            // Auth-gated: unauthenticated viewers see the login modal
            // instead of an immediate API call that would 401.
            if (!isAuthenticated) {
                openLoginModal({
                    redirectAfterLogin: false,
                    buttonPage: 'tripboard_v1'
                })
                return
            }
            const nextState = !currentVisual
            // Optimistic local flip — card stays in place; heart visual
            // toggles immediately so the user gets instant feedback.
            setLocalOverride((prev) => ({ ...prev, [experienceId]: nextState }))
            setInFlight((prev) => ({ ...prev, [experienceId]: true }))

            try {
                // Call bulkUpsert DIRECTLY with the prop-sourced tripId.
                // The shared context's handleShortlistToggle bails out
                // when `activeTrip` isn't populated in `travelerTripsContext`
                // (which can happen on tripboard deep-links). Calling the
                // API here means the flag actually updates regardless.
                await bulkUpsertTripExperiences(tripId, {
                    trip_id: tripId,
                    experiences: [
                        {
                            experience_id: experienceId,
                            is_traveler_shortlisted: nextState
                        }
                    ]
                })
                toast.success(nextState ? 'Added to wishlist' : 'Removed from wishlist')

                // Sync the shared context so "In your itinerary" hearts
                // update too. Fire-and-forget — the local override here
                // already covers the visual.
                void refreshShortlistCtx?.()
            } catch (err) {
                // Revert on failure.
                setLocalOverride((prev) => ({ ...prev, [experienceId]: currentVisual }))
                // eslint-disable-next-line no-console
                console.error('Failed to update shortlist', err)
                toast.error('Could not update shortlist. Please try again.')
            } finally {
                setInFlight((prev) => {
                    const next = { ...prev }
                    delete next[experienceId]
                    return next
                })
            }

            // Debounced list refetch: un-shortlisted cards should drop
            // out of the list so stale entries don't linger. The delay
            // gives the user visual confirmation first and coalesces
            // rapid re-toggles into a single refetch.
            if (refetchTimerRef.current) {
                clearTimeout(refetchTimerRef.current)
            }
            refetchTimerRef.current = setTimeout(() => {
                queryClient.invalidateQueries({
                    queryKey: ['tripboard-activities-shortlisted', tripId]
                })
                refetchTimerRef.current = null
            }, 800)
        },
        [queryClient, tripId, refreshShortlistCtx, isAuthenticated, openLoginModal]
    )

    // Clear pending refetch on unmount so we don't invalidate after
    // the user has already navigated away.
    useEffect(() => {
        return () => {
            if (refetchTimerRef.current) {
                clearTimeout(refetchTimerRef.current)
                refetchTimerRef.current = null
            }
        }
    }, [])

    if (isLoading && cityWiseExperiences.length === 0) {
        return (
            <div className="flex flex-col gap-4 py-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={`skeleton-${i}`} className="animate-pulse rounded-2xl bg-grey-5 h-[180px] w-full" />
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="mx-4 my-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Failed to load shortlisted activities. Please try again.
            </div>
        )
    }

    // Cross-fade between the card grid and the empty state. `mode="wait"`
    // lets the outgoing grid (cards animating out one-by-one via the inner
    // AnimatePresence) finish before the empty state fades in, so the
    // transition feels intentional rather than abrupt.
    if (visibleCities.length === 0) {
        return (
            <AnimatePresence mode="wait">
                <motion.div
                    key="shortlist-empty"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="flex flex-col items-center justify-center px-6 py-16 md:py-24 text-center">
                    <img
                        src={FERRIS_WHEEL_ICON}
                        alt=""
                        className="w-20 h-20 object-contain mb-4"
                    />
                    <h2 className="text-[16px] font-bold font-red-hat-display text-grey-0">
                        {selectedCityName ? `No activities shortlisted in ${selectedCityName}` : 'No activities shortlisted'}
                    </h2>
                    <p className="mt-1 text-[13px] font-medium font-red-hat-display text-grey-1 max-w-[300px]">
                        You can save your favourite activities here for easy reference later.
                    </p>
                    {onExploreActivitiesClick && (
                        <button
                            type="button"
                            onClick={onExploreActivitiesClick}
                            className="mt-6 rounded-xl bg-primary-default hover:bg-primary-default/90 transition-colors px-6 py-3 text-[14px] font-bold font-red-hat-display text-white cursor-pointer">
                            Explore activities
                        </button>
                    )}
                </motion.div>
            </AnimatePresence>
        )
    }

    return (
        <div className="flex flex-col gap-6 py-4">
            {/* Shortlist banner is mounted in ExperienceTab.renderStickyHeader
                so it pins along with the chip header (full-width). */}
            {visibleCities.map((cityData) => (
                <div key={cityData.cityKey} className="flex flex-col gap-4">
                    {!selectedCityName && (
                        <h2 className="text-lg font-manrope font-semibold text-header-black">{cityData.cityName}</h2>
                    )}
                    <div
                        className={
                            isMapHidden
                                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6'
                                : 'grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6'
                        }>
                        {/* AnimatePresence drives the per-card exit animation:
                            when an un-shortlist refetch drops a card from
                            `cityWiseExperiences`, the card stays mounted long
                            enough to fade + collapse before unmounting, so
                            the grid neighbour-shift looks smooth instead of
                            snapping. */}
                        <AnimatePresence initial={false}>
                            {cityData.experiences.map((experience) => {
                                const experienceId = experience.id
                                const override = localOverride[experienceId]
                                const isShortlisted = override ?? experience.initialIsShortlisted
                                const isShortlisting = Boolean(inFlight[experienceId])
                                const displayTitle = experience.title
                                return (
                                    <motion.div
                                        key={experience.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.94 }}
                                        transition={{ duration: 0.25, ease: 'easeOut' }}
                                        className="relative w-full">
                                        <ListCard
                                            image={experience.image}
                                            imageAlt={displayTitle}
                                            title={displayTitle}
                                            city={experience.city_name}
                                            className="group w-full"
                                            fullHeight={!isMobile}
                                            onClick={() => handleCardClick(experienceId)}
                                            showShortlistButton={false}
                                            showSneakPeekButton
                                            onSneakPeekClick={(e) => handleWatchReelClick(e, experienceId)}
                                            sneakPeekUserImage={experience.image}
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
                                            onToggle={() => {
                                                trackShortlist(POSTHOG_EVENTS.ACTIVITIES_SHORTLIST_CARD_SHORTLIST_TOGGLE, {
                                                    experience_id: experienceId,
                                                    next: isShortlisted ? 'removed' : 'added'
                                                })
                                                void onToggle(experienceId, isShortlisted)
                                            }}
                                        />
                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            ))}
            {hasNextPage && <div ref={sentinelRef} className="h-10 w-full" />}
            {isFetchingNextPage && <LoadingMoreExperiences />}

            {/* Mobile Watch-Reel reels view — the tapped activity's own videos.
                Shortlist surfaces the full action row (View Details / heart /
                + add) so the user can act on the activity from the reel. */}
            {isReelsOpen && reelsExperienceId && (
                <SingleExperienceReelsView
                    isOpen={isReelsOpen}
                    onClose={() => setReelsExperienceId(null)}
                    experienceId={reelsExperienceId}
                    experienceName={reelsExperience?.title}
                    fallbackImageUrl={reelsExperience?.image}
                    isShortlisted={localOverride[reelsExperienceId] ?? reelsExperience?.initialIsShortlisted ?? false}
                    isShortlisting={Boolean(inFlight[reelsExperienceId])}
                    onShortlistToggle={() => {
                        void onToggle(reelsExperienceId, localOverride[reelsExperienceId] ?? reelsExperience?.initialIsShortlisted ?? false)
                    }}
                    onViewDetails={() => onExperienceClick(reelsExperienceId)}
                    onAddToItinerary={
                        itineraryAddCtx
                            ? () => itineraryAddCtx.onAddToItinerary(reelsExperienceId, reelsExperience?.title ?? 'Activity', reelsExperience?.image)
                            : undefined
                    }
                    isInItinerary={itineraryAddCtx?.itineraryExperienceIds.has(reelsExperienceId) ?? false}
                />
            )}
        </div>
    )
}

export default ShortlistedActivitiesView
