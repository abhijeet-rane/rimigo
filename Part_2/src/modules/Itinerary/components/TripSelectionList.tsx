import React from 'react'
import Typography from '@/components/shared/Typography'
import { TravelerTrip } from '@/pages/Landing/api/travelerTrips'
import { formatDestinationTripName } from '@/utils/tripFormatters'
import Divider from '@/components/shared/Divider/Divider'
import { ArrowUpRightIcon } from 'lucide-react'
import { isArrayExistsAndNotEmpty, joinArray } from '@/utils/arrayUtils'
import { SELECT_TRIP_TEXT } from '@/constants/textConstants'

interface TripSelectionListProps {
    trips: TravelerTrip[]
    selectedTrip: TravelerTrip | null
    onSelectTrip: (trip: TravelerTrip) => void
    onCreateNewTrip?: () => void
    activeTripId?: string | null
}

const TripSelectionList: React.FC<TripSelectionListProps> = ({ trips, selectedTrip, onSelectTrip, onCreateNewTrip, activeTripId }) => {
    if (trips.length === 0) {
        return null
    }

    // Sort trips: active trip first, then filter by destination
    const sortedTrips = React.useMemo(() => {
        const tripsWithDestinations = trips.filter(trip => 
            isArrayExistsAndNotEmpty(trip.final_destination_countries)
        )
        
        if (!activeTripId) {
            return tripsWithDestinations
        }

        const activeTripIndex = tripsWithDestinations.findIndex(trip => trip.trip_id === activeTripId)
        if (activeTripIndex === -1) {
            return tripsWithDestinations
        }

        const activeTrip = tripsWithDestinations[activeTripIndex]
        const otherTrips = tripsWithDestinations.filter(trip => trip.trip_id !== activeTripId)
        
        return [activeTrip, ...otherTrips]
    }, [trips, activeTripId])

    return (
        <div className="space-y-4">
            <div className="">
                <Typography
                    size="14"
                    weight="medium"
                    family="manrope"
                    color="grey-2">
                    You already have an itinerary for this trip. Cloning will replace your existing itinerary.
                </Typography>
            </div>
            
            <div>
                <Typography
                    size="12"
                    weight="medium"
                    family="manrope"
                    color="grey-2"
                    className="mb-2">
                    {SELECT_TRIP_TEXT}
                </Typography>
                
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    {sortedTrips.map((trip) => {
                        const tripName = formatDestinationTripName(trip)
                        const isSelected = selectedTrip?.trip_id === trip.trip_id
                        const hasDestination = isArrayExistsAndNotEmpty(trip.final_destination_countries)

                        
                        if (!hasDestination) {
                            return null
                        }

                        return (
                            <button
                                key={trip.trip_id}
                                type="button"
                                onClick={() => onSelectTrip(trip)}
                                className={`w-full rounded-xl border p-3 flex items-center justify-between cursor-pointer transition-colors text-left ${
                                    isSelected
                                        ? 'border-primary-default bg-primary-light/10 hover:bg-primary-light/20'
                                        : 'border-grey-4 bg-grey-5 hover:bg-grey-4'
                                }`}>
                                <div className="flex-1 flex items-center gap-1">
                                    <Typography
                                        size="14"
                                        weight="semibold"
                                        family="manrope"
                                        color="grey-0">
                                        {tripName}
                                    </Typography>
                                    {/* dot */}
                                    •
                                    {isArrayExistsAndNotEmpty(trip.final_destination_countries) && (
                                        <Typography
                                            size="12"
                                            weight="medium"
                                            family="manrope"
                                            color="grey-2"
                                            className="mt-1">
                                            {joinArray(trip.final_destination_countries.map(c => c.name), ', ')}
                                        </Typography>
                                    )}
                                </div>
                                {isSelected && (
                                    <div className="w-5 h-5 rounded-full bg-primary-default flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-white" />
                                    </div>
                                )}
                            </button>
                        )
                    })}
                </div>


                {/* Divider */}

                <Divider className="my-4" />
                

                {/* Create new trip button */}
                <button
                    onClick={onCreateNewTrip}
                    className="w-full rounded-xl border border-grey-4 bg-white p-3 flex items-center justify-between cursor-pointer hover:bg-grey-5 transition-colors text-left">
                    <p className="text-left text-[14px] font-semibold font-redhat-display text-grey-0">Create New Trip</p>
                    <ArrowUpRightIcon className="w-4 h-4 text-grey-2" />
                </button>
            </div>
        </div>
    )
}

export default TripSelectionList
