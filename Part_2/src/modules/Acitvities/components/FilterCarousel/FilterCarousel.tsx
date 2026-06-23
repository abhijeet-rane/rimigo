import { useState } from 'react'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import { PRIORITY_LABELS } from '@/modules/Experiences/constants/filterConstants'
import { cn } from '@/lib/utils'
import type { ExperiencePreferenceUI } from '@/modules/Onboarding/adapters/experiencePreferenceAdapters'
import Divider from '@/components/shared/Divider/Divider'
import SmartSearchButton from './SmartSearchButton'
import FilterChipButton from './FilterChipButton'
import FilterButton from './FilterButton'
import SortButton from './SortButton'
import type { FilterConfig, SortConfig } from '../../hooks/useFilterAndSort'
import { GEM_ICON_BLACK, STAR_PRIMARY_DEFAULT } from '@/constants/icons/svgFromCDN'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

// Configuration: Enable or disable priority filters
const ENABLE_PRIORITY_FILTERS = false

interface FilterChip {
    id: string
    label: string
    icon?: string
    imageUrl?: string
    isPopular?: boolean
    type: 'priority' | 'preference'
}

export interface SmartSearchConfig {
    enabled: boolean
}

/**
 * Configuration for Filter and Sort buttons
 */
export interface FilterAndSortConfig<
    TFilterMetadata = unknown,
    TFilterInitialData = unknown,
    TFilterResult = unknown,
    TSortMetadata = unknown,
    TSortInitialData = unknown,
    TSortResult = unknown
> {
    /** Filter button configuration */
    filterConfig?: FilterConfig<TFilterMetadata, TFilterInitialData, TFilterResult>
    /** Sort button configuration */
    sortConfig?: SortConfig<TSortMetadata, TSortInitialData, TSortResult>
    /** Handler when filter button is clicked */
    onFilterClick?: () => void
    /** Handler when sort button is clicked */
    onSortClick?: () => void
    /** Whether filter button should show as active (e.g., when filters are applied) */
    isFilterActive?: boolean
    /** Whether sort button should show as active (e.g., when sort is applied) */
    isSortActive?: boolean
    /** Ref callback for filter button (to position modal) */
    filterButtonRef?: (element: HTMLButtonElement | null) => void
    /** Ref callback for sort button (to position modal) */
    sortButtonRef?: (element: HTMLButtonElement | null) => void
}

interface FilterCarouselProps<
    TFilterMetadata = unknown,
    TFilterInitialData = unknown,
    TFilterResult = unknown,
    TSortMetadata = unknown,
    TSortInitialData = unknown,
    TSortResult = unknown
> {
    selectedPriorities?: string[]
    selectedPreferences: string[]
    onPriorityToggle?: (filterId: string) => void
    onPreferenceToggle: (filterId: string) => void
    experiencePreferences?: ExperiencePreferenceUI[]
    className?: string
    floatingPrompts?: Array<{ text: string; onClick?: () => void }>
    smartSearchConfig?: SmartSearchConfig
    onSmartSearch?: (query: string) => void
    onSmartSearchToggle?: (isActive: boolean) => void
    isSmartSearchActive?: boolean
    /** Filter and Sort button configuration */
    filterAndSortConfig?: FilterAndSortConfig<TFilterMetadata, TFilterInitialData, TFilterResult, TSortMetadata, TSortInitialData, TSortResult>
    /** Optional — when provided, renders a leading "For you" meta-chip
     *  in the mobile chips row. Clicking it clears every selected
     *  priority/preference (the "all" state). The chip is shown as
     *  active when nothing else is selected. */
    onClearAllFilters?: () => void
    /** Mobile-only — when true, the chip filter row is hidden by default
     *  and the Filter button toggles its visibility with a smooth expand
     *  animation. Desktop layout is unchanged. Used by the Tripboard
     *  Activities tab so chips don't compete with the cards above-the-fold. */
    mobileCollapsibleChips?: boolean
    /** When true, the trailing `<Divider />` below the filter row is
     *  suppressed. Callers that wrap the carousel in their own section
     *  (e.g. Tripboard Activities) use this so they control the bottom
     *  separator's position and spacing without doubling it up. */
    hideTrailingDivider?: boolean
    /** Spacing override for the desktop top divider (defaults to
     *  'mt-12 mb-4'). The Tripboard Activities tab renders its own heading
     *  directly above the carousel, where the default 48px gap reads as a
     *  hole in the layout. */
    topDividerClassName?: string
}

const FilterCarousel = <
    TFilterMetadata = unknown,
    TFilterInitialData = unknown,
    TFilterResult = unknown,
    TSortMetadata = unknown,
    TSortInitialData = unknown,
    TSortResult = unknown
>({
    selectedPriorities = [],
    selectedPreferences,
    onPriorityToggle,
    onPreferenceToggle,
    experiencePreferences,
    className,
    smartSearchConfig = { enabled: false },
    onSmartSearchToggle,
    isSmartSearchActive: externalIsSmartSearchActive,
    filterAndSortConfig,
    onClearAllFilters,
    mobileCollapsibleChips = false,
    hideTrailingDivider = false,
    topDividerClassName
}: FilterCarouselProps<TFilterMetadata, TFilterInitialData, TFilterResult, TSortMetadata, TSortInitialData, TSortResult>) => {
    // Smart search state - use external prop if provided, otherwise use internal state
    const [internalIsSmartSearchActive, setInternalIsSmartSearchActive] = useState(false)
    // Mobile chip-row expanded state. Only consulted when
    // `mobileCollapsibleChips` is on — desktop and other callers ignore it.
    const [isMobileChipsExpanded, setIsMobileChipsExpanded] = useState(false)
    // const [smartSearchQuery, setSmartSearchQuery] = useState('')

    // Use external state if provided, otherwise use internal state
    const isSmartSearchActive = externalIsSmartSearchActive !== undefined ? externalIsSmartSearchActive : internalIsSmartSearchActive

    const { trackButtonClickCustom } = usePostHog()

    // Wrap caller-supplied handlers so each filter interaction also fires
    // a PostHog event. Falls back to no-op when the caller doesn't supply
    // a corresponding handler.
    const trackedPriorityToggle = (id: string) => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_EXPLORE_FILTER_CHIP_TOGGLE,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { type: 'priority', id, selected: !selectedPriorities.includes(id) }
        })
        onPriorityToggle?.(id)
    }
    const trackedPreferenceToggle = (id: string) => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_EXPLORE_FILTER_CHIP_TOGGLE,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { type: 'preference', id, selected: !selectedPreferences.includes(id) }
        })
        onPreferenceToggle(id)
    }
    const trackedClearAll = () => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_EXPLORE_FILTER_CLEAR_ALL,
            buttonAction: POSTHOG_ACTIONS.CLICK
        })
        onClearAllFilters?.()
    }
    const trackedFilterClick = () => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_EXPLORE_FILTER_OPEN,
            buttonAction: POSTHOG_ACTIONS.CLICK
        })
        filterAndSortConfig?.onFilterClick?.()
    }
    const trackedSortClick = () => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_EXPLORE_SORT_OPEN,
            buttonAction: POSTHOG_ACTIONS.CLICK
        })
        filterAndSortConfig?.onSortClick?.()
    }

    const isSmartSearchEnabled = smartSearchConfig.enabled

    // Build filter options from priorities and preferences
    const priorityFilters: FilterChip[] = ENABLE_PRIORITY_FILTERS
        ? Object.entries(PRIORITY_LABELS).map(([id, data]) => ({
              id,
              label: data.label,
              icon: data.icon,
              type: 'priority' as const
          }))
        : []

    const preferenceFilters: FilterChip[] = experiencePreferences
        ? experiencePreferences.map((pref) => ({
              id: pref.backendValue,
              label: pref.labelUi,
              imageUrl: pref.imageSrc,
              type: 'preference' as const
          }))
        : []

    const allFilters: FilterChip[] = [...priorityFilters, ...preferenceFilters]

    // Handle smart search toggle
    const handleSmartSearchToggle = () => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.ACTIVITIES_EXPLORE,
            buttonName: POSTHOG_EVENTS.ACTIVITIES_EXPLORE_SMART_SEARCH_TOGGLE,
            buttonAction: POSTHOG_ACTIONS.CLICK
        })
        if (externalIsSmartSearchActive === undefined) {
            setInternalIsSmartSearchActive(true)
        }
        onSmartSearchToggle?.(true)
    }

    // Handle back button click
    // const handleBackClick = () => {
    //     if (externalIsSmartSearchActive === undefined) {
    //         setInternalIsSmartSearchActive(false)
    //     }
    //     setSmartSearchQuery('')
    //     onSmartSearchToggle?.(false)
    // }

    // Handle search
    // const handleSearch = () => {
    //     if (onSmartSearch) {
    //         onSmartSearch(smartSearchQuery)
    //     }
    // }

    // If smart search is active, don't show the filter carousel (it's handled by SmartSearchSection)
    if (isSmartSearchActive && isSmartSearchEnabled) {
        return null
    }

    // Mobile filter/sort row: when both are enabled they split the row;
    // when only one, drop `flex-1` and center the single pill.
    const filterEnabled = !!filterAndSortConfig?.filterConfig?.enabled
    const sortEnabled = !!filterAndSortConfig?.sortConfig?.enabled
    // When the collapsible-chips affordance is on, the Filter button is
    // surfaced on mobile regardless of whether the API-backed modal is
    // wired up — its job there is just to toggle the inline chip row.
    const mobileFilterVisible = filterEnabled || mobileCollapsibleChips
    const mobileBothEnabled = mobileFilterVisible && sortEnabled
    const mobileButtonClass = mobileBothEnabled
        ? 'max-md:flex-1 max-md:max-w-1/2 max-md:justify-center'
        : 'max-md:justify-center'

    const handleMobileFilterClick = () => {
        if (mobileCollapsibleChips) {
            // Toggle the inline chip panel — modal not used on mobile in
            // this mode. PostHog tracking still fires so analytics see the
            // intent the same way as the desktop modal open.
            trackedFilterClick()
            setIsMobileChipsExpanded((prev) => !prev)
            return
        }
        trackedFilterClick()
    }

    return (
        <>
            {/* Top divider — hidden on mobile so the FilterCarousel can
                butt directly against the section above it (Quick Bites
                / All-activities listing). On desktop the 48px top
                breathing room is preserved. */}
            <Divider className={`hidden md:block ${topDividerClassName ?? 'mt-12 mb-4'}`} />

            {/* Desktop Layout (unchanged) - hidden on mobile/tablet */}
            <div className={cn('hidden lg:flex w-full items-center gap-3 py-0 overflow-hidden', className)}>
                {/* Smart Search Button - Outside carousel so it doesn't scroll */}
                {isSmartSearchEnabled && (
                    <>
                        <SmartSearchButton onClick={handleSmartSearchToggle} />
                        {/* Separator between Smart Search and carousel */}
                        {allFilters.length > 0 && <div className="w-px h-6 bg-grey-4 shrink-0"></div>}
                    </>
                )}

                {/* Carousel container - flexible width, can shrink */}
                <div className="flex-1 min-w-0 overflow-hidden py-[4.5px]">
                    <GenericCarousel
                        className="w-full"
                        gap={12}
                        gradientStartColor="white"
                        gradientEndColor="rgba(255,255,255,0)">
                        {/* Filter Chips */}
                        {allFilters.map((filter) => {
                            const isSelected =
                                filter.type === 'priority' ? selectedPriorities.includes(filter.id) : selectedPreferences.includes(filter.id)
                            const handleToggle = filter.type === 'priority' ? trackedPriorityToggle : trackedPreferenceToggle

                            // Skip rendering if priority filter but no handler provided
                            if (filter.type === 'priority' && !onPriorityToggle) {
                                return null
                            }

                            // Skip rendering if no handler available
                            if (!handleToggle) {
                                return null
                            }

                            return (
                                <FilterChipButton
                                    key={`${filter.type}-${filter.id}`}
                                    id={filter.id}
                                    label={filter.label}
                                    icon={GEM_ICON_BLACK}
                                    imageUrl={filter.imageUrl}
                                    isPopular={filter.isPopular}
                                    isSelected={isSelected}
                                    onClick={() => handleToggle(filter.id)}
                                />
                            )
                        })}
                    </GenericCarousel>
                </div>

                {/* Separator before Filter and Sort buttons (if there are filters and buttons are enabled) */}
                {allFilters.length > 0 && (filterAndSortConfig?.filterConfig?.enabled || filterAndSortConfig?.sortConfig?.enabled) && (
                    <div className="w-px h-6 bg-grey-4 shrink-0"></div>
                )}

                {/* Filter and Sort buttons container - fixed width, won't shrink */}
                <div className="flex items-center gap-3 shrink-0">
                    {/* Filter Button - Always at the end if enabled */}
                    {filterAndSortConfig?.filterConfig?.enabled && (
                        <FilterButton
                            ref={filterAndSortConfig.filterButtonRef || undefined}
                            label={filterAndSortConfig.filterConfig.label}
                            icon={filterAndSortConfig.filterConfig.icon}
                            isActive={filterAndSortConfig.isFilterActive}
                            onClick={trackedFilterClick}
                        />
                    )}

                    {/* Sort Button - Always at the end if enabled */}
                    {filterAndSortConfig?.sortConfig?.enabled && (
                        <SortButton
                            ref={filterAndSortConfig.sortButtonRef || undefined}
                            label={filterAndSortConfig.sortConfig.label}
                            icon={filterAndSortConfig.sortConfig.icon}
                            isActive={filterAndSortConfig.isSortActive}
                            onClick={trackedSortClick}
                        />
                    )}
                </div>
            </div>

            {/* Mobile/Tablet Layout - shown only on mobile and tablet */}
            <div className={cn('flex  lg:hidden flex-col  w-full', className)}>
                {/* Top Row: Filter and Sort buttons. When BOTH are enabled,
                    each takes half the row (`flex-1`); when only one is
                    enabled, drop `flex-1` and center the single pill so
                    it sits in the middle of the row rather than pinned
                    left. */}
                <div
                    className={cn(
                        'flex items-center gap-3 px-[20px]',
                        !mobileBothEnabled && (mobileFilterVisible || sortEnabled) && 'justify-center'
                    )}>
                    {isSmartSearchEnabled && <SmartSearchButton onClick={handleSmartSearchToggle} />}
                    {isSmartSearchEnabled && <div className="self-stretch w-[1px] bg-grey-4 "></div>}
                    {mobileFilterVisible && (
                        <FilterButton
                            ref={filterAndSortConfig?.filterButtonRef || undefined}
                            label={filterAndSortConfig?.filterConfig?.label}
                            icon={filterAndSortConfig?.filterConfig?.icon}
                            isActive={filterAndSortConfig?.isFilterActive || (mobileCollapsibleChips && isMobileChipsExpanded)}
                            onClick={handleMobileFilterClick}
                            className={mobileButtonClass}
                        />
                    )}
                    {sortEnabled && (
                        <SortButton
                            ref={filterAndSortConfig?.sortButtonRef || undefined}
                            label={filterAndSortConfig?.sortConfig?.label}
                            icon={filterAndSortConfig?.sortConfig?.icon}
                            isActive={filterAndSortConfig?.isSortActive}
                            onClick={trackedSortClick}
                            className={mobileButtonClass}
                        />
                    )}
                </div>
                {/* Chip filters — always inline on the standalone /activities
                    page; collapsible (hidden by default, expanded by the
                    Filter button) when the tripboard Activities tab opts in
                    via `mobileCollapsibleChips`. The collapse uses a
                    grid-rows transition for a smooth height animation
                    without measuring children. */}
                {allFilters.length > 0 && (
                    <div
                        className={cn(
                            'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
                            mobileCollapsibleChips
                                ? isMobileChipsExpanded
                                    ? 'grid-rows-[1fr] opacity-100 mt-3'
                                    : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                                : 'grid-rows-[1fr] opacity-100 mt-3'
                        )}>
                        <div className="overflow-hidden">
                            <div className="flex flex-row max-md:overflow-x-auto md:flex-col gap-2 px-[20px] scrollbar-hide">
                                {onClearAllFilters && (
                                    <FilterChipButton
                                        id="__for_you__"
                                        label="For you"
                                        icon={STAR_PRIMARY_DEFAULT}
                                        isSelected={selectedPriorities.length === 0 && selectedPreferences.length === 0}
                                        onClick={trackedClearAll}
                                    />
                                )}
                                {allFilters.map((filter) => {
                                    const isSelected =
                                        filter.type === 'priority'
                                            ? selectedPriorities.includes(filter.id)
                                            : selectedPreferences.includes(filter.id)
                                    const handleToggle =
                                        filter.type === 'priority' ? onPriorityToggle : onPreferenceToggle

                                    if (filter.type === 'priority' && !onPriorityToggle) return null
                                    if (!handleToggle) return null

                                    return (
                                        <FilterChipButton
                                            key={`${filter.type}-${filter.id}`}
                                            id={filter.id}
                                            label={filter.label}
                                            icon={GEM_ICON_BLACK}
                                            imageUrl={filter.imageUrl}
                                            isPopular={filter.isPopular}
                                            isSelected={isSelected}
                                            onClick={() => handleToggle(filter.id)}
                                        />
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {!hideTrailingDivider && <Divider className="mt-4 mb-8" />}
        </>
    )
}

export default FilterCarousel
