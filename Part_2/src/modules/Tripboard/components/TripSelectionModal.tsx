import { useState } from 'react'
import { X, Plus, Loader2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { TripButton } from '@/modules/Onboarding/components/TripButton'
import { useTripFlagsMap } from '@/hooks/useTripFlags'
import { useLocationPersonalization } from '@/hooks/useLocationPersonalization'
import type { TravelerTrip } from '@/pages/Landing/api/travelerTrips'
import type { SearchDestinationCardData } from '@/lib/api/OnboardingApi'
import type { WizardState } from '@/modules/Itinerary/components/CreateItineraryWizard/types'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { createBasicTrip } from '@/modules/Onboarding/api/onboardingAPI'
import { updateTripProfilePartial } from '@/api/tripProfileAPI/tripProfileAPI'
import { toast } from 'sonner'
import Divider from '@/components/shared/Divider/Divider'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { TRIPBOARD_V1_BUTTON_PAGE } from '@/constants/posthogEvents'
import { toNoonUtcIso } from '@/utils/dateUtils'

export interface PendingWizardData {
    destinations: SearchDestinationCardData[]
    groupType: string
    purpose: string
    wizardState?: WizardState
    tripSource?: string
    utmMedium?: string
    utmCampaign?: string
}

interface TripSelectionModalProps {
    isOpen: boolean
    onClose: () => void
    trips: TravelerTrip[]
    isTripsLoading: boolean
    pendingWizardData: PendingWizardData
    onSelectExistingTrip: (tripId: string) => Promise<void>
    onNewTripCreated: () => void
    travelerTripsContext?: {
        updateActiveTrip?: (tripId: string, options?: { force?: boolean; replaceOnly?: boolean }) => Promise<void>
    }
    /** When provided, delegates trip creation to the parent (unified orchestration flow) */
    onCreateNewTrip?: (data: PendingWizardData) => Promise<void>
}

const TripSelectionModal: React.FC<TripSelectionModalProps> = ({
    isOpen,
    onClose,
    trips,
    isTripsLoading,
    pendingWizardData,
    onSelectExistingTrip,
    onNewTripCreated,
    travelerTripsContext,
    onCreateNewTrip
}) => {
    const { trackButtonClickCustom } = usePostHog()
    const [isCreating, setIsCreating] = useState(false)
    const [isSelectingTrip, setIsSelectingTrip] = useState<string | null>(null)
    const { countries } = useLocationPersonalization()
    const tripFlagsMap = useTripFlagsMap(trips, countries)

    const tripsWithDestinations = trips.filter(trip => trip.final_destination_countries?.length > 0)
    const hasExistingTrips = tripsWithDestinations.length > 0
    const ownTrips = tripsWithDestinations.filter(trip => trip.role === 'owner')
    const otherTrips = tripsWithDestinations.filter(trip => trip.role !== 'owner')

    const handleSelectExisting = async (tripId: string) => {
        setIsSelectingTrip(tripId)
        trackButtonClickCustom({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: 'select_existing_trip',
            buttonAction: 'click',
            extra: { trip_id: tripId }
        })
        try {
            await onSelectExistingTrip(tripId)
        } finally {
            setIsSelectingTrip(null)
        }
    }

    const handleCreateNewTrip = async () => {
        setIsCreating(true)
        trackButtonClickCustom({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: 'create_new_trip',
            buttonAction: 'click'
        })
        try {
            // ── Unified orchestration path ───────────────────────────────
            if (onCreateNewTrip) {
                onNewTripCreated() // close modal
                await onCreateNewTrip(pendingWizardData)
                return
            }

            // ── Legacy fallback (standalone modal) ───────────────────────
            const { destinations, groupType, purpose, wizardState } = pendingWizardData
            const destIds = destinations.map(d => d.id)

            // 1. Get user info
            const userInfo = await TokenStorage.getUserInfo()
            if (!userInfo?.traveler_id) {
                throw new Error('Unable to get user information')
            }

            // 2. Create basic trip
            const tripResponse = await createBasicTrip(userInfo.traveler_id, {
                interested_destinations: destIds,
                final_destination_countries: destIds,
                destination_finalized: true
            })

            const newTripId = tripResponse.data.trip_id
            const tripProfileId = tripResponse.data.trip_profile_id

            // 3. Update trip profile with group type, travel purpose, and dates
            const profileUpdate: Record<string, unknown> = {
                group_type: groupType,
                travel_purpose: purpose
            }

            if (wizardState?.startDate && wizardState?.endDate) {
                const start = wizardState.startDate instanceof Date
                    ? wizardState.startDate
                    : new Date(wizardState.startDate)
                const end = wizardState.endDate instanceof Date
                    ? wizardState.endDate
                    : new Date(wizardState.endDate)

                profileUpdate.preferred_travel_time = {
                    is_fixed: true,
                    startDate: toNoonUtcIso(start),
                    endDate: toNoonUtcIso(end),
                    year: start.getFullYear(),
                    months: [start.toLocaleString('default', { month: 'long' })]
                }
            }

            await updateTripProfilePartial(tripProfileId, profileUpdate)

            // 4. Set as active trip
            if (travelerTripsContext?.updateActiveTrip) {
                await travelerTripsContext.updateActiveTrip(newTripId, {
                    force: true,
                    replaceOnly: true
                })
            }

            // 5. Navigate to itinerary page
            onNewTripCreated()
            window.location.href = '/itinerary'
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Trip creation failed:', error)
            toast.error('Something went wrong. Please try again.')
            setIsCreating(false)
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
                onClick={(e) => {
                    if (e.target === e.currentTarget && !isCreating && !isSelectingTrip) {
                        trackButtonClickCustom({
                            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                            buttonName: 'close_trip_selection',
                            buttonAction: 'click'
                        })
                        onClose()
                    }
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-grey-4/50">
                        <div>
                            <h2 className="text-lg font-bold font-red-hat-display text-grey-0">
                                {hasExistingTrips ? 'Welcome back!' : 'Create your trip'}
                            </h2>
                            <p className="text-sm text-grey-2 font-manrope font-[500] mt-0.5">
                                {hasExistingTrips
                                    ? 'Continue with an existing trip or create a new one'
                                    : 'Tap below to get started with your new trip'}
                            </p>
                        </div>
                        {!isCreating && !isSelectingTrip && (
                            <button
                                type="button"
                                onClick={() => {
                                    trackButtonClickCustom({
                                        buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                        buttonName: 'close_trip_selection',
                                        buttonAction: 'click'
                                    })
                                    onClose()
                                }}
                                className="p-1.5 hover:bg-grey-5 rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={18} className="text-grey-2" />
                            </button>
                        )}
                    </div>

                   

                    {/* New trip action */}
                    <div className="px-5 pt-4 pb-2">
                        <p className="text-xs font-bold font-red-hat-display text-grey-2 uppercase tracking-wide pb-[8px]">
                            New trip
                        </p>
                        <button
                            type="button"
                            onClick={handleCreateNewTrip}
                            disabled={isCreating || !!isSelectingTrip}
                            className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 transition-all ${
                                isCreating
                                    ? 'bg-primary-default/10 border border-primary-default/30 cursor-wait'
                                    : 'bg-primary-default/5 border border-primary-default/20 hover:bg-primary-default/10 cursor-pointer'
                            }`}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="flex items-center -space-x-1.5 shrink-0">
                                    {pendingWizardData.destinations.slice(0, 3).map((dest) =>
                                        dest.imageUrl ? (
                                            <img
                                                key={dest.id}
                                                src={dest.imageUrl}
                                                alt={dest.title}
                                                className="w-6 h-6 rounded-full object-cover border-2 border-white"
                                            />
                                        ) : null
                                    )}
                                </div>
                                <span className="text-sm font-semibold text-primary-default font-red-hat-display truncate">
                                    {isCreating
                                        ? 'Creating your trip...'
                                        : `New trip to ${pendingWizardData.destinations.map(d => d.title).join(', ')}`}
                                </span>
                            </div>
                            {isCreating ? (
                                <Loader2 size={16} className="text-primary-default animate-spin shrink-0" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-primary-default/10 flex items-center justify-center shrink-0">
                                    <Plus size={16} className="text-primary-default" />
                                </div>
                            )}
                        </button>
                    </div>

                    {/* divider + trip list — only when there are existing trips */}
                    {(isTripsLoading || hasExistingTrips) && (
                    <>
                    <Divider className="my-4" />

                    <div className="flex-1 overflow-y-auto px-5 py-3">
                        {isTripsLoading ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 size={20} className="text-grey-3 animate-spin" />
                            </div>
                        ) : tripsWithDestinations.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                <p className="text-xs font-bold font-red-hat-display text-grey-2 uppercase tracking-wide">
                                    Your existing trips
                                </p>
                                {ownTrips.map(trip => (
                                    <div key={trip.trip_id} className="relative">
                                        <TripButton
                                            trip={trip}
                                            flagData={tripFlagsMap[trip.trip_id]}
                                            onClick={() => handleSelectExisting(trip.trip_id)}
                                            icon={
                                                isSelectingTrip === trip.trip_id
                                                    ? <Loader2 size={14} className="text-primary-default animate-spin shrink-0" />
                                                    : undefined
                                            }
                                        />
                                    </div>
                                ))}
                                {otherTrips.length > 0 && (
                                    <>
                                        <p className="text-xs font-bold font-red-hat-display text-grey-2 uppercase tracking-wide mt-2">
                                            Shared with you
                                        </p>
                                        {otherTrips.map(trip => (
                                            <div key={trip.trip_id} className="relative">
                                                <TripButton
                                                    trip={trip}
                                                    flagData={tripFlagsMap[trip.trip_id]}
                                                    onClick={() => handleSelectExisting(trip.trip_id)}
                                                    icon={
                                                        isSelectingTrip === trip.trip_id
                                                            ? <Loader2 size={14} className="text-primary-default animate-spin shrink-0" />
                                                            : undefined
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        ) : null}


                    </div>
                    </>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

export default TripSelectionModal
