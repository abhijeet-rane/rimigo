import Typography from '@/components/shared/Typography'
import { X } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import CustomDatePicker from './CustomDatePicker'
import TripSelectionList from './TripSelectionList'
import TripCreationFlow from '@/components/common/TripCreationFlow'
import { TravelerTrip } from '@/pages/Landing/api/travelerTrips'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { formatCapitalizeFirstLetter } from '@/utils/tripFormatters'

interface CloneItineraryModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (startDate: Date, tripId?: string) => void
    hasExistingItinerary: boolean
    isEmbeddedView: boolean
    isExternalIdView: boolean
    trips?: TravelerTrip[]
    onTripsUpdated?: () => void
}

const CloneItineraryModal: React.FC<CloneItineraryModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    hasExistingItinerary,
    isEmbeddedView,
    isExternalIdView,
    trips = [],
    onTripsUpdated
}) => {
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [selectedTrip, setSelectedTrip] = useState<TravelerTrip | null>(null)
    const [currentStep, setCurrentStep] = useState<'trip' | 'date'>('trip')
    const [isTripCreationOpen, setIsTripCreationOpen] = useState(false)
    // 'current' = clone into the user's active trip; 'other' = pick a different trip.
    const [destinationMode, setDestinationMode] = useState<'current' | 'other'>('current')

    const queryClient = useQueryClient()
    const travelerTripsContext = useOptionalTravelerTrips()
    const activeTrip = travelerTripsContext?.activeTrip ?? null

    // Embedded + external view → user is viewing someone else's itinerary, so they
    // must always pick a target trip. We keep the existing two-step flow for that.
    const isExternalSourceView = isEmbeddedView && isExternalIdView
    // Toggle is shown when the user has an active trip context to clone *into*.
    const canChooseDestinationMode = !isExternalSourceView && !!activeTrip?.trip_id

    // Reset to trip selection step when modal opens and set active trip as selected by default
    useEffect(() => {
        if (isOpen && isExternalSourceView) {
            setCurrentStep('trip')
            // Set active trip as selected by default
            if (activeTrip && activeTrip.final_destination_countries && activeTrip.final_destination_countries.length > 0) {
                setSelectedTrip(activeTrip)
            } else if (trips.length > 0) {
                // If active trip doesn't have destination, select first trip with destination
                const firstTripWithDestination = trips.find(trip =>
                    trip.final_destination_countries && trip.final_destination_countries.length > 0
                )
                if (firstTripWithDestination) {
                    setSelectedTrip(firstTripWithDestination)
                }
            }
        }
    }, [isOpen, isExternalSourceView, activeTrip, trips])

    // For the non-embedded case: each time the modal opens, default to "current".
    useEffect(() => {
        if (!isOpen) return
        if (isExternalSourceView) return
        setDestinationMode(canChooseDestinationMode ? 'current' : 'other')
        setSelectedTrip(null)
    }, [isOpen, isExternalSourceView, canChooseDestinationMode])

    if (!isOpen) return null

    // Two-step flow only applies to the embedded/external source view.
    const useTwoStepFlow = isExternalSourceView

    const handleNext = () => {
        if (useTwoStepFlow && selectedTrip) {
            setCurrentStep('date')
        }
    }

    const handleConfirm = () => {
        if (useTwoStepFlow) {
            if (currentStep === 'trip') {
                handleNext()
                return
            }
            onConfirm(selectedDate, selectedTrip?.trip_id)
            return
        }
        // Single-screen flow: 'current' uses the active trip, 'other' uses the picked trip.
        const targetTripId = destinationMode === 'current'
            ? activeTrip?.trip_id
            : selectedTrip?.trip_id
        onConfirm(selectedDate, targetTripId)
    }

    const handleBack = () => {
        if (useTwoStepFlow && currentStep === 'date') {
            setCurrentStep('trip')
        }
    }

    const handleSelectTrip = (trip: TravelerTrip) => {
        // Toggle selection - if already selected, deselect
        if (selectedTrip?.trip_id === trip.trip_id) {
            setSelectedTrip(null)
        } else {
            setSelectedTrip(trip)
        }
    }

    const handleCreateNewTrip = () => {
        setIsTripCreationOpen(true)
    }

    const handleTripCreationSuccess = () => {
        setIsTripCreationOpen(false)
        // Invalidate trips query to refresh the list
        if (travelerTripsContext?.tripsData?.traveler_id) {
            queryClient.invalidateQueries({
                queryKey: ['travelerTrips', travelerTripsContext.tripsData.traveler_id]
            })
        }
        // Call the callback if provided
        onTripsUpdated?.()
    }

    const handleTripCreationClose = () => {
        setIsTripCreationOpen(false)
    }

    return (
        <>
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-white rounded-lg border border-feature-card-border shadow-lg w-full max-w-md"
                    onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-feature-card-border">
                        <Typography
                            size="18"
                            weight="semibold"
                            family="manrope"
                            color="grey-0">
                            Clone Itinerary
                        </Typography>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-grey-5 rounded transition-colors">
                            <X className="h-5 w-5 text-grey-2" />
                        </button>
                    </div>


                    {/* ask about in which trip to clone (embedded + external source view only) */}
                    {useTwoStepFlow && currentStep === 'trip' && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <Typography
                                size="14"
                                weight="medium"
                                family="manrope"
                                color="grey-0">
                                Which trip do you want to clone into?
                            </Typography>
                        </div>
                    )}

                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Destination toggle: clone into the user's current trip or another trip. */}
                        {canChooseDestinationMode && (
                            <div>
                                <Typography
                                    size="12"
                                    weight="medium"
                                    family="manrope"
                                    color="grey-2"
                                    className="mb-2">
                                    Where do you want to clone this itinerary?
                                </Typography>
                                <div className="inline-flex w-full p-0.5 rounded-xl bg-grey-5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setDestinationMode('current')
                                            setSelectedTrip(null)
                                        }}
                                        className={cn(
                                            'flex-1 px-3 py-2 text-xs font-manrope font-semibold rounded-lg transition-colors cursor-pointer',
                                            destinationMode === 'current'
                                                ? 'bg-white text-grey-0 shadow-sm'
                                                : 'text-grey-2 hover:text-grey-0'
                                        )}>
                                        This trip
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDestinationMode('other')}
                                        className={cn(
                                            'flex-1 px-3 py-2 text-xs font-manrope font-semibold rounded-lg transition-colors cursor-pointer',
                                            destinationMode === 'other'
                                                ? 'bg-white text-grey-0 shadow-sm'
                                                : 'text-grey-2 hover:text-grey-0'
                                        )}>
                                        Another trip
                                    </button>
                                </div>
                                <Typography
                                    size="12"
                                    family="manrope"
                                    color="grey-2"
                                    className="mt-2">
                                    {destinationMode === 'current'
                                        ? `Will clone into ${activeTrip ? formatCapitalizeFirstLetter(activeTrip) : 'your active trip'}.`
                                        : 'Pick a different trip to clone into.'}
                                </Typography>
                            </div>
                        )}

                        {/* Trip Selection — embedded two-step OR single-screen 'other' mode */}
                        {((useTwoStepFlow && currentStep === 'trip') || (!useTwoStepFlow && destinationMode === 'other')) && (
                            <TripSelectionList
                                trips={useTwoStepFlow ? trips : trips.filter((t) => t.trip_id !== activeTrip?.trip_id)}
                                selectedTrip={selectedTrip}
                                onSelectTrip={handleSelectTrip}
                                onCreateNewTrip={handleCreateNewTrip}
                                activeTripId={activeTrip?.trip_id}
                            />
                        )}

                        {/* Date Input — single-screen flow always shows it; two-step shows on date step. */}
                        {(!useTwoStepFlow || currentStep === 'date') && (
                            <div>
                                <Typography
                                    size="12"
                                    weight="medium"
                                    family="manrope"
                                    color="grey-2"
                                    className="mb-2">
                                    Start Date
                                </Typography>
                                <CustomDatePicker
                                    value={selectedDate}
                                    onChange={setSelectedDate}
                                    disabled={false}
                                />
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {(() => {
                        const isOnTripStep = useTwoStepFlow && currentStep === 'trip'
                        const needsTripPick = (useTwoStepFlow && currentStep === 'trip') || (!useTwoStepFlow && destinationMode === 'other')
                        const confirmDisabled = needsTripPick && !selectedTrip
                        return (
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-feature-card-border">
                        <button
                            onClick={useTwoStepFlow && currentStep === 'date' ? handleBack : onClose}
                            className="h-10 px-4 flex items-center justify-center rounded-md border border-grey-4 hover:bg-grey-5 transition-colors cursor-pointer">
                            <div
                                className="font-red-hat-display text-grey-1"
                                style={{ fontWeight: 550, fontSize: '14px' }}>
                                {useTwoStepFlow && currentStep === 'date' ? 'Back' : 'Cancel'}
                            </div>
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={confirmDisabled}
                            className={`h-10 px-4 flex items-center justify-center gap-2 rounded-md text-natural-white transition-all duration-400 ${
                                confirmDisabled
                                    ? 'bg-grey-3 cursor-not-allowed'
                                    : 'bg-primary-default hover:bg-primary-light cursor-pointer'
                            }`}>
                            <div
                                className="font-red-hat-display"
                                style={{ fontWeight: 550, fontSize: '14px' }}>
                                {isOnTripStep
                                    ? 'Next'
                                    : hasExistingItinerary
                                        ? 'Continue'
                                        : 'Clone'}
                            </div>
                        </button>
                    </div>
                        )
                    })()}
                </div>
            </div>

            {/* Trip Creation Flow */}
            <TripCreationFlow
                isOpen={isTripCreationOpen}
                onClose={handleTripCreationClose}
                onSuccess={handleTripCreationSuccess}
            />
        </>
    )
}

export default CloneItineraryModal
