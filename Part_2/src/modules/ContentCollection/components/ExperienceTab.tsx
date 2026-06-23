import { Fragment, useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { CheckSquare, ChevronLeft, ExternalLink, Heart, Plus, Search, Trash2 } from 'lucide-react'
import ShortlistedActivitiesView from './ShortlistedActivitiesView'
import ActivitiesExploreView from './ActivitiesExploreView'
import ActivitiesCountryOverviewView from './ActivitiesCountryOverviewView'
import ActivitiesCountrySwitcher from './ActivitiesCountrySwitcher'
import ExploreCityModal from './ExploreCityModal'
import type { CityListItem } from '@/components/common/SearchBar'
import Typography from '@/components/shared/Typography'
import SearchAndAddExperienceModal from './SearchAndAddExperienceModal'
import type { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import ExperienceWithTours from '../components/ExperienceWithTours'
import { TourLiveDataBatchProvider } from '@/modules/Experiences/hooks/TourLiveDataBatchScope'
import { useCollectionId } from '@/modules/Tripboard/context/TripCollectionRecommendationsContext'
import type { BatchItem } from '@/modules/Experiences/api/tourLiveDataBatchAPI'
import CustomShimmer from '@/components/shared/Shimmer'
import CityDateFilterCarousel, { buildCityDateGroupsFromExperiences, formatCompactDateRange } from './CityDateFilterCarousel'
import EditExperienceDateModal from './EditExperienceDateModal'
import { useIsMobile } from '@/hooks/use-mobile'
import { ShortlistedExperiencesProvider, useOptionalShortlistedExperiences } from '@/modules/Acitvities/context/ShortlistedExperiencesContext'
import { ShortlistDisplayProvider } from '@/modules/Acitvities/context/ShortlistDisplayContext'
import { ItineraryAddProvider } from '@/modules/Acitvities/context/ItineraryAddContext'
import AddToItineraryDayModal from '@/modules/Acitvities/components/AddToItineraryDayModal'
import { useExperienceFitRecommendation } from '@/modules/Acitvities/hooks/useExperienceFitRecommendation'
import InYourItineraryView from './InYourItineraryView'
import ShortlistBanner from './ShortlistBanner'
import { triggerAssistantPrompt } from '@/pages/Stays/Components/assistantController'
import { buildScheduleShortlistPrompt } from '@/utils/shortlistPrompts'
import { useHideOnScrollDown } from '@/hooks/useHideOnScrollDown'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useUserInfo } from '@/hooks/useUserInfo'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { toast } from 'sonner'
import { formatDateHeading, formatDayLabel } from '../utils'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { useLoginModal } from '@/modules/Onboarding/context/LoginModalContext'
import { isPastDate, getTomorrowDate, formatDateStringToYMD } from '@/utils/dateUtils'
import { ACTIVITIES_PARAMS, writeGroupToParams, findGroupKeyFromParams, readGroupFromParams } from '../utils/cityDateFilter'
import { buildActivitiesCityExploreHref } from '../utils/tripboardExploreLinks'
import TripboardExploreMoreCard from './TripboardExploreMoreCard'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import { TRIPBOARD_V1_BUTTON_PAGE } from '@/constants/posthogEvents'
import ExperienceComments from './ExperienceComments'
import { useDeleteSlot } from '@/modules/Itinerary/hooks/ItineraryEventHook'
import type { CollectionApi, ExperienceTabProps } from '../types/experienceTabTypes'

// ── Country-layer Activities drill — URL params ──
// `act_country` = selected country id (persisted in BOTH the country
// overview and the drilled city view). `act_cmode=cities` flags the
// drilled state; absent means the country overview is showing.
const ACT_COUNTRY_PARAM = 'act_country'
const ACT_CMODE_PARAM = 'act_cmode'

/**
 * Public wrapper. Mounts shortlist + display providers so Explore /
 * Shortlist subviews share heart state and curator-shared pages can
 * suppress hearts via context.
 */
const ExperienceTab: React.FC<ExperienceTabProps> = (props) => {
    const existingShortlistCtx = useOptionalShortlistedExperiences()
    // Wrap the subtree so descendants (CardShortlistOverlay, ActivitiesExploreView)
    // can hide hearts via context without prop drilling.
    const inner = <ExperienceTabInner {...props} />
    const withDisplay = <ShortlistDisplayProvider hidden={!!props.readOnlyShortlist}>{inner}</ShortlistDisplayProvider>
    // Curator-shared mode needs no working shortlist context — viewer can't
    // toggle hearts. Skip mounting `ShortlistedExperiencesProvider`.
    if (props.showShortlistToggle && !props.readOnlyShortlist && !existingShortlistCtx) {
        return (
            <ShortlistedExperiencesProvider tripId={props.tripId ?? null}>
                {withDisplay}
            </ShortlistedExperiencesProvider>
        )
    }
    return withDisplay
}

const ExperienceTabInner: React.FC<ExperienceTabProps> = ({
    experiences,
    inItineraryExperiences,
    experienceSlotMap,
    experienceCommentsByExpId,
    isExperiencesLoading,
    onExperienceClick,
    onSneakPeekClick,
    hoveredCardId,
    setHoveredCardId,
    onSwitchToMapTab,
    collectionIdentifier,
    experienceSectionMap,
    sectionMetadataMap,
    api = contentCollectionApi as CollectionApi,
    allowDateEdit = false,
    onDeleteSection,
    isDeleting = false,
    canAddExperience: canAddExperienceProp = false,
    hideShortlist = false,
    collectionType = 'content',
    queryKeyPrefix = 'content-collection',
    fallbackMode = 'traveler',
    exploreCountryId,
    exploreCountryName,
    hideExactDates = false,
    tripStartDate,
    bulkSelection,
    itineraryDays,
    headerPortalRef,
    isActive = true,
    showShortlistToggle = false,
    tripId,
    countryId,
    defaultActivitiesView = 'in_itinerary',
    readOnlyShortlist = false,
    itineraryId,
}) => {
    // ObjectId of the collection in scope, for attribution query param. Prefer
    // ctx (TripCollectionRecommendationsProvider sets it from collections[0].id);
    // fall back to whatever the parent passed as collectionIdentifier (may be slug).
    const ctxCollectionId = useCollectionId()
    const collectionIdForAttribution = ctxCollectionId ?? collectionIdentifier ?? null

    const bulkSelectMode = bulkSelection?.mode ?? false
    const selectedSectionIds = bulkSelection?.selectedSectionIds
    const onToggleSectionSelect = bulkSelection?.onToggleSectionSelect
    const onToggleBulkSelectMode = bulkSelection?.onToggleMode
    const onBulkDeleteSelected = bulkSelection?.onDeleteSelected
    const onBulkSelectAll = bulkSelection?.onSelectAllVisible

    // Map ``entity_id → itinerary day date (YYYY-MM-DD)`` for every
    // experience-linked slot on the itinerary.
    //
    // Match by ``entity_model === 'experiences'`` (the BE convention used by
    // ``traveler_collection_service.sync_from_itinerary`` at lines 1420-1423
    // and the budget service) instead of ``kind === 'experience'``. The
    // ``kind`` field can be ``'experience'``, ``'tour'``, or ``'activity'``
    // (see concierge enricher's ENRICHABLE_KINDS) — filtering only on the
    // first one missed tour/activity-tagged slots that still link to an
    // Experience document, leaving their cards on the stale metadata path.
    const itineraryDateByEntityId = useMemo(() => {
        const map = new Map<string, string>()
        if (!itineraryDays) return map
        for (const day of itineraryDays) {
            const dayDate = typeof day.date === 'string' ? day.date.split('T')[0] : new Date(day.date).toISOString().split('T')[0]
            for (const slot of day.slots || []) {
                if (!slot.entity_id) continue
                const isExperienceSlot =
                    slot.entity_model === 'experiences' || slot.kind === 'experience' || slot.kind === 'tour' || slot.kind === 'activity'
                if (isExperienceSlot && !map.has(slot.entity_id)) {
                    map.set(slot.entity_id, dayDate)
                }
            }
        }
        return map
    }, [itineraryDays])

    // Derived set powering the "Added" detection on Activities tab explore cards.
    // O(1) `.has(id)` per card — same Map data we already build for date lookups.
    const itineraryExperienceIds = useMemo(
        () => new Set(itineraryDateByEntityId.keys()),
        [itineraryDateByEntityId]
    )

    // Day-picker modal state for the "+ Add" flow on explore cards.
    // The actual insert API call is stubbed for now — `onAdd` toasts and
    // closes. When the backend insert is wired, swap the toast for the call.
    const [addToItineraryTarget, setAddToItineraryTarget] = useState<{
        id: string
        name: string
        image?: string | null
    } | null>(null)

    // Build a small lookup so the AddToItineraryDayModal can stack
    // thumbnails of each day's already-placed activities (matches the
    // visual style of the In-Your-Itinerary day rows). Only id+image is
    // needed by the modal — keeps the prop surface tight.
    const addToItineraryExperiencesById = useMemo(() => {
        const map = new Map<string, { id: string; image?: string | null }>()
        for (const exp of experiences) {
            if (exp.id) map.set(exp.id, { id: exp.id, image: exp.image ?? null })
        }
        return map
    }, [experiences])

    // The selected experience's own thumbnail — surfaced in the modal
    // header next to its name. Prefer the image the card passed in
    // directly (covers experiences from the all-activities listing,
    // which aren't always in the section-derived `experiences` map);
    // fall back to the lookup so callers that only pass id+name still
    // get an image when one is known.
    const addToItineraryTargetImage = useMemo(() => {
        if (!addToItineraryTarget?.id) return null
        if (addToItineraryTarget.image) return addToItineraryTarget.image
        return addToItineraryExperiencesById.get(addToItineraryTarget.id)?.image ?? null
    }, [addToItineraryTarget, addToItineraryExperiencesById])

    // AI day-fit recommendation for the experience being placed — streams while
    // the day-picker modal is open, surfaced as a banner inside it. Shared by
    // all three modal mounts (explore / in-itinerary / shortlisted).
    const dayFitRecommendation = useExperienceFitRecommendation({
        experienceId: addToItineraryTarget?.id ?? null,
        tripId: tripId ?? null,
        enabled: !!addToItineraryTarget
    })
    const handleAddToItinerary = useCallback(
        (experienceId: string, experienceName: string, experienceImage?: string | null) => {
            setAddToItineraryTarget({
                id: experienceId,
                name: experienceName,
                image: experienceImage ?? null
            })
        },
        []
    )
    const handleCloseAddToItinerary = useCallback(() => setAddToItineraryTarget(null), [])
    // Bumped on each confirmed hand-off to close the mobile Watch-Reel view
    // (in ShortlistedActivitiesView), revealing the assistant behind it.
    const [closeReelsSignal, setCloseReelsSignal] = useState(0)
    const handleConfirmAddToItinerary = useCallback(
        ({ dayDate, dayNumber }: { dayDate: string; dayNumber: number }) => {
            const name = addToItineraryTarget?.name ?? 'this activity'
            const experienceId = addToItineraryTarget?.id
            setAddToItineraryTarget(null)
            setCloseReelsSignal((n) => n + 1)
            // Hand off to the AI concierge with a prefilled, auto-triggered
            // prompt — the agent places the activity on the chosen day. No
            // time-picker step: the user just picks the day.
            // ``experienceIds`` rides input_data.experience_ids (the "+ Add"
            // fast path) so the BE adds the known experience without re-search.
            const prompt = `Add "${name}" to Day ${dayNumber} (${dayDate}) of my itinerary.`
            void triggerAssistantPrompt(prompt, experienceId ? { experienceIds: [experienceId] } : undefined)
        },
        [addToItineraryTarget]
    )

    // First itinerary day per city, used to re-anchor orphan experiences (no
    // matching slot on the itinerary) so they cluster under their city's live
    // chip instead of creating phantom chips from stale ``metadata.start_date``.
    // Earlier behaviour fell back to the section metadata for orphans, which
    // surfaced pre-mutation dates (e.g. a "Kuala Lumpur Jun 18" chip alongside
    // the current "Kuala Lumpur Jul 1" after the user shifted the trip). The
    // metadata is a snapshot frozen at section-create time and isn't synced —
    // the city's live day date is the only reliable anchor for orphans.
    const cityFirstDateMap = useMemo(() => {
        const map = new Map<string, string>()
        if (!itineraryDays) return map
        for (const day of itineraryDays) {
            const cityId = day.base_city?.id
            if (!cityId || map.has(cityId)) continue
            const dayDate = typeof day.date === 'string' ? day.date.split('T')[0] : new Date(day.date).toISOString().split('T')[0]
            map.set(cityId, dayDate)
        }
        return map
    }, [itineraryDays])

    // Resolve original date for an experience.
    //
    // Resolution chain:
    //   1. Itinerary slot match by entity_id → that slot's day date (source
    //      of truth for matched experiences — auto-tracks itinerary
    //      shifts/inserts without any BE sync).
    //   2. City's first itinerary day → re-anchors orphan shortlist entries
    //      so they show up on the city's live chip rather than as ghost
    //      chips at the metadata's stale date.
    //   3. ``null`` → dateless. The chip carousel collapses dateless entries
    //      under their city group; ``metadata.start_date`` is intentionally
    //      ignored here because it's a stale snapshot that produced the
    //      phantom-chip bug.
    const getOriginalDate = useCallback(
        (exp: { id: string; city_id?: string; start_date?: string | null }): string | null => {
            const fromItinerary = itineraryDateByEntityId.get(exp.id)
            if (fromItinerary) return fromItinerary
            if (exp.city_id) {
                const fromCity = cityFirstDateMap.get(exp.city_id)
                if (fromCity) return fromCity
            }
            return null
        },
        [itineraryDateByEntityId, cityFirstDateMap]
    )

    const [searchParams, setSearchParams] = useSearchParams()
    const queryClient = useQueryClient()
    const isMobile = useIsMobile()
    // `isLoading` tracks the auth-init flight. Until it resolves,
    // `isAuthenticated` is `false` even for users who ARE logged in
    // (it's computed as `!!user && isInitialized`). Without gating on
    // `isLoading`, the shortlist deep-link effect below would briefly see
    // `isAuthenticated === false` on first render and pop the login modal
    // for an already-logged-in user.
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth()
    const { openLoginModal } = useLoginModal()
    // Mobile: collapse secondary controls (toggle/map/browse) on scroll-down;
    // primary city/date chip row stays pinned.
    const hideSecondaryHeader = useHideOnScrollDown()

    // Explore / Shortlist / In-Your-Itinerary subtab, URL-persisted via
    // `activities_view`. Unauthenticated viewers can't load the shortlist
    // API, so we force them back to Explore and pop the login modal in
    // the effect below. Curator-shared (readOnly) skips the auth gate
    // since shortlist there just renders the public itinerary sections.
    //
    // Legacy URL value `in_itinerary` means the Explore subview — kept
    // for backward compatibility. The new In-Your-Itinerary tab uses
    // `my_itinerary`.
    const activitiesViewMode: 'in_itinerary' | 'shortlisted' | 'my_itinerary' = useMemo(() => {
        if (!showShortlistToggle) return 'in_itinerary'
        const raw = searchParams.get('activities_view')
        if (raw === 'shortlisted') {
            if (!readOnlyShortlist && !isAuthenticated) return 'in_itinerary'
            return 'shortlisted'
        }
        if (raw === 'my_itinerary') return 'my_itinerary'
        if (raw === 'in_itinerary') return 'in_itinerary'
        return defaultActivitiesView
    }, [showShortlistToggle, searchParams, isAuthenticated, defaultActivitiesView, readOnlyShortlist])

    // If the URL deep-links to `shortlisted` while logged out, prompt login.
    // Wait for auth-init to settle (`isAuthLoading === false`) before deciding
    // — otherwise the first render sees `isAuthenticated === false` for users
    // who ARE logged in and the modal pops over an authed session.
    useEffect(() => {
        if (!showShortlistToggle) return
        if (readOnlyShortlist) return
        if (searchParams.get('activities_view') !== 'shortlisted') return
        if (isAuthLoading) return
        if (isAuthenticated) return
        openLoginModal({ redirectAfterLogin: false, buttonPage: 'tripboard_v1' })
    }, [showShortlistToggle, searchParams, isAuthenticated, isAuthLoading, openLoginModal, readOnlyShortlist])
    const setActivitiesViewMode = useCallback(
        (next: 'in_itinerary' | 'shortlisted' | 'my_itinerary') => {
            // Shortlist API is auth-only; readOnly skips the API entirely.
            if (next === 'shortlisted' && !isAuthenticated && !readOnlyShortlist) {
                openLoginModal({ redirectAfterLogin: false, buttonPage: 'tripboard_v1' })
                return
            }
            const params = new URLSearchParams(searchParams)
            params.set('activities_view', next)
            // Shortlist subtab opens with the map visible (user can re-hide).
            if (next === 'shortlisted') params.delete('act_map')
            setSearchParams(params, { replace: true })
        },
        [searchParams, setSearchParams, isAuthenticated, openLoginModal, readOnlyShortlist]
    )

    // Reset the page scroll whenever the user flips between Activities
    // subtabs — otherwise the position from the previous tab persists
    // (scroll deep in Shortlist, switch to Explore, you'd land mid-page).
    // Done twice: synchronously and on the next animation frame so we
    // beat react-router's scroll restoration, exactly like the See-All
    // landing in ActivitiesExploreView.
    useEffect(() => {
        if (!showShortlistToggle) return
        const reset = () => {
            window.scrollTo({ top: 0, behavior: 'auto' })
            if (document.scrollingElement) document.scrollingElement.scrollTop = 0
            document.querySelectorAll<HTMLElement>('*').forEach((el) => {
                if (el.scrollTop > 0) {
                    const overflowY = window.getComputedStyle(el).overflowY
                    if (overflowY === 'auto' || overflowY === 'scroll') el.scrollTop = 0
                }
            })
        }
        reset()
        const raf = window.requestAnimationFrame(reset)
        return () => window.cancelAnimationFrame(raf)
    }, [activitiesViewMode, showShortlistToggle])

    // Bulk-select operates on section ids — meaningless when the view reads
    // from itinerary slots. Hide the controls in itinerary mode and exit any
    // active bulk-select on entry so stale selections don't apply when the
    // user toggles back to Shortlisted.
    const isItineraryView = showShortlistToggle && activitiesViewMode === 'in_itinerary'
    const showBulkSelectionControls = Boolean(bulkSelection) && !isItineraryView
    useEffect(() => {
        // Gate on isActive: TripboardPage mounts every tab simultaneously
        // (display:none). The `bulkSelection` config is SHARED across tabs,
        // so a hidden ExperienceTab in itinerary view would otherwise call
        // onToggleBulkSelectMode the moment ANOTHER tab (Stays / Restaurant)
        // turned bulk-select on — flipping it straight back off and producing
        // the split-second "Select → Cancel → Select" flash.
        if (!isActive) return
        if (isItineraryView && bulkSelectMode) {
            onToggleBulkSelectMode?.()
        }
    }, [isActive, isItineraryView, bulkSelectMode, onToggleBulkSelectMode])
    const { trackButtonClickCustom } = usePostHog()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip

    // Experiences scoped to the active view.
    //
    // Source-switch by view mode:
    //   - Any Tripboard Activities subview (Explore / Shortlist / My-Itinerary):
    //     read from `inItineraryExperiences` so the city/date chip carousel
    //     is identical across the three tabs. (Previously Shortlist used the
    //     section-derived `experiences`, which yielded a different chip set.)
    //     `ShortlistedActivitiesView` owns its own card list — the chips
    //     here only drive the city header.
    //   - Curator-shared (readOnly): use the collection's experiences as-is.
    //   - Curation / no toggle: read from `experiences` (section-derived).
    const experiencesInView = useMemo(() => {
        // Shortlist subview shows everything in the shortlist — no itinerary intersect.
        if (showShortlistToggle && activitiesViewMode === 'shortlisted') {
            return experiences
        }
        // Curator-shared pages: collection IS the itinerary; skip the intersect.
        if (readOnlyShortlist) return experiences
        // Itinerary slots are authoritative when a trip is bound; collection
        // sections are a sparse curation overlay.
        if (inItineraryExperiences && inItineraryExperiences.length > 0) {
            return inItineraryExperiences
        }
        if (!showShortlistToggle) return experiences
        if (!itineraryDays || itineraryDays.length === 0) return experiences
        return experiences.filter((exp) => itineraryDateByEntityId.has(exp.id))
    }, [
        experiences,
        inItineraryExperiences,
        showShortlistToggle,
        activitiesViewMode,
        itineraryDays,
        itineraryDateByEntityId,
        readOnlyShortlist,
    ])

    // ── City-date group selection via clean URL params ──
    // Stored as: act_city=<id>&act_checkin=2026-05-20&act_checkout=2026-05-22
    const selectedCityId = useMemo(() => searchParams.get(ACTIVITIES_PARAMS.city) || null, [searchParams])

    // Activities tab Explore "Explore more cities" affordance — opens the
    // shared city picker seeded with every city across the trip's countries.
    const [isExploreCityModalOpen, setIsExploreCityModalOpen] = useState(false)
    const tripCountryIds = useMemo(() => {
        const fromActive = (activeTrip?.final_destination_countries ?? [])
            .map((c: { id?: string } | string) => (typeof c === 'string' ? c : c?.id))
            .filter((id): id is string => !!id)
        if (fromActive.length > 0) return fromActive
        // Fallback to the single country surfaced via props so the modal
        // still has scope when the trip's destinations aren't denormalised.
        return exploreCountryId ? [exploreCountryId] : []
    }, [activeTrip?.final_destination_countries, exploreCountryId])

    // (`exploreCityCountryIds` is computed below, once `selectedCountryId`
    // — the country the user is actively exploring on a multi-country trip —
    // is resolved, so the picker follows the country switcher.)
    // Track how many date groups should load tours (for pagination) - simple numeric count
    const INITIAL_LOAD = 3
    const LOAD_MORE_STEP = 3
    const [loadedGroupCount, setLoadedGroupCount] = useState<number>(INITIAL_LOAD)
    const [isLoadingMoreTours, setIsLoadingMoreTours] = useState(false)
    const sentinelRef = useRef<HTMLDivElement>(null)
    const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Get user info to check user type
    const { isRimigoInternal } = useUserInfo()

    // Determine if we should show dates - only for premium and rimigo internal users
    // Regular users (authenticated but not premium/rimigo) should not see dates
    // const isRegularUser = isAuthenticated && !isPremium && !isRimigoInternal
    // Get shortlist state and handlers from context
    const shortlistedExperiencesContext = useOptionalShortlistedExperiences()
    const shortlistState = shortlistedExperiencesContext?.shortlistState ?? {}
    const handleShortlistToggle = shortlistedExperiencesContext?.handleShortlistToggle
    const shortlistLoadingIds = shortlistedExperiencesContext?.shortlistLoadingIds ?? {}

    // State for date edit modal
    const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null)
    const [isSavingDates, setIsSavingDates] = useState(false)
    const [editingStartDate, setEditingStartDate] = useState<string | null | undefined>(null)
    const [editingEndDate, setEditingEndDate] = useState<string | null | undefined>(null)

    // State for add experience modal
    const [isAddExperienceModalOpen, setIsAddExperienceModalOpen] = useState(false)

    // Slot-remove for the "In your itinerary" view. The hook accepts trip /
    // itinerary ids unconditionally — gate the trigger below on both being
    // present + the slot existing on `experienceSlotMap`. Triggered through
    // the per-card delete affordance.
    const deleteSlotMutation = useDeleteSlot(tripId ?? '', itineraryId ?? '')
    const handleDeleteExperienceFromItinerary = useCallback(
        (experienceId: string) => {
            if (!tripId || !itineraryId) {
                toast.error('Trip not loaded — try refreshing.')
                return
            }
            const slotId = experienceSlotMap?.get(experienceId)
            if (!slotId) {
                toast.error('Could not find this activity on the itinerary.')
                return
            }
            deleteSlotMutation.mutate(
                { slotId },
                {
                    onSuccess: () => {
                        toast.success('Removed from itinerary')
                        queryClient.invalidateQueries({ queryKey: ['itineraryCompleted', itineraryId] })
                        queryClient.invalidateQueries({ queryKey: ['tripBudget'] })
                        queryClient.invalidateQueries({ queryKey: ['traveler-collection', collectionIdentifier] })
                        queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier] })
                    },
                    onError: (err: unknown) => {
                        const msg =
                            (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                            (err as { message?: string })?.message ||
                            'Failed to remove from itinerary'
                        toast.error(msg)
                    }
                }
            )
        },
        [tripId, itineraryId, experienceSlotMap, deleteSlotMutation, queryClient, collectionIdentifier]
    )

    // Helper function to get corrected date (handles past dates)
    const getCorrectedDate = useCallback((dateStr: string | null | undefined): string | null => {
        if (!dateStr) return null

        const formattedDate = formatDateStringToYMD(dateStr)
        if (!formattedDate) return null

        // Check if date is in the past, if so use tomorrow
        if (isPastDate(formattedDate)) {
            return getTomorrowDate()
        }
        return formattedDate
    }, [])

    // Handle opening date edit modal
    const handleEditDateClick = useCallback(
        (experienceId: string) => {
            const experience = experiences.find((exp) => exp.id === experienceId)
            trackButtonClickCustom?.({
                buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
                buttonName: POSTHOG_EVENTS.EXPERIENCE_EDIT_DATE_CLICK,
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: {
                    experienceId
                }
            })
            if (experience) {
                setEditingExperienceId(experienceId)
                // Use corrected dates (handling past dates) to match what's shown in the section heading
                // If no date is present, use tomorrow's date as default. Routes through
                // ``getOriginalDate`` so the modal pre-fills from the itinerary slot day
                // (source of truth) rather than the section's stale metadata cache.
                const correctedStartDate = getCorrectedDate(getOriginalDate(experience)) || getTomorrowDate()
                const correctedEndDate = experience.end_date ? getCorrectedDate(experience.end_date) : null
                setEditingStartDate(correctedStartDate)
                setEditingEndDate(correctedEndDate)
            }
        },
        [experiences, getCorrectedDate, getOriginalDate]
    )

    // Helper function to get the canonical date for an experience.
    // Falls back to tomorrow if no date is available or if date is in the past.
    const getDateForExperience = useCallback(
        (experience: ExperienceCardData): string => {
            // Prefer the resolved start (itinerary slot day → metadata fallback),
            // then the section's stored end_date, then tomorrow.
            const dateStr = getOriginalDate(experience) || experience.end_date
            const correctedDate = getCorrectedDate(dateStr)
            if (correctedDate) {
                return correctedDate
            }

            // Default to tomorrow's date (instead of today)
            return getTomorrowDate()
        },
        [getCorrectedDate, getOriginalDate]
    )

    // Local Day 1 for this tab: earliest start_date across experiences in view
    // (self-contained, no itinerary dependency). Uses ``experiencesInView``
    // so the anchor honours the "In your itinerary" filter — otherwise an
    // orphan with a stale early date could anchor Day 1 below the user's
    // actual trip start.
    const localTripStartDate = useMemo(() => {
        if (!hideExactDates) return tripStartDate || null
        let earliest: string | null = null
        for (const exp of experiencesInView) {
            const d = getOriginalDate(exp)
            if (d && (!earliest || d < earliest)) earliest = d
        }
        return earliest
    }, [hideExactDates, experiencesInView, getOriginalDate, tripStartDate])

    // City groups for the filter carousel. Activities chips show CITY ONLY —
    // no dates / day labels — and one chip per city (deduped). The builder can
    // emit several groups for the same city (one per date); we collapse them to
    // a single dateless chip so the header lists each city exactly once.
    const experienceCityDateGroups = useMemo(() => {
        // Pass ``getOriginalDate`` so the underlying grouping keys off the
        // itinerary slot's day (source of truth) rather than the section's
        // stale ``metadata.start_date`` cache. Built from ``experiencesInView``
        // so chips reflect the active view.
        const groups = buildCityDateGroupsFromExperiences(experiencesInView, getCorrectedDate, getOriginalDate)
        const cityMap = new Map<string, { cityId: string; cityName: string }>()
        for (const group of groups) {
            if (!cityMap.has(group.cityId)) cityMap.set(group.cityId, { cityId: group.cityId, cityName: group.cityName })
        }
        return [...cityMap.values()].map((c) => ({ key: `${c.cityId}::`, cityId: c.cityId, cityName: c.cityName, dateLabel: '' }))
    }, [experiencesInView, getCorrectedDate, getOriginalDate])

    // ── Shortlist tab city chips ──────────────────────────────────────────
    // The Shortlist subview can include experiences shortlisted in cities the
    // user explored but never added to the itinerary. Filtering is by city
    // NAME — the shortlist API groups results by name, not id. `null` means
    // no city filter (the "Overview" tab — every shortlisted activity).
    // `shortlistChipGroups` itself is built AFTER the country layer below so
    // it can scope to the selected country.
    const SHORTLIST_ALL_KEY = '__all__'
    const isShortlistView = showShortlistToggle && activitiesViewMode === 'shortlisted'
    const [shortlistCityNames, setShortlistCityNames] = useState<string[]>([])
    const [selectedShortlistCity, setSelectedShortlistCity] = useState<string | null>(null)
    // Count of shortlisted cards visible for the selected shortlist city,
    // reported up by ShortlistedActivitiesView. Drives the per-city heart
    // count + banner gating below.
    const [shortlistVisibleCount, setShortlistVisibleCount] = useState(0)

    // ── Country layer (Tripboard Activities tab) ──
    // The chip row leads with a country DROPDOWN (grey-5 tile) followed by
    // an "Overview" tab and the selected country's city chips — all on one
    // row, no header swap. Overview selected → country-scoped content (the
    // /experiences-style overview); a city chip selected → the familiar
    // per-city Explore content. Single-country trips get the same layer
    // (one-item dropdown) so the header reads identically across trips.

    // Moved up from the external-city block below: the country overview
    // must yield to the external-city header, so the flag is needed here.
    // When the user picks a city from "Explore more cities" that ISN'T in
    // their itinerary, the chip row swaps to a back-arrow + city card.
    const exploreCityName = searchParams.get('act_explore_city_name')
    const isExploringExternalCity = useMemo(() => {
        if (!exploreCityName || !selectedCityId) return false
        // If the URL's act_city matches one of the itinerary groups, the
        // user is browsing an itinerary city — the alternate header is
        // for cities that aren't on the trip yet.
        return !experienceCityDateGroups.some((g) => g.cityId === selectedCityId)
    }, [exploreCityName, selectedCityId, experienceCityDateGroups])

    // ``city_id → country label`` from itinerary days. The BE's country
    // field is a free string (typically the name); we store it lowercased
    // and later match against BOTH the trip country's name and id so a
    // BE switch to ids degrades gracefully instead of breaking the drill.
    const cityCountryLabelById = useMemo(() => {
        const map = new Map<string, string>()
        // 1) Each day's base/destination city carries the day's country.
        for (const day of itineraryDays ?? []) {
            const city = day.base_city || day.destination_city
            const countryLabel = city?.country?.trim().toLowerCase()
            if (city?.id && countryLabel && !map.has(city.id)) map.set(city.id, countryLabel)
        }
        // 2) Cities that never appear as a base city (e.g. a Pattaya
        //    day-trip activity on a Bangkok-based day) inherit the country
        //    of the day their activity is scheduled on. Without this the
        //    city is unmappable and leaked into other countries' chip rows.
        const expCityById = new Map<string, string>()
        for (const exp of experiencesInView) {
            if (exp.id && exp.city_id) expCityById.set(exp.id, exp.city_id)
        }
        for (const day of itineraryDays ?? []) {
            const city = day.base_city || day.destination_city
            const countryLabel = city?.country?.trim().toLowerCase()
            if (!countryLabel) continue
            for (const slot of day.slots || []) {
                if (!slot.entity_id) continue
                const expCityId = expCityById.get(slot.entity_id)
                if (expCityId && !map.has(expCityId)) map.set(expCityId, countryLabel)
            }
        }
        return map
    }, [itineraryDays, experiencesInView])

    // Country chips, shaped as CityDateGroup so CityDateFilterCarousel is
    // reused verbatim — cityId/cityName carry the country's id/name. No
    // dateLabel: the dropdown shows the country name only, per spec.
    const countryGroups = useMemo(() => {
        if (!showShortlistToggle) return []
        const countries = (activeTrip?.final_destination_countries ?? [])
            .map((c: { id?: string; name?: string } | string) => (typeof c === 'string' ? null : c))
            .filter((c): c is { id: string; name: string } => !!c?.id && !!c?.name)
        if (countries.length === 0) return []
        // First itinerary day per country label — drives itinerary ordering.
        // The BE's country field is a free string (typically the name), so
        // match against BOTH the trip country's name and id.
        const startDayByLabel = new Map<string, number>()
        ;(itineraryDays ?? []).forEach((day, i) => {
            const city = day.base_city || day.destination_city
            const label = city?.country?.trim().toLowerCase()
            if (label && !startDayByLabel.has(label)) startDayByLabel.set(label, i + 1)
        })
        const startDayFor = (c: { id: string; name: string }) =>
            startDayByLabel.get(c.name.trim().toLowerCase()) ?? startDayByLabel.get(c.id.toLowerCase()) ?? Number.MAX_SAFE_INTEGER
        return countries
            .map((c) => ({ key: c.id, cityId: c.id, cityName: c.name, dateLabel: '' }))
            // Itinerary order; countries with no matched days trail behind.
            .sort((a, b) => startDayFor({ id: a.cityId, name: a.cityName }) - startDayFor({ id: b.cityId, name: b.cityName }))
    }, [showShortlistToggle, activeTrip?.final_destination_countries, itineraryDays])

    // Single- AND multi-country trips render the country layer; the flag is
    // false only when the trip has no resolvable countries (or the caller
    // isn't the Tripboard Activities tab).
    const hasCountryLayer = countryGroups.length > 0

    // Selected country: URL first, else the itinerary's first country.
    const selectedCountryId = useMemo(() => {
        if (!hasCountryLayer) return null
        const fromUrl = searchParams.get(ACT_COUNTRY_PARAM)
        if (fromUrl && countryGroups.some((g) => g.cityId === fromUrl)) return fromUrl
        return countryGroups[0]?.cityId ?? null
    }, [hasCountryLayer, searchParams, countryGroups])
    const selectedCountryGroup = useMemo(
        () => countryGroups.find((g) => g.cityId === selectedCountryId) ?? null,
        [countryGroups, selectedCountryId]
    )
    // A city chip is selected (vs the "Overview" tab). The Overview tab is
    // the resting state whenever the country layer renders; the
    // external-city header takes precedence — it already owns the chip row.
    const isCityChipSelected = hasCountryLayer && searchParams.get(ACT_CMODE_PARAM) === 'cities'
    const showCountryOverview = hasCountryLayer && !isCityChipSelected && !isExploringExternalCity

    // "Explore more cities" is scoped to the country the user is currently
    // exploring — not just the trip's first destination. On a multi-country
    // trip that's `selectedCountryId` (driven by the country switcher), so
    // switching from Italy → France re-scopes the picker to France. Single-
    // country falls back to the prop country, then to all trip countries so
    // the picker is never empty.
    const exploreCityCountryIds = useMemo(() => {
        const selected = selectedCountryId ?? countryId ?? exploreCountryId
        return selected ? [selected] : tripCountryIds
    }, [selectedCountryId, countryId, exploreCountryId, tripCountryIds])

    // City chips visible in the carousel — scoped to the selected country
    // on multi-country trips, the full set otherwise. Unmapped cities are
    // HIDDEN from the scoped rows (showing them under every country leaked
    // e.g. Pattaya into Dubai's row); the country-inheritance pass above
    // makes unmapped cities rare. If NO city maps at all (BE not sending
    // country labels), scoping is impossible — show everything rather
    // than an empty chip row.
    const visibleCityDateGroups = useMemo(() => {
        if (!hasCountryLayer || !selectedCountryGroup) return experienceCityDateGroups
        if (cityCountryLabelById.size === 0) return experienceCityDateGroups
        const nameKey = selectedCountryGroup.cityName.trim().toLowerCase()
        const idKey = selectedCountryGroup.cityId.toLowerCase()
        return experienceCityDateGroups.filter((g) => {
            const cityCountry = cityCountryLabelById.get(g.cityId)
            return cityCountry === nameKey || cityCountry === idKey
        })
    }, [hasCountryLayer, selectedCountryGroup, experienceCityDateGroups, cityCountryLabelById])

    // Shortlist chips MERGE the country-scoped itinerary cities with the
    // extra cities reported up by ShortlistedActivitiesView. The shared
    // "Overview" tab plays the old "All" chip's role now, keeping the strip
    // identical to the Explore subview — the "All" chip only returns as a
    // fallback when the country layer can't render (no resolvable trip
    // countries), so the user can always clear the city filter. Extra
    // shortlist-only cities can't be mapped to a country (the shortlist API
    // reports names only), so they stay visible under every country EXCEPT
    // when the name matches an itinerary city of another country.
    const shortlistChipGroups = useMemo(() => {
        const names: string[] = []
        const seen = new Set<string>()
        const push = (n?: string) => {
            const key = n?.trim().toLowerCase()
            if (n && key && !seen.has(key)) {
                seen.add(key)
                names.push(n)
            }
        }
        // Itinerary cities first (trip order), scoped to the selected country.
        visibleCityDateGroups.forEach((g) => push(g.cityName))
        // Names that belong to itinerary cities of OTHER countries are
        // excluded so e.g. Bangkok doesn't surface under Dubai's row.
        const namesInOtherCountries = new Set(
            experienceCityDateGroups
                .filter((g) => !visibleCityDateGroups.some((v) => v.cityId === g.cityId))
                .map((g) => g.cityName.trim().toLowerCase())
        )
        shortlistCityNames.filter((n) => !namesInOtherCountries.has(n.trim().toLowerCase())).forEach((n) => push(n))
        const chips = names.map((n) => ({ key: n, cityId: '', cityName: n, dateLabel: '' }))
        if (!hasCountryLayer) chips.unshift({ key: SHORTLIST_ALL_KEY, cityId: '', cityName: 'All', dateLabel: '' })
        return chips
    }, [hasCountryLayer, visibleCityDateGroups, experienceCityDateGroups, shortlistCityNames])

    // If the selected shortlist city disappears (e.g. its last activity was
    // un-shortlisted, or the country scope changed), fall back to the
    // Overview tab so the filter never strands the user on an empty list.
    useEffect(() => {
        if (selectedShortlistCity && !shortlistChipGroups.some((g) => g.key === selectedShortlistCity)) {
            setSelectedShortlistCity(null)
        }
    }, [selectedShortlistCity, shortlistChipGroups])

    // Country dropdown change → reset to that country's Overview tab. City
    // params are wiped so no stale city selection leaks into the new scope;
    // the shortlist city filter resets for the same reason.
    const handleCountrySelect = useCallback(
        (countryIdNext: string) => {
            trackButtonClickCustom?.({
                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                buttonName: 'activities_country_switch',
                buttonAction: 'click',
                extra: { country_id: countryIdNext }
            })
            setSelectedShortlistCity(null)
            const next = new URLSearchParams(searchParams)
            next.set(ACT_COUNTRY_PARAM, countryIdNext)
            next.delete(ACT_CMODE_PARAM)
            next.delete(ACTIVITIES_PARAMS.city)
            next.delete(ACTIVITIES_PARAMS.checkIn)
            next.delete(ACTIVITIES_PARAMS.checkOut)
            next.delete('act_day')
            next.delete('act_explore_city_name')
            setSearchParams(next, { replace: true })
        },
        [searchParams, setSearchParams, trackButtonClickCustom]
    )

    // "Overview" tab click → country-scoped content. Keeps act_country.
    const handleOverviewSelect = useCallback(() => {
        if (showCountryOverview) return
        trackButtonClickCustom?.({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: 'activities_overview_tab_click',
            buttonAction: 'click'
        })
        const next = new URLSearchParams(searchParams)
        next.delete(ACT_CMODE_PARAM)
        next.delete(ACTIVITIES_PARAMS.city)
        next.delete(ACTIVITIES_PARAMS.checkIn)
        next.delete(ACTIVITIES_PARAMS.checkOut)
        next.delete('act_day')
        next.delete('act_explore_city_name')
        setSearchParams(next, { replace: true })
    }, [showCountryOverview, searchParams, setSearchParams, trackButtonClickCustom])

    // The Overview tab is shared by Explore and Shortlist so the strip reads
    // identically across subviews. On Shortlist it plays the old "All"
    // chip's role — clearing the city-name filter — and never touches the
    // URL params that drive the Explore overview.
    const isOverviewTabActive = isShortlistView ? selectedShortlistCity === null : showCountryOverview
    const handleOverviewTabClick = useCallback(() => {
        if (isShortlistView) {
            setSelectedShortlistCity(null)
            return
        }
        handleOverviewSelect()
    }, [isShortlistView, handleOverviewSelect])

    // Reset scroll when crossing the Overview↔city boundary or switching
    // countries — the content swaps wholesale, so keeping the old scroll
    // depth strands the user mid-page. Mirrors the subtab-switch reset above.
    useEffect(() => {
        if (!hasCountryLayer) return
        const reset = () => {
            window.scrollTo({ top: 0, behavior: 'auto' })
            if (document.scrollingElement) document.scrollingElement.scrollTop = 0
            // Also clear the inner tab scroller (the Tripboard content has its
            // own overflow-y-auto container) — without this, drilling from the
            // Top Cities carousel into a city keeps the previous scroll depth.
            document.querySelectorAll<HTMLElement>('*').forEach((el) => {
                if (el.scrollTop > 0) {
                    const overflowY = window.getComputedStyle(el).overflowY
                    if (overflowY === 'auto' || overflowY === 'scroll') el.scrollTop = 0
                }
            })
        }
        reset()
        const raf = window.requestAnimationFrame(reset)
        return () => window.cancelAnimationFrame(raf)
    }, [hasCountryLayer, showCountryOverview, selectedCountryId, isExploringExternalCity, selectedCityId])

    // Reconstruct group key from clean URL params (act_city, act_checkin, act_checkout).
    // Reads from ``visibleCityDateGroups`` so a drilled country resolves to
    // ITS first city, not the global first chip.
    const effectiveSelectedGroupKey = useMemo(() => {
        if (visibleCityDateGroups.length === 0) return null
        // When hiding dates, use act_day param to distinguish same-city segments
        if (hideExactDates) {
            const cityParam = searchParams.get(ACTIVITIES_PARAMS.city)
            const dayParam = searchParams.get('act_day')
            // 1) Exact (city + day) match — preferred.
            if (cityParam && dayParam) {
                const exact = visibleCityDateGroups.find((g) => g.cityId === cityParam && g.dateLabel === dayParam)
                if (exact) return exact.key
            }
            // 2) City-only fallback — required when the page-level city switcher
            //    writes a new `act_city` but the existing `act_day` belongs to
            //    the previous city. Without this we'd fall through to the
            //    global first group and the switcher would appear to snap back.
            if (cityParam) {
                const cityFallback = visibleCityDateGroups.find((g) => g.cityId === cityParam)
                if (cityFallback) return cityFallback.key
            }
            return visibleCityDateGroups[0]?.key ?? null
        }
        const matched = findGroupKeyFromParams(searchParams, ACTIVITIES_PARAMS, visibleCityDateGroups, formatCompactDateRange)
        if (matched) return matched
        return visibleCityDateGroups[0]?.key ?? null
    }, [visibleCityDateGroups, searchParams, hideExactDates])

    // Keep activities URL params in sync with the currently effective group.
    // This handles first load and filter-driven group/date changes.
    useEffect(() => {
        // Country overview: no city is selected by design — auto-writing
        // act_city here would immediately fight the overview's country-wide
        // scope (and a stale act_city from an old deep link is simply
        // ignored until the user drills in).
        if (showCountryOverview) return
        if (visibleCityDateGroups.length === 0) return
        // If the URL already has an `act_city` set but it doesn't correspond to
        // any group (e.g. the page-level city switcher selected a city that
        // has no activities yet), DO NOT auto-rewrite the URL — that would
        // snap the user back to the first activity-bearing city. Leave the
        // user's selection in place; `filteredExperiences` will naturally
        // produce an empty list and the empty state will render.
        const urlActCity = searchParams.get(ACTIVITIES_PARAMS.city)
        if (urlActCity && !visibleCityDateGroups.some((g) => g.cityId === urlActCity)) {
            return
        }
        const selectedGroup = visibleCityDateGroups.find((g) => g.key === effectiveSelectedGroupKey) ?? visibleCityDateGroups[0]
        if (!selectedGroup) return

        const next = new URLSearchParams(searchParams)
        next.delete('activities_group')

        // Find experience matching both city AND dateLabel for correct dates.
        // All date reads route through ``getOriginalDate`` so matching uses
        // the itinerary slot day (source of truth) rather than the section's
        // stored metadata cache.
        const matchingExp = hideExactDates
            ? experiencesInView.find((e) => e.city_id === selectedGroup.cityId)
            : experiencesInView.find((e) => {
                  if (e.city_id !== selectedGroup.cityId) return false
                  const corrStart = getCorrectedDate(getOriginalDate(e)) || undefined
                  // Match the chip's label format — start-only, no end_date
                  // (experience sections' end_date is a stale metadata cache).
                  return formatCompactDateRange(corrStart, undefined) === selectedGroup.dateLabel
              })
        const checkIn = matchingExp ? getCorrectedDate(getOriginalDate(matchingExp)) : null
        if (hideExactDates) {
            next.set(ACTIVITIES_PARAMS.city, selectedGroup.cityId)
            // Deduped (label-less) chips carry no day segment — drop the
            // param instead of writing an empty value.
            if (selectedGroup.dateLabel) next.set('act_day', selectedGroup.dateLabel)
            else next.delete('act_day')
            next.delete(ACTIVITIES_PARAMS.checkIn)
            next.delete(ACTIVITIES_PARAMS.checkOut)
        } else {
            next.delete('act_day')
            // Activity chips use a single (start-only) date label, so write
            // only check-in to the URL. Writing check-out would make
            // ``findGroupKeyFromParams`` reconstruct a range label that
            // wouldn't match the chip's start-only label.
            writeGroupToParams(next, ACTIVITIES_PARAMS, selectedGroup.cityId, checkIn || undefined, undefined)
        }

        if (next.toString() !== searchParams.toString()) {
            setSearchParams(next, { replace: true })
        }
    }, [
        visibleCityDateGroups,
        showCountryOverview,
        effectiveSelectedGroupKey,
        searchParams,
        setSearchParams,
        experiencesInView,
        getCorrectedDate,
        getOriginalDate,
        hideExactDates
    ])

    // Filter experiences based on selected city+date group
    const filteredExperiences = useMemo(() => {
        if (!effectiveSelectedGroupKey) return []
        // Parse cityId from group key (format: "cityId::dateLabel")
        const selectedGroup = visibleCityDateGroups.find((g) => g.key === effectiveSelectedGroupKey)
        if (!selectedGroup) return []
        // When using itinerary segments, filter by entity_ids from the selected day range
        if (hideExactDates) {
            if (itineraryDays && itineraryDays.length > 0 && selectedGroup.dateLabel) {
                // Parse day range: "Day 2 - Day 5" → [2, 5], "Day 9" → [9, 9]
                const dayMatch = selectedGroup.dateLabel.match(/Day\s+(\d+)(?:\s*-\s*Day\s+(\d+))?/)
                if (dayMatch) {
                    const startDay = parseInt(dayMatch[1])
                    const endDay = dayMatch[2] ? parseInt(dayMatch[2]) : startDay
                    const entityIds = new Set<string>()
                    for (let d = startDay; d <= endDay && d <= itineraryDays.length; d++) {
                        for (const slot of itineraryDays[d - 1]?.slots || []) {
                            if (slot.entity_id && slot.kind === 'experience') entityIds.add(slot.entity_id)
                        }
                    }
                    if (entityIds.size > 0) {
                        return experiencesInView.filter((exp) => entityIds.has(exp.id))
                    }
                }
            }
            // Fallback: city only (no itinerary or couldn't parse)
            return experiencesInView.filter((exp) => exp.city_id === selectedGroup.cityId)
        }
        return experiencesInView.filter((exp) => {
            if (exp.city_id !== selectedGroup.cityId) return false
            if (!selectedGroup.dateLabel) return true
            const correctedStart = getCorrectedDate(getOriginalDate(exp)) || undefined
            // Match the chip's start-only label.
            return formatCompactDateRange(correctedStart, undefined) === selectedGroup.dateLabel
        })
    }, [experiencesInView, effectiveSelectedGroupKey, visibleCityDateGroups, getCorrectedDate, getOriginalDate, hideExactDates, itineraryDays])

    const bulkVisibleExperienceSectionIds = useMemo(() => {
        const seen = new Set<string>()
        const ids: string[] = []
        for (const exp of filteredExperiences) {
            const sid = experienceSectionMap?.get(exp.id)
            if (sid && !seen.has(sid)) {
                seen.add(sid)
                ids.push(sid)
            }
        }
        return ids
    }, [filteredExperiences, experienceSectionMap])

    // Handle saving dates — bulk-updates ALL experiences in the same city+date group
    const handleSaveDates = useCallback(
        async (startDate: string | null, endDate: string | null) => {
            trackButtonClickCustom?.({
                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                buttonName: 'experience_date_save',
                buttonAction: 'submit',
                extra: { count: filteredExperiences.length }
            })
            if (!editingExperienceId || !experienceSectionMap || !collectionIdentifier) return

            setIsSavingDates(true)
            try {
                const sectionIdsToUpdate: string[] = []

                if (effectiveSelectedGroupKey) {
                    filteredExperiences.forEach((exp) => {
                        const sid = experienceSectionMap.get(exp.id)
                        if (sid) sectionIdsToUpdate.push(sid)
                    })
                }

                // Fallback: at minimum update the editing experience
                if (sectionIdsToUpdate.length === 0) {
                    const sid = experienceSectionMap.get(editingExperienceId)
                    if (sid) sectionIdsToUpdate.push(sid)
                }

                if (sectionIdsToUpdate.length === 0) {
                    toast.error('Section ID not found for this experience')
                    return
                }

                // Build metadata updates preserving existing fields
                const updates = sectionIdsToUpdate.map((sectionId) => {
                    const existing = sectionMetadataMap?.get(sectionId)
                    const metadata: Record<string, unknown> = existing ? { ...existing } : {}
                    metadata.start_date = startDate || null
                    metadata.end_date = endDate || null
                    return { sectionId, metadata }
                })

                if (updates.length === 1) {
                    await api.updateSectionMetadata(collectionIdentifier, updates[0].sectionId, updates[0].metadata)
                } else if (api.bulkUpdateSectionMetadata) {
                    await api.bulkUpdateSectionMetadata(collectionIdentifier, updates)
                } else {
                    await Promise.all(updates.map((u) => api.updateSectionMetadata(collectionIdentifier, u.sectionId, u.metadata)))
                }

                // Invalidate once
                queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier] })
                queryClient.invalidateQueries({ queryKey: ['traveler-collection', collectionIdentifier] })
                queryClient.invalidateQueries({ queryKey: ['tours-for-experience'] })
                queryClient.invalidateQueries({ queryKey: ['tripBudget'] })
                toast.success('Dates updated successfully')
                setEditingExperienceId(null)
            } catch (error: unknown) {
                const errorMessage =
                    (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                    (error as { message?: string })?.message ||
                    'Failed to update dates. Please try again.'
                toast.error(errorMessage)
            } finally {
                setIsSavingDates(false)
            }
        },
        [
            editingExperienceId,
            experienceSectionMap,
            sectionMetadataMap,
            collectionIdentifier,
            effectiveSelectedGroupKey,
            filteredExperiences,
            api,
            queryClient
        ]
    )

    // Wrap formatDateHeading in useCallback for useMemo dependency
    const formatDateHeadingCallback = useCallback(
        (startDate: string | null | undefined, endDate: string | null | undefined): string => {
            if (hideExactDates) {
                return formatDayLabel(startDate, endDate, localTripStartDate)
            }
            return formatDateHeading(startDate, endDate)
        },
        [hideExactDates, localTripStartDate]
    )

    // Group experiences by date (using formatted date string as key)
    // Use corrected dates (handling past dates) for the heading
    const groupedExperiencesByDate = useMemo(() => {
        const groups = new Map<string, ExperienceCardData[]>()

        filteredExperiences.forEach((exp) => {
            // For Day N labels use original dates; for exact dates use corrected dates.
            // ``getOriginalDate`` resolves itinerary → metadata for both modes;
            // we drop ``exp.end_date`` here (stale metadata cache) so the day
            // heading is the single resolved day rather than a stale range.
            const correctedStartDate = getCorrectedDate(getOriginalDate(exp)) || getTomorrowDate()
            const dateKey = hideExactDates
                ? formatDateHeadingCallback(getOriginalDate(exp), null)
                : formatDateHeadingCallback(correctedStartDate, null)
            if (!groups.has(dateKey)) {
                groups.set(dateKey, [])
            }
            groups.get(dateKey)!.push(exp)
        })

        // Convert to array of [dateKey, experiences[]] pairs, sorted by date/day number
        return Array.from(groups.entries()).sort(([dateA], [dateB]) => {
            // Handle "Day N" format sorting
            const dayNumMatch = (s: string) => s.match(/^Day (\d+)/)
            const dayA = dayNumMatch(dateA)
            const dayB = dayNumMatch(dateB)
            if (dayA && dayB) return parseInt(dayA[1]) - parseInt(dayB[1])

            // Try to parse dates for sorting, fallback to string comparison
            try {
                const parseDate = (dateStr: string): Date => {
                    // Handle date range format "15 Jun 2024 - 20 Jun 2024"
                    if (dateStr.includes(' - ')) {
                        const startDateStr = dateStr.split(' - ')[0]
                        return new Date(startDateStr)
                    }
                    return new Date(dateStr)
                }
                const dateAObj = parseDate(dateA)
                const dateBObj = parseDate(dateB)
                return dateAObj.getTime() - dateBObj.getTime()
            } catch {
                return dateA.localeCompare(dateB)
            }
        })
    }, [filteredExperiences, formatDateHeadingCallback, getCorrectedDate, getOriginalDate, hideExactDates])

    // Public collections (creator-published tripboards) load multiple day-groups
    // simultaneously. Per-day-group SSE would fire N concurrent calls that race
    // on the same AttributionContext lookup tuple (one row gets minted per
    // racing call). Aggregate items so a SINGLE SSE covers all visible
    // experiences on the page → one mint, no race. Private (own) tripboards
    // keep the per-day-group behaviour (typically one group at a time).
    const isPublicCollection = collectionType === 'content'
    const aggregatedBatchItems: BatchItem[] = useMemo(
        () => isPublicCollection
            ? groupedExperiencesByDate.flatMap(([, exps]) =>
                exps.map((exp) => ({
                    experienceId: exp.id,
                    checkIn: getDateForExperience(exp)
                }))
            )
            : [],
        [isPublicCollection, groupedExperiencesByDate, getDateForExperience]
    )

    const tripboardExploreActivitiesLink = useMemo(() => {
        if (filteredExperiences.length === 0) return null

        const fromParams = readGroupFromParams(searchParams, ACTIVITIES_PARAMS)
        let cityId = fromParams?.cityId
        const checkIn = fromParams?.checkIn
        const checkOut = fromParams?.checkOut

        const first = filteredExperiences[0]
        if (!cityId) cityId = first.city_id

        const cityName =
            first.city_id === cityId ? first.city_name : (filteredExperiences.find((e) => e.city_id === cityId)?.city_name ?? first.city_name)

        const checkInResolved = checkIn || (first.start_date ? getCorrectedDate(first.start_date) : null) || getTomorrowDate()
        const checkOutResolved = checkOut || (first.end_date ? getCorrectedDate(first.end_date) : null) || checkInResolved

        const groupType = activeTrip?.tripProfile?.group_type ?? searchParams.get('groupType')
        const travelPurpose = activeTrip?.tripProfile?.travel_purpose ?? searchParams.get('travelPurpose')

        const to = buildActivitiesCityExploreHref({
            cityId,
            cityName,
            countryId: exploreCountryId,
            countryNameDisplay: exploreCountryName,
            anchorDateYmd: checkInResolved,
            groupType: groupType ?? undefined,
            travelPurpose: travelPurpose ?? undefined
        })

        return {
            to,
            cityLabel: cityName,
            subtitleDateRange: formatCompactDateRange(checkInResolved, checkOutResolved)
        }
    }, [
        filteredExperiences,
        searchParams,
        exploreCountryId,
        exploreCountryName,
        activeTrip?.tripProfile?.group_type,
        activeTrip?.tripProfile?.travel_purpose,
        getCorrectedDate
    ])

    // Reset loaded count when city filter changes or grouped experiences change
    useEffect(() => {
        // Reset to initial load, but cap at grouped list length
        const newCount = Math.min(INITIAL_LOAD, groupedExperiencesByDate.length)
        setLoadedGroupCount(newCount)
        setIsLoadingMoreTours(false)
        if (throttleTimeoutRef.current) {
            clearTimeout(throttleTimeoutRef.current)
            throttleTimeoutRef.current = null
        }
    }, [selectedCityId, groupedExperiencesByDate.length])

    // Load more tours on scroll (with throttling)
    const loadMoreTours = useCallback(() => {
        if (isLoadingMoreTours) return

        // If all groups already have tours loaded, don't do anything
        if (loadedGroupCount >= groupedExperiencesByDate.length) return

        setIsLoadingMoreTours(true)

        // Clear any existing throttle timeout
        if (throttleTimeoutRef.current) {
            clearTimeout(throttleTimeoutRef.current)
        }

        // Throttle: wait 500ms before loading next batch
        throttleTimeoutRef.current = setTimeout(() => {
            setLoadedGroupCount((prev) => {
                const next = Math.min(prev + LOAD_MORE_STEP, groupedExperiencesByDate.length)
                setIsLoadingMoreTours(false)
                return next
            })
        }, 500)
    }, [isLoadingMoreTours, loadedGroupCount, groupedExperiencesByDate.length])

    // Intersection Observer for pagination
    useEffect(() => {
        let observer: IntersectionObserver | null = null

        // Use a small delay to ensure sentinel is rendered
        const timeoutId = setTimeout(() => {
            const sentinel = sentinelRef.current
            if (!sentinel) return

            observer = new IntersectionObserver(
                (entries) => {
                    const [entry] = entries
                    if (entry.isIntersecting && loadedGroupCount < groupedExperiencesByDate.length && !isLoadingMoreTours) {
                        loadMoreTours()
                    }
                },
                {
                    root: null,
                    rootMargin: '200px', // Trigger 200px before the element comes into view
                    threshold: 0.1
                }
            )

            observer.observe(sentinel)

            // Check if sentinel is already visible (in case it's rendered in viewport)
            const rect = sentinel.getBoundingClientRect()
            const isVisible = rect.top < window.innerHeight + 200 && rect.bottom > -200
            if (isVisible && loadedGroupCount < groupedExperiencesByDate.length && !isLoadingMoreTours) {
                loadMoreTours()
            }
        }, 100)

        return () => {
            clearTimeout(timeoutId)
            if (observer) {
                observer.disconnect()
            }
        }
    }, [isLoadingMoreTours, loadMoreTours, loadedGroupCount, groupedExperiencesByDate.length, selectedCityId])

    // Activities tab → spec sub-tab strip.
    //   • Explore = black pill when active
    //   • Shortlist = outlined pill with heart + count
    // For non-tripboard callers we keep the original toggle chip so
    // content/traveler-collection surfaces are unchanged.
    // Shortlisted count is read straight from the shared context so
    // toggling a heart anywhere in the tab (Explore cards, list cards)
    // updates the sub-pill counter + the banner gate in real time.
    // Curator-shared (readOnly) falls back to the collection sections.
    const shortlistedCount = readOnlyShortlist
        ? experiences.length
        : (shortlistedExperiencesContext?.shortlistedCount ?? 0)
    // When a specific city chip is selected in the Shortlist view, show that
    // city's count (0 when nothing is shortlisted there). "All" and the
    // Explore toggle keep the trip-wide total.
    const displayedShortlistCount =
        !readOnlyShortlist && isShortlistView && selectedShortlistCity ? shortlistVisibleCount : shortlistedCount

    // "All caught up" — every shortlisted activity is already placed on the
    // itinerary, so there's nothing left for the AI to schedule. Drives the
    // Shortlist banner's copy swap (celebratory message, no "Add with AI"
    // CTA). Gated on having at least one shortlisted item so an empty
    // shortlist doesn't read as "caught up".
    const allShortlistedInItinerary = useMemo(() => {
        if (readOnlyShortlist) return false
        const shortlistedIds = Object.values(shortlistState)
            .filter((entry) => entry.isShortlisted)
            .map((entry) => entry.experienceId)
        if (shortlistedIds.length === 0) return false
        return shortlistedIds.every((id) => itineraryExperienceIds.has(id))
    }, [readOnlyShortlist, shortlistState, itineraryExperienceIds])
    const shortlistToggleChip = showShortlistToggle ? (
        <div className="flex items-center gap-2 pl-2">
            <button
                type="button"
                onClick={() => {
                    trackButtonClickCustom?.({
                        buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                        buttonName: POSTHOG_EVENTS.ACTIVITIES_SUBVIEW_TOGGLE,
                        buttonAction: POSTHOG_ACTIONS.CLICK,
                        extra: { view: 'explore' }
                    })
                    setActivitiesViewMode('in_itinerary')
                }}
                className={`flex items-center gap-1.5 px-4 h-9 rounded-full text-[13px] font-semibold transition-colors ${
                    activitiesViewMode === 'in_itinerary'
                        ? 'bg-grey-0 text-white'
                        : 'bg-white text-grey-0 border border-[#dfdde0] hover:bg-grey-5'
                }`}>
                Explore
            </button>
            <button
                type="button"
                onClick={() => {
                    trackButtonClickCustom?.({
                        buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                        buttonName: POSTHOG_EVENTS.ACTIVITIES_SUBVIEW_TOGGLE,
                        buttonAction: POSTHOG_ACTIONS.CLICK,
                        extra: { view: 'shortlisted' }
                    })
                    setActivitiesViewMode('shortlisted')
                }}
                className={`flex items-center gap-1.5 px-4 h-9 rounded-full text-[13px] font-semibold transition-colors ${
                    activitiesViewMode === 'shortlisted'
                        ? 'bg-grey-0 text-white'
                        : 'bg-white text-grey-0 border border-[#dfdde0] hover:bg-grey-5'
                }`}>
                <Heart
                    className={`w-3.5 h-3.5 ${
                        activitiesViewMode === 'shortlisted' ? 'fill-white text-white' : 'text-grey-0'
                    }`}
                />
                <span className="text-[13px] font-semibold">{displayedShortlistCount}</span>
            </button>
        </div>
    ) : null

    // Map visibility for the Activities tab is URL-driven (`act_map`) so
    // the choice survives refresh. TripboardPage reads the same param to
    // decide whether to render the right-side map column. The in-page Map
    // toggle was removed per spec — the param is still consumed by other
    // surfaces (e.g. the mobile map tab handler).
    const isMapHidden = searchParams.get('act_map') === 'hidden'

    // Mobile Map button → switch to the mobile map tab AND clear any
    // stale `act_map=hidden` from a previous "Hide Map" click. Without
    // the clear, shouldShowMap in TripboardPage stays false, the map
    // div doesn't render, and the user sees a white screen.
    const handleOpenMobileMap = useCallback(() => {
        if (isMapHidden) {
            const next = new URLSearchParams(searchParams)
            next.delete('act_map')
            setSearchParams(next, { replace: true })
        }
        onSwitchToMapTab?.()
    }, [isMapHidden, searchParams, setSearchParams, onSwitchToMapTab])

    // Derive the currently-selected city label for the "Explore more
    // cities" pill button. Prefers (in order) the matching chip group,
    // then the URL-stashed external city name, then the country fallback.
    const exploreSelectedCityName = useMemo(() => {
        const group = experienceCityDateGroups.find((g) => g.cityId === selectedCityId)
        if (group?.cityName) return group.cityName
        const externalName = searchParams.get('act_explore_city_name')
        if (externalName) return externalName
        return exploreCountryName ?? ''
    }, [experienceCityDateGroups, selectedCityId, exploreCountryName, searchParams])

    const handleExploreCityModalOpen = useCallback(() => {
        if (!showShortlistToggle) return
        trackButtonClickCustom?.({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: 'activities_explore_more_cities_click',
            buttonAction: 'click'
        })
        setIsExploreCityModalOpen(true)
    }, [showShortlistToggle, trackButtonClickCustom])

    // ── External-city exploration state ──
    // `exploreCityName` / `isExploringExternalCity` are declared above the
    // country layer (which must yield to this header). When the user picks
    // a city from "Explore more cities" that ISN'T already in their
    // itinerary, the chip carousel is replaced with a back-arrow + centred
    // city card so the alternate scope is obvious. The selected city id
    // rides on `act_city` like before; the city name is stashed in
    // `act_explore_city_name` so:
    //   - the header has a label to render without re-fetching, and
    //   - the back button can wipe one well-known key to return to the
    //     itinerary view.
    const handleExploreCitySelect = useCallback(
        (city: CityListItem) => {
            const next = new URLSearchParams(searchParams)
            next.set(ACTIVITIES_PARAMS.city, city.id)
            // Itinerary cities use the normal chip flow; only flag the
            // external-city header when the picked city isn't a chip.
            const isItineraryCity = experienceCityDateGroups.some((g) => g.cityId === city.id)
            if (isItineraryCity) {
                next.delete('act_explore_city_name')
                // Multi-country trips: jump straight into the drilled city
                // view of the picked city's country so the chip the user
                // just chose is actually visible in the carousel.
                if (hasCountryLayer) {
                    const cityCountry = cityCountryLabelById.get(city.id)
                    const countryGroup = cityCountry
                        ? countryGroups.find(
                              (g) => g.cityName.trim().toLowerCase() === cityCountry || g.cityId.toLowerCase() === cityCountry
                          )
                        : null
                    if (countryGroup) next.set(ACT_COUNTRY_PARAM, countryGroup.cityId)
                    next.set(ACT_CMODE_PARAM, 'cities')
                }
            } else {
                next.set('act_explore_city_name', city.name)
            }
            setSearchParams(next, { replace: true })
        },
        [searchParams, setSearchParams, experienceCityDateGroups, hasCountryLayer, cityCountryLabelById, countryGroups]
    )

    // Back button on the external-city header → drop both the external
    // city id and its name; the auto-sync useEffect will pick the first
    // itinerary group as the active chip again.
    const handleExitExternalCity = useCallback(() => {
        const next = new URLSearchParams(searchParams)
        next.delete(ACTIVITIES_PARAMS.city)
        next.delete(ACTIVITIES_PARAMS.checkIn)
        next.delete(ACTIVITIES_PARAMS.checkOut)
        next.delete('act_explore_city_name')
        next.delete('act_day')
        setSearchParams(next, { replace: true })
    }, [searchParams, setSearchParams])

    // Currently-selected city for the picker. Falls back to the active
    // chip's cityId so the modal opens pre-highlighted regardless of
    // which branch (Explore / Shortlist / default body) is rendering.
    const modalSelectedCity = useMemo(() => {
        const group = experienceCityDateGroups.find((g) => g.key === effectiveSelectedGroupKey) ?? null
        const id = selectedCityId ?? group?.cityId ?? null
        const name = exploreSelectedCityName ?? group?.cityName ?? null
        return id && name ? { id, name } : null
    }, [selectedCityId, exploreSelectedCityName, experienceCityDateGroups, effectiveSelectedGroupKey])

    // One mount for `<ExploreCityModal>` — referenced from every body
    // branch instead of inlining the modal three times.
    const exploreCityModalEl = showShortlistToggle ? (
        <ExploreCityModal
            isOpen={isExploreCityModalOpen}
            onClose={() => setIsExploreCityModalOpen(false)}
            countryIds={exploreCityCountryIds}
            selectedCity={modalSelectedCity}
            onSelectCity={handleExploreCitySelect}
        />
    ) : null

    // Trip's planned month/year shown under the external-city name
    // (e.g. "October 2026"). Falls back to empty when the trip hasn't
    // got a preferred travel time set.
    const tripMonthYearLabel = useMemo(() => {
        const startDate = activeTrip?.preferred_travel_time?.startDate
        if (!startDate) return ''
        const d = new Date(startDate)
        if (Number.isNaN(d.getTime())) return ''
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }, [activeTrip?.preferred_travel_time?.startDate])

    // Hand-off to the AI concierge from the Shortlist tab's banner CTA.
    // The prompt is built from the live shortlist count so the assistant
    // gets enough context to draft a multi-day placement plan.
    const handleAddWithAI = useCallback(() => {
        // Scope to the selected city when one is chosen; "All" stays trip-wide.
        const cityScope = !readOnlyShortlist && isShortlistView && selectedShortlistCity ? ` in ${selectedShortlistCity}` : ''
        // ``skills`` force-activates the schedule_shortlisted concierge skill on the BE.
        const metadata: { skills: string[]; experienceIds?: string[] } = { skills: ['schedule_shortlisted'] }
        // Multi-add fast path: hand the BE the shortlisted ids so it skips
        // search. Only for the trip-wide ("All") case — when a city scope is
        // applied we can't derive the city-filtered id set here, so the scoped
        // prompt + schedule_shortlisted skill handle the narrowing instead.
        if (!cityScope) {
            const shortlistedIds = Object.values(shortlistState)
                .filter((entry) => entry.isShortlisted)
                .map((entry) => entry.experienceId)
            if (shortlistedIds.length > 0) metadata.experienceIds = shortlistedIds
        }
        void triggerAssistantPrompt(buildScheduleShortlistPrompt(displayedShortlistCount, cityScope), metadata)
    }, [displayedShortlistCount, selectedShortlistCity, isShortlistView, readOnlyShortlist, shortlistState])

    // Shared banner JSX — referenced by renderStickyHeader (desktop, where
    // the banner still sits inside the sticky chrome) AND by the body
    // (mobile, where the banner now lives in the scrolling list so the
    // sticky chrome stays lean). Computed once at the component scope
    // so both paths use the exact same instance.
    const activitiesBannerEl =
        !readOnlyShortlist && showShortlistToggle
            ? activitiesViewMode === 'in_itinerary'
                ? (
                      <ShortlistBanner
                          key="banner-explore"
                          variant="explore"
                          shortlistedCount={shortlistedCount}
                      />
                  )
                : activitiesViewMode === 'shortlisted'
                ? (
                      <ShortlistBanner
                          key="banner-shortlist"
                          variant="shortlist"
                          shortlistedCount={displayedShortlistCount}
                          onAddWithAI={handleAddWithAI}
                          allCaughtUp={allShortlistedInItinerary}
                      />
                  )
                : null
            : null

    // Sticky header shared by all three Activities subviews (Explore /
    // Shortlist / My-Itinerary) — the city+date carousel stays anchored
    // across the toggle, and the dismissible shortlist banner mounts
    // INSIDE the sticky so it pins to the top of the viewport too.
    const renderStickyHeader = () => {
        // Shortlist view has its own chip set and the country layer renders
        // the switcher + Overview even with no city groups — both render
        // without itinerary cities.
        if (experienceCityDateGroups.length === 0 && !isShortlistView && !hasCountryLayer) return null
        // Banner variant depends on subview. Hidden on My-Itinerary (the
        // user is already there) and on curator-shared (read-only) pages.
        //
        // Note we no longer gate on `shortlistedCount > 0` — the banner
        // owns its own visibility + deferred-unmount logic so the
        // collapse animation can play when the user un-shortlists their
        // last card (count goes to 0). Pulling the JSX here when count
        // drops would yank the banner mid-animation.
        //
        // `key` is variant-specific so React treats Explore and Shortlist
        // banners as independent instances — dismissing one no longer
        // carries over to the other when the user flips subtabs.
        const bannerEl = activitiesBannerEl
        // Activities tab now uses the outer TripboardPage collapse for
        // hide-on-scroll — same single-unit grid-rows transition that
        // Stays uses. The previous per-layer staggered cascade inside
        // ExperienceTab fought the outer collapse and the scroll-anchor
        // echo on fast scroll, producing visible jank. Keeping the
        // headerContent layout exactly as it was (no inner wrappers)
        // lets the outer collapse animate everything as one clean unit.
        const headerContent = (
            <div className="bg-white pr-4">
                {/* Locked-height swap container so the chip-carousel row
                    and the external-city row occupy the same vertical
                    space (~44px = chip button px-4 py-3 + a single line of
                    city text — the chips are city-only now, no date row).
                    AnimatePresence cross-fades the two states so the
                    transition into / out of the external-city header
                    isn't a jarring re-layout. */}
                <div className="relative h-[42px]">
                    <AnimatePresence initial={false} mode="wait">
                {isExploringExternalCity ? (
                    // Alternate header — user has selected a city that
                    // isn't part of the itinerary. Back arrow restores
                    // the chip carousel; the centred card opens the
                    // city picker so the user can switch to yet another
                    // external city without going back first.
                    //
                    // Layout matches the spec mock: square-rounded back
                    // tile + a centred rounded grey card (NOT full-width)
                    // showing the city name and the trip month/year.
                    <motion.div
                        key="external-city"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="absolute inset-0 flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleExitExternalCity}
                            aria-label="Back to itinerary cities"
                            className="shrink-0 h-[42px] w-[42px] rounded-xl bg-grey-5 border border-grey-4 flex items-center justify-center hover:bg-grey-4/60 transition-colors ml-2">
                            <ChevronLeft className="w-5 h-5 text-grey-0" />
                        </button>
                        <button
                            type="button"
                            onClick={handleExploreCityModalOpen}
                            className="flex-1 mx-auto max-w-[420px] min-w-0 h-[42px] flex flex-col items-center justify-center px-6 rounded-xl bg-grey-5 border border-grey-4 hover:bg-grey-4/60 transition-colors">
                            <span className="text-[14px] font-bold font-red-hat-display text-grey-0 tracking-[-0.28px] leading-[18px] line-clamp-1">
                                {exploreCityName}
                            </span>
                            {tripMonthYearLabel && (
                                <span className="text-[12px] font-medium font-manrope text-grey-2 tracking-[-0.24px] leading-4">
                                    {tripMonthYearLabel}
                                </span>
                            )}
                        </button>
                    </motion.div>
                ) : (
                <motion.div
                    // Keyed on the subview so switching Explore↔Shortlist↔
                    // Itinerary cross-fades the chip row (the chip SET changes
                    // between subviews) instead of hard-swapping.
                    key={`chip-carousel-${activitiesViewMode}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="absolute inset-0">
                {/* City carousel + "Explore more cities" sit on the same
                    row so the right-hand action stays anchored to the city
                    chips, per spec. The link only renders for the Activities
                    tab (showShortlistToggle). */}
                <div className="flex items-stretch gap-3 h-full">
                    {/* Inner group keeps the dropdown, Overview tab and city
                        chips flush against each other (one continuous tab
                        strip, per spec sketch); the outer gap-3 only spaces
                        the desktop "Explore more cities" action. */}
                    <div className="flex items-stretch flex-1 min-w-0">
                    {/* The row leads with the country dropdown (grey-5
                        tile) + the "Overview" tab — on Explore AND
                        Shortlist, so the strip reads identically across
                        subviews. The Overview tab uses the same chip
                        styling as the city chips (selected = grey-4). */}
                    {hasCountryLayer && (
                        <div className="flex items-stretch shrink-0">
                            <ActivitiesCountrySwitcher
                                countries={countryGroups.map((g) => ({
                                    id: g.cityId,
                                    name: g.cityName
                                }))}
                                selectedCountryId={selectedCountryId}
                                onSelect={handleCountrySelect}
                            />
                            {/* Desktop-only pinned Overview tab. On mobile
                                the Overview tab scrolls WITH the city chips
                                (rendered as the carousel's `leadingItem`
                                below) — only the dropdown stays frozen. */}
                            <button
                                type="button"
                                onClick={handleOverviewTabClick}
                                className={`shrink-0 hidden md:flex items-center px-4 text-[14px] font-bold font-red-hat-display text-grey-0 tracking-[-0.28px] leading-[18px] whitespace-nowrap transition-colors cursor-pointer ${
                                    isOverviewTabActive ? 'bg-grey-4' : 'bg-white hover:bg-grey-5'
                                }`}>
                                Overview
                            </button>
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <CityDateFilterCarousel
                    /* Mobile-only Overview tab at the head of the SCROLLABLE
                       strip — the pinned (desktop) variant lives above. */
                    leadingItem={
                        hasCountryLayer ? (
                            <button
                                type="button"
                                onClick={handleOverviewTabClick}
                                className={`shrink-0 flex md:hidden items-center px-4 h-[42px] text-[14px] font-bold font-red-hat-display text-grey-0 tracking-[-0.28px] leading-[18px] whitespace-nowrap transition-colors cursor-pointer ${
                                    isOverviewTabActive ? 'bg-grey-4' : 'bg-white hover:bg-grey-5'
                                }`}>
                                Overview
                            </button>
                        ) : null
                    }
                    // Shortlist subview drives its own city set (itinerary +
                    // extra shortlisted cities) and filters by city name.
                    groups={isShortlistView ? shortlistChipGroups : visibleCityDateGroups}
                    selectedGroupKey={
                        isShortlistView
                            ? (selectedShortlistCity ?? (hasCountryLayer ? null : SHORTLIST_ALL_KEY))
                            : showCountryOverview
                              ? null
                              : effectiveSelectedGroupKey
                    }
                    /* Chips fill the full strip height so the selected grey
                       background spans edge-to-edge like the country
                       dropdown / Overview tab beside it. */
                    chipClassName="h-[42px]"
                    scrollControls={{
                        rightScrollArrow: 'h-4! w-4!',
                        rightScrollBtn: 'h-7! w-7!',
                        leftArrowBtn: 'h-4! w-4!',
                        leftScrollBtn: 'h-7! w-7!'
                    }}
                    onGroupChange={(groupKey) => {
                        if (isShortlistView) {
                            setSelectedShortlistCity(groupKey === SHORTLIST_ALL_KEY ? null : groupKey)
                            return
                        }
                        const group = visibleCityDateGroups.find((g) => g.key === groupKey)
                        trackButtonClickCustom?.({
                            buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
                            buttonName: POSTHOG_EVENTS.EXPERIENCE_CITY_CHANGE,
                            buttonAction: POSTHOG_ACTIONS.CLICK,
                            extra: { cityId: group?.cityId }
                        })
                        trackButtonClickCustom?.({
                            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                            buttonName: 'experience_city_date_filter_change',
                            buttonAction: 'click',
                            extra: { group_key: groupKey }
                        })
                        if (group) {
                            // Mirror the URL-sync effect: resolve dates via
                            // ``getOriginalDate`` so the chip click uses the
                            // itinerary slot day as source of truth.
                            const matchingExp = hideExactDates
                                ? experiencesInView.find((e) => e.city_id === group.cityId)
                                : experiencesInView.find((e) => {
                                      if (e.city_id !== group.cityId) return false
                                      const corrStart = getCorrectedDate(getOriginalDate(e)) || undefined
                                      // Match the chip's start-only label.
                                      return formatCompactDateRange(corrStart, undefined) === group.dateLabel
                                  })
                            const next = new URLSearchParams(searchParams)
                            // Country layer: a city chip click exits the
                            // "Overview" tab into city mode.
                            if (hasCountryLayer) next.set(ACT_CMODE_PARAM, 'cities')
                            if (hideExactDates) {
                                next.set(ACTIVITIES_PARAMS.city, group.cityId)
                                // Deduped chips have no day segment label.
                                if (group.dateLabel) next.set('act_day', group.dateLabel)
                                else next.delete('act_day')
                            } else {
                                const checkIn = matchingExp ? getCorrectedDate(getOriginalDate(matchingExp)) : null
                                // Activity chips use a single (start-only)
                                // date label — write only check-in so the
                                // reconstructed group label matches.
                                writeGroupToParams(next, ACTIVITIES_PARAMS, group.cityId, checkIn || undefined, undefined)
                            }
                            setSearchParams(next, { replace: true })
                        }
                    }}
                    /* Pencil/date-edit affordance is off across the entire
                       Tripboard Activities tab — itinerary dates here are
                       managed elsewhere, so the pencil only confuses. */
                    allowDateEdit={allowDateEdit && !showShortlistToggle}
                    onEditDate={(groupKey) => {
                        if (isItineraryView) return
                        const group = experienceCityDateGroups.find((g) => g.key === groupKey)
                        if (!group) return
                        const firstExp = filteredExperiences[0]
                        if (firstExp) handleEditDateClick(firstExp.id)
                    }}
                    onMapViewClick={onSwitchToMapTab}
                    /* "Explore cities" as the carousel's last item. Mobile:
                       pinned right (wrapper `ml-auto`). Desktop (`sm:ml-0`):
                       flush after the last city, behind a vertical divider. */
                    trailingItem={
                        showShortlistToggle ? (
                            <>
                                {/* Mobile */}
                                <button
                                    type="button"
                                    onClick={handleExploreCityModalOpen}
                                    className="sm:hidden flex items-center gap-1.5 shrink-0 px-3 py-3 text-[14px] font-bold font-red-hat-display text-primary-default hover:underline">
                                    <Search className="w-3.5 h-3.5" />
                                    <span className="whitespace-nowrap">Explore cities</span>
                                </button>
                                {/* Desktop — divider + label, flush after the cities. */}
                                <div className="hidden sm:flex items-center gap-3 pl-3">
                                    <div
                                        aria-hidden
                                        className="w-px h-8 bg-grey-4 shrink-0"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleExploreCityModalOpen}
                                        className="flex items-center gap-1.5 shrink-0 text-[14px] font-bold font-red-hat-display text-primary-default hover:underline">
                                        <Search className="w-4 h-4" />
                                        <span className="whitespace-nowrap">Explore more cities</span>
                                    </button>
                                </div>
                            </>
                        ) : null
                    }
                />
                    </div>
                    {/* Close the inner flush group — the desktop "Explore
                        more cities" affordance now lives INSIDE the carousel
                        as `trailingItem` (divider + label). */}
                    </div>
                </div>
                </motion.div>
                )}
                    </AnimatePresence>
                </div>
                {/* Standalone 1px divider — full width. We render this as
                    a sibling instead of using `border-b` on the swap
                    container because the swap container's absolute
                    children (`motion.div` with `inset-0`) and the chip
                    buttons' `bg-[#dfdde0]` backgrounds were painting
                    over the bottom border, making it look broken /
                    half-missing in screenshots. The `-mr-4 -ml-0`
                    cancel the parent's `pr-4` so the line spans from
                    the page's left edge to its right edge. */}
                <div className="-mr-4 h-px bg-grey-4" />
                {/* Secondary controls row. Mobile: outer sticky wrapper
                    handles hide-on-scroll via transform-only, so this
                    block stays open. Desktop: this block collapses via
                    grid-rows when `hideSecondaryHeader` fires. */}
                <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                        hideSecondaryHeader
                            ? 'max-md:grid-rows-[1fr] max-md:opacity-100 md:grid-rows-[0fr] md:opacity-0 md:pointer-events-none'
                            : 'grid-rows-[1fr] opacity-100'
                    }`}>
                    <div className="overflow-hidden min-w-0">
                {(shortlistToggleChip || onSwitchToMapTab || showShortlistToggle || tripboardExploreActivitiesLink) && (
                    <>
                        {/* "In your itinerary" pill — right-aligned on mobile
                            and desktop, replaces the Map button on the
                            Activities tab. Shown only when the parent passes
                            the Activities tab toggle (tripboard surface). */}
                        {(() => {
                            if (!showShortlistToggle) return null
                            const isActive = activitiesViewMode === 'my_itinerary'
                            const onClick = () => {
                                trackButtonClickCustom?.({
                                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                    buttonName: POSTHOG_EVENTS.ACTIVITIES_SUBVIEW_TOGGLE,
                                    buttonAction: POSTHOG_ACTIONS.CLICK,
                                    extra: { view: isActive ? 'explore' : 'my_itinerary' }
                                })
                                setActivitiesViewMode(isActive ? 'in_itinerary' : 'my_itinerary')
                            }
                            return (
                                <>
                                    {/* Mobile bar — chips on the left, In-Your-Itinerary pill on the right. */}
                                    <div className="sm:hidden pb-2 pt-2 flex items-center justify-between gap-2">
                                        <div className="flex items-center min-w-0">{shortlistToggleChip}</div>
                                        <button
                                            type="button"
                                            onClick={onClick}
                                            className={`flex items-center gap-1.5 px-4 h-9 rounded-full text-[13px] font-semibold transition-colors shrink-0 ${
                                                isActive
                                                    ? 'bg-grey-0 text-white'
                                                    : 'bg-white text-grey-0 border border-[#dfdde0] hover:bg-grey-5'
                                            }`}>
                                            In your itinerary
                                        </button>
                                    </div>

                                    {/* Desktop bar — chips on the left, In-Your-Itinerary pill on the right. */}
                                    <div className="hidden sm:flex pb-4 pt-4 items-center justify-between gap-3">
                                        <div className="flex items-center min-w-0">{shortlistToggleChip}</div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <button
                                                type="button"
                                                onClick={onClick}
                                                className={`flex items-center gap-1.5 px-4 h-9 rounded-full text-[13px] font-semibold transition-colors ${
                                                    isActive
                                                        ? 'bg-grey-0 text-white'
                                                        : 'bg-white text-grey-0 border border-[#dfdde0] hover:bg-grey-5'
                                                }`}>
                                                In your itinerary
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )
                        })()}

                        {/* Desktop "Explore more activities" link for non-
                            Activities-tab callers (content/traveler-collection
                            pages). The Map toggle is intentionally removed
                            for the Activities tab per spec. */}
                        {!showShortlistToggle && tripboardExploreActivitiesLink && (
                            <div className="hidden sm:flex pb-4 pt-4 items-center justify-end gap-3">
                                <div className="flex items-center gap-4 shrink-0">
                                    <a
                                        href={tripboardExploreActivitiesLink.to}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 shrink-0 px-3 py-2 rounded-xl text-[12px] leading-4"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            trackButtonClickCustom?.({
                                                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                                buttonName: POSTHOG_EVENTS.ACTIVITIES_TAB_EXPLORE_BROWSE_CLICK,
                                                buttonAction: 'click'
                                            })
                                        }}>
                                        <span className="text-[12px] font-semibold font-manrope text-grey-0 tracking-[-0.24px] leading-4 whitespace-nowrap">
                                            Explore more activities
                                        </span>
                                        <span className="text-[12px] font-bold font-red-hat-display text-primary-default tracking-[-0.24px] leading-4 underline whitespace-nowrap">
                                            Browse
                                        </span>
                                        <ExternalLink className="w-3.5 h-3.5 text-primary-default shrink-0" />
                                    </a>
                                </div>
                            </div>
                        )}
                    </>
                )}
                    </div>
                </div>
            </div>
        )
        // The banner is rendered alongside `headerContent` in BOTH the
        // portal branch (Tripboard activities tab routes the sticky header
        // through `staysHeaderPortalRef`) and the direct branch. Without
        // this the banner would never mount on Tripboard surfaces.
        // On mobile the banner is rendered INSIDE the list body (it
        // scrolls away with the content) so the sticky chrome only has
        // 2 layers (chips + row) — much lighter on the reveal cascade.
        // Desktop keeps the original sticky banner placement.
        const stickyContents = (
            <>
                {headerContent}
                {!isMobile && bannerEl}
            </>
        )
        return headerPortalRef?.current && isActive ? (
            createPortal(stickyContents, headerPortalRef.current)
        ) : !headerPortalRef ? (
            // `lg:top-[72px]` keeps the chip carousel pinned just below
            // TripboardHeader on desktop (where both share SideBarLayout's
            // scroll container). On mobile the tab content has its own
            // overflow-y-auto scroller, so plain `top-0` is correct there.
            // `-mx-4` bleeds past the page's px-4, giving the banner a
            // full-width look.
            <div className="mb-0 -mx-4 sticky top-0 lg:top-[72px] z-20 shadow-[0px_2px_4px_rgba(0,0,0,0.08)]">
                {stickyContents}
            </div>
        ) : null
    }

    // Tripboard Activities tab → Explore sub-view.
    // When `showShortlistToggle` is on and the user is in "Explore" mode
    // (legacy URL value `in_itinerary`, surfaced as "Explore" in the UI),
    // render the new video-first discovery experience instead of the
    // grouped itinerary list. Content/traveler-collection callers keep
    // their existing list because they never pass `showShortlistToggle`.
    if (showShortlistToggle && activitiesViewMode === 'in_itinerary') {
        const selectedGroup = visibleCityDateGroups.find((g) => g.key === effectiveSelectedGroupKey) ?? null
        // Country overview: no city scope — content goes country-wide for
        // the selected country (the hooks fall back to country data when
        // cityId is null), and the listing header shows the country name.
        const exploreCityIdResolved = showCountryOverview ? null : (selectedCityId ?? selectedGroup?.cityId ?? null)
        const exploreCityNameResolved = showCountryOverview
            ? (selectedCountryGroup?.cityName ?? null)
            : (selectedGroup?.cityName ?? exploreSelectedCityName ?? null)
        // The country layer scopes the explore content to the selected
        // country; the page-level country props are the fallback when the
        // layer can't resolve any trip countries.
        const exploreCountryIdResolved = (hasCountryLayer ? selectedCountryId : null) ?? countryId ?? exploreCountryId ?? null
        // Country overview swaps the per-city Explore composition for the
        // /experiences?country_id= page's country content (hero, top cities,
        // quick bites, all cities, curated collections, country-wide
        // listing). City taps route through `handleExploreCitySelect` so
        // itinerary cities drill into the in-tab city view and any other
        // city opens via the external-city header — never a page redirect.
        const exploreBodyEl =
            showCountryOverview && exploreCountryIdResolved ? (
                <ActivitiesCountryOverviewView
                    countryId={exploreCountryIdResolved}
                    countryName={selectedCountryGroup?.cityName ?? null}
                    tripId={tripId}
                    isActive={isActive}
                    itineraryStartDate={itineraryDays?.[0]?.date ?? null}
                    onCityClick={(cityId, cityName) => handleExploreCitySelect({ id: cityId, name: cityName ?? '' })}
                />
            ) : (
                <ActivitiesExploreView
                    countryId={exploreCountryIdResolved}
                    selectedCityId={exploreCityIdResolved}
                    selectedCityName={exploreCityNameResolved}
                    tripId={tripId}
                    isActive={isActive}
                />
            )
        return (
            // Wrapper matches the Shortlist / In-Your-Itinerary subtabs
            // (`flex flex-col gap-4 px-4 …`) instead of the previous block
            // layout. Other Activities subtabs scroll smoothly on mobile
            // with that wrapper; Explore overshooting was traced to its
            // divergent block layout interacting with the chrome collapse
            // mid-momentum. Aligning the wrapper kills the divergence.
            //
            // Inner body sections (Top 10, BestThings) are designed
            // edge-to-edge on mobile, so the inner wrapper carries
            // `max-md:-mx-4` to cancel the outer `px-4` only on mobile.
            // Desktop keeps the px-4 inset on both layers.
            <div className="flex flex-col max-md:gap-0 md:gap-4 px-4 pt-0 pb-2 md:pb-4">
                {renderStickyHeader()}
                {/* Mobile-only inline banner (desktop keeps the sticky one).
                    `-mx-4` makes it full-bleed. Outer gap is 0 on mobile
                    (`max-md:gap-0`) so the collapsed banner leaves no white
                    band above Top 10; desktop keeps `gap-4`. */}
                {isMobile && <div className="-mx-4">{activitiesBannerEl}</div>}
                <div className={readOnlyShortlist ? '-mx-4' : 'max-md:-mx-4'}>
                    {readOnlyShortlist ? (
                        exploreBodyEl
                    ) : (
                        // Provider only mounted for the trip owner / collaborators —
                        // read-only viewers can't modify the itinerary, so the +Add
                        // affordance stays hidden by virtue of the missing context.
                        //
                        // `hideAddAffordance` suppresses the "+ Add" button + the
                        // "+" tick chip on Explore cards so users add only via the
                        // Shortlist subview. The green "Added" pill / tick still
                        // renders for cards already on the itinerary so users can
                        // still see what's in the trip at a glance.
                        <ItineraryAddProvider
                            itineraryExperienceIds={itineraryExperienceIds}
                            onAddToItinerary={handleAddToItinerary}
                            hideAddAffordance>
                            {exploreBodyEl}
                            <AddToItineraryDayModal
                                isOpen={!!addToItineraryTarget}
                                onClose={handleCloseAddToItinerary}
                                experienceName={addToItineraryTarget?.name ?? ''}
                                experienceImage={addToItineraryTargetImage}
                                days={itineraryDays ?? []}
                                experiencesById={addToItineraryExperiencesById}
                                onAdd={handleConfirmAddToItinerary}
                                recommendation={dayFitRecommendation}
                            />
                        </ItineraryAddProvider>
                    )}
                </div>
                {exploreCityModalEl}
            </div>
        )
    }

    // In Your Itinerary view — day-grouped, collapsible list of every
    // experience currently placed on the itinerary. Sticky header stays
    // mounted so the user can still switch between subtabs without
    // losing their place.
    if (showShortlistToggle && activitiesViewMode === 'my_itinerary') {
        return (
            <div className="flex flex-col gap-4 px-4 pt-0 pb-2 md:pb-4">
                {renderStickyHeader()}
                <ItineraryAddProvider
                    itineraryExperienceIds={itineraryExperienceIds}
                    onAddToItinerary={handleAddToItinerary}>
                    <InYourItineraryView
                        days={itineraryDays ?? []}
                        experiences={inItineraryExperiences ?? experiences}
                        onCardClick={onExperienceClick}
                        onSneakPeekClick={onSneakPeekClick}
                    />
                    <AddToItineraryDayModal
                        isOpen={!!addToItineraryTarget}
                        onClose={handleCloseAddToItinerary}
                        experienceName={addToItineraryTarget?.name ?? ''}
                        experienceImage={addToItineraryTargetImage}
                        days={itineraryDays ?? []}
                        experiencesById={addToItineraryExperiencesById}
                        onAdd={handleConfirmAddToItinerary}
                        recommendation={dayFitRecommendation}
                    />
                </ItineraryAddProvider>
                {exploreCityModalEl}
            </div>
        )
    }

    // Shortlisted view bypasses the rest of the tab (including the
    // collection-loading shimmer) — it owns its own layout and queries
    // the trip-experiences shortlist API directly. Header stays mounted
    // so the city+date carousel + toggle are visible across modes.
    if (showShortlistToggle && activitiesViewMode === 'shortlisted' && !readOnlyShortlist) {
        return (
            <div
                className={`flex flex-col gap-4 px-4 ${
                    tripboardExploreActivitiesLink ? 'pt-0 max-md:pb-32 md:pb-8' : 'pt-0 pb-2 md:pb-4'
                }`}>
                {renderStickyHeader()}
                {/* Mobile-only inline "Add with AI" banner — desktop shows it
                    inside the sticky header; on mobile it lives in the body
                    (same as the Explore subview). `-mx-4` cancels the outer
                    `px-4` so the banner renders full-bleed edge-to-edge. */}
                {isMobile && <div className="-mx-4">{activitiesBannerEl}</div>}
                {tripId ? (
                    <ItineraryAddProvider
                        itineraryExperienceIds={itineraryExperienceIds}
                        onAddToItinerary={handleAddToItinerary}>
                        <ShortlistedActivitiesView
                            tripId={tripId}
                            countryId={countryId ?? undefined}
                            // City filter: the shortlist chips (itinerary +
                            // extra shortlisted cities) drive the visible
                            // subset. `null` ("All") shows every shortlisted
                            // activity. `onCitiesChange` reports the cities the
                            // shortlist actually spans so the parent can build
                            // chips for cities outside the itinerary.
                            selectedCityId={null}
                            selectedCityName={selectedShortlistCity}
                            onCitiesChange={setShortlistCityNames}
                            onVisibleCountChange={setShortlistVisibleCount}
                            // Shortlist UX: tapping a card OR "View Details"
                            // inside the per-card reels should open the
                            // sneak-peek sheet in place — the standalone
                            // details-page redirect (an Explore-style
                            // affordance) felt jarring here. Both bindings
                            // route through `onSneakPeekClick` which the
                            // parent has wired to open SneakPeekModal.
                            // `stopPropagation` is a no-op shim because
                            // these callsites don't have a real event.
                            onExperienceClick={(experienceId) =>
                                onSneakPeekClick(
                                    { stopPropagation: () => {} } as React.MouseEvent,
                                    experienceId
                                )
                            }
                            onSneakPeekClick={onSneakPeekClick}
                            // Use the wrapped handler so card-level "View on
                            // Map" clicks also clear act_map=hidden — without
                            // it, clicking opens the mobile map tab but the
                            // map div doesn't render (white screen).
                            onSwitchToMapTab={handleOpenMobileMap}
                            // When the map column is hidden, use a 2-col grid
                            // on desktop so cards don't stretch to full width.
                            isMapHidden={isMapHidden}
                            // Forward the parent's active flag so tour polling
                            // only runs while the user is on the activities tab.
                            isActive={isActive}
                            onExploreActivitiesClick={() => setActivitiesViewMode('in_itinerary')}
                            closeReelsSignal={closeReelsSignal}
                        />
                        <AddToItineraryDayModal
                            isOpen={!!addToItineraryTarget}
                            onClose={handleCloseAddToItinerary}
                            experienceName={addToItineraryTarget?.name ?? ''}
                            experienceImage={addToItineraryTargetImage}
                            days={itineraryDays ?? []}
                            experiencesById={addToItineraryExperiencesById}
                            onAdd={handleConfirmAddToItinerary}
                            recommendation={dayFitRecommendation}
                        />
                    </ItineraryAddProvider>
                ) : (
                    <div className="mx-4 my-6 rounded-lg border border-dashed border-feature-card-border bg-white px-6 py-12 text-center text-sm text-grey-2">
                        Trip id missing — shortlisted activities unavailable.
                    </div>
                )}
                {exploreCityModalEl}
            </div>
        )
    }

    if (isExperiencesLoading) {
        return (
            <div className="flex flex-col gap-10">
                <CustomShimmer
                    height={400}
                    radius={16}
                    className="w-full"
                />
                <CustomShimmer
                    height={400}
                    radius={16}
                    className="w-full"
                />
                <CustomShimmer
                    height={400}
                    radius={16}
                    className="w-full"
                />
            </div>
        )
    }

    const canAddExperience = isRimigoInternal && !!collectionIdentifier && !!selectedCityId && typeof api?.addExperienceToCollection === 'function'
    const nextSectionsOrder = experiences.length + 1
    const allVisibleExperienceSectionsSelected =
        bulkVisibleExperienceSectionIds.length > 0 && bulkVisibleExperienceSectionIds.every((id) => selectedSectionIds?.has(id))

    return (
        <div
            className={`flex flex-col gap-4 px-4 ${
                tripboardExploreActivitiesLink ? 'pt-0 max-md:pb-32 md:pb-8' : 'pt-0 pb-2 md:pb-4'
            }`}>
            {renderStickyHeader()}

            {/* Action buttons — Select + Add activity, right-aligned */}
            {(canAddExperience || showBulkSelectionControls) && (
                <div className="flex items-center justify-end gap-2 py-3">
                    {showBulkSelectionControls && (
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={onToggleBulkSelectMode}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-grey-4 bg-white hover:bg-grey-5 text-[12px] font-medium">
                                <CheckSquare className="w-3.5 h-3.5" />
                                {bulkSelectMode ? 'Cancel' : 'Select'}
                            </button>
                            {bulkSelectMode && onBulkSelectAll && (
                                <button
                                    type="button"
                                    onClick={() => onBulkSelectAll(bulkVisibleExperienceSectionIds)}
                                    disabled={bulkVisibleExperienceSectionIds.length === 0}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-grey-4 bg-white hover:bg-grey-5 disabled:opacity-50 text-[12px] font-medium text-grey-0">
                                    {allVisibleExperienceSectionsSelected ? 'Deselect all' : 'Select all'}
                                </button>
                            )}
                            {bulkSelectMode && (
                                <button
                                    type="button"
                                    onClick={() => void onBulkDeleteSelected?.()}
                                    disabled={!selectedSectionIds || selectedSectionIds.size === 0}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 text-[12px] font-medium">
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete ({selectedSectionIds?.size ?? 0})
                                </button>
                            )}
                        </div>
                    )}
                    {canAddExperience && (
                        <button
                            type="button"
                            onClick={() => {
                                trackButtonClickCustom?.({
                                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                    buttonName: 'experience_add_activity_click',
                                    buttonAction: 'click'
                                })
                                setIsAddExperienceModalOpen(true)
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-grey-4 shrink-0 transition-colors cursor-pointer bg-white text-grey-0 hover:bg-grey-5 text-[12px] font-medium">
                            <Plus className="w-3.5 h-3.5" />
                            {canAddExperienceProp ? 'Add activity' : 'Add experience'}
                        </button>
                    )}
                </div>
            )}

            {/* Experiences List or Empty State */}
            {filteredExperiences.length === 0 ? (
                <div className="text-center py-12">
                    <Typography
                        size="16"
                        weight="medium"
                        color="grey-1">
                        No experiences found for the selected city.
                    </Typography>
                </div>
            ) : (
                <div className="flex flex-col gap-4 pt-4">
                    {(() => {
                        // Render the day-groups. Each group returns either a Provider
                        // (private) or a Fragment (public — wrapped by the outer
                        // single Provider below the .map).
                        const groupNodes = groupedExperiencesByDate.map(([dateKey, groupExperiences], groupIndex) => {
                        // For public, treat all groups as loaded — the single SSE
                        // above covers everything. For private, gate by lazy-load.
                        const isGroupLoaded = isPublicCollection || groupIndex < loadedGroupCount
                        const isLastLoadedGroup = groupIndex === loadedGroupCount - 1
                        const hasMoreToLoad = !isPublicCollection && loadedGroupCount < groupedExperiencesByDate.length
                        const shouldShowSentinel = isLastLoadedGroup && hasMoreToLoad

                        // Private mode: one batched SSE stream per day-group.
                        const dayItems: BatchItem[] = groupExperiences.map((exp) => ({
                            experienceId: exp.id,
                            checkIn: getDateForExperience(exp)
                        }))

                        const groupBody = (
                                <div className="flex flex-col gap-4">
                                    {/* Experiences in this group — 2-col grid on
                                        desktop when the map is hidden (curator-
                                        shared shortlist subtab) so cards don't
                                        stretch to full width. Mirrors
                                        Tripboard's ShortlistedActivitiesView. */}
                                    <div className={readOnlyShortlist && isMapHidden ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'flex flex-col gap-4'}>
                                        {groupExperiences.map((experience) => {
                                            const experienceId = experience.id
                                            const isHovered = hoveredCardId === experienceId || isMobile

                                            // Only load tours when:
                                            //  1. this tab is currently active (isActive gates the whole ExperienceTab
                                            //     — prevents background polling/initial fetch when the parent
                                            //     page routes to a different tab without unmounting), AND
                                            //  2. this group is within the lazy-loaded window (INITIAL_LOAD,
                                            //     then bumps on scroll).
                                            // Cities are already scoped by `filteredExperiences`, so non-active
                                            // cities don't render cards at all.
                                            const shouldLoadTours = isActive && isGroupLoaded

                                            // Get shortlist state for this experience
                                            const shortlistEntry = shortlistState[experienceId]
                                            const isShortlisted = shortlistEntry?.isShortlisted ?? false
                                            const isShortlisting = Boolean(shortlistLoadingIds[experienceId])

                                            const expSectionId = experienceSectionMap?.get(experienceId)

                                            const isSelected = !!expSectionId && selectedSectionIds?.has(expSectionId)

                                            // Per-card delete affordance — in itinerary view this removes
                                            // the slot from the itinerary (not the shortlist section). The
                                            // `sectionId` prop is reused as the identifier the underlying
                                            // card hands back, so we pass `experienceId` in itinerary mode
                                            // and let `handleDeleteExperienceFromItinerary` resolve to the
                                            // matching slot id.
                                            const itineraryDeleteEnabled =
                                                isItineraryView && !!experienceSlotMap?.get(experienceId) && !!tripId && !!itineraryId
                                            const cardSectionId = itineraryDeleteEnabled
                                                ? experienceId
                                                : (experience as ExperienceCardData & { _sectionId?: string })._sectionId
                                            const cardOnDeleteSection = itineraryDeleteEnabled
                                                ? handleDeleteExperienceFromItinerary
                                                : showShortlistToggle
                                                  ? undefined
                                                  : onDeleteSection
                                            const cardShowDeleteButton = itineraryDeleteEnabled
                                                ? true
                                                : showShortlistToggle
                                                  ? false
                                                  : !!onDeleteSection
                                            const cardIsDeleting = itineraryDeleteEnabled ? deleteSlotMutation.isPending : isDeleting

                                            return (
                                                <div key={(experience as ExperienceCardData & { _sectionId?: string })._sectionId || experience.id}>
                                                    {/* Card + comments use the same tuck-behind pattern as StaysTab:
                                                    card wrapper gets `z-[1]` and the comments sibling gets `z-0`,
                                                    so the comments' `-mt-4` negative margin slides under the
                                                    card's bottom edge with only the grey strip peeking below. */}
                                                    <div className="relative z-[1]">
                                                        {bulkSelectMode && expSectionId && onToggleSectionSelect && (
                                                            <label className="absolute top-3 left-3 z-30 inline-flex items-center gap-2 rounded-md bg-white border border-grey-4 px-2.5 py-1 cursor-pointer shadow-sm hover:bg-grey-5">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={!!isSelected}
                                                                    onChange={() => onToggleSectionSelect(expSectionId)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="h-3.5 w-3.5 accent-primary-default"
                                                                />
                                                                <span className="text-[11px] font-semibold text-grey-0">Select</span>
                                                            </label>
                                                        )}
                                                        <ExperienceWithTours
                                                            experience={experience}
                                                            onExperienceClick={onExperienceClick}
                                                            isHovered={isHovered}
                                                            onMouseEnter={() => {
                                                                setHoveredCardId(experienceId)
                                                            }}
                                                            onMouseLeave={() => {
                                                                setHoveredCardId(null)
                                                            }}
                                                            isPublicView={false}
                                                            onSneakPeekClick={onSneakPeekClick}
                                                            shouldLoadTours={shouldLoadTours}
                                                            checkIn={getDateForExperience(experience)}
                                                            isShortlisted={isShortlisted}
                                                            isShortlisting={isShortlisting}
                                                            // `!readOnlyShortlist`: curator-shared
                                                            // pages are view-only — the heart must
                                                            // not toggle a shortlist there.
                                                            onShortlistClick={
                                                                !hideShortlist && !readOnlyShortlist && experienceId && handleShortlistToggle
                                                                    ? () => handleShortlistToggle(experienceId)
                                                                    : undefined
                                                            }
                                                            onSwitchToMapTab={onSwitchToMapTab}
                                                            sectionId={cardSectionId}
                                                            onDeleteSection={cardOnDeleteSection}
                                                            showDeleteButton={cardShowDeleteButton}
                                                            isDeleting={cardIsDeleting}
                                                            enableSneakPeekFallback
                                                        />
                                                    </div>
                                                    {collectionIdentifier && (
                                                        <div className="relative z-0">
                                                            <ExperienceComments
                                                                experienceId={experienceId}
                                                                comments={experienceCommentsByExpId?.get(experienceId) ?? []}
                                                                collectionIdentifier={collectionIdentifier}
                                                                collectionType={collectionType}
                                                                isRimigoInternal={isRimigoInternal}
                                                                queryKeyPrefix={queryKeyPrefix}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Sentinel element for pagination - placed after last loaded group */}
                                    {shouldShowSentinel && (
                                        <div
                                            ref={sentinelRef}
                                            className="h-10 w-full"
                                        />
                                    )}
                                </div>
                        )

                        // Public mode skips the per-group Provider — the single
                        // top-level provider (added below the .map) covers these
                        // items. Private mode keeps the per-group Provider.
                        if (isPublicCollection) {
                            return (
                                <Fragment key={dateKey || 'all-experiences'}>
                                    {groupBody}
                                </Fragment>
                            )
                        }
                        return (
                            <TourLiveDataBatchProvider
                                key={dateKey || 'all-experiences'}
                                items={dayItems}
                                enabled={isActive && isGroupLoaded}
                                travelerCollectionId={collectionIdForAttribution}>
                                {groupBody}
                            </TourLiveDataBatchProvider>
                        )
                        })

                        // Public collections: wrap ALL day-groups in ONE provider
                        // so a single SSE call covers every visible experience
                        // (prevents the per-group concurrent-mint race that yielded
                        // duplicate AttributionContext rows). Private: just render
                        // the per-group providers as siblings.
                        if (isPublicCollection) {
                            return (
                                <TourLiveDataBatchProvider
                                    items={aggregatedBatchItems}
                                    enabled={isActive}
                                    travelerCollectionId={collectionIdForAttribution}>
                                    {groupNodes}
                                </TourLiveDataBatchProvider>
                            )
                        }
                        return groupNodes
                    })()}
                    {tripboardExploreActivitiesLink && (
                        <TripboardExploreMoreCard
                            variant="activities"
                            subtitle={`Search activities in ${tripboardExploreActivitiesLink.cityLabel} for ${tripboardExploreActivitiesLink.subtitleDateRange}`}
                            to={tripboardExploreActivitiesLink.to}
                            openInNewTab
                            buttonPage={fallbackMode === 'tripboard' ? TRIPBOARD_V1_BUTTON_PAGE : POSTHOG_PAGES.COLLECTION_PAGE}
                            trackingExtra={{
                                explore_city_name: tripboardExploreActivitiesLink.cityLabel,
                                explore_date_range_label: tripboardExploreActivitiesLink.subtitleDateRange,
                                explore_country_id: exploreCountryId
                            }}
                        />
                    )}
                </div>
            )}

            {/* Date Edit Modal */}
            {editingExperienceId && (
                <EditExperienceDateModal
                    isOpen={!!editingExperienceId}
                    onClose={() => setEditingExperienceId(null)}
                    startDate={editingStartDate}
                    endDate={editingEndDate}
                    onSave={handleSaveDates}
                    isLoading={isSavingDates}
                />
            )}

            {/* City picker — same mount used by the Explore / Shortlist branches. */}
            {exploreCityModalEl}

            {/* Search and Add Experience Modal */}
            {canAddExperience && (
                <SearchAndAddExperienceModal
                    isOpen={isAddExperienceModalOpen}
                    onClose={() => setIsAddExperienceModalOpen(false)}
                    collectionIdentifier={collectionIdentifier}
                    baseCityId={selectedCityId ?? ''}
                    nextSectionsOrder={nextSectionsOrder}
                    addExperienceApi={api}
                    variant={canAddExperienceProp ? 'tripboard' : 'collection'}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier] })
                        queryClient.invalidateQueries({ queryKey: ['traveler-collection', collectionIdentifier] })
                        queryClient.invalidateQueries({ queryKey: ['tripBudget'] })
                    }}
                />
            )}
        </div>
    )
}

export default ExperienceTab
