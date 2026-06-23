import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import clsx from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X, ArrowRight, ArrowLeft, Check, Globe2 } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { useLocationPersonalization } from '@/hooks/useLocationPersonalization'
import type { SearchDestinationCardData } from '@/lib/api/OnboardingApi'
import { getPopularCountries, type LocationResponse } from '@/modules/Onboarding/api/onboardingAPI'
import { SafeImage } from '@/modules/Onboarding/components/SearchDestinationCard'
import CustomShimmer from '@/components/shared/Shimmer'
import { FormSection } from '@/modules/Premium/sections/FormSection'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
// MobileStickyCTA replaced by inline floating bottom bar

/** Shared spring for chips + destination check — feels consistent */
const chipSpring = { type: 'spring' as const, stiffness: 520, damping: 32, mass: 0.85 }

export interface MultiSelectDestinationPickerProps {
    /** Country IDs to pre-select when countries load (e.g. from URL params) */
    initialSelectedIds?: string[]
    /** Called when user clicks the proceed button with all selected destinations */
    onProceed: (selected: SearchDestinationCardData[]) => void
    /** Label for the proceed button (default: "GO") */
    buttonLabel?: string
    /** Placeholder for search input (default: "Search international destinations") */
    searchPlaceholder?: string
    /** Show "Where are you going?" header text (default: false) */
    showHeader?: boolean
    /** Additional className for the outer container */
    className?: string
    /** Back button handler — when provided, shows a back button in the floating bar */
    onBack?: () => void
}

const MultiSelectDestinationPicker: React.FC<MultiSelectDestinationPickerProps> = ({
    initialSelectedIds,
    onProceed,
    buttonLabel = 'GO',
    searchPlaceholder = 'Search international destinations',
    showHeader = false,
    className,
    onBack
}) => {
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDestinations, setSelectedDestinations] = useState<SearchDestinationCardData[]>([])
    const [isRequestCallbackModalOpen, setIsRequestCallbackModalOpen] = useState(false)
    const [, setRequestCallbackViewState] = useState<'form' | 'success' | 'member'>('form')
    const [searchResults, setSearchResults] = useState<SearchDestinationCardData[]>([])
    const [isSearchLoading, setIsSearchLoading] = useState(false)
    const debouncedSearch = useDebounce(searchTerm, 300)
    const { trackButtonClickCustom } = usePostHog()
    const lastFiredQueryRef = useRef<string | null>(null)

    const { groupedDestinations, isLoading } = useLocationPersonalization()

    // Flatten all live destinations for search + init
    const allLiveDestinations = useMemo(() => {
        if (!groupedDestinations) return []
        return groupedDestinations.flatMap((group: any) =>
            group.countries.map((c: any) => ({
                id: c.country_id,
                title: c.country_name,
                imageUrl: c.flag_icon_url,
                iconUrl: c.icon_url,
                region: c.region?.name ?? '',
            }))
        )
    }, [groupedDestinations])

    // Pre-select destinations from initialSelectedIds when countries load
    const hasInitialized = useRef(false)
    useEffect(() => {
        if (!initialSelectedIds?.length || hasInitialized.current || allLiveDestinations.length === 0) return
        hasInitialized.current = true
        const matched = allLiveDestinations.filter((d) => initialSelectedIds.includes(d.id))
        if (matched.length > 0) setSelectedDestinations(matched)
    }, [initialSelectedIds, allLiveDestinations])

    const selectedIds = useMemo(() => new Set(selectedDestinations.map((d) => d.id)), [selectedDestinations])

    // Fetch search results when debounced search term changes
    useEffect(() => {
        const query = debouncedSearch.trim()
        if (!query) {
            setSearchResults([])
            setIsSearchLoading(false)
            return
        }

        let isCancelled = false
        setIsSearchLoading(true)

        const fetchSearchResults = async () => {
            try {
                const response = await getPopularCountries({ q: query, isLive: true })

                if (isCancelled) return

                const mapped: SearchDestinationCardData[] = (response ?? []).slice(0, 5).map((item: LocationResponse) => ({
                    id: item.country_id,
                    title: item.country_name,
                    imageUrl: item.flag_icon_url || '',
                    iconUrl: item.icon_url || '',
                    region: item.region || '',
                }))

                setSearchResults(mapped)
            } catch {
                if (!isCancelled) setSearchResults([])
            } finally {
                if (!isCancelled) setIsSearchLoading(false)
            }
        }

        void fetchSearchResults()

        return () => {
            isCancelled = true
        }
    }, [debouncedSearch])

    useEffect(() => {
        const query = searchTerm.trim()
        const isEmptyResult = !isSearchLoading && searchResults.length === 0 && query.length >= 2
        if (isEmptyResult) {
            if (lastFiredQueryRef.current !== query) {
                lastFiredQueryRef.current = query
                trackButtonClickCustom({
                    buttonPage: 'tripboard_v1',
                    buttonName: 'no_results',
                    buttonAction: 'destination_search',
                    extra: {
                        search_query: query,
                        query_length: query.length,
                    },
                })
            }
        } else {
            lastFiredQueryRef.current = null
        }
    }, [searchResults, isSearchLoading, searchTerm, trackButtonClickCustom])

    const countryCardRef = useRef<HTMLDivElement>(null)

    // Two-phase selection: first move the region to top, then hide others
    const [pendingRegion, setPendingRegion] = useState<string | null>(null)

    const handleToggleDestination = (dest: SearchDestinationCardData) => {
        if (selectedIds.has(dest.id)) {
            setSelectedDestinations((prev) => prev.filter((d) => d.id !== dest.id))
            setPendingRegion(null)
        } else {
            const mergeNames = new Set(['West Europe', 'South Europe', 'Western Europe', 'Southern Europe'])
            const mergedRegion = mergeNames.has(dest.region ?? '') ? 'West & South Europe' : (dest.region ?? '')

            // Phase 1: reorder so selected region moves to top (layout animation handles the slide)
            setPendingRegion(mergedRegion)

            // Phase 2: fade out others — fast for top regions, slower for bottom to let scroll settle
            const topRegions = new Set(['Southeast Asia', 'West & South Europe', 'East Asia', 'Eastern Europe'])
            const delay = topRegions.has(mergedRegion) ? 80 : 350
            setTimeout(() => {
                setSelectedDestinations((prev) => [...prev, dest])
                setSearchTerm('')
                setPendingRegion(null)
            }, delay)
        }
    }

    const handleRemoveDestination = (id: string) => {
        setSelectedDestinations((prev) => prev.filter((d) => d.id !== id))
    }

    const handleProceedClick = () => {
        if (selectedDestinations.length === 0) return
        onProceed(selectedDestinations)
    }

    const hasSelection = selectedDestinations.length > 0

    // Track scroll position for left/right gradient fades
    const [isScrolledLeft, setIsScrolledLeft] = useState(false)
    const [isScrolledRight, setIsScrolledRight] = useState(false)
    const chipScrollRef = useRef<HTMLDivElement>(null)

    const handleChipScroll = useCallback(() => {
        const el = chipScrollRef.current
        if (!el) return
        setIsScrolledLeft(el.scrollLeft > 0)
        setIsScrolledRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
    }, [])

    // Re-check overflow when chips are added/removed
    useEffect(() => {
        handleChipScroll()
    }, [selectedDestinations, handleChipScroll])

    const isSearching = debouncedSearch.trim().length > 0

    return (
        <div className={clsx('flex flex-col w-full gap-6 px-3 ', className)}>
            {showHeader && (
                <div className="text-left">
                    <h3 className="font-red-hat-display font-medium text-[18px] text-grey-0">
                        Where are you going?
                    </h3>
                    <p className="text-grey-2 font-medium text-[14px] mt-0.5 font-manrope">
                        Pick one or more destinations
                    </p>
                </div>
            )}

            {/* Search Box with Chips + Proceed button inline */}
            <div className="flex items-start gap-3 min-w-full">
                {/* Search input with selected chips */}
                <div
                    className={clsx(
                        'relative flex flex-wrap items-center flex-1 min-w-0 w-full bg-white border rounded-2xl px-3 py-2 min-h-14 transition-all duration-200',
                        hasSelection
                            ? 'border-primary-default/40 shadow-[0_2px_12px_0_rgba(112,17,246,0.12)]'
                            : 'border-grey-4 shadow-[0px_2px_8px_0px_#e0e0e0]'
                    )}>
                        {/* Left-edge gradient fade — visible only when scrolled */}
                        {hasSelection && isScrolledLeft && (
                            <div
                                className="absolute left-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
                                style={{ background: 'linear-gradient(to right, white 40%, transparent)' }}
                            />
                        )}
                        {!hasSelection && (
                            <Search size={18} className="text-grey-2 flex-shrink-0 mr-2" />
                        )}
                        <div
                            ref={chipScrollRef}
                            onScroll={handleChipScroll}
                            className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                            <AnimatePresence initial={false}>
                                {selectedDestinations.map((d) => (
                                    <motion.div
                                        key={d.id}
                                        initial={{ opacity: 0, scale: 0.82 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.82 }}
                                        transition={chipSpring}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-default-80 shrink-0 max-w-[160px]">
                                        <SafeImage
                                            src={d.imageUrl}
                                            alt={d.title}
                                            className="w-5 h-5 rounded-full object-cover shrink-0"
                                        />
                                        <span className="font-red-hat-display font-bold text-[12px] text-black whitespace-nowrap truncate">
                                            {d.title}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveDestination(d.id)}
                                            className="w-4 h-4 rounded-full bg-primary-default hover:bg-primary-default/80 flex items-center justify-center transition-colors shrink-0">
                                            <X size={10} className="text-white" strokeWidth={3} />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            <input
                                type="text"
                                placeholder={hasSelection ? '' : searchPlaceholder}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="flex-grow outline-none bg-transparent text-grey-0 placeholder-grey-3 min-w-[160px] font-manrope text-[15px] py-1"
                            />
                        </div>
                        {/* Right-edge gradient fade — visible when content overflows */}
                        {hasSelection && isScrolledRight && (
                            <div
                                className="absolute right-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
                                style={{ background: 'linear-gradient(to left, white 40%, transparent)' }}
                            />
                        )}
                </div>

                {/* Inline proceed button removed — using floating bottom bar instead */}
            </div>

            {/* Country Lists — inside card */}
            <div ref={countryCardRef} className="w-full flex-shrink-0 bg-white rounded-2xl border border-grey-4/50 shadow-sm p-4 sm:p-5">
                {/* SEARCH MODE */}
                {isSearching && (
                    <div className="flex flex-col gap-2 min-w-full">
                        <p className="text-[12px] font-manrope text-grey-2 font-medium px-0.5">
                            {isSearchLoading
                                ? `Searching for "${debouncedSearch}"…`
                                : `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${debouncedSearch}"`}
                        </p>
                        {isSearchLoading ? (
                            <div className="flex flex-col gap-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <CustomShimmer key={i} height={44} radius={14} />
                                ))}
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="flex flex-wrap gap-2.5">
                                {searchResults.map((dest) => (
                                    <DestinationCard
                                        key={dest.id}
                                        dest={dest}
                                        isSelected={selectedIds.has(dest.id)}
                                        onToggle={handleToggleDestination}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex w-full flex-col items-center justify-center py-8 gap-2 text-center">
                                <Globe2 size={32} className="text-grey-3" />
                                <span className="text-[14px] text-grey-2 font-red-hat-display font-semibold">
                                    No destinations match your search
                                </span>
                            </div>
                        )}

                        {/* Always offer callback while searching — API can match tags, not just country names */}
                        <div className="flex flex-col items-center gap-2 pt-4 mt-2 border-t border-grey-4/50 text-center">
                            <span className="text-[14px] text-grey-1 font-red-hat-display font-semibold">
                                Can&apos;t find your destination?
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    trackButtonClickCustom({
                                        buttonPage: 'tripboard_v1',
                                        buttonName: 'callback_requested',
                                        buttonAction: 'destination_search',
                                        extra: {
                                            search_query: searchTerm.trim(),
                                        },
                                    })
                                    setIsRequestCallbackModalOpen(true)
                                }}
                                className="min-w-40 w-fit px-6 py-3 font-red-hat-display font-[645] text-[15px] bg-linear-to-r from-header-black to-black text-white rounded-xl transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer"
                            >
                                Request callback
                            </button>
                        </div>
                    </div>
                )}

                {/* When NOT searching: show default sections */}
                {!debouncedSearch.trim() && (
                    <>
                        {isLoading ? (
                            <div className="flex flex-col gap-8">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex flex-col gap-3">
                                        <CustomShimmer height={18} radius={6} />
                                        <div className="flex flex-wrap gap-2.5">
                                            {Array.from({ length: 4 }).map((_, j) => (
                                                <CustomShimmer key={j} height={52} radius={16} />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-7">
                                <AnimatePresence mode="popLayout">
                                {(() => {
                                    if (!groupedDestinations) return null

                                    // Merge West Europe + South Europe into one group
                                    const mergeNames = new Set(['West Europe', 'South Europe', 'Western Europe', 'Southern Europe'])
                                    const mergedGroups: { name: string; countries: any[] }[] = []
                                    let westSouthGroup: { name: string; countries: any[] } | null = null

                                    for (const group of groupedDestinations as any[]) {
                                        if (mergeNames.has(group.name)) {
                                            if (!westSouthGroup) {
                                                westSouthGroup = { name: 'West & South Europe', countries: [...group.countries] }
                                            } else {
                                                westSouthGroup.countries.push(...group.countries)
                                            }
                                        } else {
                                            mergedGroups.push(group)
                                        }
                                    }
                                    if (westSouthGroup) mergedGroups.push(westSouthGroup)

                                    // Custom region order
                                    const regionOrder = [
                                        'Southeast Asia',
                                        'West & South Europe',
                                        'East Asia',
                                        'Eastern Europe',
                                        'Middle East',
                                        'Oceania',
                                        'South Asia',
                                        'Northern Europe',
                                    ]

                                    const sorted = mergedGroups.sort((a, b) => {
                                        const ai = regionOrder.indexOf(a.name)
                                        const bi = regionOrder.indexOf(b.name)
                                        // Unknown regions go to the end
                                        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
                                    })

                                    // Map raw region names to merged group names
                                    const rawToMerged = (raw: string) =>
                                        mergeNames.has(raw) ? 'West & South Europe' : raw

                                    // Determine locked region from selected destinations
                                    const selectedRegion = selectedDestinations.length > 0
                                        ? rawToMerged(selectedDestinations[0].region ?? '')
                                        : null

                                    // Filter to only the selected region when a country is picked
                                    const visibleGroups = selectedRegion
                                        ? sorted.filter((group) => group.name === selectedRegion)
                                        : sorted

                                    // During pending phase: reorder so pending region is first
                                    const orderedGroups = pendingRegion && !selectedRegion
                                        ? [
                                              ...visibleGroups.filter((g) => g.name === pendingRegion),
                                              ...visibleGroups.filter((g) => g.name !== pendingRegion),
                                          ]
                                        : visibleGroups

                                    return orderedGroups.map((group) => {
                                        const destinations: SearchDestinationCardData[] = group.countries.map((c: any) => ({
                                            id: c.country_id,
                                            title: c.country_name,
                                            imageUrl: c.flag_icon_url,
                                            iconUrl: c.icon_url,
                                            region: c.region?.name ?? '',
                                        }))
                                        return (
                                            <motion.div
                                                key={group.name}
                                                layout
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
                                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                            >
                                                <RegionGroup
                                                    regionName={group.name}
                                                    destinations={destinations}
                                                    selectedIds={selectedIds}
                                                    onToggle={handleToggleDestination}
                                                />
                                            </motion.div>
                                        )
                                    })
                                })()}
                                </AnimatePresence>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Floating bottom bar — matches Step 1 design */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-grey-4/50 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-30">
                <div className={`max-w-2xl mx-auto flex items-center gap-4 ${onBack ? 'justify-between' : 'justify-end'}`}>
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-grey-4 text-grey-1 font-medium font-manrope hover:bg-grey-5 cursor-pointer transition-all"
                        >
                            <ArrowLeft size={18} />
                            <span>Back</span>
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={!hasSelection}
                        onClick={handleProceedClick}
                        className={`flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-medium font-manrope cursor-pointer transition-all duration-300 ${
                            onBack ? '' : 'w-full sm:w-auto'
                        } ${
                            hasSelection
                                ? 'bg-primary-default text-white hover:shadow-lg sm:hover:scale-105 active:scale-95'
                                : 'bg-primary-default/40 text-white/70'
                        }`}
                    >
                        <span>{buttonLabel}</span>
                        {hasSelection && <ArrowRight size={16} strokeWidth={2.5} />}
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {isRequestCallbackModalOpen && (
                    <div
                        key="callback-modal-root"
                        className="fixed inset-0 z-[260] flex items-center justify-center p-4"
                    >
                        {/* Backdrop */}
                        <motion.div
                            key="callback-modal-backdrop"
                            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.22, ease: 'linear' }}
                            onClick={() => setIsRequestCallbackModalOpen(false)}
                            aria-hidden="true"
                        />
                        {/* Card */}
                        <motion.div
                            key="callback-modal-card"
                            className="relative w-full max-w-[400px] rounded-2xl bg-white shadow-2xl overflow-hidden"
                            initial={{ opacity: 0, y: 16, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 12, scale: 0.98 }}
                            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        >
                            <div className="px-4 py-5 sm:px-5 sm:py-6 max-h-[80vh] overflow-y-auto bg-grey_5">
                                <FormSection
                                    compact
                                    onViewStateChange={setRequestCallbackViewState}
                                    onCancel={() => setIsRequestCallbackModalOpen(false)}
                                    subscriptionIntent="destination_callback"
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

/** Horizontal wrapping pill layout for destination cards */
const RegionGroup: React.FC<{
    regionName: string
    destinations: SearchDestinationCardData[]
    selectedIds: Set<string>
    onToggle: (dest: SearchDestinationCardData) => void
}> = ({ regionName, destinations, selectedIds, onToggle }) => (
    <div className="flex flex-col gap-3">
        {/* Section heading */}
        <div className="flex items-center gap-2">
            {/* <span className="text-[16px] leading-none">{emoji}</span> */}
            <span className="font-red-hat-display font-bold text-[13px] text-grey-1 tracking-wide uppercase">
                {regionName}
            </span>
            <div className="flex-1 h-px bg-grey-5 ml-1" />
        </div>

        {/* Cards */}
        <div className="flex flex-wrap gap-2.5">
            {destinations.map((dest) => (
                <DestinationCard
                    key={dest.id}
                    dest={dest}
                    isSelected={selectedIds.has(dest.id)}
                    onToggle={onToggle}
                />
            ))}
        </div>
    </div>
)

const DestinationCard: React.FC<{
    dest: SearchDestinationCardData
    isSelected: boolean
    onToggle: (dest: SearchDestinationCardData) => void
}> = ({ dest, isSelected, onToggle }) => (
    <button
        type="button"
        onClick={() => onToggle(dest)}
        className={clsx(
            'group relative isolate inline-flex h-10 shrink-0 transform-gpu items-center gap-2.5 rounded-2xl border border-solid pl-3 transition-[background-color,border-color,padding-right] duration-200 cursor-pointer select-none',
            isSelected
                ? 'border-primary-default bg-primary-default-80 pr-8'
                : 'border-primary-default-08 bg-grey-5 pr-3 active:opacity-90'
        )}>
        {/* Flag image */}
        <div
            className={clsx(
                'size-6 rounded-xl overflow-hidden shrink-0 ring-2 transition-all',
                isSelected ? 'ring-white/40' : 'ring-grey-5 group-hover:ring-primary-default/20'
            )}>
            <SafeImage
                src={dest.imageUrl}
                alt={dest.title}
                className="w-full h-full object-cover"
            />
        </div>
        {/* Name */}
        <span className={clsx(
            'font-red-hat-display font-[650] text-[15px] leading-none whitespace-nowrap transition-colors',
            isSelected ? 'text-black' : 'text-grey-0'
        )}>
            {dest.title}
        </span>
        <AnimatePresence>
            {isSelected && (
                <motion.span
                    key="tick"
                    initial={{ opacity: 0, scale: 0.35 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.35 }}
                    transition={chipSpring}
                    className="pointer-events-none absolute right-2 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center rounded-full bg-primary-default"
                    aria-hidden
                >
                <Check size={10} strokeWidth={3.5} className="text-white" />
                </motion.span>
            )}
        </AnimatePresence>
    </button>
)

export default MultiSelectDestinationPicker
