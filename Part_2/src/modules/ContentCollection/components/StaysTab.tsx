import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query'
import { importCompletedItinerary } from '@/modules/Itinerary/hooks/ItineraryHook'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { Map as MapIcon, Sparkles, Heart, ExternalLink, Info, Search, SlidersHorizontal } from 'lucide-react'
import StaysBulkActionButtons from './StaysBulkActionButtons'
import Typography from '@/components/shared/Typography'
import { useStaysGuestsData } from '../hooks/useStaysGuestsData'
import { useItineraryCities } from '../hooks/useItineraryCities'
import RoomsGuestsFilterChip from './RoomsGuestsFilterChip'
import FilterChip from './FilterChip'
import type { BudgetRange } from './StaysTabFilterModal'
import { useStaysOccupancies } from '../hooks/useStaysOccupancies'
import { flattenOccupancies, encodeOccupancies } from '@/types/occupancy'
import type { OccupanciesConfig } from '@/types/occupancy'
import StaysCardWrapper from './StaysCardWrapper'
import type { AccommodationMetadataItem } from '@/pages/Stays/Apis/accommodationsAPI'
import { getAccommodationFilters } from '@/pages/Stays/Apis'
import type { Amenities } from '@/pages/Stays/Types/accommodationFiltersTypes'
import { useFilterRatesHistogram } from '../hooks/useFilterRatesHistogram'
import { updateTripPartial } from '@/api/trip/tripAPI'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { useUserInfo } from '@/hooks/useUserInfo'
import { FilterMobileSheet } from '@/pages/Stays/Components/FilterMobileSheet'
import { SortMobileSheet } from '@/pages/Stays/Components/SortMobileSheet'
import { FilterDialog } from '@/pages/Stays/Components/FilterDialog'
import { SortModal } from '@/pages/Stays/Components/SortModal'
import type { FilterConfig, SortConfig } from '@/components/common/SearchHeader'
import { useIsMobile } from '@/hooks/use-mobile'
import { useHideOnScrollDown } from '@/hooks/useHideOnScrollDown'
import CityDateFilterCarousel, { buildCityDateGroupsFromStays, formatCompactDateRange } from './CityDateFilterCarousel'
import EditExperienceDateModal from './EditExperienceDateModal'
import ExploringDatesBanner from './ExploringDatesBanner'
import SearchStaysModal from './SearchStaysModal'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { isPastDate, getTomorrowDate, formatDateStringToYMD } from '@/utils/dateUtils'
import { formatDayLabel } from '../utils/dateUtils'
import { buildCorrectedDatesMap, computeUncoveredWindowGap, groupStaysByDate, getSectionIdsForGroup } from '../utils/staysDateGrouping'
import { resolveStayCardData } from '../utils/staysEnrichmentUtils'
// Distance-to-nearest-activity badges on stay cards are disabled.
// import { buildDistanceLocationTag, findNearestActivity } from '../utils/nearestActivityUtils'
import {
    STAYS_PARAMS,
    STAYS_EXP_PARAMS,
    writeGroupToParams,
    findGroupKeyFromParams,
    readGroupFromParams,
    resolveEffectiveStaysDates,
    pickItineraryWindow
} from '../utils/cityDateFilter'
import { buildStaysExploreQueryString, buildStaysExploreLinkTo } from '../utils/tripboardExploreLinks'
import { countShortlistForCity, countShortlistForCityWindow, resolveStaysViewMode } from '../utils/tripboardStaysUtils'
import { buildShortlistDedupeClustersWithResolver, getShortlistDedupeKey } from '../utils/staysShortlistDedupe'

import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS } from '@/modules/amplitude/components/posthogEventDetails'
import { TRIPBOARD_V1_BUTTON_PAGE } from '@/constants/posthogEvents'
import SectionComments from './SectionComments'

import StaysExploreSection from './StaysExploreSection'
import TripboardExploreMoreCard from './TripboardExploreMoreCard'
import type { Accommodation } from '@/pages/Stays/Types/accommodationTypes'
import type { StaysTabProps, CollectionApi } from '../types/staysTabTypes'
import { PROPERTY_TYPE_FILTER_LABELS, parseOrderBy } from '../types/staysTabTypes'
// Types, constants, and CollectionApi are in ../types/staysTabTypes.ts

const StaysTab: React.FC<StaysTabProps> = ({
    isStaysLoading,
    staysData,
    stayMetadataMap,
    onDatesChange,
    collectionIdentifier,
    staySectionMap,
    staySectionMetadataMap,
    api = contentCollectionApi,
    showAddToCollection = false,
    allowDateEdit = false,
    buttonPage = 'Stays_tab',
    stayPricesMap,
    isFilterOpen,
    isSortOpen,
    onFilterOpenChange,
    onSortOpenChange,
    countryIds,
    onDeleteSection,
    onDeleteExploreStay,
    showExploreToggle = true,
    isDeleting = false,

    sectionBlocksMap,
    collectionType = 'content',
    queryKeyPrefix = 'content-collection',
    fallbackMode = 'traveler',
    hideExactDates = false,
    tripStartDate,
    itineraryDays,
    itineraryStays,
    routeSummary,
    bulkSelection,
    tripBudgetRange,
    tripGroupSetup: _tripGroupSetup,
    tripTravelPurpose,
    tripId,
    enrichedStaysMap,
    onExploreAccommodationsLoaded,
    mapElement,
    headerPortalRef,
    onMapViewClick,
    hasMapPanel,
    isActive = true,
    exploreActivities = [],
    exploreActivitiesLoading = false,
    hideSelectItineraryButton = false,
    hideGuestFilterAndExplore = false,
    shortlistSections,
    isReadOnly = false
}) => {
    const bulkSelectMode = bulkSelection?.mode ?? false
    const selectedSectionIds = bulkSelection?.selectedSectionIds
    const onToggleSectionSelect = bulkSelection?.onToggleSectionSelect
    const showBulkSelectionControls = Boolean(bulkSelection)
    const onToggleBulkSelectMode = bulkSelection?.onToggleMode
    const onBulkDeleteSelected = bulkSelection?.onDeleteSelected
    const onBulkSelectAll = bulkSelection?.onSelectAllVisible
    const [searchParams, setSearchParams] = useSearchParams()
    const queryClient = useQueryClient()
    const isMobile = useIsMobile()
    // Mobile: collapse the secondary controls row (guests/Filters/toggle) while
    // scrolling down the listing; primary city/date chip row stays pinned.
    const hideSecondaryHeader = useHideOnScrollDown()
    const { trackButtonClickCustom } = usePostHog()

    // State for mobile map toggle (only relevant when mapElement is provided)
    const [mobileShowMap, setMobileShowMap] = useState(false)

    // Per-city budget overrides (in-memory only — clears on reload).
    // Resolution: cityBudgetOverrides[cityId] ?? tripBudgetRange.
    const [cityBudgetOverrides, setCityBudgetOverrides] = useState<Record<string, BudgetRange>>({})

    // State for date edit modal
    const [editingStayId, setEditingStayId] = useState<string | null>(null)
    const [editingStartDate, setEditingStartDate] = useState<string | null | undefined>(null)
    const [editingEndDate, setEditingEndDate] = useState<string | null | undefined>(null)
    const [isSavingDates, setIsSavingDates] = useState(false)

    // City-level date edit (no saved-stay required). Used when the user
    // lands on an empty-rates / zero-hotels / timeout state and needs to
    // pick different dates, or when the carousel pencil is clicked for a
    // city with no saved stays yet. Only writes to URL params — it doesn't
    // touch any section metadata (that's the saved-stay flow above).
    const [cityDateEditOpen, setCityDateEditOpen] = useState(false)
    const [cityDateEditInitial, setCityDateEditInitial] = useState<{
        cityId: string
        checkIn: string
        checkOut: string
    } | null>(null)
    // selectedGroupKey is no longer local state — it's derived from city_id URL param
    // to keep chips, displayed stays, and parent price queries all in sync
    // "For You" / "Shortlist" toggle — URL-persisted so the view is shareable
    // and survives refresh. URL key: stays_view.
    // Default: Shortlist when the currently-selected city already has any
    // saved stays, For You otherwise. Explicit URL values ('for_you' /
    // 'shortlist') always win so user toggles persist across city changes.
    // When showExploreToggle=false (non-tripboard contexts), always locked to shortlist.
    const staysViewMode = useMemo(() => {
        if (!showExploreToggle) return 'shortlist' as const
        return resolveStaysViewMode(searchParams.get('stays_view'), searchParams.get(STAYS_PARAMS.city), staysData, stayMetadataMap)
    }, [showExploreToggle, searchParams, staysData, stayMetadataMap])
    const setStaysViewMode = useCallback(
        (next: 'for_you' | 'shortlist') => {
            const params = new URLSearchParams(searchParams)
            // Always write — the absence-means-for_you convention was
            // replaced by city-aware defaulting above, so we need an
            // explicit value to pin the user's choice.
            params.set('stays_view', next)
            setSearchParams(params, { replace: true })
        },
        [searchParams, setSearchParams]
    )

    // When the user switches to Shortlist, lazily refresh the collection so the
    // list is always up-to-date. We deliberately do NOT invalidate inside
    // StaysExploreSection.handleAddStay — doing so immediately causes a
    // re-render storm across TripboardPage while the user is still in For You.
    useEffect(() => {
        if (staysViewMode === 'shortlist' && collectionIdentifier) {
            queryClient.invalidateQueries({
                queryKey: ['traveler-collection', collectionIdentifier, 'stays']
            })
        }
    }, [staysViewMode, collectionIdentifier, queryClient])

    // When the user switches to a different city, drop any pinned
    // `stays_view` preference so the city-aware default (Shortlisted
    // when the new city has saved stays, For You otherwise) takes over.
    // Initial mount is skipped so deep-links with an explicit
    // `stays_view` param are honoured on first load.
    const prevStaysCityRef = useRef<string | null>(null)
    useEffect(() => {
        const cityId = searchParams.get(STAYS_PARAMS.city)
        if (prevStaysCityRef.current === null) {
            prevStaysCityRef.current = cityId
            return
        }
        if (cityId !== prevStaysCityRef.current) {
            prevStaysCityRef.current = cityId
            if (searchParams.has('stays_view')) {
                const next = new URLSearchParams(searchParams)
                next.delete('stays_view')
                setSearchParams(next, { replace: true })
            }
        }
    }, [searchParams, setSearchParams])

    // State for unified stays search modal
    const [isSearchStaysModalOpen, setIsSearchStaysModalOpen] = useState(false)

    // Track if stays are being fetched (for loading state on date chip)
    const isStaysFetching = useIsFetching({ queryKey: ['collection-stays'] }) > 0

    // Filter state - only property types (hardcoded in frontend). The label
    // map intentionally aliases the legacy "Unknown" key to the same `hotel`
    // entry, so dedupe by id before exposing to the filter UI — otherwise two
    // identical "Hotels" tiles render.
    const propertyTypes = useMemo(() => {
        const seen = new Set<string>()
        return Object.values(PROPERTY_TYPE_FILTER_LABELS).filter((pt) => {
            if (seen.has(pt.id)) return false
            seen.add(pt.id)
            return true
        })
    }, [])
    const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>(() => searchParams.getAll('pt'))

    // For You filters — amenities + star rating + verification toggles. Hydrated
    // from URL so filter state survives refresh / share-link navigation.
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>(() => searchParams.getAll('am'))
    const [selectedStarRatings, setSelectedStarRatings] = useState<number[]>(() =>
        searchParams
            .getAll('star')
            .map((s) => Number(s))
            .filter((n) => !Number.isNaN(n))
    )
    const isVerifiedFilter = searchParams.get('is_verified') === 'true' ? true : null
    const isB2bDealAvailableFilter = searchParams.get('is_b2b_deal_available') === 'true' ? true : null

    // Count of active filters surfaced on the Filters chip badge. Budget is
    // intentionally excluded — it's persisted per-city on the trip, so
    // almost every user ends up with one and it would always show as +1.
    // Property types and amenities each contribute their selected-count;
    // star ratings collapse to a single +1 (multiple rating tiers feel like
    // one composite filter); each verification toggle is +1.
    const activeForYouFilterCount =
        selectedPropertyTypes.length +
        selectedAmenities.length +
        (selectedStarRatings.length > 0 ? 1 : 0) +
        (isVerifiedFilter === true ? 1 : 0) +
        (isB2bDealAvailableFilter === true ? 1 : 0)

    // ── City-date group selection via clean URL params ──
    // Stored as: stays_city=<id>&stays_checkin=2026-05-20&stays_checkout=2026-05-22
    // Internally reconstructed into a group key (e.g. "cityId::May 20 - May 22").
    const selectedCityId = useMemo(() => searchParams.get(STAYS_PARAMS.city) || null, [searchParams])

    // Shortlist count moved below — needs `itineraryCities` to scope to a
    // single (city, window) for return-trip cities so each chip's count
    // reflects only its own visit's saved stays.

    // availableCities is still needed for the filter config and AddExternalStaysModal.
    // Ordered by earliest known check-in date per city (chronological), falling
    // back to name when no dates are available — keeps city lists in trip order
    // rather than alphabetical so multi-city itineraries read left-to-right.
    const availableCities = useMemo(() => {
        const cityMap = new Map<string, { id: string; name: string; earliestDate: string | null }>()
        for (const stay of staysData) {
            const stayKey = stay.zentrum_hub_id || stay.id
            const metadata = stayMetadataMap.get(stayKey)
            const cityId = metadata?.city_id
            const cityName = metadata?.city_name
            if (!cityId || !cityName) continue
            const sectionId = staySectionMap?.get(stayKey)
            const sectionMetadata = sectionId ? staySectionMetadataMap?.get(sectionId) : undefined
            const startDate = (sectionMetadata as { start_date?: string | null } | undefined)?.start_date
            const ymd = startDate ? formatDateStringToYMD(startDate) : null
            const existing = cityMap.get(cityId)
            if (!existing) {
                cityMap.set(cityId, { id: cityId, name: cityName, earliestDate: ymd })
            } else if (ymd && (!existing.earliestDate || ymd < existing.earliestDate)) {
                existing.earliestDate = ymd
            }
        }
        return Array.from(cityMap.values())
            .sort((a, b) => {
                if (a.earliestDate && b.earliestDate) return a.earliestDate.localeCompare(b.earliestDate)
                if (a.earliestDate) return -1
                if (b.earliestDate) return 1
                return a.name.localeCompare(b.name)
            })
            .map(({ id, name }) => ({ id, name }))
    }, [staysData, stayMetadataMap, staySectionMap, staySectionMetadataMap])

    const { itineraryCities, effectiveCities } = useItineraryCities({
        fallbackMode,
        itineraryDays,
        availableCities,
        routeSummary
    })

    const isTripboardMode = fallbackMode === 'tripboard'

    // Build savedStayIds set for explore section badge detection
    const savedStayIds = useMemo(() => {
        const ids = new Set<string>()
        stayMetadataMap.forEach((meta, key) => {
            if (meta?.zentrum_hub_id) ids.add(meta.zentrum_hub_id)
            else ids.add(key)
        })
        return ids
    }, [stayMetadataMap])

    // YYYY-MM-DD → 1-based itinerary-day number. Drives the public-collection
    // chip labels (`Day N - (N+x)`) and the matcher in `effectiveStaysDates`.
    const dateToDay = useMemo(() => {
        const map = new Map<string, number>()
        if (!itineraryDays || itineraryDays.length === 0) return map
        itineraryDays.forEach((day, idx) => {
            const ymd = typeof day.date === 'string' ? day.date.slice(0, 10) : ''
            if (ymd) map.set(ymd, idx + 1)
        })
        return map
    }, [itineraryDays])

    // Single formatter for chip dateLabels. Public collections (hideExactDates)
    // render `Day N - (N+x)` where x = nights (to_date − from_date) so the
    // checkout day is shown explicitly — same convention the tripboard uses
    // for date-range chips. Everything else gets the date-range format.
    const formatChipLabelForRange = useCallback(
        (checkIn: string, checkOut: string): string => {
            if (!hideExactDates) return formatCompactDateRange(checkIn, checkOut)
            const startDay = dateToDay.get(checkIn)
            if (!startDay) return ''
            let nights = 0
            if (checkOut) {
                const start = new Date(`${checkIn}T00:00:00Z`)
                const end = new Date(`${checkOut}T00:00:00Z`)
                if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime())) {
                    nights = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000))
                }
            }
            return `Day ${startDay} - Day ${startDay + nights}`
        },
        [hideExactDates, dateToDay]
    )

    // Effective dates for downstream consumers (rates, viewport, shortlist,
    // add-to-itinerary, compare).
    //
    // Resolution order:
    //   1. stays_exp_* params (user explored custom dates) → isExploration=true.
    //   2. `stays_day` chip label matched against itinerary.stays — picks the
    //      chip's sub-range when a window is split per-hotel (route_summary
    //      RLE's by sleep_city only, so two hotels inside one Singapore stay
    //      produce one route_summary window but two chips).
    //   3. `stays_day` matched against itineraryCities — whole-window chips.
    //   4. pickItineraryWindow fallback (first window for the city).
    const effectiveStaysDates = useMemo(() => {
        const fromResolve = resolveEffectiveStaysDates(searchParams, itineraryCities)
        // Exploration overlay only exists in tripboard (date editor writes
        // stays_exp_*). Public + traveler collections always resolve via
        // the chip path below.
        if (fallbackMode === 'tripboard' && fromResolve.isExploration) return fromResolve

        const cityParam = searchParams.get(STAYS_PARAMS.city)
        const dayParam = searchParams.get('stays_day')
        if (!cityParam || !dayParam) return fromResolve

        // Match a saved itinerary stay whose date range formats to the
        // chip's dateLabel — gives sub-range chips their actual dates.
        if (itineraryStays && itineraryStays.length > 0) {
            const match = itineraryStays.find((s) => {
                if (s.city_id !== cityParam || !s.check_in_date || !s.check_out_date) return false
                const ci = s.check_in_date.slice(0, 10)
                const co = s.check_out_date.slice(0, 10)
                return formatChipLabelForRange(ci, co) === dayParam
            })
            if (match?.check_in_date && match?.check_out_date) {
                return {
                    checkIn: match.check_in_date.slice(0, 10),
                    checkOut: match.check_out_date.slice(0, 10),
                    isExploration: false,
                    window: fromResolve.window
                }
            }
        }

        // Whole-window chip: dateLabel matches a route_summary window.
        if (itineraryCities) {
            const win = itineraryCities.find((c) => c.id === cityParam && formatChipLabelForRange(c.checkIn, c.checkOut) === dayParam)
            if (win) {
                return { checkIn: win.checkIn, checkOut: win.checkOut, isExploration: false, window: win }
            }
        }

        return fromResolve
    }, [searchParams, itineraryCities, itineraryStays, fallbackMode, formatChipLabelForRange])
    const isExploringDates = effectiveStaysDates.isExploration

    // Get selected city data for explore section.
    // Fallback chain (URL > itinerary > saved-stay metadata) so a null here
    // only occurs when there is truly nothing to fetch. Previously this
    // required the URL city to exist in `itineraryCities` — which meant trips
    // whose `itineraryDays` arrive without populated `base_city`/
    // `destination_city` (backend schema drift) resolved to null and
    // StaysExploreSection got empty-string props, silently blocking all
    // explore API calls.
    const selectedExploreCity = useMemo(() => {
        const urlCityId = searchParams.get(STAYS_PARAMS.city)

        const nameForId = (id: string): string => {
            const itinMatch = itineraryCities?.find((c) => c.id === id)
            if (itinMatch?.name) return itinMatch.name
            const availMatch = availableCities.find((c) => c.id === id)
            return availMatch?.name ?? ''
        }

        const checkIn = effectiveStaysDates.checkIn
        const checkOut = effectiveStaysDates.checkOut

        if (urlCityId) {
            return { id: urlCityId, name: nameForId(urlCityId), checkIn, checkOut }
        }

        // No URL city — default to first itinerary city (bridge before the
        // auto-select effect writes the URL).
        if (itineraryCities && itineraryCities.length > 0) {
            const first = itineraryCities[0]
            return {
                ...first,
                checkIn: checkIn || first.checkIn,
                checkOut: checkOut || first.checkOut
            }
        }

        // No itinerary cities — fall back to a saved-stay city (if any)
        // combined with whatever effective dates we computed (may be empty).
        if (availableCities.length > 0 && checkIn && checkOut) {
            const first = availableCities[0]
            return { id: first.id, name: first.name, checkIn, checkOut }
        }

        return null
    }, [itineraryCities, availableCities, searchParams, effectiveStaysDates])

    // Handle adding stay from explore section
    const handleAddExploreStay = useCallback(
        async (stay: Accommodation) => {
            if (!collectionIdentifier || !api.addStayToCollection) return
            const cityData = selectedExploreCity
            // Effective dates = exploration overlay (when present) or
            // itinerary window for the selected city. Mirrors what the user
            // is actually filtering on, so a shortlisted stay carries those
            // dates onto the section metadata.
            const filterCheckIn = cityData?.checkIn
            const filterCheckOut = cityData?.checkOut
            await api.addStayToCollection(collectionIdentifier, stay.zentrum_hub_id, stay.name, undefined, undefined, {
                banner_img: stay.content?.[0] ?? '',
                city_id: stay.base_city_info?.id ?? cityData?.id ?? '',
                city_name: stay.base_city_info?.name ?? cityData?.name ?? '',
                category: stay.category ?? '',
                accommodation_id: stay.id,
                start_date: filterCheckIn,
                end_date: filterCheckOut
            })
        },
        [collectionIdentifier, api, selectedExploreCity, searchParams]
    )

    // Handle removing (un-shortlisting) a stay from the For You explore section.
    // Uses onDeleteExploreStay (targeted stays-only invalidation) when available,
    // falling back to onDeleteSection for non-tripboard contexts.
    const handleRemoveExploreStay = useCallback(
        async (zentrumHubId: string) => {
            if (!staySectionMap) return
            const sectionId = staySectionMap.get(zentrumHubId)
            if (!sectionId) return
            if (onDeleteExploreStay) {
                await onDeleteExploreStay(sectionId)
            } else if (onDeleteSection) {
                onDeleteSection(sectionId)
            }
        },
        [onDeleteExploreStay, onDeleteSection, staySectionMap]
    )

    // Active trip — read from context (resolved-budget memo below depends on it).
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip

    // Amenities metadata for the current For You city — drives the Amenities
    // section in the filter dialog. Lazy: only fetched when we have a city
    // and the For You tab is the relevant view.
    const exploreCityIdForFilters = selectedExploreCity?.id ?? ''
    const accommodationFiltersQuery = useQuery({
        queryKey: ['stays-tab-accommodation-filters', exploreCityIdForFilters],
        queryFn: () => getAccommodationFilters(exploreCityIdForFilters),
        enabled: Boolean(exploreCityIdForFilters),
        staleTime: HOURS_24
    })
    const allAmenities: Amenities | undefined = accommodationFiltersQuery.data?.data?.amenities

    // Resolved budget for the current explore city.
    // Priority: in-memory override → trip's saved per-city override → trip-wide default.
    const exploreCityIdForBudget = selectedExploreCity?.id ?? ''
    const tripCityBudget = exploreCityIdForBudget ? activeTrip?.stay_budget_range?.city_wise_preferences?.[exploreCityIdForBudget] : undefined
    const resolvedExploreBudget: BudgetRange | undefined =
        (exploreCityIdForBudget ? cityBudgetOverrides[exploreCityIdForBudget] : undefined) ?? tripCityBudget ?? tripBudgetRange

    // Auto-select first itinerary city + dates when user lands on the Stays tab
    // with no `stays_city` in URL. Gates:
    //   - Only fire when user is actually on the Stays tab (`tab=stays`). Tab bodies
    //     are mounted via display:none on TripboardPage, so this effect otherwise runs
    //     on every page load regardless of which tab is active.
    //   - Only fire when `itineraryCities` is populated (waits for the itinerary query
    //     in TripboardPage to resolve).
    //   - Never overwrite an explicit user selection — `hasAutoSelectedRef` guards the
    //     ref for the duration of a Stays-tab visit. Reset it when the user explicitly
    //     clears `stays_city` so a later arrival (e.g., from a deep link without city)
    //     can auto-select again.
    const hasAutoSelectedRef = useRef(false)
    const currentTab = searchParams.get('tab')
    const isOnStaysTab = currentTab === 'stays'
    useEffect(() => {
        if (!isOnStaysTab) return
        if (!isTripboardMode) return
        if (searchParams.get(STAYS_PARAMS.city)) {
            // Explicit city already in URL — do nothing, but mark as selected so
            // subsequent renders don't try to auto-select.
            hasAutoSelectedRef.current = true
            return
        }
        if (hasAutoSelectedRef.current) return

        // Prefer first itinerary city when available; otherwise fall back to a
        // saved-stay city. Either way we only proceed when we have a city id.
        const first =
            (itineraryCities && itineraryCities.length > 0 ? itineraryCities[0] : null) ||
            (availableCities.length > 0 ? { id: availableCities[0].id, name: availableCities[0].name, checkIn: '', checkOut: '' } : null)
        if (!first?.id) return

        const next = new URLSearchParams(searchParams)
        next.set(STAYS_PARAMS.city, first.id)
        // Date params intentionally NOT written. Itinerary windows are the
        // source of truth for chip + downstream consumers; stays_exp_* are
        // only set by the date editor when the user explores other dates.
        next.delete(STAYS_PARAMS.checkIn)
        next.delete(STAYS_PARAMS.checkOut)
        hasAutoSelectedRef.current = true
        setSearchParams(next, { replace: true })
    }, [isOnStaysTab, isTripboardMode, itineraryCities, availableCities, searchParams, setSearchParams])

    // Reset the auto-select guard when `stays_city` becomes absent again (e.g.
    // a later deep link without city). Otherwise the user would be stuck on an
    // empty selection.
    useEffect(() => {
        if (!searchParams.get(STAYS_PARAMS.city)) {
            hasAutoSelectedRef.current = false
        }
    }, [searchParams])

    // Tripboard mode treats itinerary windows as the chip's source of truth,
    // so any inbound stays_checkin/stays_checkout (legacy deep links, leftover
    // params from before this model) would otherwise quietly reintroduce the
    // drift. Strip them once on mount and any time they reappear.
    useEffect(() => {
        if (!isTripboardMode) return
        if (!searchParams.has(STAYS_PARAMS.checkIn) && !searchParams.has(STAYS_PARAMS.checkOut)) return
        const next = new URLSearchParams(searchParams)
        next.delete(STAYS_PARAMS.checkIn)
        next.delete(STAYS_PARAMS.checkOut)
        setSearchParams(next, { replace: true })
    }, [isTripboardMode, searchParams, setSearchParams])

    // Self-clear stays_exp_* once they coincide with the current itinerary
    // window for the selected city — happens when the user edits the
    // itinerary upstream until it matches their exploration dates, or when
    // the editor saves dates equal to the itinerary. Keeps URL clean and
    // hides the exploration banner without explicit action.
    useEffect(() => {
        if (!isTripboardMode) return
        const expIn = searchParams.get(STAYS_EXP_PARAMS.checkIn)
        const expOut = searchParams.get(STAYS_EXP_PARAMS.checkOut)
        if (!expIn || !expOut) return
        const cityId = searchParams.get(STAYS_PARAMS.city)
        if (!cityId || !itineraryCities) return
        const windowIndex = Number(searchParams.get(STAYS_EXP_PARAMS.window) || '0') || 0
        const window = pickItineraryWindow(itineraryCities, cityId, windowIndex)
        if (!window) return
        if (window.checkIn !== expIn || window.checkOut !== expOut) return
        const next = new URLSearchParams(searchParams)
        next.delete(STAYS_EXP_PARAMS.checkIn)
        next.delete(STAYS_EXP_PARAMS.checkOut)
        setSearchParams(next, { replace: true })
    }, [isTripboardMode, itineraryCities, searchParams, setSearchParams])

    // Initialize selected property types from URL params
    useEffect(() => {
        const pts = searchParams.getAll('pt')
        const ptsCsv = (searchParams.get('pt') ?? searchParams.get('property_types') ?? '').split(',').filter(Boolean)
        const initPts = pts.length ? pts : ptsCsv
        if (initPts.length) setSelectedPropertyTypes(initPts)
    }, [searchParams])

    // Derive current sort from URL
    const currentOrderBy = useMemo(() => parseOrderBy(searchParams), [searchParams])

    const { isAuthenticated } = useAuth()

    // Get user info to check user type
    const { isPremium, isRimigoInternal } = useUserInfo()

    // Determine if we should show dates and use itinerary dates
    // Show dates only when user is logged in, has trips, and is premium or rimigo_internal
    // For public users or regular travelers, show old view without dates
    const isRegularTraveler = isAuthenticated && !isPremium && !isRimigoInternal
    const isPublicView = !isAuthenticated

    const shouldShowDates = true
    const shouldUseItineraryDates = shouldShowDates && !!activeTrip?.itineraryRoute
    const shouldShowOldView = isPublicView || isRegularTraveler

    // Priority: trip.group_setup (persisted from wizard) > trip_preference > tripProfile
    const resolvedGroupSetup = activeTrip?.group_setup ?? activeTrip?.trip_preference?.group_setup ?? activeTrip?.tripProfile?.group_setup
    const guestsData = useStaysGuestsData(resolvedGroupSetup)

    const occupancies = useStaysOccupancies(resolvedGroupSetup)
    const rooms = occupancies.length

    const handleOccupanciesApply = useCallback(
        (newOccupancies: OccupanciesConfig) => {
            const next = new URLSearchParams(searchParams)
            const flat = flattenOccupancies(newOccupancies)
            next.set('occupancies', encodeOccupancies(newOccupancies))
            next.set('adults', String(flat.adults))
            next.set('children', String(flat.children))
            if (flat.childAges.length > 0) next.set('children_age', flat.childAges.join(','))
            else next.delete('children_age')
            if (flat.noOfRooms > 1) next.set('rooms', String(flat.noOfRooms))
            else next.delete('rooms')
            next.delete('infants')
            setSearchParams(next, { replace: true })
            queryClient.invalidateQueries({ queryKey: ['traveler-collection-stay-price'] })
        },
        [searchParams, setSearchParams, queryClient]
    )

    // Helper function to get dates for a stay from the itinerary.
    // Multi-window aware: when a city has multiple windows (return trip
    // A → B → A), match the stay to the window containing its section
    // start_date. Falls back to first window for the city when no section
    // dates are saved, then to activeTrip.itineraryRoute for backward compat.
    const getDatesForStayFromItinerary = useCallback(
        (stay: AccommodationMetadataItem): { checkIn: string; checkOut: string } | null => {
            if (!shouldUseItineraryDates) return null

            const stayKey = stay.zentrum_hub_id || stay.id
            const sectionMetadata = stayMetadataMap.get(stayKey)
            const cityId = sectionMetadata?.city_id
            if (!cityId) return null

            // Prefer per-window dates from `itineraryCities` (sorted by checkIn,
            // possibly multiple entries per city). itineraryRoute is lossy for
            // return trips so it's only a last resort.
            if (itineraryCities && itineraryCities.length > 0) {
                const windows = itineraryCities.filter((c) => c.id === cityId)
                if (windows.length > 0) {
                    // If this exact stay is in the itinerary, use its saved sub-range.
                    if (stay.zentrum_hub_id && itineraryStays && itineraryStays.length > 0) {
                        const matched = itineraryStays.find((s) => s.zentrum_hub_id && String(s.zentrum_hub_id) === String(stay.zentrum_hub_id))
                        if (matched?.check_in_date && matched?.check_out_date) {
                            return {
                                checkIn: matched.check_in_date.slice(0, 10),
                                checkOut: matched.check_out_date.slice(0, 10)
                            }
                        }
                    }

                    const sectionId = staySectionMap?.get(stayKey)
                    const meta = sectionId ? staySectionMetadataMap?.get(sectionId) : undefined
                    const sectionStart = (meta as { start_date?: string | null } | undefined)?.start_date
                    const startYMD = sectionStart ? formatDateStringToYMD(sectionStart) : null
                    const containing = startYMD ? windows.find((w) => startYMD >= w.checkIn && startYMD < w.checkOut) : null
                    const chosen = containing ?? windows[0]

                    // Collection-only stay in a partially-covered window → show
                    // the largest uncovered gap so rates target fillable dates.
                    if (itineraryStays && itineraryStays.length > 0) {
                        const stayInWindow = itineraryStays.filter((s) => {
                            if (s.city_id !== cityId || !s.check_in_date || !s.check_out_date) return false
                            const ci = s.check_in_date.slice(0, 10)
                            const co = s.check_out_date.slice(0, 10)
                            return ci < chosen.checkOut && co > chosen.checkIn
                        })
                        if (stayInWindow.length > 0) {
                            const gap = computeUncoveredWindowGap(chosen, stayInWindow)
                            if (gap) return { checkIn: gap.checkIn, checkOut: gap.checkOut }
                        }
                    }

                    return { checkIn: chosen.checkIn, checkOut: chosen.checkOut }
                }
            }

            const itinerarySegment = activeTrip?.itineraryRoute?.[cityId]
            if (!itinerarySegment?.start_date || !itinerarySegment?.end_date) return null
            return {
                checkIn: itinerarySegment.start_date,
                checkOut: itinerarySegment.end_date
            }
        },
        [
            shouldUseItineraryDates,
            activeTrip?.itineraryRoute,
            stayMetadataMap,
            itineraryCities,
            staySectionMap,
            staySectionMetadataMap,
            itineraryStays
        ]
    )

    // Helper function to get date from itinerary dates (priority), then section metadata, then sequential date logic, then tomorrow (if past dates are found)
    const getDateForStay = useCallback(
        (stay: AccommodationMetadataItem, previousStayDate: string | null): string => {
            // First priority: Try to get date from itinerary route (city-wise)
            if (shouldUseItineraryDates) {
                const itineraryDates = getDatesForStayFromItinerary(stay)
                if (itineraryDates?.checkIn) {
                    // Check if itinerary date is in the past, if so use tomorrow
                    if (isPastDate(itineraryDates.checkIn)) {
                        return getTomorrowDate()
                    }
                    return itineraryDates.checkIn
                }
            }

            // Second priority: Try to get date from section metadata
            const sectionId = staySectionMap?.get(stay.zentrum_hub_id || stay.id)
            const sectionMetadata = sectionId ? staySectionMetadataMap?.get(sectionId) : undefined
            if (sectionMetadata) {
                const metadata = sectionMetadata as { start_date?: string | null; end_date?: string | null }
                const dateStr = metadata.start_date || metadata.end_date
                if (dateStr) {
                    const formattedDate = formatDateStringToYMD(dateStr)
                    if (formattedDate) {
                        // Check if date is in the past, if so use tomorrow
                        if (isPastDate(formattedDate)) {
                            return getTomorrowDate()
                        }
                        return formattedDate
                    }
                }
            }

            // Sequential logic: if previous stay has a date, add 1 day
            if (previousStayDate) {
                try {
                    const prevDate = new Date(previousStayDate)
                    prevDate.setDate(prevDate.getDate() + 1)
                    const formattedDate = formatDateStringToYMD(prevDate)
                    if (formattedDate) {
                        // Check if sequential date is in the past, if so use tomorrow
                        if (isPastDate(formattedDate)) {
                            return getTomorrowDate()
                        }
                        return formattedDate
                    }
                } catch {
                    // Invalid date, fall through to tomorrow
                }
            }

            // Default to tomorrow's date (instead of today)
            return getTomorrowDate()
        },
        [staySectionMap, staySectionMetadataMap, shouldUseItineraryDates, getDatesForStayFromItinerary]
    )

    // Handle opening date edit modal
    const handleEditDateClick = useCallback(
        (stayId: string) => {
            const sectionId = staySectionMap?.get(stayId)
            if (!sectionId) {
                toast.error('Section ID not found for this stay')
                return
            }
            const sectionMetadata = staySectionMetadataMap?.get(sectionId)
            const metadata = sectionMetadata as { start_date?: string | null; end_date?: string | null } | undefined
            trackButtonClickCustom?.({
                buttonPage,
                buttonName: POSTHOG_EVENTS.STAYS_EDIT_DATE_CLICK,
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: {
                    stayId,
                    sectionId
                }
            })

            setEditingStayId(stayId)
            // Tripboard: seed the editor with the dates currently driving
            // downstream consumers (exploration overlay or itinerary window).
            // Section metadata is irrelevant in this mode — the chip mirrors
            // the itinerary regardless of saved dates.
            if (isTripboardMode && selectedExploreCity?.checkIn && selectedExploreCity?.checkOut) {
                setEditingStartDate(selectedExploreCity.checkIn)
                setEditingEndDate(selectedExploreCity.checkOut)
                return
            }
            // Use corrected dates (handling past dates) to match what's shown in the section heading
            // If no date is present, use tomorrow's date as default
            const correctedStartDate =
                metadata?.start_date && isPastDate(metadata.start_date) ? getTomorrowDate() : metadata?.start_date || getTomorrowDate()
            const correctedEndDate =
                metadata?.end_date && isPastDate(metadata.end_date)
                    ? (() => {
                          const tomorrow = new Date(getTomorrowDate())
                          tomorrow.setDate(tomorrow.getDate() + 1)
                          return tomorrow.toISOString().split('T')[0]
                      })()
                    : metadata?.end_date || null
            setEditingStartDate(correctedStartDate)
            setEditingEndDate(correctedEndDate)
        },
        [staySectionMap, staySectionMetadataMap, isTripboardMode, selectedExploreCity?.checkIn, selectedExploreCity?.checkOut]
    )

    // Add dates to stays - use itinerary dates if available, otherwise sequential logic
    const staysWithDates = useMemo(() => {
        if (shouldShowOldView) {
            // For public/regular travelers, don't add dates
            return staysData.map((stay) => ({ ...stay }))
        }

        let previousDate: string | null = null
        return staysData.map((stay) => {
            // Try itinerary dates first (priority)
            const itineraryDates = shouldUseItineraryDates ? getDatesForStayFromItinerary(stay) : null
            let checkInDate: string
            if (itineraryDates?.checkIn) {
                // Check if itinerary date is in the past, if so use tomorrow
                checkInDate = isPastDate(itineraryDates.checkIn) ? getTomorrowDate() : itineraryDates.checkIn
            } else {
                // Fallback to getDateForStay which will check itinerary, section metadata, sequential, then tomorrow
                checkInDate = getDateForStay(stay, previousDate)
            }
            previousDate = checkInDate
            return {
                ...stay,
                _checkInDate: checkInDate,
                _checkOutDate: itineraryDates?.checkOut
                    ? isPastDate(itineraryDates.checkOut)
                        ? (() => {
                              const tomorrow = new Date(getTomorrowDate())
                              tomorrow.setDate(tomorrow.getDate() + 1)
                              return tomorrow.toISOString().split('T')[0]
                          })()
                        : itineraryDates.checkOut
                    : null
            }
        })
    }, [staysData, getDateForStay, shouldShowOldView, shouldUseItineraryDates, getDatesForStayFromItinerary])

    // Handle filter apply
    const handleFilterApply = useCallback(
        (result: {
            propertyTypes: string[]
            amenities?: string[]
            cities?: string[]
            starRatings?: number[]
            isVerified?: boolean | null
            isB2bDealAvailable?: boolean | null
            budgetRange?: { min: number; max: number }
        }) => {
            trackButtonClickCustom?.({
                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                buttonName: 'stays_filter_apply',
                buttonAction: 'submit',
                extra: {
                    property_types: result.propertyTypes,
                    amenities: result.amenities,
                    star_ratings: result.starRatings,
                    is_verified: result.isVerified,
                    is_b2b_deal_available: result.isB2bDealAvailable
                }
            })
            const next = new URLSearchParams(searchParams)

            // Property types
            setSelectedPropertyTypes(result.propertyTypes)
            next.delete('pt')
            next.delete('property_types')
            if (result.propertyTypes.length) {
                result.propertyTypes.forEach((t: string) => next.append('pt', t))
                result.propertyTypes.forEach((t: string) => next.append('property_types', t))
            }

            // Amenities (For You only — harmless to write in shortlist mode)
            if (result.amenities !== undefined) {
                setSelectedAmenities(result.amenities)
                next.delete('am')
                next.delete('amenities')
                if (result.amenities.length) {
                    result.amenities.forEach((a: string) => next.append('am', a))
                    result.amenities.forEach((a: string) => next.append('amenities', a))
                }
            }

            // Star ratings (For You only)
            if (result.starRatings !== undefined) {
                setSelectedStarRatings(result.starRatings)
                next.delete('star')
                if (result.starRatings.length) {
                    result.starRatings.forEach((r: number) => next.append('star', String(r)))
                }
            }

            // Verification toggles (For You only, internal users)
            next.delete('is_verified')
            next.delete('is_b2b_deal_available')
            if (result.isVerified === true) next.set('is_verified', 'true')
            if (result.isB2bDealAvailable === true) next.set('is_b2b_deal_available', 'true')

            // Cities - use city_id as single source of truth (like ExperienceTab)
            if (result.cities !== undefined) {
                // Remove old city params
                next.delete('city')
                next.delete('cities')
                next.delete('city_id')
                // Set city_id if a city is selected (take first one if multiple)
                if (result.cities.length > 0) {
                    next.set('city_id', result.cities[0])
                }
            }

            // Budget — single budget for the active For You city. Persists to
            // the trip's `stay_budget_range.city_wise_preferences[cityId]` so
            // the choice survives reloads (matches the previous "Save to Trip"
            // behaviour from the standalone budget modal). Top-level min/max
            // and other cities' preferences are preserved via the merge.
            if (result.budgetRange && exploreCityIdForBudget) {
                const range = result.budgetRange
                // Optimistic in-memory override so the next render of the
                // explore section + slider picks up the new range without
                // waiting for the API + travelerTrips refetch round-trip.
                setCityBudgetOverrides((prev) => ({ ...prev, [exploreCityIdForBudget]: range }))

                if (tripId) {
                    const existing = activeTrip?.stay_budget_range
                    const merged = {
                        min: existing?.min ?? 0,
                        max: existing?.max ?? 0,
                        city_wise_preferences: {
                            ...(existing?.city_wise_preferences ?? {}),
                            [exploreCityIdForBudget]: range
                        }
                    }
                    updateTripPartial(tripId, { stay_budget_range: merged })
                        .then(() => {
                            queryClient.invalidateQueries({ queryKey: ['travelerTrips'] })
                            // Trip is now the source of truth — drop the
                            // in-memory override so resolution falls through
                            // to the persisted trip value on next render.
                            setCityBudgetOverrides((prev) => {
                                const { [exploreCityIdForBudget]: _drop, ...rest } = prev
                                return rest
                            })
                        })
                        .catch(() => {
                            toast.error('Could not save budget. Please try again.')
                        })
                }
            }

            setSearchParams(next, { replace: true })
        },
        [searchParams, setSearchParams, exploreCityIdForBudget, tripId, activeTrip?.stay_budget_range, queryClient]
    )

    // Handle filter clear
    const handleFilterClear = useCallback(() => {
        const next = new URLSearchParams(searchParams)
        next.delete('pt')
        next.delete('property_types')
        next.delete('am')
        next.delete('amenities')
        next.delete('star')
        next.delete('is_verified')
        next.delete('is_b2b_deal_available')
        next.delete('city')
        next.delete('cities')
        next.delete('city_id')
        setSelectedPropertyTypes([])
        setSelectedAmenities([])
        setSelectedStarRatings([])
        // city_id will be set to first city by useEffect if available
        setSearchParams(next, { replace: true })
    }, [searchParams, setSearchParams])

    // Handle sort apply
    const handleSortApply = useCallback(
        (result: { orderBy: Record<string, number> }) => {
            trackButtonClickCustom?.({
                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                buttonName: 'stays_sort_change',
                buttonAction: 'click',
                extra: { sort_by: result.orderBy }
            })
            const next = new URLSearchParams(searchParams)
            next.set('order_by', JSON.stringify(result.orderBy))
            setSearchParams(next, { replace: true })
        },
        [searchParams, setSearchParams]
    )

    const { histogram: filterPriceHistogram, isReady: isFilterPriceHistogramReady } = useFilterRatesHistogram({
        cityId: exploreCityIdForBudget,
        checkIn: selectedExploreCity?.checkIn ?? '',
        checkOut: selectedExploreCity?.checkOut ?? '',
        guestsData,
        enabled: staysViewMode === 'for_you'
    })

    // Filter config — For You exposes Status/Property type/Amenities/Rating
    // (mirroring StaysExplore); Shortlist keeps the existing Property type +
    // Cities behaviour.
    const emptyAmenities: Amenities = useMemo(() => ({ primary: [], essentials: [], features: [], location: [], services: [] }), [])
    const filterConfig: FilterConfig = useMemo(() => {
        if (staysViewMode === 'for_you') {
            return {
                enabled: true,
                type: 'stays',
                metadata: {
                    propertyTypes: propertyTypes,
                    amenities: allAmenities ?? emptyAmenities,
                    showVerificationFilters: isRimigoInternal,
                    showStarRatings: true,
                    priceHistogram: isFilterPriceHistogramReady ? filterPriceHistogram : undefined,
                    priceHistogramLoading: !isFilterPriceHistogramReady
                },
                initialData: {
                    selectedPropertyTypes,
                    selectedAmenities,
                    selectedStarRatings,
                    isVerified: isVerifiedFilter,
                    isB2bDealAvailable: isB2bDealAvailableFilter,
                    budgetRange: resolvedExploreBudget
                },
                onChange: () => {},
                onApply: handleFilterApply,
                onClear: handleFilterClear
            }
        }
        return {
            enabled: true,
            type: 'stays',
            metadata: {
                propertyTypes: propertyTypes,
                amenities: emptyAmenities,
                cities: effectiveCities
            },
            initialData: {
                selectedPropertyTypes,
                selectedAmenities: [],
                selectedCities: selectedCityId ? [selectedCityId] : []
            },
            onChange: () => {},
            onApply: handleFilterApply,
            onClear: handleFilterClear
        }
    }, [
        staysViewMode,
        propertyTypes,
        allAmenities,
        emptyAmenities,
        isRimigoInternal,
        effectiveCities,
        selectedPropertyTypes,
        selectedAmenities,
        selectedStarRatings,
        isVerifiedFilter,
        isB2bDealAvailableFilter,
        selectedCityId,
        filterPriceHistogram,
        isFilterPriceHistogramReady,
        resolvedExploreBudget,
        handleFilterApply,
        handleFilterClear
    ])

    // Sort config
    const sortConfig: SortConfig = useMemo(
        () => ({
            enabled: true,
            type: 'stays',
            metadata: {
                sortOptions: [
                    {
                        id: 'relevance',
                        label: 'Relevance',
                        description: 'Best match for your search',
                        orderBy: { relevance: -1 }
                    },
                    {
                        id: 'price_low',
                        label: 'Price: Low to High',
                        description: 'Lowest price first',
                        orderBy: { rate: 1 }
                    },
                    {
                        id: 'price_high',
                        label: 'Price: High to Low',
                        description: 'Highest price first',
                        orderBy: { rate: -1 }
                    }
                ]
            },
            initialData: {
                currentOrderBy: currentOrderBy
            },
            onChange: () => {
                // Optional: Real-time preview (not needed for sort)
            },
            onApply: handleSortApply
        }),
        [currentOrderBy, handleSortApply]
    )

    // Corrected dates for ALL stays (before city/group filtering) — used by the filter carousel
    const allStaysCorrectedDatesMap = useMemo(
        () =>
            buildCorrectedDatesMap(
                staysWithDates,
                staySectionMap,
                staySectionMetadataMap,
                fallbackMode,
                stayMetadataMap,
                itineraryCities,
                itineraryStays
            ),
        [staysWithDates, staySectionMap, staySectionMetadataMap, fallbackMode, stayMetadataMap, itineraryCities, itineraryStays]
    )

    // City+date groups built from all stays (property-type-filtered only) for the filter carousel
    const cityDateGroups = useMemo(() => {
        const itineraryCityIds = itineraryCities ? new Set(itineraryCities.map((c) => c.id)) : null
        const filteredStays = staysWithDates.filter((stay) => {
            const stayKey = stay.zentrum_hub_id || stay.id
            const meta = stayMetadataMap.get(stayKey)

            if (selectedPropertyTypes.length > 0) {
                const cat = meta?.category ? meta.category.toLowerCase() : 'unknown'
                const key = cat === 'unknown' ? 'hotel' : cat
                const label = PROPERTY_TYPE_FILTER_LABELS[key]
                const passesType = label ? selectedPropertyTypes.includes(label.id) : selectedPropertyTypes.includes('hotel')
                if (!passesType) return false
            }

            // Orphan-city stays remain on the collection but must not surface a
            // stale chip — only show stays whose city is in the live itinerary.
            if (itineraryCityIds) {
                const cityId = meta?.city_id
                if (!cityId || !itineraryCityIds.has(cityId)) return false
            }

            return true
        })
        let groups = buildCityDateGroupsFromStays(filteredStays, allStaysCorrectedDatesMap, stayMetadataMap)
        // In tripboard mode, ensure every itinerary window appears in the
        // carousel — including return-trip second visits (A → B → A produces
        // two A windows). Dedupe by `(cityId, dateLabel)` rather than cityId
        // alone, otherwise the second visit is silently dropped whenever any
        // saved stay exists in that city.
        // Carousel chip extras: ensure every route_summary stay (or
        // computeItineraryWindows fallback) surfaces a chip — even when
        // the collection has no saved stays for that city. Works for all
        // surfaces that pass an itinerary (tripboard, traveler, public).
        if (itineraryCities) {
            const existingKeys = new Set(groups.map((g) => `${g.cityId}::${g.dateLabel}`))
            for (const city of itineraryCities) {
                const dateLabel = formatCompactDateRange(city.checkIn, city.checkOut)
                const groupKey = `${city.id}::${dateLabel}`
                if (existingKeys.has(groupKey)) continue
                // Skip the window-wide fallback chip when any group's stays
                // already cover (fully or partially) this window — sub-range
                // chips like "Jun 13 - Jun 15" + "Jun 15 - Jun 16" already
                // represent the user's stays; the window-wide "Jun 13 - Jun 16"
                // chip would be a stale duplicate.
                const hasGroupInsideWindow = groups.some((g) => {
                    if (g.cityId !== city.id) return false
                    const sample = g.stays[0]
                    if (!sample) return false
                    const stayKey = sample.zentrum_hub_id || sample.id
                    const dates = allStaysCorrectedDatesMap.get(stayKey)
                    if (!dates?.checkIn || !dates?.checkOut) return false
                    return dates.checkIn < city.checkOut && dates.checkOut > city.checkIn
                })
                if (hasGroupInsideWindow) continue
                existingKeys.add(groupKey)
                groups.push({
                    key: groupKey,
                    cityId: city.id,
                    cityName: city.name,
                    dateLabel,
                    stays: []
                })
            }
            // Re-sort after appending itinerary-only (stay-less) cities so the
            // whole list reads chronologically. Match each group to its
            // itinerary window via dateLabel — keying by city alone is lossy
            // for return trips (A → B → A produces two A windows).
            const findWindowCheckIn = (cityId: string, dateLabel: string): string => {
                const wins = itineraryCities.filter((c) => c.id === cityId)
                const matched = wins.find((w) => formatCompactDateRange(w.checkIn, w.checkOut) === dateLabel)
                return (matched ?? wins[0])?.checkIn || ''
            }
            groups.sort((a, b) => {
                const aKey = a.stays[0]?.zentrum_hub_id || a.stays[0]?.id || ''
                const bKey = b.stays[0]?.zentrum_hub_id || b.stays[0]?.id || ''
                const aDate = allStaysCorrectedDatesMap.get(aKey)?.checkIn || findWindowCheckIn(a.cityId, a.dateLabel)
                const bDate = allStaysCorrectedDatesMap.get(bKey)?.checkIn || findWindowCheckIn(b.cityId, b.dateLabel)
                return aDate.localeCompare(bDate)
            })
        }
        if (!hideExactDates) return groups

        // Public-collection (hideExactDates) chip strip — show "Day N - Day M"
        // labels instead of date ranges. Prefer route_summary windows (via
        // itineraryCities) so return-trip stays (A → B → A) get their own
        // chips and day-trip-only cities (Mount Cook on an itineraryDays
        // base_city slot but never a sleep_city) don't surface a spurious
        // chip. Falls back to the legacy base_city segment walk below when
        // itineraryCities is unavailable.
        if (itineraryCities && itineraryDays && itineraryDays.length > 0) {
            // Distribute stays across windows by (cityId, date overlap). When
            // a city has multiple windows (return trip), match each stay to
            // the window covering its corrected start_date; falls back to
            // every window for that city when no date is known.
            const cityIdForStayKey = new Map<string, string>()
            stayMetadataMap.forEach((meta, key) => {
                if (meta?.city_id) cityIdForStayKey.set(key, meta.city_id)
            })
            const allStays = new Map<string, (typeof groups)[0]['stays'][0]>()
            for (const g of groups) {
                for (const stay of g.stays) {
                    const k = stay.zentrum_hub_id || stay.id
                    if (!allStays.has(k)) allStays.set(k, stay)
                }
            }

            const out = itineraryCities.map((w) => {
                const dayLabel = formatChipLabelForRange(w.checkIn, w.checkOut)
                const chipStays: (typeof groups)[0]['stays'] = []
                for (const [stayKey, stay] of allStays) {
                    if (cityIdForStayKey.get(stayKey) !== w.id) continue
                    const dates = allStaysCorrectedDatesMap.get(stayKey)
                    const ci = dates?.checkIn
                    // Date-aware bucketing only when corrected dates exist
                    // AND the city has multiple windows. Otherwise attach
                    // unconditionally (the carousel-extras dedupe pass would
                    // otherwise drop empty chips for return-trip second
                    // visits).
                    const cityWindowCount = itineraryCities.filter((c) => c.id === w.id).length
                    if (cityWindowCount > 1 && ci) {
                        if (ci >= w.checkIn && ci < w.checkOut) chipStays.push(stay)
                    } else {
                        chipStays.push(stay)
                    }
                }
                return {
                    key: `${w.id}::${dayLabel}`,
                    cityId: w.id,
                    cityName: w.name,
                    dateLabel: dayLabel,
                    stays: chipStays
                }
            })
            return out
        }

        // Legacy fallback: walk itineraryDays grouping by base_city.id.
        // Only reached when route_summary's itineraryCities is unavailable
        // (route-summary endpoint absent / errored).
        if (!itineraryDays || itineraryDays.length === 0) {
            // No itinerary — fall back to just showing city names without day labels
            const cityMap = new Map<string, { cityId: string; cityName: string; stays: (typeof groups)[0]['stays'] }>()
            for (const group of groups) {
                const existing = cityMap.get(group.cityId)
                if (existing) {
                    existing.stays = [...existing.stays, ...group.stays]
                } else {
                    cityMap.set(group.cityId, { cityId: group.cityId, cityName: group.cityName, stays: [...group.stays] })
                }
            }
            return [...cityMap.values()].map((c) => ({
                key: `${c.cityId}::`,
                cityId: c.cityId,
                cityName: c.cityName,
                dateLabel: '',
                stays: c.stays
            }))
        }

        // Build city segments from itinerary: consecutive days in the same city
        type CitySegment = { cityId: string; cityName: string; startDay: number; endDay: number }
        const segments: CitySegment[] = []
        for (let i = 0; i < itineraryDays.length; i++) {
            const day = itineraryDays[i]
            const city = day.base_city || day.destination_city
            if (!city) continue
            const prev = segments.length > 0 ? segments[segments.length - 1] : null
            if (prev && prev.cityId === city.id) {
                prev.endDay = i + 1
            } else {
                segments.push({ cityId: city.id, cityName: city.name, startDay: i + 1, endDay: i + 1 })
            }
        }

        // Build a city_id → city_name map from stayMetadataMap for matching
        const stayCityMap = new Map<string, string>()
        stayMetadataMap.forEach((meta, key) => {
            if (meta?.city_id) stayCityMap.set(key, meta.city_id)
        })

        // Assign stays to segments based on city_id match
        // If a city has multiple segments, distribute stays to all matching segments
        type SegmentGroup = CitySegment & { stays: (typeof groups)[0]['stays'] }
        const segmentGroups: SegmentGroup[] = segments.map((s) => ({ ...s, stays: [] }))

        // Collect all unique stays across all groups
        const allStays = new Map<string, (typeof groups)[0]['stays'][0]>()
        for (const group of groups) {
            for (const stay of group.stays) {
                const key = stay.zentrum_hub_id || stay.id
                if (!allStays.has(key)) allStays.set(key, stay)
            }
        }

        // Assign each stay to matching segment(s) by city_id
        for (const [stayKey, stay] of allStays) {
            const stayCityId = stayCityMap.get(stayKey)
            if (!stayCityId) continue
            for (const sg of segmentGroups) {
                if (sg.cityId === stayCityId) {
                    sg.stays.push(stay)
                }
            }
        }

        // Filter out empty segments and build final groups
        return segmentGroups
            .filter((sg) => sg.stays.length > 0)
            .map((sg) => {
                const dayLabel = sg.startDay === sg.endDay ? `Day ${sg.startDay}` : `Day ${sg.startDay} - Day ${sg.endDay}`
                return {
                    key: `${sg.cityId}::${dayLabel}`,
                    cityId: sg.cityId,
                    cityName: sg.cityName,
                    dateLabel: dayLabel,
                    stays: sg.stays
                }
            })
    }, [
        staysWithDates,
        allStaysCorrectedDatesMap,
        stayMetadataMap,
        staySectionMap,
        staySectionMetadataMap,
        selectedPropertyTypes,
        hideExactDates,
        itineraryDays,
        isTripboardMode,
        itineraryCities,
        formatChipLabelForRange
    ])

    // Reconstruct group key from clean URL params.
    //   - hideExactDates: stays_city + stays_day (Day N label).
    //   - tripboard:      stays_city + stays_window (window index for return
    //                     trips); chip dateLabel comes from the itinerary so
    //                     we look up by window dates.
    //   - other:          stays_city + stays_checkin + stays_checkout.
    // If no valid match, fall back to first group.
    const effectiveSelectedGroupKey = useMemo(() => {
        if (cityDateGroups.length === 0) return null
        if (hideExactDates) {
            const cityParam = searchParams.get(STAYS_PARAMS.city)
            const dayParam = searchParams.get('stays_day')
            if (cityParam && dayParam) {
                const match = cityDateGroups.find((g) => g.cityId === cityParam && g.dateLabel === dayParam)
                if (match) return match.key
            }
            return cityDateGroups[0]?.key ?? null
        }
        if (isTripboardMode) {
            const cityParam = searchParams.get(STAYS_PARAMS.city)
            if (cityParam) {
                // Prefer per-chip `stays_day` so sub-range chips inside the
                // same itinerary window (Hotel A Jun 13-15 + Hotel B Jun 15-16
                // both inside one window) round-trip through the URL.
                const dayParam = searchParams.get('stays_day')
                if (dayParam) {
                    const exactDay = cityDateGroups.find((g) => g.cityId === cityParam && g.dateLabel === dayParam)
                    if (exactDay) return exactDay.key
                }
                const windowIndex = Number(searchParams.get(STAYS_EXP_PARAMS.window) || '0') || 0
                const window = pickItineraryWindow(itineraryCities, cityParam, windowIndex)
                if (window) {
                    const label = formatCompactDateRange(window.checkIn, window.checkOut)
                    const exact = cityDateGroups.find((g) => g.cityId === cityParam && g.dateLabel === label)
                    if (exact) return exact.key
                }
                const cityFallback = cityDateGroups.find((g) => g.cityId === cityParam)
                if (cityFallback) return cityFallback.key
            }
            return cityDateGroups[0]?.key ?? null
        }
        const matched = findGroupKeyFromParams(searchParams, STAYS_PARAMS, cityDateGroups, formatCompactDateRange)
        if (matched) return matched
        return cityDateGroups[0]?.key ?? null
    }, [cityDateGroups, searchParams, hideExactDates, isTripboardMode, itineraryCities])

    // Count of shortlisted stays scoped to the currently-selected chip.
    // In tripboard mode chips can be sub-ranges inside a single window
    // (Hotel A Jun 13-15 + Hotel B Jun 15-16 both inside the same Innsbruck
    // window), so the count must come from the active group's stays — not
    // the whole city or whole window. Falls back to plain city count outside
    // tripboard mode or before chip groups are computed.
    const shortlistCountForSelectedCity = useMemo(() => {
        if (!isTripboardMode || !selectedCityId || !itineraryCities) {
            return countShortlistForCity(staysData, stayMetadataMap, selectedCityId)
        }
        const windowsForCity = itineraryCities.filter((c) => c.id === selectedCityId)
        // Repeat-visit city: shortlist is city-wide on every visit's tab, so
        // the badge must be too (mirrors filteredAndSortedStaysData). Checked
        // before the group-scoped branch since the second visit's group is
        // stay-less and would otherwise count 0.
        if (windowsForCity.length > 1) {
            return countShortlistForCity(staysData, stayMetadataMap, selectedCityId)
        }
        if (effectiveSelectedGroupKey) {
            const selectedGroup = cityDateGroups.find((g) => g.key === effectiveSelectedGroupKey)
            if (selectedGroup) return selectedGroup.stays.length
        }
        if (windowsForCity.length === 0) {
            return countShortlistForCity(staysData, stayMetadataMap, selectedCityId)
        }
        const windowIndex = Number(searchParams.get(STAYS_EXP_PARAMS.window) || '0') || 0
        const selectedWindow = windowsForCity[Math.min(windowIndex, windowsForCity.length - 1)]
        return countShortlistForCityWindow(
            staysData,
            stayMetadataMap,
            staySectionMap,
            staySectionMetadataMap,
            selectedCityId,
            selectedWindow,
            windowsForCity
        )
    }, [
        isTripboardMode,
        selectedCityId,
        itineraryCities,
        searchParams,
        staysData,
        effectiveSelectedGroupKey,
        cityDateGroups,
        stayMetadataMap,
        staySectionMap,
        staySectionMetadataMap
    ])

    // Keep stays URL params in sync with the currently effective group.
    // This handles first load and filter-driven group changes (including date changes),
    // so explore links always read fresh city/date params.
    useEffect(() => {
        // Gated on isActive: deletes `city_id` which FoodTab also uses, so running while another tab is live wipes its filter.
        if (!isActive) return
        if (cityDateGroups.length === 0) return
        const selectedGroup = cityDateGroups.find((g) => g.key === effectiveSelectedGroupKey) ?? cityDateGroups[0]
        if (!selectedGroup) return

        const next = new URLSearchParams(searchParams)
        next.delete('city')
        next.delete('cities')
        next.delete('city_id')
        next.delete('stays_group')
        if (hideExactDates) {
            next.set(STAYS_PARAMS.city, selectedGroup.cityId)
            next.set('stays_day', selectedGroup.dateLabel)
            next.delete(STAYS_PARAMS.checkIn)
            next.delete(STAYS_PARAMS.checkOut)
        } else if (isTripboardMode) {
            next.set(STAYS_PARAMS.city, selectedGroup.cityId)
            // Itinerary windows drive the chip; legacy stays_checkin /
            // stays_checkout are not used in tripboard mode.
            next.delete(STAYS_PARAMS.checkIn)
            next.delete(STAYS_PARAMS.checkOut)
            // Carry the chip's exact dateLabel so sub-range chips inside the
            // same window (Hotel A 13-15 + Hotel B 15-16) are URL-distinct.
            if (selectedGroup.dateLabel) next.set('stays_day', selectedGroup.dateLabel)
            else next.delete('stays_day')
            const winsForCity = (itineraryCities ?? []).filter((c) => c.id === selectedGroup.cityId)
            if (winsForCity.length > 1) {
                const idx = winsForCity.findIndex((w) => formatCompactDateRange(w.checkIn, w.checkOut) === selectedGroup.dateLabel)
                if (idx > 0) next.set(STAYS_EXP_PARAMS.window, String(idx))
                else next.delete(STAYS_EXP_PARAMS.window)
            } else {
                next.delete(STAYS_EXP_PARAMS.window)
            }
        } else {
            next.delete('stays_day')
            let checkIn: string | undefined
            let checkOut: string | undefined
            if (selectedGroup.stays.length > 0) {
                const firstDates = allStaysCorrectedDatesMap.get(selectedGroup.stays[0]?.zentrum_hub_id || selectedGroup.stays[0]?.id || '')
                checkIn = firstDates?.checkIn
                checkOut = firstDates?.checkOut
            }
            // Fallback to itinerary city dates when no saved stays exist for this city.
            // Disambiguate by dateLabel — return trips (A → B → A) produce two
            // windows for the same cityId, and a plain `.find` would always return
            // the first one, sending the user to the wrong window.
            if (!checkIn && itineraryCities) {
                const matches = itineraryCities.filter((c) => c.id === selectedGroup.cityId)
                const itinCity = matches.find((c) => formatCompactDateRange(c.checkIn, c.checkOut) === selectedGroup.dateLabel) ?? matches[0]
                checkIn = itinCity?.checkIn
                checkOut = itinCity?.checkOut
            }
            writeGroupToParams(next, STAYS_PARAMS, selectedGroup.cityId, checkIn, checkOut)
        }

        if (next.toString() !== searchParams.toString()) {
            setSearchParams(next, { replace: true })
        }
    }, [
        isActive,
        cityDateGroups,
        effectiveSelectedGroupKey,
        searchParams,
        setSearchParams,
        allStaysCorrectedDatesMap,
        hideExactDates,
        isTripboardMode,
        itineraryCities
    ])

    // Hubs attached to the active itinerary — used to float the
    // itinerary stay to the very top of the Shortlist list, mirroring
    // the For You view's rank-0 bucket.
    //
    // Read from the `['itineraryCompleted', id]` query cache so this
    // matches what the card's "In your Itinerary" pill reads via
    // `useStayItineraryStatus`. The traveler-trips context can lag or
    // omit `stays`, which previously left the itinerary hotel sorted
    // as an ordinary shortlist entry.
    const activeItineraryId = activeTrip?.tripItinerary?.id ?? null
    const { data: completedItinerary } = useQuery({
        queryKey: ['itineraryCompleted', activeItineraryId ?? ''],
        queryFn: () => importCompletedItinerary(activeItineraryId!),
        enabled: Boolean(activeItineraryId),
        staleTime: HOURS_24,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 1
    })
    const itineraryHubIds = useMemo(() => {
        const set = new Set<string>()
        for (const s of completedItinerary?.stays ?? []) {
            if (s.zentrum_hub_id) set.add(s.zentrum_hub_id)
        }
        return set
    }, [completedItinerary?.stays])

    // Sort and filter staysData client-side
    const filteredAndSortedStaysData = useMemo(() => {
        let filtered = [...staysWithDates]

        // Apply property type filter based on category in metadata
        // Category is stored in section.metadata.category (e.g., "hotel", "apartment", etc.)
        if (selectedPropertyTypes.length > 0) {
            filtered = filtered.filter((stay) => {
                // Get category from stayMetadataMap (extracted from section.metadata.category)
                const sectionMetadata = stayMetadataMap.get(stay.zentrum_hub_id || stay.id)
                const category = sectionMetadata?.category

                // Normalize category: handle null/undefined, "Unknown", and case variations
                const normalizedCategory = category ? category.toLowerCase() : 'unknown'
                const propertyTypeKey = normalizedCategory === 'unknown' ? 'hotel' : normalizedCategory

                // Get the filter label for this property type
                const filterLabel = PROPERTY_TYPE_FILTER_LABELS[propertyTypeKey]
                if (!filterLabel) {
                    // If category doesn't match any known type, default to hotel
                    return selectedPropertyTypes.includes('hotel')
                }

                // Check if the filter ID matches any selected filter
                return selectedPropertyTypes.includes(filterLabel.id)
            })
        }

        // Apply city+date group filter based on selected group key
        if (effectiveSelectedGroupKey) {
            const selectedGroup = cityDateGroups.find((g) => g.key === effectiveSelectedGroupKey)
            if (selectedGroup) {
                // Repeat-visit city (multiple itinerary windows, e.g. Kuala
                // Lumpur on the way out AND the way back): shortlisted stays
                // aren't window-specific. buildCorrectedDatesMap snaps each
                // stay to a single window by its section start_date, which
                // would hide the whole shortlist from every tab except the
                // first. Scope by city across all its windows instead so the
                // same shortlist shows on each visit's tab. Single-window
                // cities keep group-scoping so sub-range chips (Hotel A
                // Jun 13-15 / Hotel B Jun 15-16 within one visit) still
                // separate correctly.
                const cityWindowCount = itineraryCities
                    ? itineraryCities.filter((c) => c.id === selectedGroup.cityId).length
                    : 0
                if (isTripboardMode && cityWindowCount > 1) {
                    filtered = filtered.filter((stay) => {
                        const meta = stayMetadataMap.get(stay.zentrum_hub_id || stay.id)
                        return meta?.city_id === selectedGroup.cityId
                    })
                } else {
                    const stayKeysInGroup = new Set(selectedGroup.stays.map((s) => s.zentrum_hub_id || s.id))
                    filtered = filtered.filter((stay) => stayKeysInGroup.has(stay.zentrum_hub_id || stay.id))
                }
            }
        }

        // Sort by check-in date (earliest first). Source of truth: section metadata start_date/end_date.
        // For ties, preserve existing sort (e.g. price).
        const orderBy = currentOrderBy
        const FAR_FUTURE = '9999-12-31'
        const getEffectiveCheckIn = (stay: AccommodationMetadataItem): string => {
            const key = stay.zentrum_hub_id || stay.id
            const sectionId = staySectionMap?.get(key)
            const sectionMetadataFull = sectionId ? staySectionMetadataMap?.get(sectionId) : undefined
            const md = sectionMetadataFull as { start_date?: string | null } | undefined
            const raw = md?.start_date ? formatDateStringToYMD(md.start_date) : undefined
            if (!raw) return FAR_FUTURE
            return isPastDate(raw) ? getTomorrowDate() : raw
        }

        const hasLoadedPrice = (stay: AccommodationMetadataItem): boolean => {
            const key = stay.zentrum_hub_id || stay.id
            const price = stayPricesMap?.get(key)
            if (!price) return false
            if (price.isPriceLoading) return false
            if (price.isPriceUnavailable) return false
            return (price.platforms?.length ?? 0) > 0 || price.displayPrice > 0
        }

        filtered.sort((a, b) => {
            // Rank 0: itinerary stay. Rank 1: has a loaded, non-empty
            // price. Rank 2: everything else (unpriced / still-loading).
            const aInItin = itineraryHubIds.has(a.zentrum_hub_id || '')
            const bInItin = itineraryHubIds.has(b.zentrum_hub_id || '')
            if (aInItin !== bInItin) return aInItin ? -1 : 1

            const aPriced = hasLoadedPrice(a)
            const bPriced = hasLoadedPrice(b)
            if (aPriced !== bPriced) return aPriced ? -1 : 1

            const aIn = getEffectiveCheckIn(a)
            const bIn = getEffectiveCheckIn(b)
            if (aIn !== bIn) return aIn.localeCompare(bIn)

            if (orderBy.rate !== undefined) {
                const rateA = a.rate_per_night ?? 0
                const rateB = b.rate_per_night ?? 0
                return orderBy.rate === 1 ? rateA - rateB : rateB - rateA
            }
            return 0
        })

        return filtered
    }, [
        staysWithDates,
        selectedPropertyTypes,
        effectiveSelectedGroupKey,
        cityDateGroups,
        currentOrderBy,
        stayMetadataMap,
        staySectionMap,
        staySectionMetadataMap,
        itineraryHubIds,
        stayPricesMap,
        itineraryCities,
        isTripboardMode
    ])

    // Single source of truth for stay dates: section metadata (start_date/end_date).
    const staysWithCorrectedDatesMap = useMemo(() => {
        const base = buildCorrectedDatesMap(
            filteredAndSortedStaysData,
            staySectionMap,
            staySectionMetadataMap,
            fallbackMode,
            stayMetadataMap,
            itineraryCities,
            itineraryStays
        )
        // Repeat-visit city (same city in 2+ itinerary windows, e.g. Kuala
        // Lumpur on the way out AND back): buildCorrectedDatesMap snaps each
        // stay to a single window by its section start_date, so both tabs
        // would show the first window's dates/prices/links. The active tab IS
        // the window context, so override the selected city's stays to the
        // selected window's dates — keeping displayed dates, the dedupe key,
        // the "View deal" link, and the rate (fetched for the same window by
        // the parent) all aligned with the tab the user is viewing.
        if (!isTripboardMode || !selectedCityId || !itineraryCities) return base
        const windowsForCity = itineraryCities.filter((c) => c.id === selectedCityId)
        if (windowsForCity.length <= 1) return base
        const { checkIn, checkOut } = resolveEffectiveStaysDates(searchParams, itineraryCities)
        // A 0-night window (same-day departure stop) has no stay to show — keep
        // the snapped base dates so the card/link stay valid. Matches the guard
        // on the price fetch in TripboardPage.staysDatesMap.
        if (!checkIn || !checkOut || checkIn >= checkOut) return base
        for (const stay of filteredAndSortedStaysData) {
            const meta = stayMetadataMap.get(stay.zentrum_hub_id || stay.id)
            if (meta?.city_id !== selectedCityId) continue
            base.set(stay.zentrum_hub_id || stay.id, { checkIn, checkOut, isFallback: false })
        }
        return base
    }, [
        filteredAndSortedStaysData,
        staySectionMap,
        staySectionMetadataMap,
        fallbackMode,
        stayMetadataMap,
        itineraryCities,
        itineraryStays,
        isTripboardMode,
        selectedCityId,
        searchParams
    ])

    // Cluster every shortlist record by (zentrumHubId, normalizedCheckIn,
    // normalizedCheckOut) using the SAME resolved dates the cards display.
    // Critical for tripboard mode: `buildCorrectedDatesMap` overrides raw
    // section start_date/end_date with itinerary windows, so two sections
    // for the same hub with different saved dates collapse to one card —
    // and their dedupe keys must also collapse so deleting the visible
    // card removes every underlying section, not just the cluster keyed
    // by raw metadata dates.
    const shortlistClusters = useMemo(() => {
        return buildShortlistDedupeClustersWithResolver(shortlistSections ?? [], (hubId) => {
            const dates = staysWithCorrectedDatesMap.get(hubId)
            if (!dates) return undefined
            return { checkIn: dates.checkIn, checkOut: dates.checkOut }
        })
    }, [shortlistSections, staysWithCorrectedDatesMap])

    // Build uncorrected dates map for Day N labels (avoids past-date correction skewing offsets)
    const originalDatesMap = useMemo(() => {
        if (!hideExactDates) return staysWithCorrectedDatesMap
        const map = new Map<string, { checkIn: string | undefined; checkOut: string | undefined; isFallback: boolean }>()
        filteredAndSortedStaysData.forEach((stay) => {
            const key = stay.zentrum_hub_id || stay.id
            const sectionId = staySectionMap?.get(key)
            const metadata = sectionId
                ? (staySectionMetadataMap?.get(sectionId) as { start_date?: string; end_date?: string } | undefined)
                : undefined
            map.set(key, {
                checkIn: metadata?.start_date ? formatDateStringToYMD(metadata.start_date) || undefined : undefined,
                checkOut: metadata?.end_date ? formatDateStringToYMD(metadata.end_date) || undefined : undefined,
                isFallback: false
            })
        })
        return map
    }, [hideExactDates, filteredAndSortedStaysData, staySectionMap, staySectionMetadataMap, staysWithCorrectedDatesMap])

    // Local Day 1 for stays tab: earliest start_date across all stays (self-contained)
    const localStaysTripStart = useMemo(() => {
        if (!hideExactDates) return tripStartDate || null
        let earliest: string | null = null
        for (const stay of filteredAndSortedStaysData) {
            const key = stay.zentrum_hub_id || stay.id
            const dates = originalDatesMap.get(key)
            if (dates?.checkIn && (!earliest || dates.checkIn < earliest)) earliest = dates.checkIn
        }
        return earliest
    }, [hideExactDates, filteredAndSortedStaysData, originalDatesMap, tripStartDate])

    // Group stays by date heading (stays with same check-in/check-out are merged under one heading)
    const dayLabelFormatter = useMemo(() => {
        if (!hideExactDates) return undefined
        return (start: string | null | undefined, end: string | null | undefined) => formatDayLabel(start, end, localStaysTripStart)
    }, [hideExactDates, localStaysTripStart])

    const groupedStaysByDate = useMemo(() => {
        const groups = groupStaysByDate(filteredAndSortedStaysData, originalDatesMap, dayLabelFormatter)
        if (itineraryHubIds.size === 0) return groups
        // Float the date group that contains the itinerary stay to the
        // top so the user's chosen hotel is visible without scrolling.
        // Stable sort: ties (both groups have / neither has an itinerary
        // stay) preserve the original date ordering.
        const indexed = groups.map((g, i) => ({
            g,
            i,
            hasItin: g[1].some((s) => itineraryHubIds.has(s.zentrum_hub_id || ''))
        }))
        indexed.sort((a, b) => (a.hasItin === b.hasItin ? a.i - b.i : a.hasItin ? -1 : 1))
        return indexed.map(({ g }) => g)
    }, [filteredAndSortedStaysData, originalDatesMap, dayLabelFormatter, itineraryHubIds])

    // Pre-populate external stays modal with the dates currently driving
    // filters. In tripboard mode that means effective dates (overlay or
    // itinerary window); in other modes the legacy URL date params still win.
    const filterCheckInParam = isTripboardMode ? selectedExploreCity?.checkIn || null : searchParams.get(STAYS_PARAMS.checkIn) || null
    const filterCheckOutParam = isTripboardMode ? selectedExploreCity?.checkOut || null : searchParams.get(STAYS_PARAMS.checkOut) || null

    const tripboardExploreStaysLink = useMemo(() => {
        if (filteredAndSortedStaysData.length === 0) return null

        const fromParams = readGroupFromParams(searchParams, STAYS_PARAMS)
        let cityId = fromParams?.cityId ?? null
        let checkIn = (isTripboardMode ? selectedExploreCity?.checkIn : fromParams?.checkIn) ?? null
        let checkOut = (isTripboardMode ? selectedExploreCity?.checkOut : fromParams?.checkOut) ?? null

        const firstStay = filteredAndSortedStaysData[0]
        const firstKey = firstStay.zentrum_hub_id || firstStay.id
        const md = stayMetadataMap.get(firstKey)

        let cityName: string | undefined
        if (cityId) {
            cityName = availableCities.find((c) => c.id === cityId)?.name
        }
        if (!cityId && md?.city_id) {
            cityId = md.city_id
        }
        if (!cityName) {
            cityName = md?.city_name ?? (cityId ? availableCities.find((c) => c.id === cityId)?.name : undefined)
        }

        const corrected = staysWithCorrectedDatesMap.get(firstKey)
        if (!checkIn) checkIn = corrected?.checkIn ?? null
        if (!checkOut) checkOut = corrected?.checkOut ?? null

        if (!cityId || !cityName || !checkIn || !checkOut) return null

        const qs = buildStaysExploreQueryString({
            cityId,
            cityName,
            checkIn,
            checkOut,
            groupType: searchParams.get('group_type'),
            travelPurpose: searchParams.get('travel_purpose'),
            cityPrefs: searchParams.get('city_prefs'),
            adults: String(guestsData.adults),
            children: String(guestsData.children),
            infants: String(guestsData.infants),
            childrenAge: guestsData.children_age && guestsData.children_age.length > 0 ? guestsData.children_age.join(',') : undefined
        })

        return {
            to: `/stays?${qs}`,
            cityLabel: cityName,
            subtitleDateRange: formatCompactDateRange(checkIn, checkOut)
        }
    }, [
        filteredAndSortedStaysData,
        searchParams,
        availableCities,
        stayMetadataMap,
        staysWithCorrectedDatesMap,
        guestsData,
        isTripboardMode,
        selectedExploreCity?.checkIn,
        selectedExploreCity?.checkOut
    ])

    // Save dates from the chip's pencil/date editor.
    // Tripboard: writes the exploration overlay (stays_exp_checkin/out) when
    // dates differ from the itinerary window for the selected city; clears
    // the overlay when they match. Does NOT mutate section metadata — the
    // chip stays a mirror of the itinerary, exploration only flows through
    // downstream consumers (rates, viewport, shortlist, add-to-itinerary).
    // Non-tripboard: keeps the legacy section-metadata mutation path so
    // ViewContentCollection / TravelerCollectionDetailsPage are unaffected.
    const handleSaveDates = useCallback(
        async (startDate: string | null, endDate: string | null) => {
            trackButtonClickCustom?.({
                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                buttonName: 'stays_date_save',
                buttonAction: 'submit',
                extra: { count: staysData.length }
            })

            if (isTripboardMode) {
                if (!startDate || !endDate) {
                    setEditingStayId(null)
                    return
                }
                const cityId = selectedExploreCity?.id ?? searchParams.get(STAYS_PARAMS.city) ?? ''
                const windowIndex = Number(searchParams.get(STAYS_EXP_PARAMS.window) || '0') || 0
                const window = pickItineraryWindow(itineraryCities, cityId, windowIndex)
                const next = new URLSearchParams(searchParams)
                if (window && window.checkIn === startDate && window.checkOut === endDate) {
                    next.delete(STAYS_EXP_PARAMS.checkIn)
                    next.delete(STAYS_EXP_PARAMS.checkOut)
                } else {
                    next.set(STAYS_EXP_PARAMS.checkIn, startDate)
                    next.set(STAYS_EXP_PARAMS.checkOut, endDate)
                }
                setSearchParams(next, { replace: true })
                if (onDatesChange) onDatesChange(startDate, endDate)
                setEditingStayId(null)
                return
            }

            if (!editingStayId || !staySectionMap || !collectionIdentifier) return

            setIsSavingDates(true)
            try {
                // Find the date group that contains the editing stay
                const editingGroup = groupedStaysByDate.find(([, stays]) => stays.some((s) => (s.zentrum_hub_id || s.id) === editingStayId))

                const sectionIds = editingGroup
                    ? getSectionIdsForGroup(editingGroup[1], staySectionMap)
                    : (() => {
                          const sid = staySectionMap.get(editingStayId)
                          return sid ? [sid] : []
                      })()

                if (sectionIds.length === 0) {
                    toast.error('Section ID not found for this stay')
                    return
                }

                // Build metadata updates preserving existing fields
                const updates = sectionIds.map((sectionId) => {
                    const existing = staySectionMetadataMap?.get(sectionId)
                    const metadata: Record<string, unknown> = existing ? { ...existing } : {}
                    metadata.start_date = startDate || null
                    metadata.end_date = endDate || null
                    return { sectionId, metadata }
                })

                if (updates.length === 1) {
                    // Single stay — use existing endpoint (no bulk needed)
                    await api.updateSectionMetadata(collectionIdentifier, updates[0].sectionId, updates[0].metadata)
                } else if ('bulkUpdateSectionMetadata' in api && api.bulkUpdateSectionMetadata) {
                    // Multiple stays — single bulk request
                    await (api as CollectionApi).bulkUpdateSectionMetadata!(collectionIdentifier, updates)
                } else {
                    // Fallback if bulk not available on this api instance
                    await Promise.all(updates.map((u) => api.updateSectionMetadata(collectionIdentifier, u.sectionId, u.metadata)))
                }

                // Invalidate once
                queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier] })
                queryClient.invalidateQueries({ queryKey: ['traveler-collection', collectionIdentifier] })
                queryClient.invalidateQueries({ queryKey: ['stay-deals'] })
                queryClient.invalidateQueries({ queryKey: ['collection-stays'] })
                queryClient.invalidateQueries({ queryKey: ['tripBudget'] })
                queryClient.invalidateQueries({ queryKey: ['collection-stay-price'] })
                // Update URL params so explore section picks up new dates
                if (startDate && endDate) {
                    const next = new URLSearchParams(searchParams)
                    next.set(STAYS_PARAMS.checkIn, startDate)
                    next.set(STAYS_PARAMS.checkOut, endDate)
                    setSearchParams(next, { replace: true })
                }
                // Notify parent so it can also invalidate its price queries
                if (onDatesChange && startDate && endDate) {
                    onDatesChange(startDate, endDate)
                }
                toast.success('Dates updated successfully')
                setEditingStayId(null)
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
            editingStayId,
            staySectionMap,
            staySectionMetadataMap,
            collectionIdentifier,
            groupedStaysByDate,
            api,
            queryClient,
            onDatesChange,
            searchParams,
            setSearchParams,
            isTripboardMode,
            selectedExploreCity?.id,
            itineraryCities,
            trackButtonClickCustom,
            staysData.length
        ]
    )

    const bulkVisibleStaySectionIds = useMemo(() => {
        const seen = new Set<string>()
        const ids: string[] = []
        for (const stay of filteredAndSortedStaysData) {
            const key = stay.zentrum_hub_id || stay.id
            const sid = staySectionMap?.get(key)
            if (sid && !seen.has(sid)) {
                seen.add(sid)
                ids.push(sid)
            }
        }
        return ids
    }, [filteredAndSortedStaysData, staySectionMap])

    const canAddExternalStays = isRimigoInternal && !!collectionIdentifier
    const canSearchRimigoStays = canAddExternalStays && typeof api.addStayToCollection === 'function'
    const canOpenSearchStays = canAddExternalStays && (canSearchRimigoStays || typeof api.addKayakStayToCollection === 'function')
    const bulkActionButtons = (
        <StaysBulkActionButtons
            show={showBulkSelectionControls}
            bulkSelectMode={bulkSelectMode}
            selectedSectionIds={selectedSectionIds}
            bulkVisibleStaySectionIds={bulkVisibleStaySectionIds}
            onToggleBulkSelectMode={onToggleBulkSelectMode}
            onBulkSelectAll={onBulkSelectAll}
            onBulkDeleteSelected={onBulkDeleteSelected}
        />
    )

    const renderFilterChips = () => {
        // Only render if we have something to show (dates/guests OR cities)
        const hasContent = shouldShowDates || cityDateGroups.length > 0
        if (!hasContent) {
            return null
        }

        return (
            <div className="bg-white mb-0 -mx-4  py-0 lg:py-0 lg:px-0 ">
                {/* Row 1: City + Date filter carousel */}
                {cityDateGroups.length > 0 && (
                    <div className="flex items-center">
                        <CityDateFilterCarousel
                            groups={cityDateGroups}
                            selectedGroupKey={effectiveSelectedGroupKey}
                            onGroupChange={(groupKey) => {
                                trackButtonClickCustom?.({
                                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                    buttonName: 'stays_city_date_filter_change',
                                    buttonAction: 'click',
                                    extra: { group_key: groupKey }
                                })
                                const group = cityDateGroups.find((g) => g.key === groupKey)
                                if (group) {
                                    const next = new URLSearchParams(searchParams)
                                    // Switching cities/windows clears any
                                    // exploration overlay — exploration is
                                    // scoped to a single (city, window).
                                    next.delete(STAYS_EXP_PARAMS.checkIn)
                                    next.delete(STAYS_EXP_PARAMS.checkOut)
                                    if (hideExactDates) {
                                        next.set(STAYS_PARAMS.city, group.cityId)
                                        next.set('stays_day', group.dateLabel)
                                    } else if (isTripboardMode) {
                                        next.set(STAYS_PARAMS.city, group.cityId)
                                        next.delete(STAYS_PARAMS.checkIn)
                                        next.delete(STAYS_PARAMS.checkOut)
                                        // Carry per-chip dateLabel so sub-range chips inside
                                        // the same window stay URL-distinct.
                                        if (group.dateLabel) next.set('stays_day', group.dateLabel)
                                        else next.delete('stays_day')
                                        const winsForCity = (itineraryCities ?? []).filter((c) => c.id === group.cityId)
                                        if (winsForCity.length > 1) {
                                            const idx = winsForCity.findIndex(
                                                (w) => formatCompactDateRange(w.checkIn, w.checkOut) === group.dateLabel
                                            )
                                            if (idx > 0) next.set(STAYS_EXP_PARAMS.window, String(idx))
                                            else next.delete(STAYS_EXP_PARAMS.window)
                                        } else {
                                            next.delete(STAYS_EXP_PARAMS.window)
                                        }
                                    } else {
                                        let checkIn: string | undefined
                                        let checkOut: string | undefined
                                        if (group.stays.length > 0) {
                                            const dates = allStaysCorrectedDatesMap.get(group.stays[0]?.zentrum_hub_id || group.stays[0]?.id || '')
                                            checkIn = dates?.checkIn
                                            checkOut = dates?.checkOut
                                        }
                                        if (!checkIn && itineraryCities) {
                                            const matches = itineraryCities.filter((c) => c.id === group.cityId)
                                            const itinCity =
                                                matches.find((c) => formatCompactDateRange(c.checkIn, c.checkOut) === group.dateLabel) ?? matches[0]
                                            checkIn = itinCity?.checkIn
                                            checkOut = itinCity?.checkOut
                                        }
                                        writeGroupToParams(next, STAYS_PARAMS, group.cityId, checkIn, checkOut)
                                    }
                                    setSearchParams(next, { replace: true })
                                }
                            }}
                            allowDateEdit={allowDateEdit}
                            onEditDate={(groupKey) => {
                                const group = cityDateGroups.find((g) => g.key === groupKey)
                                // With saved stays: edit dates through the
                                // section-metadata bulk-update flow.
                                if (group && group.stays.length > 0) {
                                    const firstStayKey = group.stays[0].zentrum_hub_id || group.stays[0].id
                                    handleEditDateClick(firstStayKey)
                                    return
                                }
                                // Without saved stays (common on first-time
                                // tripboard or after a zero-rates result):
                                // open the city-level URL-params-only editor
                                // so the user can still change dates.
                                if (group) {
                                    const matches = itineraryCities?.filter((c) => c.id === group.cityId) ?? []
                                    const itinCity =
                                        matches.find((c) => formatCompactDateRange(c.checkIn, c.checkOut) === group.dateLabel) ?? matches[0]
                                    // Tripboard prefers the effective dates
                                    // (overlay or itinerary window) so the
                                    // editor opens on what the user is
                                    // currently filtering by.
                                    const seedCheckIn = isTripboardMode
                                        ? selectedExploreCity?.checkIn || itinCity?.checkIn || ''
                                        : itinCity?.checkIn || selectedExploreCity?.checkIn || ''
                                    const seedCheckOut = isTripboardMode
                                        ? selectedExploreCity?.checkOut || itinCity?.checkOut || ''
                                        : itinCity?.checkOut || selectedExploreCity?.checkOut || ''
                                    setCityDateEditInitial({
                                        cityId: group.cityId,
                                        checkIn: seedCheckIn,
                                        checkOut: seedCheckOut
                                    })
                                    setCityDateEditOpen(true)
                                }
                            }}
                            onMapViewClick={undefined}
                        />
                    </div>
                )}

                {/* Secondary controls (guests / Filters / toggle). Mobile: collapses
                    while scrolling down the listing, reappears on scroll up.
                    grid-rows 1fr↔0fr animates height smoothly without a fixed px. */}
                <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                        hideSecondaryHeader ? 'grid-rows-[0fr] opacity-0 pointer-events-none' : 'grid-rows-[1fr] opacity-100'
                    }`}>
                    <div className="overflow-hidden min-w-0">
                {/* Row 1b: Guests chip + Map button — public page (no For You/Shortlist toggle).
                    No Filters chip here: this row is locked to Shortlist view, so the
                    explore-only budget filter doesn't apply. */}
                {!showExploreToggle && !hideGuestFilterAndExplore && cityDateGroups.length > 0 && (
                    <div className="flex items-center justify-between gap-2 px-4 py-2">
                        <RoomsGuestsFilterChip
                            occupancies={occupancies}
                            onApply={handleOccupanciesApply}
                            isLoading={isStaysFetching}
                            tripId={tripId}
                            existingGroupSetup={resolvedGroupSetup}
                        />
                        {onMapViewClick && (
                            <button
                                type="button"
                                onClick={onMapViewClick}
                                className="sm:hidden w-9 h-9 rounded-full border border-[#dfdde0] bg-white flex items-center justify-center hover:bg-grey-5 transition-colors shrink-0">
                                <MapIcon className="w-4 h-4 text-grey-0" />
                            </button>
                        )}
                    </div>
                )}

                {/* Row 2: For You / Shortlist toggle + Guests chip + Explore link.
                    Only render when at least one child is visible — otherwise
                    the row's padding leaves an empty gap on callers that
                    suppress every child (e.g. ViewContentCollection). */}
                {shouldShowDates && (showExploreToggle || !hideGuestFilterAndExplore) && (
                    <div className="pb-2 pt-1 px-4 flex flex-col gap-2">
                        {isTripboardMode && isExploringDates && (
                            <ExploringDatesBanner
                                checkIn={effectiveStaysDates.checkIn}
                                checkOut={effectiveStaysDates.checkOut}
                                onReset={() => {
                                    const next = new URLSearchParams(searchParams)
                                    next.delete(STAYS_EXP_PARAMS.checkIn)
                                    next.delete(STAYS_EXP_PARAMS.checkOut)
                                    setSearchParams(next, { replace: true })
                                }}
                            />
                        )}
                        {/* Row: Guests chip (left, replaces old For You/Shortlist
                            slot) + Explore link (right, desktop) + Map (mobile).
                            The For You / Shortlist toggle moved down to the
                            actionButtonsRow where "All prices…" used to live. */}
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide shrink-0">
                                {showExploreToggle && (
                                    <RoomsGuestsFilterChip
                                        occupancies={occupancies}
                                        onApply={handleOccupanciesApply}
                                        isLoading={isStaysFetching}
                                        tripId={tripId}
                                        existingGroupSetup={resolvedGroupSetup}
                                    />
                                )}
                                {showExploreToggle && isTripboardMode && staysViewMode === 'for_you' && (
                                    <span
                                        className="h-5 w-px bg-grey-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                )}
                                {showExploreToggle && isTripboardMode && staysViewMode === 'for_you' && (
                                    <FilterChip
                                        icon={
                                            <SlidersHorizontal
                                                className={`w-4 h-4 shrink-0 ${activeForYouFilterCount > 0 ? 'text-primary-default' : 'text-grey-2'}`}
                                            />
                                        }
                                        label="Filters"
                                        onClick={() => onFilterOpenChange?.(true)}
                                        activeCount={activeForYouFilterCount}
                                    />
                                )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {/* Explore stays link — desktop only */}
                                {!hideGuestFilterAndExplore &&
                                    (() => {
                                        const exploreLinkTo = buildStaysExploreLinkTo({
                                            tripboardExploreStaysLink,
                                            selectedExploreCity,
                                            selectedCityId,
                                            guestsData
                                        })
                                        return exploreLinkTo ? (
                                            <a
                                                href={exploreLinkTo}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hidden sm:flex items-center gap-1 shrink-0 px-3 py-2 rounded-xl"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    trackButtonClickCustom?.({
                                                        buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                                        buttonName: POSTHOG_EVENTS.STAYS_TAB_EXPLORE_BROWSE_CLICK,
                                                        buttonAction: 'click'
                                                    })
                                                }}>
                                                <span className="text-[12px] font-semibold font-manrope text-grey-0 tracking-[-0.24px] leading-4 whitespace-nowrap">
                                                    Explore more stays
                                                </span>
                                                <span className="text-[12px] font-bold font-red-hat-display text-primary-default tracking-[-0.24px] leading-4 underline whitespace-nowrap">
                                                    Browse
                                                </span>
                                                <ExternalLink className="w-3.5 h-3.5 text-primary-default shrink-0" />
                                            </a>
                                        ) : null
                                    })()}
                            </div>
                        </div>
                    </div>
                )}
                </div>
                </div>
            </div>
        )
    }

    // Only show the full-page shimmer on the truly-first load (no data yet).
    // During refetches after mutations (e.g. adding a shortlisted stay),
    // ``staysData`` already contains the new entries from ``staysCollectionResponse.sections``
    // at the same render where ``isStaysLoading`` flips true. Blocking on
    // ``isStaysLoading`` alone would swap the whole DOM tree to shimmers,
    // causing a visible flash during the For You → Shortlist transition.
    if (isStaysLoading && staysData.length === 0) {
        return (
            <div className="flex flex-col gap-4 pb-28 md:pb-6">
                {(canAddExternalStays || showBulkSelectionControls) && (
                    <div className="flex justify-end items-center gap-2 -mt-2 mb-1 flex-wrap">
                        {bulkActionButtons}
                        {canOpenSearchStays && (
                            <button
                                type="button"
                                onClick={() => {
                                    trackButtonClickCustom?.({
                                        buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                        buttonName: 'stays_search_modal_click',
                                        buttonAction: 'click'
                                    })
                                    setIsSearchStaysModalOpen(true)
                                }}
                                className="flex cursor-pointer items-center gap-2 px-4 py-2 rounded-lg border border-primary-default text-primary-default font-red-hat-display font-semibold text-sm">
                                <Search className="w-4 h-4" />
                                Search Stays
                            </button>
                        )}
                    </div>
                )}
                {renderFilterChips()}
                <TripboardExploreMoreCard
                    variant="stays"
                    subtitle="No stays in this collection yet — browse and add one that fits your trip."
                    to={buildStaysExploreLinkTo({ tripboardExploreStaysLink, selectedExploreCity, selectedCityId, guestsData }) ?? '/stays'}
                    trackingExtra={{ surface: 'stays_tab_empty_state', collection_id: collectionIdentifier }}
                />

                {canOpenSearchStays && (
                    <SearchStaysModal
                        isOpen={isSearchStaysModalOpen}
                        onClose={() => setIsSearchStaysModalOpen(false)}
                        collectionIdentifier={collectionIdentifier}
                        addStayApi={api}
                        nextSectionsOrder={(staysData?.length ?? 0) + 1}
                        availableCities={availableCities}
                        countryIds={countryIds}
                        filterCheckIn={filterCheckInParam}
                        filterCheckOut={filterCheckOutParam}
                        onSuccess={() => {
                            if (collectionIdentifier) {
                                queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier] })
                                queryClient.invalidateQueries({ queryKey: ['traveler-collection', collectionIdentifier] })
                                queryClient.invalidateQueries({ queryKey: ['collection-stays'] })
                                queryClient.invalidateQueries({ queryKey: ['tripBudget'] })
                            }
                        }}
                    />
                )}
            </div>
        )
    }

    // ── City-level date-change flow (opened from empty-rates states and
    //    the carousel pencil when no stays exist yet). Seeds the modal
    //    with the currently-selected city's dates and, on save, writes
    //    `stays_checkin` / `stays_checkout` (+ city) to the URL. That
    //    flip alone triggers the rates histogram + viewport queries to
    //    refetch — no section metadata is touched. ──
    const openCityDateEditor = useCallback(() => {
        const cid = selectedExploreCity?.id
        if (!cid) return
        setCityDateEditInitial({
            cityId: cid,
            checkIn: selectedExploreCity?.checkIn || '',
            checkOut: selectedExploreCity?.checkOut || ''
        })
        setCityDateEditOpen(true)
    }, [selectedExploreCity?.id, selectedExploreCity?.checkIn, selectedExploreCity?.checkOut])

    const handleSaveCityDates = useCallback(
        async (startDate: string | null, endDate: string | null) => {
            if (!cityDateEditInitial || !startDate || !endDate) {
                setCityDateEditOpen(false)
                return
            }

            // Tripboard: route through the exploration overlay instead of
            // mutating the chip's source of truth (the itinerary). Section
            // metadata is left alone — shortlisting picks up the overlay
            // dates via handleAddExploreStay.
            if (isTripboardMode) {
                const cityId = cityDateEditInitial.cityId
                const windowIndex = Number(searchParams.get(STAYS_EXP_PARAMS.window) || '0') || 0
                const window = pickItineraryWindow(itineraryCities, cityId, windowIndex)
                const next = new URLSearchParams(searchParams)
                next.set(STAYS_PARAMS.city, cityId)
                next.delete(STAYS_PARAMS.checkIn)
                next.delete(STAYS_PARAMS.checkOut)
                if (window && window.checkIn === startDate && window.checkOut === endDate) {
                    next.delete(STAYS_EXP_PARAMS.checkIn)
                    next.delete(STAYS_EXP_PARAMS.checkOut)
                } else {
                    next.set(STAYS_EXP_PARAMS.checkIn, startDate)
                    next.set(STAYS_EXP_PARAMS.checkOut, endDate)
                }
                setSearchParams(next, { replace: true })
                setCityDateEditOpen(false)
                onDatesChange?.(startDate, endDate)
                return
            }

            // 1. URL update first — drives the rates histogram + viewport
            //    refetch regardless of whether we have saved stays to
            //    persist against.
            const next = new URLSearchParams(searchParams)
            writeGroupToParams(next, STAYS_PARAMS, cityDateEditInitial.cityId, startDate, endDate)
            setSearchParams(next, { replace: true })

            // 2. Persist dates onto the section metadata of every saved
            //    stay in this city. When there are zero saved stays we
            //    stop at the URL update — per spec, persistence defers
            //    until a stay is shortlisted, which will pick up the
            //    current URL dates at shortlist time.
            if (collectionIdentifier && staySectionMap) {
                // Find stays in this city by intersecting the active city
                // with stayMetadataMap (metadata carries `city_id`).
                const cityId = cityDateEditInitial.cityId
                const sectionIdsInCity: string[] = []
                stayMetadataMap.forEach((meta, stayKey) => {
                    if (meta?.city_id !== cityId) return
                    const sid = staySectionMap.get(stayKey)
                    if (sid && !sectionIdsInCity.includes(sid)) {
                        sectionIdsInCity.push(sid)
                    }
                })

                if (sectionIdsInCity.length > 0) {
                    try {
                        const updates = sectionIdsInCity.map((sectionId) => {
                            const existing = staySectionMetadataMap?.get(sectionId)
                            const metadata: Record<string, unknown> = existing ? { ...existing } : {}
                            metadata.start_date = startDate
                            metadata.end_date = endDate
                            return { sectionId, metadata }
                        })

                        if (updates.length === 1) {
                            await api.updateSectionMetadata(collectionIdentifier, updates[0].sectionId, updates[0].metadata)
                        } else if ('bulkUpdateSectionMetadata' in api && api.bulkUpdateSectionMetadata) {
                            await (api as CollectionApi).bulkUpdateSectionMetadata!(collectionIdentifier, updates)
                        } else {
                            await Promise.all(updates.map((u) => api.updateSectionMetadata(collectionIdentifier, u.sectionId, u.metadata)))
                        }

                        queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier] })
                        queryClient.invalidateQueries({ queryKey: ['traveler-collection', collectionIdentifier] })
                        queryClient.invalidateQueries({ queryKey: ['collection-stays'] })
                        queryClient.invalidateQueries({ queryKey: ['collection-stay-price'] })
                        toast.success('Dates updated')
                    } catch (error) {
                        const msg =
                            (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                            (error as { message?: string })?.message ||
                            'Failed to update dates. Please try again.'
                        toast.error(msg)
                    }
                }
            }

            setCityDateEditOpen(false)
            onDatesChange?.(startDate, endDate)
        },
        [
            cityDateEditInitial,
            searchParams,
            setSearchParams,
            onDatesChange,
            collectionIdentifier,
            staySectionMap,
            stayMetadataMap,
            staySectionMetadataMap,
            api,
            queryClient
        ]
    )

    // ── Left panel content (used in both layouts) ──
    // ── Explore section element (reused in both views) ──
    // Always render in tripboard mode when collection + trip are known.
    // StaysExploreSection handles the "city not resolved yet" case by rendering
    // a skeleton — so the empty-text fallback is no longer needed here.
    const exploreSectionElement =
        isTripboardMode && collectionIdentifier && tripId ? (
            <StaysExploreSection
                cityId={selectedExploreCity?.id ?? ''}
                cityName={selectedExploreCity?.name ?? ''}
                checkIn={selectedExploreCity?.checkIn ?? ''}
                checkOut={selectedExploreCity?.checkOut ?? ''}
                budgetRange={resolvedExploreBudget}
                groupType={activeTrip?.tripProfile?.group_type ?? 'couple'}
                travelPurpose={tripTravelPurpose ?? 'leisure_relaxation'}
                guestsData={guestsData}
                rooms={rooms}
                occupancies={occupancies}
                rimigoPrice={isRimigoInternal}
                tripId={tripId}
                collectionIdentifier={collectionIdentifier}
                savedStayIds={savedStayIds}
                onAddStay={handleAddExploreStay}
                onRemoveStay={handleRemoveExploreStay}
                onAccommodationsLoaded={onExploreAccommodationsLoaded}
                onRequestDateChange={openCityDateEditor}
                propertyTypes={selectedPropertyTypes}
                amenities={selectedAmenities}
                isVerified={isVerifiedFilter}
                isB2bDealAvailable={isB2bDealAvailableFilter}
                starRatings={selectedStarRatings}
                activities={exploreActivities}
                isActivitiesLoading={exploreActivitiesLoading}
            />
        ) : null
    if (staysData.length === 0 && !isTripboardMode) {
        return (
            <div className="pb-28 md:pb-6">
                {(canAddExternalStays || showBulkSelectionControls) && (
                    <div className="flex justify-end items-center gap-2 -mt-2 mb-1 px-3 sm:px-5 flex-wrap">
                        {bulkActionButtons}
                        {canOpenSearchStays && (
                            <button
                                type="button"
                                onClick={() => {
                                    trackButtonClickCustom?.({
                                        buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                        buttonName: 'stays_search_modal_click',
                                        buttonAction: 'click'
                                    })
                                    setIsSearchStaysModalOpen(true)
                                }}
                                className="flex cursor-pointer items-center gap-2 px-4 py-2 rounded-lg border border-primary-default text-primary-default font-red-hat-display font-semibold text-sm">
                                <Search className="w-4 h-4" />
                                Search Stays
                            </button>
                        )}
                    </div>
                )}
                {renderFilterChips()}
                <TripboardExploreMoreCard
                    variant="stays"
                    subtitle="No stays in this collection yet — browse and add one that fits your trip."
                    to={buildStaysExploreLinkTo({ tripboardExploreStaysLink, selectedExploreCity, selectedCityId, guestsData }) ?? '/stays'}
                    trackingExtra={{ surface: 'stays_tab_empty_state', collection_id: collectionIdentifier }}
                />

                {canOpenSearchStays && (
                    <SearchStaysModal
                        isOpen={isSearchStaysModalOpen}
                        onClose={() => setIsSearchStaysModalOpen(false)}
                        collectionIdentifier={collectionIdentifier}
                        addStayApi={api}
                        nextSectionsOrder={(staysData?.length ?? 0) + 1}
                        availableCities={availableCities}
                        countryIds={countryIds}
                        filterCheckIn={filterCheckInParam}
                        filterCheckOut={filterCheckOutParam}
                        onSuccess={() => {
                            if (collectionIdentifier) {
                                queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier] })
                                queryClient.invalidateQueries({ queryKey: ['traveler-collection', collectionIdentifier] })
                                queryClient.invalidateQueries({ queryKey: ['collection-stays'] })
                                queryClient.invalidateQueries({ queryKey: ['tripBudget'] })
                            }
                        }}
                    />
                )}
            </div>
        )
    }

    // ── For You/Shortlist toggle + Price disclaimer (below sticky header, inside scrollable content) ──
    // Layout swap: the toggle used to live in the sticky header alongside
    // the guests chip; now it sits here on the LEFT, with the price
    // disclaimer pushed to the extreme RIGHT. The guests chip moved up
    // into the sticky header (where the toggle used to be).
    const actionButtonsRow = (
        <div className="flex flex-col gap-2 px-2 lg:px-0 sm:px-3 py-3">
            {shouldShowDates && (
                <div className="flex items-center justify-between gap-2">
                    {/* Left: Recommend / Shortlist — two independent outlined
                        chips (no shared container). Active chip fills with
                        primary color; inactive chip stays white with a grey
                        border. Icons preserved. */}
                    {showExploreToggle ? (
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setStaysViewMode('for_you')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold font-red-hat-display tracking-[-0.24px] leading-4 transition-colors cursor-pointer ${
                                    staysViewMode === 'for_you'
                                        ? 'bg-grey-0 border-grey-0 text-white'
                                        : 'bg-white border-[#dfdde0] text-grey-0 hover:border-grey-0'
                                }`}>
                                <Sparkles className="w-3.5 h-3.5" />
                                Explore
                            </button>
                            <button
                                type="button"
                                onClick={() => setStaysViewMode('shortlist')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-semibold font-red-hat-display tracking-[-0.24px] leading-4 transition-colors cursor-pointer ${
                                    staysViewMode === 'shortlist'
                                        ? 'bg-grey-0 border-grey-0 text-white'
                                        : 'bg-white border-[#dfdde0] text-grey-0 hover:border-grey-0'
                                }`}>
                                <Heart className={`w-3.5 h-3.5 ${staysViewMode === 'shortlist' ? 'fill-current' : ''}`} />
                                Shortlisted
                                {shortlistCountForSelectedCity > 0 &&
                                    (staysViewMode === 'shortlist' ? (
                                        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-white text-grey-0 font-red-hat-display font-bold text-[11px] leading-none tracking-normal">
                                            {shortlistCountForSelectedCity}
                                        </span>
                                    ) : (
                                        <span className="font-manrope font-semibold opacity-80">· {shortlistCountForSelectedCity}</span>
                                    ))}
                            </button>
                        </div>
                    ) : (
                        <span />
                    )}
                    {/* Right (desktop only): price disclaimer — hidden on mobile
                        because space is tight once the toggle is present. */}
                    <div className="hidden sm:flex items-center gap-1.5 min-w-0 shrink-0">
                        <Info className="w-3.5 h-3.5 text-grey-2 shrink-0" />
                        <span className="text-[12px] font-manrope font-medium text-grey-2 whitespace-nowrap">All prices are per room, per night</span>
                    </div>
                </div>
            )}
            {/* Action buttons — right aligned */}
            {(canAddExternalStays || showBulkSelectionControls) && (
                <div className="flex justify-end items-center gap-2">
                    {bulkActionButtons}
                    {canOpenSearchStays && (
                        <button
                            type="button"
                            onClick={() => {
                                trackButtonClickCustom?.({
                                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                    buttonName: 'stays_search_modal_click',
                                    buttonAction: 'click'
                                })
                                setIsSearchStaysModalOpen(true)
                            }}
                            className="flex cursor-pointer items-center gap-2 px-4 py-2 rounded-lg border border-primary-default text-primary-default font-red-hat-display font-semibold text-sm">
                            <Search className="w-4 h-4" />
                            Search Stays
                        </button>
                    )}
                </div>
            )}
        </div>
    )

    const leftPanelContent = (
        <AnimatePresence mode="wait">
            <motion.div
                // Key on view mode only, NOT on city. When the city changes we want
                // the child (StaysExploreSection) to receive new props and let
                // React Query handle the fetch; remounting via AnimatePresence's
                // exit→enter is prone to getting stuck and pinning stale props.
                key={staysViewMode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}>
                {actionButtonsRow}
                {/* "For You" mode — always render explore section; it handles its own
                skeleton while the city/dates resolve. */}
                {staysViewMode === 'for_you' && exploreSectionElement}
                {staysViewMode === 'for_you' && !isTripboardMode && staysData.length === 0 && (
                    <div className="text-center py-12">
                        <Typography
                            size="16"
                            weight="medium"
                            color="grey-1">
                            No stays found in this collection.
                        </Typography>
                    </div>
                )}

                {/* "Shortlist" mode — only show collection stays */}
                {staysViewMode === 'shortlist' && (
                    <>
                        {filteredAndSortedStaysData.length === 0 ? (
                            <div className="flex items-center justify-center py-8 sm:py-12 px-4">
                                <div className="bg-white flex flex-col gap-8 items-center px-10 py-8 rounded-2xl shadow-[0px_2px_8px_0px_#dfdde0] max-w-sm w-full">
                                    <div className="flex flex-col gap-2 items-center w-full">
                                        <h3 className="text-[16px] font-semibold font-red-hat-display text-grey-0 tracking-[-0.32px] leading-5 text-center">
                                            No shortlisted stays
                                            {selectedCityId ? ` in ${effectiveCities.find((c) => c.id === selectedCityId)?.name || ''}` : ''}
                                        </h3>
                                        {/* Single-sentence layout: the Heart is inlined
                                        into the text flow (not a flex sibling) so the
                                        browser wraps at natural word boundaries on
                                        narrow mobile widths instead of orphaning
                                        "Tap on the" onto its own line. */}
                                        <p className="text-[14px] font-semibold font-manrope text-grey-2 tracking-[-0.28px] leading-[18px] text-center max-w-[260px]">
                                            Tap on the{' '}
                                            <span className="inline-flex align-middle mx-[2px]">
                                                <Heart className="w-[16px] h-[16px] text-grey-2" />
                                            </span>{' '}
                                            icon to save your favourite stays
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setStaysViewMode('for_you')}
                                        className="bg-primary-default text-white font-red-hat-display font-bold text-[14px] tracking-[-0.28px] leading-[18px] px-4 py-3 rounded-xl flex items-center gap-1 hover:bg-primary-dark transition-colors cursor-pointer">
                                        <Sparkles className="w-4 h-4" />
                                        Browse Explore
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // `max-md:pb-32`: reserve scroll room below the
                            // last card on mobile so the floating "Edit
                            // anything in your itinerary" chip (fixed at the
                            // bottom of the viewport) doesn't permanently
                            // cover the card's price/CTA row when the
                            // shortlist has only one or two items. Without
                            // this the content is shorter than the viewport
                            // and the user can't scroll the card up at all.
                            <div className="flex flex-col gap-4 max-md:pb-32">
                                {(() => {
                                    // De-duplicate visible cards across the entire shortlist
                                    // before grouping: one card per
                                    // (zentrumHubId, normalizedCheckIn, normalizedCheckOut)
                                    // tuple, computed against each card's resolved dates so
                                    // the +1-day same-day normalization is consistent with
                                    // delete-cluster lookup below.
                                    const seenDedupeKeys = new Set<string>()
                                    return groupedStaysByDate.map(([dateKey, groupStays]) => {
                                    const dedupedGroupStays = groupStays.filter((stay) => {
                                        const resolved = resolveStayCardData(
                                            stay,
                                            stayMetadataMap,
                                            staySectionMap,
                                            staySectionMetadataMap,
                                            enrichedStaysMap,
                                            staysWithCorrectedDatesMap,
                                            stayPricesMap
                                        )
                                        const hubIdForKey = resolved.zentrumHubId || stay.id
                                        if (!hubIdForKey) return true
                                        const key = getShortlistDedupeKey(hubIdForKey, resolved.stayCheckIn, resolved.stayCheckOut)
                                        if (seenDedupeKeys.has(key)) return false
                                        seenDedupeKeys.add(key)
                                        return true
                                    })
                                    if (dedupedGroupStays.length === 0) return null
                                    return (
                                        <div
                                            key={dateKey}
                                            className="flex flex-col gap-3">
                                            {/* Stay cards in this date group */}
                                            <div className="grid grid-cols-1 gap-3 sm:gap-x-6 sm:gap-y-4 items-start">
                                                {dedupedGroupStays.map((stay, index) => {
                                                    const {
                                                        zentrumHubId,
                                                        locationTag,
                                                        imageUrl,
                                                        kayakStarRating,
                                                        imagesArray,
                                                        platformReviews,
                                                        stayCityId,
                                                        curatedLabels,
                                                        category,
                                                        isVerified,
                                                        isB2bDealAvailable,
                                                        isAvailableOnAirbnb,
                                                        stayCheckIn,
                                                        stayCheckOut,
                                                        priceData,
                                                        sectionId,
                                                        cityName,
                                                        starRating
                                                    } = resolveStayCardData(
                                                        stay,
                                                        stayMetadataMap,
                                                        staySectionMap,
                                                        staySectionMetadataMap,
                                                        enrichedStaysMap,
                                                        staysWithCorrectedDatesMap,
                                                        stayPricesMap
                                                    )

                                                    // Distance-to-nearest-activity badge disabled — the locationTag
                                                    // slot is intentionally blank on stay cards now.
                                                    // const stayLat = parseFloat(String(stay.geo_location?.lat ?? ''))
                                                    // const stayLng = parseFloat(String(stay.geo_location?.long ?? ''))
                                                    // const nearestActivity = findNearestActivity(
                                                    //     { lat: stayLat, lng: stayLng },
                                                    //     exploreActivities
                                                    // )
                                                    // const distanceNode = buildDistanceLocationTag(nearestActivity)
                                                    // const renderedLocationTag: React.ReactNode = distanceNode ?? locationTag ?? ''
                                                    // const distanceShimmer = !distanceNode && exploreActivitiesLoading
                                                    const renderedLocationTag: React.ReactNode = null
                                                    const distanceShimmer = false
                                                    void locationTag

                                                    return (
                                                        <div key={`${stay.id}-${stay.rate_per_night ?? 'no-price'}`}>
                                                            <div className="relative z-[1]">
                                                                {bulkSelectMode && sectionId && onToggleSectionSelect && (() => {
                                                                    // Expand the visible card to its full dedupe cluster: a
                                                                    // single card can represent multiple section records (same
                                                                    // hub + dates, multiple shortlist saves). The single-delete
                                                                    // path (onToggleShortlist below) already deletes the whole
                                                                    // cluster; the checkbox must select the whole cluster too,
                                                                    // otherwise bulk delete only removes the representative and
                                                                    // the card re-appears on refetch.
                                                                    const hubIdForKey = zentrumHubId || stay.id
                                                                    const dedupeKey = hubIdForKey
                                                                        ? getShortlistDedupeKey(hubIdForKey, stayCheckIn, stayCheckOut)
                                                                        : undefined
                                                                    const cluster = dedupeKey ? shortlistClusters.get(dedupeKey) : undefined
                                                                    const clusterIds = cluster?.sectionIds && cluster.sectionIds.length > 0
                                                                        ? cluster.sectionIds
                                                                        : [sectionId]
                                                                    // Treat the representative sectionId as the source of truth
                                                                    // for the visual checked state — all cluster ids are toggled
                                                                    // together, so this stays in sync in normal flow.
                                                                    const isChecked = !!selectedSectionIds?.has(sectionId)
                                                                    return (
                                                                        <label className="absolute top-3 left-3 z-30 inline-flex items-center gap-2 rounded-md bg-white border border-grey-4 px-2.5 py-1 cursor-pointer shadow-sm hover:bg-grey-5">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isChecked}
                                                                                onChange={() => {
                                                                                    // Toggle the whole cluster atomically. The toggle
                                                                                    // handler in TripboardPage flips each id, so we
                                                                                    // call it once per id; from a currently-deselected
                                                                                    // state all ids become selected, and vice versa.
                                                                                    clusterIds.forEach((id) => onToggleSectionSelect(id))
                                                                                }}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                className="h-3.5 w-3.5 accent-primary-default"
                                                                            />
                                                                            <span className="text-[11px] font-semibold text-grey-0">Select</span>
                                                                        </label>
                                                                    )
                                                                })()}
                                                                <StaysCardWrapper
                                                                    stay={stay}
                                                                    index={index}
                                                                    locationTag={renderedLocationTag}
                                                                    locationTagLoading={distanceShimmer}
                                                                    imageUrl={imageUrl}
                                                                    images={imagesArray}
                                                                    platformReviews={platformReviews}
                                                                    kayakStarRating={kayakStarRating}
                                                                    starRating={starRating}
                                                                    zentrumHubId={zentrumHubId || ''}
                                                                    checkIn={stayCheckIn}
                                                                    checkOut={stayCheckOut}
                                                                    cityId={stayCityId}
                                                                    cityName={cityName}
                                                                    travelPurpose={searchParams.get('travel_purpose') || 'leisure_relaxation'}
                                                                    groupType={searchParams.get('group_type') || 'couple'}
                                                                    preferences={(searchParams.get('city_prefs') || '').split(',').filter(Boolean)}
                                                                    guestsData={guestsData}
                                                                    occupancies={occupancies}
                                                                    isShortlisted={true}
                                                                    isShortlisting={false}
                                                                    onToggleShortlist={(() => {
                                                                        if (!onDeleteSection || isReadOnly) return undefined
                                                                        // Resolve every section id that collapsed into this
                                                                        // dedupe cluster so deleting the visible card removes
                                                                        // ALL underlying shortlist records, not just the
                                                                        // representative.
                                                                        const hubIdForKey = zentrumHubId || stay.id
                                                                        const dedupeKey = hubIdForKey
                                                                            ? getShortlistDedupeKey(hubIdForKey, stayCheckIn, stayCheckOut)
                                                                            : undefined
                                                                        const cluster = dedupeKey ? shortlistClusters.get(dedupeKey) : undefined
                                                                        const idsToDelete = cluster?.sectionIds && cluster.sectionIds.length > 0
                                                                            ? cluster.sectionIds
                                                                            : sectionId ? [sectionId] : []
                                                                        if (idsToDelete.length === 0) return undefined
                                                                        return () => {
                                                                            for (const id of idsToDelete) onDeleteSection(id)
                                                                        }
                                                                    })()}
                                                                    isReadOnly={isReadOnly}
                                                                    viewType="list"
                                                                    curatedLabels={curatedLabels}
                                                                    category={category}
                                                                    onAddToCollection={
                                                                        showAddToCollection ? undefined : (false as (() => void) | false | null)
                                                                    }
                                                                    buttonPage={buttonPage}
                                                                    priceData={priceData}
                                                                    sectionId={sectionId}
                                                                    onDeleteSection={onDeleteSection}
                                                                    showDeleteButton={false}
                                                                    isDeleting={isDeleting}
                                                                    isVerified={isVerified}
                                                                    isB2bDealAvailable={isB2bDealAvailable}
                                                                    isAvailableOnAirbnb={isAvailableOnAirbnb}
                                                                    onView3D={
                                                                        (mapElement || hasMapPanel) &&
                                                                        stay.geo_location?.lat &&
                                                                        stay.geo_location?.long
                                                                            ? () => {
                                                                                  window.dispatchEvent(
                                                                                      new CustomEvent('collection:focusMarker', {
                                                                                          detail: { id: stay.id }
                                                                                      })
                                                                                  )
                                                                              }
                                                                            : undefined
                                                                    }
                                                                    hideSelectItineraryButton={hideSelectItineraryButton}
                                                                />
                                                            </div>
                                                            {sectionId && collectionIdentifier && (
                                                                <div className="relative z-0">
                                                                    <SectionComments
                                                                        sectionId={sectionId}
                                                                        allBlocks={sectionBlocksMap?.get(sectionId) ?? []}
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
                                        </div>
                                    )
                                })
                                })()}
                            </div>
                        )}
                    </>
                )}
            </motion.div>
        </AnimatePresence>
    )

    // ── Sticky header content (filters, action buttons) ──
    const stickyHeaderContent = (
        <div className="bg-white">
            <div className="px-2 sm:px-3">{renderFilterChips()}</div>
        </div>
    )

    // ── Modals (shared across layouts) ──
    const modals = (
        <>
            {/* Filter Modal */}
            {filterConfig.enabled &&
                (isMobile ? (
                    <FilterMobileSheet
                        isOpen={isFilterOpen ?? false}
                        onClose={() => onFilterOpenChange?.(false)}
                        config={filterConfig}
                    />
                ) : (
                    <FilterDialog
                        isOpen={isFilterOpen ?? false}
                        onClose={() => onFilterOpenChange?.(false)}
                        type="stays"
                        metadata={filterConfig.metadata}
                        initialData={filterConfig.initialData}
                        onChange={(result) => {
                            filterConfig.onChange?.(result)
                        }}
                        onApply={(result) => {
                            filterConfig.onApply?.(result)
                        }}
                        onClear={() => {
                            filterConfig.onClear?.()
                        }}
                        containerClass="border-grey-4"
                    />
                ))}

            {/* Sort Modal */}
            {sortConfig.enabled &&
                (isMobile ? (
                    <SortMobileSheet
                        isOpen={isSortOpen ?? false}
                        onClose={() => onSortOpenChange?.(false)}
                        type="stays"
                        metadata={sortConfig.metadata}
                        initialData={sortConfig.initialData}
                        onChange={() => {}}
                        onApply={(result) => {
                            sortConfig.onApply?.(result)
                        }}
                    />
                ) : (
                    <SortModal
                        isOpen={isSortOpen ?? false}
                        onClose={() => onSortOpenChange?.(false)}
                        type="stays"
                        metadata={sortConfig.metadata}
                        initialData={sortConfig.initialData}
                        onChange={(result) => {
                            sortConfig.onChange?.(result)
                        }}
                        onApply={(result) => {
                            sortConfig.onApply?.(result)
                        }}
                        containerClass="left-100! right-0 top-[260px]"
                    />
                ))}

            {/* Date Edit Modal — saved-stay update path */}
            {editingStayId && (
                <EditExperienceDateModal
                    isOpen={!!editingStayId}
                    onClose={() => setEditingStayId(null)}
                    startDate={editingStartDate}
                    endDate={editingEndDate}
                    onSave={handleSaveDates}
                    isLoading={isSavingDates}
                />
            )}

            {/* Date Edit Modal — city-level (URL-params-only) path. Used
                when the user has no saved stays yet and just needs to
                pick dates for the selected city (empty-rates empty state,
                carousel pencil on empty city). */}
            {cityDateEditOpen && cityDateEditInitial && (
                <EditExperienceDateModal
                    isOpen={cityDateEditOpen}
                    onClose={() => setCityDateEditOpen(false)}
                    startDate={cityDateEditInitial.checkIn}
                    endDate={cityDateEditInitial.checkOut}
                    onSave={handleSaveCityDates}
                    isLoading={false}
                />
            )}

            {canOpenSearchStays && (
                <SearchStaysModal
                    isOpen={isSearchStaysModalOpen}
                    onClose={() => setIsSearchStaysModalOpen(false)}
                    collectionIdentifier={collectionIdentifier}
                    addStayApi={api}
                    nextSectionsOrder={staysData.length + 1}
                    availableCities={availableCities}
                    countryIds={countryIds}
                    filterCheckIn={filterCheckInParam}
                    filterCheckOut={filterCheckOutParam}
                    onSuccess={() => {
                        if (collectionIdentifier) {
                            queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier] })
                            queryClient.invalidateQueries({ queryKey: ['traveler-collection', collectionIdentifier] })
                            queryClient.invalidateQueries({ queryKey: ['collection-stays'] })
                            queryClient.invalidateQueries({ queryKey: ['tripBudget'] })
                        }
                    }}
                />
            )}
        </>
    )

    // ── Two-column layout (when mapElement is provided) ──
    if (mapElement) {
        return (
            <div className="flex flex-col lg:flex-row w-full relative">
                {/* Left Panel — fixed width on desktop, full width on mobile */}
                <div className={`w-full lg:w-[640px] xl:w-[720px] shrink-0 flex flex-col ${mobileShowMap ? 'max-lg:hidden' : ''}`}>
                    {/* Sticky header — filters & action buttons */}
                    <div className="sticky top-0 z-20 bg-white border-b border-grey-5">
                        {/* Mobile map toggle */}
                        {!isMobile ? null : (
                            <div className="flex items-center justify-end px-3 py-2 lg:hidden">
                                <button
                                    type="button"
                                    onClick={() => setMobileShowMap(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-default bg-white text-primary-default font-manrope font-semibold text-sm hover:bg-blue-50 transition-colors">
                                    <MapIcon className="w-4 h-4" />
                                    Map
                                </button>
                            </div>
                        )}
                        {stickyHeaderContent}
                    </div>

                    {/* overflow-x-hidden: vertical-only (overflow-y-auto alone
                        computes overflow-x:auto → diagonal pan). No touch-action
                        so inner carousels/chip rows stay swipeable. */}
                    <div
                        className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain px-2 sm:px-3 pt-3 pb-28 md:pb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none]"
                        style={{ scrollbarWidth: 'none' }}>
                        {leftPanelContent}
                    </div>
                </div>

                {/* Right Panel — map, takes remaining width */}
                <div className={`flex-1 lg:sticky lg:top-0 lg:h-screen ${mobileShowMap ? '' : 'max-lg:hidden'}`}>
                    {/* Mobile back-to-list button */}
                    {mobileShowMap && (
                        <div className="absolute top-3 left-3 z-10 lg:hidden">
                            <button
                                type="button"
                                onClick={() => setMobileShowMap(false)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium font-manrope bg-white shadow-md border border-primary-default cursor-pointer transition-colors">
                                <span className="text-primary-default">← List View</span>
                            </button>
                        </div>
                    )}
                    {mapElement}
                </div>

                {modals}
            </div>
        )
    }

    // ── Legacy single-column layout (no map) ──
    const headerElement = <div className="bg-white">{stickyHeaderContent}</div>

    return (
        <div className="flex flex-col relative">
            {/* Sticky header — portaled to parent container if ref provided, otherwise inline */}
            {headerPortalRef?.current && isActive
                ? createPortal(headerElement, headerPortalRef.current)
                : !headerPortalRef && <div className="sticky top-0 z-20 bg-white">{stickyHeaderContent}</div>}
            {/* Scrollable listing content */}
            <div className="flex flex-col gap-3 sm:gap-4 px-2  sm:px-3 pt-1 sm:pt-3 pb-28 md:pb-6">{leftPanelContent}</div>
            {modals}
        </div>
    )
}

export default StaysTab
