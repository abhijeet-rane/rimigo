import { useState } from 'react'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import Typography from '@/components/shared/Typography'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { MAX_WIDTH } from '../constants/width'
import type { TravelerTrip } from '@/pages/Landing/api/travelerTrips'
import CustomShimmer from '@/components/shared/Shimmer'
import { toast } from 'sonner'
import { useTripFlagsMap } from '@/hooks/useTripFlags'
import { useLocationPersonalization } from '@/hooks/useLocationPersonalization'
import { DEFAULT_LANDING_PAGE_ROUTE } from '@/routes/routes'
import { TripButton } from './TripButton' 
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'

const DROPDOWN_THRESHOLD = 4 // if more than 4 cards then show dropdown menu

interface TravelerPreviousTripsProps {
    tripsWithDestinations: TravelerTrip[]
    isLoading?: boolean
    maxWidth?: string
    padding?: string
    containerClassname?: string
    /** When provided, overrides the default trip click handler (used when travelerTripsContext is unavailable) */
    onTripClick?: (tripId: string) => void
}

const CollapsibleDropdown = ({
    trips,
    tripFlagsMap,
    onTripClick,
}: {
    trips: TravelerTrip[]
    tripFlagsMap: Record<string, { flags: string[] }>
    onTripClick: (tripId: string) => void
}) => {
    const [isExpanded, setIsExpanded] = useState(false)

    return (
        <div className="w-full rounded-[12px] border border-grey-4 bg-natural-white hover:shadow-[var(--shadow-feature-card)] transition-shadow duration-200 overflow-hidden">
            <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between cursor-pointer gap-3 p-3 text-left rounded-[12px]">
                <Typography textAlign="right" size="14" weight="bold" family="redhat" color="grey-2">
                Saved trips ({trips.length})
                </Typography>
                {isExpanded ? (
                    <ChevronUp size={16} className="text-grey-2" />
                ) : (
                    <ChevronDown size={16} className="text-grey-2" />
                )}
            </button>

            {isExpanded && (
                <div className="px-3 pb-3 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-200 bg-natural-white pt-2">
                    {trips.map((trip) => (
                        <TripButton
                            key={trip.trip_id}
                            trip={trip}
                            flagData={tripFlagsMap[trip.trip_id]}
                            onClick={() => onTripClick(trip.trip_id)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

const TripGroup = ({
    label,
    trips,
    tripFlagsMap,
    onTripClick,
}: {
    label: string
    trips: TravelerTrip[]
    tripFlagsMap: Record<string, { flags: string[] }>
    onTripClick: (tripId: string) => void
}) => {
    if (trips.length === 0) return null

    return (
        <div className="flex flex-col gap-2">
            <Typography textAlign="left" size="12" weight="extrabold" family="redhat" color="grey-2">
                {label}
            </Typography>

            {trips.length <= DROPDOWN_THRESHOLD ? (
                <div className="flex flex-col gap-2">
                    {trips.map((trip) => (
                        <TripButton
                            key={trip.trip_id}
                            trip={trip}
                            flagData={tripFlagsMap[trip.trip_id]}
                            onClick={() => onTripClick(trip.trip_id)}
                        />
                    ))}
                </div>
            ) : (
                <CollapsibleDropdown trips={trips} tripFlagsMap={tripFlagsMap} onTripClick={onTripClick} />
            )}
        </div>
    )
}

/**
 * TravelerPreviousTrips Component
 * Displays a collapsible dropdown of user's previous trips
 */
export const TravelerPreviousTrips = ({ tripsWithDestinations, isLoading = false, maxWidth = MAX_WIDTH, padding = 'pt-4 px-[5px]', containerClassname, onTripClick: onTripClickProp }: TravelerPreviousTripsProps) => {
    const travelerTripsContext = useOptionalTravelerTrips()
    const { countries } = useLocationPersonalization()
    const tripFlagsMap = useTripFlagsMap(tripsWithDestinations, countries)
    const { trackButtonClickCustom } = usePostHog()

    if (isLoading) {
        return (
            <div
                className={`flex flex-col w-full ${padding}`}
                style={{ maxWidth: `${maxWidth}px`, width: '100%', margin: '0 auto' }}>
                <CustomShimmer height={60} radius={12} />
            </div>
        )
    }

    if (tripsWithDestinations.length === 0) return null

    const ownTrips = tripsWithDestinations.filter((trip) => trip.role === 'owner')
    const coTravelerTrips = tripsWithDestinations.filter((trip) => trip.role === 'co_traveler')
    const invitedTrips = tripsWithDestinations.filter((trip) => trip.role === 'invited')

    const handleTripClick = async (tripId: string) => {
        if (typeof window === 'undefined') return

        trackButtonClickCustom?.({
        buttonPage: 'lead_gen_v1',
        buttonName: 'open_saved_trip',
        buttonAction: 'click',
            extra: {
                tripId,
            }
        })

        // If a custom handler is provided, use it (e.g. when travelerTripsContext is unavailable)
        if (onTripClickProp) {
            onTripClickProp(tripId)
            return
        }

        // Open new window synchronously so Safari treats it as user gesture
        const newWindow = window.open('about:blank', '_blank')

        if (!newWindow) {
            toast.error('Popup blocked in your browser. Please allow popups and try again.')
            // Fallback: navigate in same tab
            await travelerTripsContext?.updateActiveTrip(tripId, { force: true, replaceOnly: true })
            window.location.href = DEFAULT_LANDING_PAGE_ROUTE
            return
        }

        try {
            // Perform async update
            await travelerTripsContext?.updateActiveTrip(tripId, { force: true, replaceOnly: true })

            // Safely update new window location after async work
            newWindow.location.href = DEFAULT_LANDING_PAGE_ROUTE
        } catch (error) {
            toast.error('Something went wrong while opening the trip.')
            // Fallback: navigate in same tab
            window.location.href = DEFAULT_LANDING_PAGE_ROUTE
        }
    }

    return (
        <div
            className={`flex flex-col w-full pt-4 gap-3 ${padding} ${containerClassname}`}
            style={{
                maxWidth: maxWidth === '100%' ? '100%' : `${maxWidth}px`,
                width: '100%',
                margin: '0 auto'
            }}>
            <TripGroup label="YOUR TRIPS" trips={ownTrips} tripFlagsMap={tripFlagsMap} onTripClick={handleTripClick} />
            <TripGroup label="CO-TRAVELER TRIPS" trips={coTravelerTrips} tripFlagsMap={tripFlagsMap} onTripClick={handleTripClick} />
            <TripGroup label="INVITED TRIPS" trips={invitedTrips} tripFlagsMap={tripFlagsMap} onTripClick={handleTripClick} />
        </div>
    )
}
