import { useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import { motion } from 'framer-motion'
import TripPreferenceStepLayout from './TripPreferenceStepLayout'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { toast } from 'sonner'
import Typography from '@/components/shared/Typography'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'

interface TripCountryMismatchStepProps {
    countryId: string
    countryName: string
    onSwitchTrip: (tripId: string) => Promise<void>
    onAddToCurrentTrip: () => Promise<void>
    onCreateNewTrip: () => void
    onClose?: () => void
    currentStep?: number
    totalSteps?: number
}

const TripCountryMismatchStep = ({
    countryId,
    countryName,
    onSwitchTrip,
    onAddToCurrentTrip,
    onCreateNewTrip,
    currentStep,
    totalSteps
}: TripCountryMismatchStepProps) => {
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip
    const [isSwitching, setIsSwitching] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const { trackButtonClickCustom } = usePostHog()

    // Find trips that contain this country (excluding active trip)
    const tripsWithCountry = useMemo(() => {
        if (!travelerTripsContext?.tripsData?.trips) return []
        return travelerTripsContext.tripsData.trips.filter(
            (trip) =>
                trip.trip_id !== activeTrip?.trip_id &&
                trip.final_destination_countries?.some((c) => c.id === countryId)
        )
    }, [travelerTripsContext?.tripsData?.trips, activeTrip?.trip_id, countryId])

    const handleSwitchTrip = async (tripId: string) => {
        setIsSwitching(true)
        try {
            await onSwitchTrip(tripId)
            toast.success('Switched to trip successfully')
        } catch (error) {
            console.error('Failed to switch trip:', error)
            toast.error('Failed to switch trip. Please try again.')
        } finally {
            setIsSwitching(false)
        }
    }

    const handleAddToCurrentTrip = async () => {
        trackButtonClickCustom?.({
            buttonPage: 'Trip_creation_step',
            buttonName: 'add_to_current_trip',
            buttonAction: 'click',
            extra: {
                countryId,
                countryName,
                sourceScreen: 'trip_country_mismatch_step'
            }
        })
        if (!activeTrip) return
        setIsAdding(true)
        try {
            await onAddToCurrentTrip()
            toast.success(`${countryName} added to your trip successfully`)
        } catch (error) {
            console.error('Failed to add country to trip:', error)
            toast.error('Failed to add country to trip. Please try again.')
        } finally {
            setIsAdding(false)
        }
    }

    return (
        <TripPreferenceStepLayout
            title={`${countryName} is not in your current trip`}
            description="Choose an option below to continue:"
            flowType="create"
            onPrimary={onCreateNewTrip}
            primaryLabel="Create New Trip"
            onClose={undefined}
            currentStep={currentStep}
            totalSteps={totalSteps}>
            <div className="flex flex-col gap-4">
                {/* Trips with this country */}
                {tripsWithCountry.length > 0 && (
                    <div className="space-y-4">
                        <Typography size="16" weight="semibold" family="redhat" color="grey-0">
                            Switch to a trip with {countryName}
                        </Typography>
                        <div className="space-y-3">
                            {tripsWithCountry.map((trip) => (
                                <motion.button
                                    key={trip.trip_id}
                                    type="button"
                                    onClick={() => handleSwitchTrip(trip.trip_id)}
                                    disabled={isSwitching || isAdding}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    className="w-full flex flex-col items-start rounded-2xl border border-feature-card-border bg-white p-4 hover:bg-grey-5 hover:border-primary-default/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left">
                                    <div className="flex items-center w-full">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="flex-shrink-0 flex items-center justify-center">
                                                <MapPin className="w-5 h-5 text-primary-default" />
                                            </div>
                                            <div className="flex-1 min-w-0 text-left">
                                                <Typography size="14" weight="semibold" family="redhat" color="grey-0" textAlign="left" className="truncate">
                                                    {trip.name || 'Untitled Trip'}
                                                </Typography>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2 ml-8 w-full text-left">
                                        <Typography size="12" weight="medium" family="manrope" color="grey-2" textAlign="left">
                                            {trip.final_destination_countries?.map((c) => c.name).join(', ') || 'No destinations'}
                                        </Typography>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Add to current trip */}
                {activeTrip && (
                    <div className="space-y-4">
                        {tripsWithCountry.length > 0 && (
                            <div className="border-t border-[#EDEDED] pt-6">
                                <Typography size="16" weight="semibold" family="redhat" color="grey-0">
                                    Or add to your current trip
                                </Typography>
                            </div>
                        )}
                        <div className="space-y-3">
                            <motion.button
                                type="button"
                                onClick={handleAddToCurrentTrip}
                                disabled={isSwitching || isAdding}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                className="w-full flex flex-col items-start rounded-2xl border border-feature-card-border bg-white p-4 hover:bg-grey-5 hover:border-primary-default/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left">
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="flex-shrink-0 flex items-center justify-center">
                                            <MapPin className="w-5 h-5 text-primary-default" />
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <Typography size="14" weight="semibold" family="redhat" color="grey-0" textAlign="left" className="truncate">
                                                {activeTrip.name || 'Untitled Trip'}
                                            </Typography>
                                        </div>
                                    </div>
                                    {isAdding && (
                                        <div className="flex-shrink-0 ml-3 flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-primary-default border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 ml-8 w-full text-left">
                                    <Typography size="12" weight="medium" family="manrope" color="grey-2" textAlign="left">
                                        {activeTrip.final_destination_countries?.map((c) => c.name).join(', ') || 'No destinations'}
                                    </Typography>
                                </div>
                            </motion.button>
                            <Typography size="12" weight="medium" family="manrope" color="grey-2" className="text-left pl-2">
                                {countryName} will be added to this trip
                            </Typography>
                        </div>
                    </div>
                )}

                {/* Create new trip */}
                <div className="space-y-3">
                    {tripsWithCountry.length > 0 || activeTrip ? (
                        <div className="border-t border-[#EDEDED] pt-4">
                            <Typography size="16" weight="semibold" family="redhat" color="grey-0">
                                Or create a new trip 👇 
                            </Typography>
                        </div>
                    ) : (
                        <Typography size="16" weight="semibold" family="redhat" color="grey-0">
                            Create a new trip with {countryName}
                        </Typography>
                    )}
                    <Typography size="14" weight="medium" family="manrope" color="grey-2">
                        Start planning a new trip with {countryName} as your destination.
                    </Typography>
                </div>
            </div>
        </TripPreferenceStepLayout>
    )
}

export default TripCountryMismatchStep

