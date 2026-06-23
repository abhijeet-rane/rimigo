/**
 * Orchestration hook for the unified tripboard creation pipeline.
 *
 * Manages the full lifecycle:
 *   idle → creating_trip → generating_itinerary → creating_tripboard → completed
 *
 * Entry points:
 *   - startFromWizard(): After wizard completes (create trip + generate itinerary + create tripboard)
 *   - startFromExistingTripWithItinerary(): Existing trip, no itinerary (skip trip creation, generate itinerary + create tripboard)
 *   - startFromExistingTrip(): Existing trip + itinerary (skip both, only create tripboard)
 *
 * The creating_tripboard phase now calls a backend async API instead of making
 * 20+ sequential HTTP calls from the frontend. It triggers a Celery task and polls
 * for completion.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { TokenStorage } from '@/lib/api/tokenStorage'
import { createBasicTrip } from '@/modules/Onboarding/api/onboardingAPI'
import { getTripItinerariesByTrip, createTripItinerary } from '@/api/itineraryApi'
import { getAgentBySpace } from '@/api/ataAPI/ataApi'
import { useSendItineraryRequest } from '@/modules/Itinerary/hooks/ItineraryHook'
import { buildItineraryPayload } from '@/modules/Itinerary/utils/buildItineraryPayload'
import { startTripboardCreation, pollTripboardStatus } from '@/api/tripboardApi'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import type { LoaderCity } from '@/modules/Itinerary/components/ItineraryGenerationLoader'
import type { WizardState } from '@/modules/Itinerary/components/CreateItineraryWizard/types'
import type { SearchDestinationCardData } from '@/lib/api/OnboardingApi'

// ─── Types ──────────────────────────────────────────────────────────────────────

export type OrchestrationPhase =
    | 'idle'
    | 'creating_trip'
    | 'generating_itinerary'
    | 'creating_tripboard'
    | 'completed'
    | 'error'

export interface OrchestrationState {
    phase: OrchestrationPhase
    tripId: string | null
    itineraryId: string | null
    travelerId: string | null
    interactionMeta: { agentId: string; threadId: string; interactionId: string } | null
    error: string | null
    errorPhase: OrchestrationPhase | null
    // ItineraryGenerationLoader data
    generationCities: LoaderCity[]
    generationTotalDays: number | undefined
    tripName: string | undefined
    // Carried data for pipeline
    wizardData: {
        destinations: SearchDestinationCardData[]
        groupType: string
        purpose: string
        wizardState: WizardState
    } | null
    // Backend task tracking
    taskId: string | null
    // Stored params for startFromExistingTrip (used for retry)
    existingTripParams: StartFromExistingTripParams | null
}

export interface StartFromWizardParams {
    destinations: SearchDestinationCardData[]
    groupType: string
    purpose: string
    wizardState: WizardState
    tripSource?: string
    utmMedium?: string
    utmCampaign?: string
    travelerTripsContext?: {
        updateActiveTrip?: (tripId: string, options?: { force?: boolean; replaceOnly?: boolean }) => Promise<void>
    }
}

export interface StartFromExistingTripParams {
    tripId: string
    itineraryId: string
    tripName: string
    countryIds: string[]
    countryName: string
    startDate: string
    endDate: string
    groupSetup: { adults: number; children: number; infants: number }
    stayBudgetRange?: { min: number; max: number }
    dietaryRestrictions?: string[]
    /** For invited/co-traveler: use the trip owner's traveler_id instead of the current user */
    ownerTravelerId?: string
}

/** For existing trips that need itinerary + tripboard (skips trip creation) */
export interface StartFromExistingTripWithItineraryParams {
    tripId: string
    destinations: SearchDestinationCardData[]
    groupType: string
    purpose: string
    wizardState: WizardState
}

const INITIAL_STATE: OrchestrationState = {
    phase: 'idle',
    tripId: null,
    itineraryId: null,
    travelerId: null,
    interactionMeta: null,
    error: null,
    errorPhase: null,
    generationCities: [],
    generationTotalDays: undefined,
    tripName: undefined,
    wizardData: null,
    taskId: null,
    existingTripParams: null
}

// ─── Session storage persistence ─────────────────────────────────────────────
// Persists orchestration state so it survives component remounts (e.g. when
// TravelerTripsProvider re-renders and causes TripboardPage to remount).
const SESSION_KEY = 'tripboard_orchestration_state'

function saveToSession(state: OrchestrationState) {
    if (state.phase === 'idle') {
        sessionStorage.removeItem(SESSION_KEY)
        return
    }
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(state))
    } catch { /* quota exceeded — non-critical */ }
}

function loadFromSession(): OrchestrationState {
    try {
        const stored = sessionStorage.getItem(SESSION_KEY)
        if (!stored) return INITIAL_STATE
        const parsed = JSON.parse(stored) as OrchestrationState
        // Only restore active phases (not stale error/completed states)
        if (parsed.phase === 'generating_itinerary' || parsed.phase === 'creating_trip' || parsed.phase === 'creating_tripboard') {
            return parsed
        }
        sessionStorage.removeItem(SESSION_KEY)
        return INITIAL_STATE
    } catch {
        sessionStorage.removeItem(SESSION_KEY)
        return INITIAL_STATE
    }
}

// ─── Cross-instance snapshot ─────────────────────────────────────────────────
// The main hook lives inside TripboardPage; components elsewhere (e.g. the
// sidebar's "Creating trip…" indicator) need to observe the same state
// without triggering the full pipeline. A module-level listener set lets
// any instance subscribe to updates, with sessionStorage as the fallback
// source-of-truth on first mount.
type OrchestrationListener = (state: OrchestrationState) => void
const orchestrationListeners = new Set<OrchestrationListener>()
const notifyOrchestrationListeners = (state: OrchestrationState) => {
    orchestrationListeners.forEach((l) => {
        try { l(state) } catch { /* swallow — observer must not break the pipeline */ }
    })
}

// Module-level "is the pipeline actively running" flag.
// Lives outside React so it survives component remounts — a per-instance
// useRef resets on remount, which is exactly when we need to know whether
// a previously-mounted instance still has a pipeline in flight. A new
// instance can read this and decide whether to wait for the orphan or
// resume on its own.
let pipelineRunning = false

// Canonical state at module scope. The pipeline outlives the instance that
// started it (URL-sync remounts TripboardPage mid-flight); React drops
// setState updater functions on the unmounted instance, which would otherwise
// swallow the saveToSession / notify side effects inside the updater. Keeping
// state here lets commitState persist + notify synchronously regardless.
let currentState: OrchestrationState = INITIAL_STATE

function commitState(updater: OrchestrationState | ((prev: OrchestrationState) => OrchestrationState)): OrchestrationState {
    const prev = currentState
    const next = typeof updater === 'function' ? updater(prev) : updater
    currentState = next
    saveToSession(next)
    notifyOrchestrationListeners(next)
    return next
}

/**
 * Read-only view of the orchestration state. Use this in components that
 * only need to *observe* whether a trip is being created (e.g. a sidebar
 * banner). Does not start or mutate the pipeline.
 */
export function useOrchestrationSnapshot(): OrchestrationState {
    const [snapshot, setSnapshot] = useState<OrchestrationState>(() => {
        const loaded = loadFromSession()
        currentState = loaded
        return loaded
    })
    useEffect(() => {
        const listener: OrchestrationListener = (s) => setSnapshot(s)
        orchestrationListeners.add(listener)
        return () => {
            orchestrationListeners.delete(listener)
        }
    }, [])
    return snapshot
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useTripboardOrchestration(travelerTripsCtx?: {
    updateActiveTrip?: (tripId: string, options?: { force?: boolean; replaceOnly?: boolean }) => Promise<void>
} | null) {
    const [state, setState] = useState<OrchestrationState>(() => {
        // Seed both React state and the module mirror — commitState reads
        // the mirror, so it must reflect reality at mount.
        const loaded = loadFromSession()
        currentState = loaded
        return loaded
    })
    const queryClient = useQueryClient()
    const { mutateAsync: sendItinerary } = useSendItineraryRequest()
    const { trackEvent } = usePostHog()
    // `pipelineRunning` lives at module scope (above) — survives remounts.
    // Store in ref so handleItineraryComplete always has the latest context
    const travelerTripsCtxRef = useRef(travelerTripsCtx)
    travelerTripsCtxRef.current = travelerTripsCtx

    // Commit via the module-level helper so persist + notify run synchronously
    // even if `this` instance has already unmounted. setState on an unmounted
    // instance is a harmless no-op; the listener below wakes the live one.
    const setStateAndPersist = useCallback((updater: OrchestrationState | ((prev: OrchestrationState) => OrchestrationState)) => {
        setState(commitState(updater))
    }, [])

    // Adopt updates pushed by a pipeline running on a previous (unmounted)
    // instance — otherwise an orphan finishes but React state stays stuck.
    useEffect(() => {
        const listener: OrchestrationListener = (s) => {
            setState(prev => (prev === s ? prev : s))
        }
        orchestrationListeners.add(listener)
        return () => { orchestrationListeners.delete(listener) }
    }, [])

    // ── Resume an orphaned creating_trip phase ──────────────────────────
    // If a remount stranded us in `creating_trip` and the original
    // pipeline is gone, continue from after `createBasicTrip` — which is
    // safe because `tripId` is persisted to state right after that call.
    // If the trip wasn't even created yet (no persisted tripId), surface
    // the error so the user can retry intentionally, rather than risk
    // creating a duplicate trip on the backend.
    const resumeFromCreatingTrip = useCallback(async () => {
        if (pipelineRunning) return
        const snapshot = loadFromSession()
        if (snapshot.phase !== 'creating_trip') return

        // No tripId means createBasicTrip never landed (or its response was
        // lost). We can't safely retry it automatically — let the user retry.
        if (!snapshot.tripId || !snapshot.wizardData) {
            setStateAndPersist(prev => prev.phase === 'creating_trip' ? {
                ...prev,
                phase: 'error',
                error: 'Trip creation was interrupted. Please try again.',
                errorPhase: 'creating_trip'
            } : prev)
            return
        }

        // eslint-disable-next-line no-console
        console.log('[Orchestration] Resuming creating_trip — backend trip already exists', { tripId: snapshot.tripId })
        pipelineRunning = true
        try {
            const tripId = snapshot.tripId
            const { destinations, wizardState } = snapshot.wizardData
            const travelerId = snapshot.travelerId
                || (await TokenStorage.getUserInfo())?.traveler_id
                || ''

            // Mirror of steps 5-8 in startFromWizard, minus createBasicTrip.
            let itineraryRecords = await getTripItinerariesByTrip(tripId)
            if (!itineraryRecords || itineraryRecords.length === 0) {
                const newItinerary = await createTripItinerary({ trip_id: tripId, status: 'draft' })
                itineraryRecords = [newItinerary]
            }

            const agentId = await getAgentBySpace('itinerary_agent')

            const payloadResult = buildItineraryPayload({ wizardState, destinations, tripId, agentId })
            if (!payloadResult) throw new Error('Could not build itinerary payload — missing dates or cities')

            const response = await sendItinerary(payloadResult.sendParams)
            const responseData = response?.data
            if (!responseData) throw new Error('No response from itinerary generation API')

            setStateAndPersist(prev => ({
                ...prev,
                phase: 'generating_itinerary',
                tripId,
                travelerId,
                tripName: destinations.length === 1
                    ? `${destinations[0].title} Trip`
                    : `${destinations.map(d => d.title).join(', ')} Trip`,
                interactionMeta: {
                    agentId: responseData.agent_id,
                    threadId: responseData.thread_id,
                    interactionId: responseData.id
                },
                generationCities: payloadResult.generationCities,
                generationTotalDays: payloadResult.generationTotalDays
            }))
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('[Orchestration] Resume from creating_trip failed:', error)
            setStateAndPersist(prev => ({
                ...prev,
                phase: 'error',
                error: error instanceof Error ? error.message : 'Something went wrong',
                errorPhase: 'creating_trip'
            }))
            toast.error('Something went wrong. Please try again.')
        } finally {
            pipelineRunning = false
        }
    }, [sendItinerary, setStateAndPersist])

    // ── Watchdog: recover from orphaned creating_trip phase ─────────────
    // If we land in `creating_trip` with no pipeline actively running
    // anywhere (the orphan died), give the cross-instance listener a brief
    // settle window in case an update is in flight, then auto-resume from
    // the persisted tripId instead of dropping the user into an error
    // screen — which is what used to happen after 30s.
    useEffect(() => {
        if (state.phase !== 'creating_trip') return
        if (pipelineRunning) return // orphan still alive — listener will sync us

        const timeout = setTimeout(() => {
            if (!pipelineRunning) void resumeFromCreatingTrip()
        }, 2_000)

        return () => clearTimeout(timeout)
    }, [state.phase, resumeFromCreatingTrip])

    // ── Safety: recover from orphaned generating_itinerary phase ─────
    // Same scenario as creating_trip: if the component remounts from
    // sessionStorage with generating_itinerary but the ItineraryGenerationLoader
    // polling silently fails or the interaction is already completed,
    // the user gets stuck on the spinner forever. After 3 minutes,
    // transition to error so they can retry.
    useEffect(() => {
        if (state.phase !== 'generating_itinerary') return
        if (pipelineRunning) return

        const timeout = setTimeout(() => {
            setStateAndPersist(prev => {
                if (prev.phase !== 'generating_itinerary') return prev
                return {
                    ...prev,
                    phase: 'error' as OrchestrationPhase,
                    error: 'Itinerary generation timed out. Please try again.',
                    errorPhase: 'generating_itinerary' as OrchestrationPhase
                }
            })
        }, 360_000) // 3 minutes

        return () => clearTimeout(timeout)
    }, [state.phase, setStateAndPersist])

    // ── Entry Point: Start from wizard data ─────────────────────────────
    const startFromWizard = useCallback(async (params: StartFromWizardParams) => {
        // eslint-disable-next-line no-console
        console.log('[Orchestration] startFromWizard called', { isRunning: pipelineRunning })
        if (pipelineRunning) return
        pipelineRunning = true

        const { destinations, groupType, purpose, wizardState, tripSource, utmMedium, utmCampaign } = params
        const destIds = destinations.map(d => d.id)

        // eslint-disable-next-line no-console
        console.log('[Orchestration] → phase: creating_trip')
        setStateAndPersist(prev => ({
            ...prev,
            phase: 'creating_trip',
            error: null,
            errorPhase: null,
            taskId: null,
            wizardData: { destinations, groupType, purpose, wizardState }
        }))

        try {
            // 1. Get user info
            const userInfo = await TokenStorage.getUserInfo()
            if (!userInfo?.traveler_id) {
                throw new Error('Unable to get user information')
            }
            const travelerId = userInfo.traveler_id

            // 2. Create basic trip (includes profile fields — no separate update needed).
            //    creation_inputs persists the entire wizardState verbatim so the
            //    backend has the full create-flow context (departure/return airport,
            //    cities, budget tier, travel styles, preferences, …) to draw on later.
            const tripPayload: Parameters<typeof createBasicTrip>[1] = {
                interested_destinations: destIds,
                final_destination_countries: destIds,
                destination_finalized: true,
                group_type: groupType,
                travel_purpose: purpose,
                trip_source: tripSource || 'rimigo',
                utm_medium: utmMedium || undefined,
                utm_campaign: utmCampaign || undefined,
                group_setup: wizardState.groupSetup,
                stay_budget_range: wizardState.stayBudgetRange,
                creation_inputs: wizardState as unknown as Record<string, unknown>
            }

            if (wizardState.startDate && wizardState.endDate) {
                const start = wizardState.startDate instanceof Date
                    ? wizardState.startDate
                    : new Date(wizardState.startDate as unknown as string)
                const end = wizardState.endDate instanceof Date
                    ? wizardState.endDate
                    : new Date(wizardState.endDate as unknown as string)
                tripPayload.preferred_travel_time = {
                    is_fixed: true,
                    startDate: start,
                    endDate: end,
                    year: start.getFullYear(),
                    months: [start.toLocaleString('default', { month: 'long' })]
                }
            }

            const tripResponse = await createBasicTrip(travelerId, tripPayload)

            const newTripId = tripResponse.data.trip_id
            // eslint-disable-next-line no-console
            console.log('[Orchestration] createBasicTrip returned', { newTripId })

            // 4. Active trip is set AFTER the pipeline completes (in handleItineraryComplete)
            // Setting it here triggers TravelerTripsContext re-render which remounts
            // the page and orphans this async pipeline at "creating_trip" phase.

            // 4a. Persist the new trip id into orchestration state NOW so:
            //       - The URL-sync effect in TripboardPage can move `/tripboard/new` → `/tripboard/<newTripId>`.
            //       - If any of the remaining steps (itinerary create / agent fetch / send) fails,
            //         the error phase still knows which trip was created, letting retry/resume work
            //         against the existing backend trip instead of creating a duplicate.
            // eslint-disable-next-line no-console
            console.log('[Orchestration] persisting tripId to state', { newTripId })
            setStateAndPersist(prev => ({ ...prev, tripId: newTripId, travelerId }))

            // 5. Get or create trip itinerary record
            let itineraryRecords = await getTripItinerariesByTrip(newTripId)
            if (!itineraryRecords || itineraryRecords.length === 0) {
                const newItinerary = await createTripItinerary({ trip_id: newTripId, status: 'draft' })
                itineraryRecords = [newItinerary]
            }
            // const itineraryId = itineraryRecords[0].id

            // 6. Get agent ID for itinerary generation
            const agentId = await getAgentBySpace('itinerary_agent')

            // 7. Build and send itinerary generation payload
            const payloadResult = buildItineraryPayload({
                wizardState,
                destinations,
                tripId: newTripId,
                agentId
            })

            if (!payloadResult) {
                throw new Error('Could not build itinerary payload — missing dates or cities')
            }

            const response = await sendItinerary(payloadResult.sendParams)
            const responseData = response?.data
            if (!responseData) {
                throw new Error('No response from itinerary generation API')
            }

            // 8. Transition to generating_itinerary phase (preserves city data for loader map)
            // eslint-disable-next-line no-console
            console.log('[Orchestration] → phase: generating_itinerary', { newTripId })
            setStateAndPersist(prev => ({
                ...prev,
                phase: 'generating_itinerary',
                tripId: newTripId,
                travelerId,
                tripName: destinations.length === 1
                    ? `${destinations[0].title} Trip`
                    : `${destinations.map(d => d.title).join(', ')} Trip`,
                interactionMeta: {
                    agentId: responseData.agent_id,
                    threadId: responseData.thread_id,
                    interactionId: responseData.id
                },
                generationCities: payloadResult.generationCities,
                generationTotalDays: payloadResult.generationTotalDays
            }))
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('[Orchestration] Trip creation / itinerary send failed:', error)
            setStateAndPersist(prev => ({
                ...prev,
                phase: 'error',
                error: error instanceof Error ? error.message : 'Something went wrong',
                errorPhase: 'creating_trip'
            }))
            toast.error('Something went wrong. Please try again.')
        } finally {
            pipelineRunning = false
        }
    }, [sendItinerary, setStateAndPersist])

    // ── Callback: Itinerary generation completed ────────────────────────
    const handleItineraryComplete = useCallback(async () => {
        // Backend waits for tripboard creation before marking interaction as completed.
        // So by the time this fires, both itinerary AND tripboard exist in the backend.

        trackEvent('tripboard_v1:itinerary_loaded', { trip_id: state.tripId })

        // Set active trip NOW (deferred from startFromWizard to avoid mid-pipeline remounts).
        // Safe here because the pipeline is complete — a context re-render won't orphan anything.
        // Use context's updateActiveTrip (updates both backend AND local state).
        // Raw setActiveTrip only hits the backend — context's activeTripId stays stale.
        const tripId = state.tripId
        if (tripId) {
            try {
                if (travelerTripsCtxRef.current?.updateActiveTrip) {
                    await travelerTripsCtxRef.current.updateActiveTrip(tripId, { force: true, replaceOnly: true })
                } else {
                    // Fallback: raw API call if context unavailable
                    const { setActiveTrip } = await import('@/pages/Landing/api/travelerTrips')
                    await setActiveTrip(tripId)
                }
            } catch {
                // Non-critical — travelerTrips refetch below will pick up the trip anyway
            }
        }

        // Refetch (not just invalidate) so the data is ready BEFORE we show "completed".
        // This prevents the flash of "Itinerary coming soon" when reset() runs and
        // TripboardPage falls through to the !identifier branch before data arrives.
        // Use Promise.allSettled — cache refetch is best-effort; a network blip must
        // never block the phase transition, otherwise the user is stuck forever.
        await Promise.allSettled([
            queryClient.refetchQueries({ queryKey: ['tripboard-collection'] }),
            queryClient.refetchQueries({ queryKey: ['travelerTrips'] }),
            // Refetch itinerary so Itenerary.tsx sees status='completed' on mount
            // and skips its resume-polling effect (which otherwise emits a noisy
            // "Could not find interaction" toast searching for a finished interaction).
            queryClient.refetchQueries({ queryKey: ['itineraryCompleted'] })
        ])
        // Invalidate all collection tab queries so they refetch with fresh data
        // (critical after itinerary recreate — tab content is rebuilt by backend)
        queryClient.invalidateQueries({ queryKey: ['traveler-collection'] })
        queryClient.invalidateQueries({ queryKey: ['traveler-collection-section-types'] })

        trackEvent('tripboard_v1:tripboard_loaded', { trip_id: state.tripId })

        setStateAndPersist(prev => ({ ...prev, phase: 'completed' }))
    }, [queryClient, setStateAndPersist, state.tripId, trackEvent])

    // ── Callback: Itinerary generation error ────────────────────────────
    const handleItineraryError = useCallback((error: Error) => {
        setStateAndPersist(prev => ({
            ...prev,
            phase: 'error',
            error: error.message || 'Itinerary generation failed',
            errorPhase: 'generating_itinerary'
        }))
    }, [setStateAndPersist])

    // ── Entry Point: Start from existing trip + itinerary (skip to tripboard creation) ──
    const startFromExistingTrip = useCallback(async (params: StartFromExistingTripParams) => {
        if (pipelineRunning) return
        pipelineRunning = true

        setStateAndPersist(prev => ({
            ...prev,
            phase: 'creating_tripboard',
            tripId: params.tripId,
            itineraryId: params.itineraryId,
            tripName: params.tripName,
            error: null,
            errorPhase: null,
            existingTripParams: params
        }))

        try {
            const travelerId = params.ownerTravelerId || (await TokenStorage.getUserInfo())?.traveler_id
            if (!travelerId) {
                throw new Error('Unable to get user information')
            }

            const { task_id } = await startTripboardCreation({
                itinerary_id: params.itineraryId,
                trip_id: params.tripId,
                traveler_id: travelerId,
                trip_name: params.tripName,
                country_ids: params.countryIds,
                country_name: params.countryName,
                wizard_data: {
                    start_date: params.startDate,
                    end_date: params.endDate,
                    group_setup: params.groupSetup,
                    stay_budget_range: params.stayBudgetRange,
                    dietary_restrictions: params.dietaryRestrictions
                }
            })

            // Poll for completion (timeout after 90s to prevent infinite polling)
            const POLL_TIMEOUT_MS = 90_000
            const poll = (): Promise<void> => new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    clearInterval(interval)
                    reject(new Error('__POLL_TIMEOUT__'))
                }, POLL_TIMEOUT_MS)

                const interval = setInterval(async () => {
                    try {
                        const status = await pollTripboardStatus(task_id)
                        if (status.status === 'completed') {
                            clearTimeout(timeout)
                            clearInterval(interval)
                            resolve()
                        } else if (status.status === 'failed') {
                            clearTimeout(timeout)
                            clearInterval(interval)
                            reject(new Error(status.error || 'Tripboard creation failed'))
                        }
                    } catch {
                        // Transient error — keep polling
                    }
                }, 4000)
            })

            await poll()

            // Refetch data before transitioning to completed
            // Use Promise.allSettled — cache refetch is best-effort; must never block phase transition.
            await Promise.allSettled([
                queryClient.refetchQueries({ queryKey: ['tripboard-collection', params.tripId] }),
                queryClient.refetchQueries({ queryKey: ['travelerTrips'] })
            ])
            queryClient.invalidateQueries({ queryKey: ['traveler-collection'] })
            queryClient.invalidateQueries({ queryKey: ['traveler-collection-section-types'] })

            trackEvent('tripboard_v1:tripboard_loaded', { trip_id: params.tripId })

            setStateAndPersist(prev => ({ ...prev, phase: 'completed' }))
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('[Orchestration] Tripboard creation failed:', error)

            // Timeout: tripboard is likely created in backend but poll didn't catch it.
            // Show toast and reload so the page picks up the new data.
            if (error instanceof Error && error.message === '__POLL_TIMEOUT__') {
                toast.error('Taking longer than expected. Reloading...')
                setStateAndPersist(INITIAL_STATE)
                setTimeout(() => window.location.reload(), 1500)
                return
            }

            setStateAndPersist(prev => ({
                ...prev,
                phase: 'error',
                error: error instanceof Error ? error.message : 'Something went wrong',
                errorPhase: 'creating_tripboard'
            }))
            toast.error('Failed to create tripboard. Please try again.')
        } finally {
            pipelineRunning = false
        }
    }, [queryClient, setStateAndPersist])

    // ── Entry Point: Existing trip, generate itinerary + create tripboard ──
    // Same as startFromWizard but skips trip creation (trip already exists).
    // Used when user lands on /tripboard with an active trip but no itinerary.
    const startFromExistingTripWithItinerary = useCallback(async (params: StartFromExistingTripWithItineraryParams) => {
        if (pipelineRunning) return
        pipelineRunning = true

        const { tripId, destinations, groupType, purpose, wizardState } = params

        setStateAndPersist(prev => ({
            ...prev,
            phase: 'creating_trip', // Reuse phase label for UI (shows "Setting up your travel details...")
            error: null,
            errorPhase: null,
            taskId: null,
            wizardData: { destinations, groupType, purpose, wizardState }
        }))

        try {
            // 1. Get user info
            const userInfo = await TokenStorage.getUserInfo()
            if (!userInfo?.traveler_id) {
                throw new Error('Unable to get user information')
            }
            const travelerId = userInfo.traveler_id

            // 2. Skip trip creation — use existing tripId

            // 3. Get or create trip itinerary record
            let itineraryRecords = await getTripItinerariesByTrip(tripId)
            if (!itineraryRecords || itineraryRecords.length === 0) {
                const newItinerary = await createTripItinerary({ trip_id: tripId, status: 'draft' })
                itineraryRecords = [newItinerary]
            }
            const itineraryId = itineraryRecords[0].id

            // 4. Get agent ID for itinerary generation
            const agentId = await getAgentBySpace('itinerary_agent')

            // 5. Build and send itinerary generation payload
            const payloadResult = buildItineraryPayload({
                wizardState,
                destinations,
                tripId,
                agentId
            })

            if (!payloadResult) {
                throw new Error('Could not build itinerary payload — missing dates or cities')
            }

            const response = await sendItinerary(payloadResult.sendParams)
            const responseData = response?.data
            if (!responseData) {
                throw new Error('No response from itinerary generation API')
            }

            // 6. Transition to generating_itinerary phase
            setStateAndPersist(prev => ({
                ...prev,
                phase: 'generating_itinerary',
                tripId,
                itineraryId,
                travelerId,
                tripName: destinations.length === 1
                    ? `${destinations[0].title} Trip`
                    : `${destinations.map(d => d.title).join(', ')} Trip`,
                interactionMeta: {
                    agentId: responseData.agent_id,
                    threadId: responseData.thread_id,
                    interactionId: responseData.id
                },
                generationCities: payloadResult.generationCities,
                generationTotalDays: payloadResult.generationTotalDays
            }))
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('[Orchestration] Itinerary generation for existing trip failed:', error)
            setStateAndPersist(prev => ({
                ...prev,
                phase: 'error',
                error: error instanceof Error ? error.message : 'Something went wrong',
                errorPhase: 'creating_trip'
            }))
            toast.error('Something went wrong. Please try again.')
        } finally {
            pipelineRunning = false
        }
    }, [sendItinerary, setStateAndPersist])

    // ── Retry from failed phase ─────────────────────────────────────────
    const retry = useCallback(async () => {
        // For existing-trip flow, retry directly
        if (!state.wizardData && state.existingTripParams && state.errorPhase === 'creating_tripboard') {
            pipelineRunning = false
            await startFromExistingTrip(state.existingTripParams)
            return
        }

        if (!state.wizardData) return

        if (state.errorPhase === 'creating_trip') {
            // Re-run the full pipeline
            pipelineRunning = false
            await startFromWizard({
                ...state.wizardData,
                // travelerTripsContext not stored, but startFromWizard handles it
            })
        } else if (state.errorPhase === 'generating_itinerary') {
            // Re-send the itinerary request
            if (!state.tripId || !state.itineraryId) return
            setStateAndPersist(prev => ({ ...prev, phase: 'creating_trip', error: null, errorPhase: null }))

            try {
                const agentId = await getAgentBySpace('itinerary_agent')
                const payloadResult = buildItineraryPayload({
                    wizardState: state.wizardData!.wizardState,
                    destinations: state.wizardData!.destinations,
                    tripId: state.tripId,
                    agentId
                })

                if (!payloadResult) throw new Error('Could not rebuild payload')

                const response = await sendItinerary(payloadResult.sendParams)
                const responseData = response?.data
                if (!responseData) throw new Error('No response')

                setStateAndPersist(prev => ({
                    ...prev,
                    phase: 'generating_itinerary',
                    error: null,
                    errorPhase: null,
                    interactionMeta: {
                        agentId: responseData.agent_id,
                        threadId: responseData.thread_id,
                        interactionId: responseData.id
                    },
                    generationCities: payloadResult.generationCities,
                    generationTotalDays: payloadResult.generationTotalDays
                }))
            } catch (error) {
                setStateAndPersist(prev => ({
                    ...prev,
                    phase: 'error',
                    error: error instanceof Error ? error.message : 'Retry failed',
                    errorPhase: 'generating_itinerary'
                }))
            }
        } else if (state.errorPhase === 'creating_tripboard') {
            // Re-trigger tripboard creation
            await handleItineraryComplete()
        }
    }, [state.errorPhase, state.wizardData, state.existingTripParams, state.tripId, state.itineraryId, startFromWizard, startFromExistingTrip, sendItinerary, handleItineraryComplete, setStateAndPersist])

    // ── Reset ───────────────────────────────────────────────────────────
    const reset = useCallback(() => {
        pipelineRunning = false
        setStateAndPersist(INITIAL_STATE)
    }, [setStateAndPersist])

    // ── Scoping helpers ──────────────────────────────────────────────────
    // The orchestration state is global (one slot per browser in sessionStorage),
    // but the tripboard page lives under a tripId-addressed URL. To avoid showing
    // the creation spinner on unrelated trip URLs, callers ask: "is this
    // orchestration for *this* trip?" or "is this the pre-trip create phase?"
    //
    // `completed` is treated as active so the orchestration view handles the brief
    // hold + full-page reload before the pipeline unmounts. `error` is treated as
    // active *when scoped to a tripId* so the retry UI shows on the failing trip's
    // URL instead of falling through to main render (which would hit 404s fetching
    // a trip whose pipeline didn't finish).
    const isOrchestrationFor = useCallback(
        (tripId?: string | null) =>
            state.phase !== 'idle' ? !!tripId && state.tripId === tripId : false,
        [state.phase, state.tripId]
    )
    const isPreTripOrchestration = useCallback(
        () =>
            (state.phase === 'creating_trip' || state.phase === 'generating_itinerary' || state.phase === 'creating_tripboard')
                && !state.tripId,
        [state.phase, state.tripId]
    )
    // isOrchestrationActive excludes idle. We keep `error` out of this flag so that
    // when there is NO tripId yet (pre-trip error) the user sees the wizard again
    // rather than an error screen on `/tripboard/new`; with a tripId, the per-trip
    // render guard takes over via `isOrchestrationFor`.
    const isOrchestrationActive = useCallback(
        () => state.phase !== 'idle' && state.phase !== 'error',
        [state.phase]
    )

    return {
        state,
        startFromWizard,
        startFromExistingTripWithItinerary,
        startFromExistingTrip,
        handleItineraryComplete,
        handleItineraryError,
        retry,
        reset,
        isOrchestrationFor,
        isPreTripOrchestration,
        isOrchestrationActive
    }
}
