import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useOptionalTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import TripboardCreateFlow from '../components/TripboardCreateFlow'
import TripboardOrchestrationView from '../components/TripboardOrchestrationView'
import TripSelectionModal, { type PendingWizardData } from '../components/TripSelectionModal'
import { useTripboardOrchestration } from '../hooks/useTripboardOrchestration'
import { INITIAL_WIZARD_STATE } from '@/modules/Itinerary/components/CreateItineraryWizard/types'
import { TRIPBOARD_POST_CREATE_URL } from '../constants/tripboardConfig'
import { useSetCreatorAttribution, type CreatorAttribution } from '@/modules/amplitude/components/creatorAttributionHooks'

const WIZARD_STATE_KEY = 'tripboard_create_wizard'

/**
 * Dedicated page for creating a new trip via the 4-step wizard + full orchestration.
 *
 * Route: /tripboard/create (semiProtected — user must be logged in)
 *
 * This is triggered when user clicks "New Trip" from sidebar.
 * Full pipeline:
 *   1. Collect user input (destination, dates, cities, preferences) via 4-step wizard
 *   2. Create the trip and set it as active
 *   3. Generate itinerary (shows ItineraryGenerationLoader)
 *   4. Create tripboard (polls backend async task)
 *   5. Auto-redirect to /tripboard on completion
 *
 * Does NOT modify TripboardPage logic in any way — this is a parallel pipeline.
 */
const TripboardCreatePage: React.FC = () => {
    const travelerTripsContext = useOptionalTravelerTrips()
    const orchestration = useTripboardOrchestration(travelerTripsContext)
    const [searchParams] = useSearchParams()
    const utmSource = searchParams.get('utm_source')
    const setCreatorAttribution = useSetCreatorAttribution()

    // Derive creator_handle from `?utm_source=...` so wizard / orchestration events
    // tagged via the trackEvent wrapper inherit attribution automatically.
    const creatorAttributionValue: CreatorAttribution | null = useMemo(() => {
        const handle = utmSource?.trim()
        if (!handle) return null
        return { creator_handle: handle, creator_id: null }
    }, [utmSource])

    useEffect(() => {
        setCreatorAttribution(creatorAttributionValue)
        return () => setCreatorAttribution(null)
    }, [creatorAttributionValue, setCreatorAttribution])

    // ── Post-login wizard recovery ──────────────────────────────────────
    const [showTripSelectionModal, setShowTripSelectionModal] = useState(false)
    const [pendingWizardData, setPendingWizardData] = useState<PendingWizardData | null>(null)

    useEffect(() => {
        const stored = sessionStorage.getItem(WIZARD_STATE_KEY)
        if (!stored) return

        try {
            const data = JSON.parse(stored) as PendingWizardData
            if (data.destinations?.length > 0 && data.groupType && data.purpose) {
                if (data.wizardState?.startDate) {
                    data.wizardState.startDate = new Date(data.wizardState.startDate)
                }
                if (data.wizardState?.endDate) {
                    data.wizardState.endDate = new Date(data.wizardState.endDate)
                }
                setPendingWizardData(data)
                setShowTripSelectionModal(true)
            }
            sessionStorage.removeItem(WIZARD_STATE_KEY)
        } catch {
            sessionStorage.removeItem(WIZARD_STATE_KEY)
        }
    }, [])

    // ── Trip selection modal (post-login recovery) ──────────────────────
    const tripSelectionModalElement = showTripSelectionModal && pendingWizardData ? (
        <TripSelectionModal
            isOpen={showTripSelectionModal}
            onClose={() => {
                setShowTripSelectionModal(false)
                setPendingWizardData(null)
            }}
            trips={travelerTripsContext?.tripsData?.trips ?? []}
            isTripsLoading={travelerTripsContext?.isLoading ?? false}
            pendingWizardData={pendingWizardData}
            onSelectExistingTrip={async (selectedTripId) => {
                if (travelerTripsContext?.updateActiveTrip) {
                    await travelerTripsContext.updateActiveTrip(selectedTripId, { force: true, replaceOnly: true })
                }
                setShowTripSelectionModal(false)
                setPendingWizardData(null)
                window.location.href = TRIPBOARD_POST_CREATE_URL
            }}
            onNewTripCreated={() => {
                setShowTripSelectionModal(false)
                setPendingWizardData(null)
            }}
            travelerTripsContext={travelerTripsContext ?? undefined}
            onCreateNewTrip={async (data) => {
                setShowTripSelectionModal(false)
                setPendingWizardData(null)
                await orchestration.startFromWizard({
                    destinations: data.destinations,
                    groupType: data.groupType,
                    purpose: data.purpose,
                    wizardState: data.wizardState || INITIAL_WIZARD_STATE,
                    tripSource: data.tripSource,
                    utmMedium: data.utmMedium,
                    utmCampaign: data.utmCampaign,
                    travelerTripsContext: travelerTripsContext ?? undefined
                })
            }}
        />
    ) : null

    // ── Orchestration is running — show progress UI ─────────────────────
    // Keep mounted through 'completed' phase so the built-in redirect
    // (window.location.href = '/tripboard' after 1.5s) fires properly.
    if (orchestration.state.phase !== 'idle') {
        return (
            <>
                {tripSelectionModalElement}
                <TripboardOrchestrationView orchestration={orchestration} />
            </>
        )
    }

    // ── Show the 4-step wizard ──────────────────────────────────────────
    // onSubmit wired to orchestration.startFromWizard → runs full pipeline:
    //   creating_trip → generating_itinerary → creating_tripboard → completed → redirect
    return (
        <>
            {tripSelectionModalElement}
            <div className="min-h-screen bg-white">
                <TripboardCreateFlow
                    travelerTripsContext={travelerTripsContext ?? undefined}
                    onSubmit={async (data) => {
                        await orchestration.startFromWizard({
                            ...data,
                            travelerTripsContext: travelerTripsContext ?? undefined
                        })
                    }}
                />
            </div>
        </>
    )
}

export default TripboardCreatePage
