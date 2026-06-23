import { useState, useRef, useMemo } from 'react'
import { Plus, Route, Search } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import clsx from 'clsx'
import { TRIP_ROLE_INVITED } from '@/constants/userConfig'
import type { TravelerTrip } from '@/pages/Landing/api/travelerTrips'
import type { TripFlagsData } from '@/utils/tripFlags'
import { formatCapitalizeFirstLetter } from '@/utils/tripFormatters'
import { useIsMobile } from '@/hooks/use-mobile'
import { useLocation } from 'react-router-dom'
import { BEACH_TREE } from '@/constants/icons/svgFromCDN'

interface SidebarTripsNavProps {
    isCollapsed: boolean
    activeTripId?: string | null
    tripsList: TravelerTrip[]
    tripFlagsMap: Record<string, TripFlagsData>
    onSelectTrip: (tripId: string) => void
    onCreateTrip: () => void
    onNavigateToTripboard: () => void
    /** When on /tripboard and sidebar is collapsed, expand it so user can select trips. */
    onExpandSidebar?: () => void
    /** When true, shows a search input to filter trips by name */
    isRimigoInternal?: boolean
}

export function SidebarTripsNav({
    isCollapsed,
    activeTripId,
    tripsList,
    tripFlagsMap,
    onSelectTrip,
    onCreateTrip,
    onNavigateToTripboard,
    onExpandSidebar,
    isRimigoInternal = false,
}: SidebarTripsNavProps) {
    const wrapperRef = useRef<HTMLDivElement>(null)
    const isMobile = useIsMobile()
    const location = useLocation()

    // Collapsed mode — icon only, navigates directly to /tripboard
    if (isCollapsed) {
        return (
            <div ref={wrapperRef} className="relative">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => {
                                // If already on tripboard and sidebar is collapsed (desktop), expand so user can choose a trip.
                                if (!isMobile && (location.pathname === '/tripboard' || location.pathname.startsWith('/tripboard/'))) {
                                    onExpandSidebar?.()
                                    return
                                }
                                onNavigateToTripboard()
                            }}
                            className="w-full h-12 flex items-center justify-center cursor-pointer rounded-xl hover:bg-grey-5 transition-colors duration-200">
                            <div className="w-7 h-7 flex items-center justify-center">
                                <Route/>
                            </div>
                        </button>
                    </TooltipTrigger>
                    {!isMobile && (
                        <TooltipContent
                            side="right"
                            sideOffset={8}
                            className="bg-grey-0 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg">
                            My Trips
                        </TooltipContent>
                    )}
                </Tooltip>
            </div>
        )
    }

    // Expanded mode — "My Trips" header with always-visible trip list
    return (
        <div ref={wrapperRef} className="flex flex-col">
            {/* My Trips header row — tripboard icon */}
            <div
                className={clsx(
                    'group relative rounded-xl transition-all duration-200',
                    'flex items-center w-full h-10 md:h-9 px-3 gap-[8px]',
                    'text-grey-1'
                )}>
                {/* Tripboard icon */}
                <div className="w-7 h-7 flex items-center justify-center shrink-0">
                    <Route/>
                </div>

                {/* Title */}
                <span className="text-[16px] md:text-sm font-semibold font-red-hat-display text-grey-1 transition-colors duration-200">
                    My Trips
                </span>

                {/* + New Trip button — hidden when active trip is an invited trip */}
                {(() => {
                    const activeTrip = tripsList.find(t => t.trip_id === activeTripId)
                    const isInvitedTrip = activeTrip?.role === TRIP_ROLE_INVITED
                    if (isInvitedTrip) return null
                    return (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onCreateTrip()
                            }}
                            className="ml-auto flex items-center gap-1 text-primary-default hover:text-primary-dark transition-colors cursor-pointer">
                            <Plus className="w-3.5 h-3.5" />
                            <span className="text-xs font-semibold font-red-hat-display whitespace-nowrap">New Trip</span>
                        </button>
                    )
                })()}
            </div>

            {/* Inline trip list — always visible, segregated by role */}
            <InlineTripList
                tripsList={tripsList}
                tripFlagsMap={tripFlagsMap}
                activeTripId={activeTripId}
                onSelectTrip={(tripId) => {
                    onSelectTrip(tripId)
                }}
                isRimigoInternal={isRimigoInternal}
            />
        </div>
    )
}

/** Helper: split trips into own vs invited, sorted by created_at desc (latest first), active trip pinned to top */
function useSplitTrips(tripsList: TravelerTrip[], activeTripId?: string | null) {
    return useMemo(() => {
        const sortTrips = (trips: TravelerTrip[]) =>
            [...trips].sort((a, b) => {
                // Active trip always first
                if (a.trip_id === activeTripId) return -1
                if (b.trip_id === activeTripId) return 1
                // Sort by created_at descending (latest first)
                const aCreated = a.trip_preference?.created_at ?? ''
                const bCreated = b.trip_preference?.created_at ?? ''
                return bCreated.localeCompare(aCreated)
            })
        const myTrips = sortTrips(tripsList.filter((t) => t.role !== TRIP_ROLE_INVITED))
        const invitedTrips = sortTrips(tripsList.filter((t) => t.role === TRIP_ROLE_INVITED))
        return { myTrips, invitedTrips }
    }, [tripsList, activeTripId])
}

/** Single trip row — shows country flags for each trip */
function TripRow({
    trip,
    isActive,
    flagData,
    onClick,
    className,
}: {
    trip: TravelerTrip
    isActive: boolean
    flagData?: TripFlagsData
    onClick: () => void
    className?: string
}) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                'flex items-center gap-2 px-2 py-1.5 rounded-xl text-left transition-colors duration-150 cursor-pointer w-full',
                isActive ? 'bg-primary-pale-purple text-primary-default' : 'text-grey-0 hover:bg-grey-5',
                className,
            )}>
            <div className="flex items-center -space-x-1 shrink-0">
                {flagData?.flags?.length ? (
                    flagData.flags.slice(0, 2).map((flagUrl: string, i: number) => (
                        <img
                            key={i}
                            src={flagUrl}
                            alt="flag"
                            className="w-4 h-4 rounded-full object-cover border-[1.5px] border-white"
                            style={{ zIndex: (flagData.flags?.length ?? 0) - i }}
                        />
                    ))
                ) : (
                  <img
                    src={BEACH_TREE}
                    alt="flag"
                    className="w-5 h-5 rounded-full object-cover border-[1.5px] border-white"
                    /> 
                )}
            </div>
            <span className={clsx('text-[13px] font-red-hat-display truncate', isActive ? 'font-semibold text-primary-default' : 'font-medium text-grey-0')}>
                {formatCapitalizeFirstLetter(trip)}
            </span>
        </button>
    )
}

/** Section heading */
function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <p className="px-2 pt-1.5 pb-0.5 text-[10px] font-semibold font-red-hat-display text-grey-2 uppercase tracking-wider">
            {children}
        </p>
    )
}

/** Inline trip list for expanded sidebar — segregated by role, always visible */
function InlineTripList({
    tripsList,
    tripFlagsMap,
    activeTripId,
    onSelectTrip,
    isRimigoInternal = false,
}: {
    tripsList: TravelerTrip[]
    tripFlagsMap: Record<string, TripFlagsData>
    activeTripId?: string | null
    onSelectTrip: (tripId: string) => void
    isRimigoInternal?: boolean
}) {
    const [showAll, setShowAll] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const { myTrips, invitedTrips } = useSplitTrips(tripsList, activeTripId)
    const MAX_VISIBLE = 3

    if (tripsList.length === 0) {
        return (
            <div className="ml-[calc(0.5rem+4px)] mr-2 mt-1 py-2 px-2 rounded-xl">
                <p className="text-xs text-grey-3 font-manrope text-center">No trips yet</p>
            </div>
        )
    }

    const isSearching = isRimigoInternal && searchQuery.length > 0
    const searchLower = searchQuery.toLowerCase()

    const filterTrips = (trips: TravelerTrip[]) => {
        if (!isSearching) return trips
        return trips.filter((t) => (t.name || '').toLowerCase().includes(searchLower))
    }

    const filteredMyTrips = filterTrips(myTrips)
    const filteredInvitedTrips = filterTrips(invitedTrips)

    // Combine all trips in order: myTrips first, then invitedTrips
    const allTrips = [...filteredMyTrips, ...filteredInvitedTrips]
    const totalTrips = allTrips.length
    const hasMore = !isSearching && totalTrips > MAX_VISIBLE

    // When searching, show all results; otherwise paginate
    const visibleMyTrips = isSearching || showAll ? filteredMyTrips : filteredMyTrips.slice(0, MAX_VISIBLE)
    const remainingSlots = Math.max(0, MAX_VISIBLE - filteredMyTrips.length)
    const visibleInvitedTrips = isSearching || showAll ? filteredInvitedTrips : filteredInvitedTrips.slice(0, remainingSlots)

    return (
        <div className="flex flex-col ml-[calc(0.5rem+4px)] mr-2 mt-1 py-1.5 pl-6.5 rounded-xl animate-fade-in">
            {/* Search — internal users only */}
            {isRimigoInternal && (
                <div className="relative mb-1.5">
                    <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-grey-3" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search trips..."
                        className="w-full pl-7 pr-2 py-1.5 text-[12px] font-manrope text-grey-0 placeholder:text-grey-3 rounded-lg border border-grey-4 focus:outline-none focus:ring-1 focus:ring-primary-default/30 focus:border-primary-default"
                    />
                </div>
            )}

            {isSearching && allTrips.length === 0 && (
                <p className="px-2 py-2 text-[11px] text-grey-3 font-manrope text-center">No trips found</p>
            )}

            {visibleMyTrips.length > 0 && (
                <>
                    <SectionHeading>My Trips</SectionHeading>
                    {visibleMyTrips.map((trip) => (
                        <TripRow
                            key={trip.trip_id}
                            trip={trip}
                            isActive={trip.trip_id === activeTripId}
                            flagData={tripFlagsMap[trip.trip_id]}
                            onClick={() => onSelectTrip(trip.trip_id)}
                        />
                    ))}
                </>
            )}

            {visibleInvitedTrips.length > 0 && (
                <>
                    <SectionHeading>Invited Trips</SectionHeading>
                    {visibleInvitedTrips.map((trip) => (
                        <TripRow
                            key={trip.trip_id}
                            trip={trip}
                            isActive={trip.trip_id === activeTripId}
                            flagData={tripFlagsMap[trip.trip_id]}
                            onClick={() => onSelectTrip(trip.trip_id)}
                        />
                    ))}
                </>
            )}

            {/* See more / See less toggle */}
            {hasMore && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="px-2 pt-1.5 pb-0.5 text-[11px] font-semibold font-red-hat-display text-primary-default hover:text-primary-dark transition-colors cursor-pointer text-left">
                    {showAll ? 'See less' : `See more (${totalTrips - MAX_VISIBLE})`}
                </button>
            )}
        </div>
    )
}

/** Trip list for collapsed sidebar dropdown — segregated by role */
export function TripList({
    tripsList,
    tripFlagsMap,
    activeTripId,
    onSelectTrip,
    onCreateTrip,
}: {
    tripsList: TravelerTrip[]
    tripFlagsMap: Record<string, TripFlagsData>
    activeTripId?: string | null
    onSelectTrip: (tripId: string) => void
    onCreateTrip: () => void
}) {
    const { myTrips, invitedTrips } = useSplitTrips(tripsList, activeTripId)

    return (
        <>
            <div className="overflow-auto max-h-52 scrollbar-hide">
                {myTrips.length > 0 && (
                    <>
                        <div className="px-3 py-1.5 bg-grey-5 border-b border-grey-4">
                            <span className="text-[10px] font-semibold text-grey-2 uppercase tracking-wider">My Trips</span>
                        </div>
                        {myTrips.map((trip) => (
                            <TripRow
                                key={trip.trip_id}
                                trip={trip}
                                isActive={trip.trip_id === activeTripId}
                                flagData={tripFlagsMap[trip.trip_id]}
                                onClick={() => onSelectTrip(trip.trip_id)}
                                className="rounded-none px-3 py-2.5 hover:bg-grey-5"
                            />
                        ))}
                    </>
                )}

                {invitedTrips.length > 0 && (
                    <>
                        <div className="px-3 py-1.5 bg-grey-5 border-b border-grey-4 border-t border-grey-4">
                            <span className="text-[10px] font-semibold text-grey-2 uppercase tracking-wider">Invited Trips</span>
                        </div>
                        {invitedTrips.map((trip) => (
                            <TripRow
                                key={trip.trip_id}
                                trip={trip}
                                isActive={trip.trip_id === activeTripId}
                                flagData={tripFlagsMap[trip.trip_id]}
                                onClick={() => onSelectTrip(trip.trip_id)}
                                className="rounded-none px-3 py-2.5 hover:bg-grey-5"
                            />
                        ))}
                    </>
                )}

                {tripsList.length === 0 && (
                    <div className="px-4 py-3 text-center text-sm text-grey-3">No trips yet</div>
                )}
            </div>

            {(() => {
                const activeTrip = tripsList.find(t => t.trip_id === activeTripId)
                const isInvitedTrip = activeTrip?.role === TRIP_ROLE_INVITED
                if (isInvitedTrip) return null
                return (
                    <button
                        onClick={onCreateTrip}
                        className="w-full px-4 py-3 flex items-center gap-2 hover:bg-grey-5 transition-colors text-primary-default border-t border-grey-4 bg-white shrink-0 rounded-b-xl cursor-pointer">
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-bold font-red-hat-display">New Trip</span>
                    </button>
                )
            })()}
        </>
    )
}
