/**
 * Renders the appropriate UI for each phase of the unified tripboard creation pipeline.
 *
 * Phases:
 *   creating_trip         → Spinner with "Creating your trip..."
 *   generating_itinerary  → ItineraryGenerationLoader (map + progress steps)
 *   creating_tripboard    → Same loader, with "Building your tripboard" appended as final step
 *   completed             → Brief success, auto-transitions to tripboard
 *   error                 → Error message + Retry button
 */

import { useEffect, useMemo } from 'react'
import { Loader2, RefreshCw, CheckCircle2 } from 'lucide-react'
import ItineraryGenerationLoader from '@/modules/Itinerary/components/ItineraryGenerationLoader'
import Itinerary from '@/modules/Itinerary/pages/Itenerary'
import { useItineraryCompletedData } from '@/modules/Itinerary/hooks/ItineraryHook'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { TRIPBOARD_V1_BUTTON_PAGE } from '@/constants/posthogEvents'
import { POST_CREATE_EXPAND_ASSISTANT_KEY } from '../constants/tripboardConfig'
import type { useTripboardOrchestration } from '../hooks/useTripboardOrchestration'
interface TripboardOrchestrationViewProps {
    orchestration: ReturnType<typeof useTripboardOrchestration>
}

const TripboardOrchestrationView: React.FC<TripboardOrchestrationViewProps> = ({ orchestration }) => {
    const { state, handleItineraryComplete, handleItineraryError, retry, reset } = orchestration
    const { trackButtonClickCustom, trackEvent } = usePostHog()

    // Try to fetch the completed itinerary data — shows itinerary as soon as it's ready
    const itineraryId = state.itineraryId ?? ''
    const { data: itineraryData } = useItineraryCompletedData(itineraryId)
    const itineraryHasDays = useMemo(() => (itineraryData?.days?.length ?? 0) > 0, [itineraryData])

    // On completion, trigger full page refresh so all data loads fresh from backend.
    // Set a one-shot sessionStorage flag so the next TripboardHeader mount
    // auto-pops the floating AI assistant; that handler reads-and-removes it.
    useEffect(() => {
        if (state.phase === 'completed') {
            const timer = setTimeout(() => {
                try {
                    sessionStorage.setItem(POST_CREATE_EXPAND_ASSISTANT_KEY, '1')
                } catch { /* sessionStorage unavailable — non-fatal */ }
                window.location.href = '/tripboard'
            }, 1500)
            return () => clearTimeout(timer)
        }
    }, [state.phase])

    // Track every time the error screen is actually shown to a user — not just
    // when they click Start Over / Try Again (most users abandon without clicking,
    // so click-only events massively under-count failures). Fires once per
    // transition into the error phase via the dependency on state.phase.
    useEffect(() => {
        if (state.phase !== 'error') return
        trackEvent('tripboard_v1:error_screen_viewed', {
            trip_id: state.tripId,
            error_phase: state.errorPhase,
            error_message: state.error
        })
    }, [state.phase, state.tripId, state.errorPhase, state.error, trackEvent])

    // ── Creating trip phase ─────────────────────────────────────────────
    if (state.phase === 'creating_trip') {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center px-4">
                    <Loader2 className="w-12 h-12 text-primary-default animate-spin mx-auto mb-6" />
                    <h2 className="text-xl font-bold font-red-hat-display text-grey-0 mb-2">
                        Creating your trip
                    </h2>
                    <p className="text-grey-2 font-manrope text-[16px] font-[550]">
                        Setting up your travel details...
                    </p>
                </div>
            </div>
        )
    }

    // ── Generating itinerary — show itinerary if /complete data is ready, otherwise loader ──
    // Keep the loader always mounted so polling continues even when itinerary is shown
    if (state.phase === 'generating_itinerary' && state.interactionMeta) {
        return (
            <>
                {/* Loader stays mounted for polling — hidden when itinerary is ready */}
                <div style={{ display: itineraryHasDays ? 'none' : 'block' }}>
                    <ItineraryGenerationLoader
                        agentId={state.interactionMeta.agentId}
                        threadId={state.interactionMeta.threadId}
                        interactionId={state.interactionMeta.interactionId}
                        pollingInterval={5000}
                        retryInteractionOnNetworkError
                        cities={state.generationCities}
                        totalDays={state.generationTotalDays}
                        tripName={state.tripName}
                        onComplete={async () => {
                            await handleItineraryComplete()
                        }}
                        onError={(error) => {
                            handleItineraryError(error)
                        }}
                    />
                </div>
                {/* Show itinerary as soon as /complete data is available */}
                {itineraryHasDays && itineraryId && (
                    <Itinerary
                        itineraryIdOverride={itineraryId}
                        embedded
                        readOnly
                        showCloneButton={false}
                        showCreateTripboardBtn={false}
                    />
                )}
            </>
        )
    }

    // ── Creating tripboard — itinerary is ready, show it ──
    if (state.phase === 'creating_tripboard' && itineraryId) {
        return (
            <Itinerary
                itineraryIdOverride={itineraryId}
                embedded
                readOnly
                showCloneButton={false}
                showCreateTripboardBtn={false}
            />
        )
    }

    // ── Creating tripboard from existing trip (no itinerary ID available) ──
    if (state.phase === 'creating_tripboard') {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center px-4">
                    <Loader2 className="w-12 h-12 text-primary-default animate-spin mx-auto mb-6" />
                    <h2 className="text-xl font-bold font-red-hat-display text-grey-0 mb-2">
                        Building your tripboard
                    </h2>
                    <p className="text-grey-2 font-manrope text-sm font-medium">
                        Creating your personalized travel plan...
                    </p>
                </div>
            </div>
        )
    }

    // ── Completed phase ─────────────────────────────────────────────────
    if (state.phase === 'completed') {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center px-4">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold font-red-hat-display text-grey-0 mb-2">
                        Your tripboard is ready!
                    </h2>
                    <p className="text-grey-2 font-manrope text-sm font-medium">
                        Loading your personalized travel plan...
                    </p>
                </div>
            </div>
        )
    }

    // ── Error phase ─────────────────────────────────────────────────────
    if (state.phase === 'error') {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center px-4 max-w-md">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
                        <RefreshCw className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold font-red-hat-display text-grey-0 mb-2">
                        Something went wrong
                    </h2>
                    <p className="text-grey-2 font-manrope text-sm mb-6">
                        {state.error || 'An unexpected error occurred. Please try again.'}
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                trackButtonClickCustom({
                                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                    buttonName: 'orchestration_start_over',
                                    buttonAction: 'click'
                                })
                                reset()
                            }}
                            className="px-5 py-2.5 rounded-xl border border-grey-4 text-grey-1 font-medium font-manrope hover:bg-grey-5 cursor-pointer transition-all"
                        >
                            Start Over
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                trackButtonClickCustom({
                                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                    buttonName: 'orchestration_retry',
                                    buttonAction: 'click',
                                    extra: { phase: state.phase }
                                })
                                retry()
                            }}
                            className="px-5 py-2.5 rounded-xl bg-primary-default text-white font-semibold font-manrope cursor-pointer hover:bg-primary-dark transition-all"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ── Fallback (should not reach here) ────────────────────────────────
    return null
}

export default TripboardOrchestrationView
