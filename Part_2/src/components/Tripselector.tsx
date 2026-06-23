import { useRef, useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import clsx from 'clsx'
import TripDropdown from './TripDropdown' 
import { BEACH_TREE } from '@/constants/icons/svgFromCDN'
import { TravelerTrip } from '@/pages/Landing/api/travelerTrips'  
import { TripFlagsData } from '@/utils/tripFlags' 


export interface TripSelectorProps {
    isCollapsed: boolean
    activeTrip?: TravelerTrip | null
    activeTripId?: string | null
    tripsList: TravelerTrip[]
    tripFlagsMap: Record<string, TripFlagsData>
    destinationFlags: TripFlagsData
    onSelectTrip: (tripId: string) => void
    onCreateTrip: () => void
    className?: string
}


export function TripSelector({
    isCollapsed,
    activeTrip,
    activeTripId,
    tripsList,
    tripFlagsMap,
    destinationFlags,
    onSelectTrip,
    onCreateTrip,
    className,
}: TripSelectorProps) {
    const [isOpen, setIsOpen] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)

    // Close when clicking outside
    useEffect(() => {
        if (!isOpen) return
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [isOpen])


    const FlagStack = ({ size }: { size: 'sm' | 'md' }) => {
        const flagCount = size === 'sm' ? 2 : 3
        const imgSize = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'
        const fallbackSize = size === 'sm' ? 'w-6 h-6' : 'w-7 h-7'
        const rounded = size === 'sm' ? 'rounded-sm' : 'rounded-full'

        if (destinationFlags.flags.length > 0) {
            return (
                <div className="flex items-center -space-x-1.5">
                    {destinationFlags.flags.slice(0, flagCount).map((flagUrl, index) => (
                        <img
                            key={index}
                            src={flagUrl}
                            alt="Flag"
                            className={clsx(imgSize, rounded, 'object-cover border-2 border-white shadow-sm')}
                            style={{ zIndex: destinationFlags.flags.length - index }}
                        />
                    ))}
                </div>
            )
        }

        return (
            <img
                src={BEACH_TREE}
                alt="Beach"
                className={clsx(fallbackSize, rounded, 'object-cover', size === 'md' && 'border-2 border-white')}
            />
        )
    }


    if (isCollapsed) {
        return (
            <div
                ref={wrapperRef}
                className={clsx('relative px-2.5 py-1.5 border-t border-feature-card-border', className)}
                onClick={() => setIsOpen(true)}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button className="w-full flex flex-col items-center justify-center cursor-pointer rounded-xl hover:bg-grey-5 transition-colors duration-200 px-1 py-1.5 gap-0.5">
                            <div className="w-7 h-7 flex items-center justify-center">
                                <FlagStack size="sm" />
                            </div>
                            <span className="text-[9px] font-semibold text-grey-3 leading-tight">My Trips</span>
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8} className="bg-grey-0 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg">
                        Your Trips
                    </TooltipContent>
                </Tooltip>

                {isOpen && (
                    <>
                        <TripDropdown
                            tripsList={tripsList}
                            tripFlagsMap={tripFlagsMap}
                            activeTripId={activeTripId}
                            onSelectTrip={(tripId) => {
                                onSelectTrip(tripId)
                                setIsOpen(false)
                            }}
                            onCreateTrip={() => {
                                onCreateTrip()
                                setIsOpen(false)
                            }}
                            containerClassName="fixed left-5 bottom-38 z-50 mt-2 w-74 rounded-xl border border-gray-200 bg-white shadow-lg"
                            buttonClassName={(isActive) =>
                                clsx(
                                    'w-full text-left px-2 py-2 text-[13px] font-medium font-manrope text-grey-0 hover:bg-gray-100 flex items-center gap-1',
                                    isActive && 'bg-primary-default/10 font-semibold'
                                )
                            }
                        />
                        {/* Click-outside overlay */}
                        <div className="fixed inset-0 z-[149]" onClick={() => setIsOpen(false)} />
                    </>
                )}
            </div>
        )
    }


    return (
        <div ref={wrapperRef} className={clsx('relative px-3 py-2', className)}>
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className="group flex items-center gap-2.5 text-[13px] text-grey-0 font-medium cursor-pointer bg-grey-5 hover:bg-grey-4/50 border border-transparent hover:border-grey-4 px-3 py-2.5 rounded-xl w-full transition-all duration-200">
                {/* Flags */}
                <div className="flex items-center -space-x-1.5 shrink-0">
                    <FlagStack size="md" />
                </div>

                {/* Trip name */}
                <span className="flex-1 min-w-0 truncate text-[15px] md:text-sm font-medium font-red-hat-display text-grey-0 text-left">
                    {activeTrip?.name || 'No trip selected'}
                </span>

                {/* Chevron */}
                <ChevronDown
                    className={clsx(
                        'h-4 w-4 shrink-0 text-grey-3 transition-transform duration-200 ml-auto',
                        isOpen && 'rotate-180'
                    )}
                />
            </button>

            {isOpen && (
                <TripDropdown
                    tripsList={tripsList}
                    tripFlagsMap={tripFlagsMap}
                    activeTripId={activeTripId}
                    onSelectTrip={(tripId) => {
                        onSelectTrip(tripId)
                        setIsOpen(false)
                    }}
                    onCreateTrip={() => {
                        onCreateTrip()
                        setIsOpen(false)
                    }}
                    containerClassName="absolute bottom-15 z-50 mt-2 w-auto rounded-xl border border-gray-200 bg-white shadow-lg"
                    buttonClassName={(isActive) =>
                        clsx(
                            'w-full text-left px-2 py-2 text-[13px] font-medium font-manrope text-grey-0 hover:bg-gray-100 flex items-center gap-1',
                            isActive && 'bg-primary-default/10 font-semibold'
                        )
                    }
                />
            )}
        </div>
    )
}