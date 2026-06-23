import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAgentBySpace } from '@/api/ataAPI/ataApi'
import { streamProfile, type StreamEvent } from '@/api/ataAPI/streamApi'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'

/** Space that owns the itinerary / day-fit agent. Same one the calendar
 *  assistant resolves — the curl's hard-coded agent id is just this space
 *  resolved for stage. */
const ITINERARY_AGENT_SPACE = 'itinerary_agent'

export type RecommendationStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error'

/** Per-day fitness assessment streamed as a `fit_day` event. */
export interface FitDayAssessment {
    dayNumber: number
    /** e.g. 'recommended' | 'not_recommended' | 'best' — drives row tone. */
    verdict: string
    assessment: string
    city?: string
    placementHint?: string | null
}

/** Overall verdict streamed as the single `fit_verdict` event. */
export interface FitVerdict {
    /** e.g. 'fits' | 'doesnt_fit'. */
    verdict: string
    assessment: string
    /** Day number the AI recommends, or null when nothing fits. */
    bestDayNumber: number | null
}

export interface ExperienceFitRecommendation {
    status: RecommendationStatus
    /** Overall fit verdict (banner), or null until it streams in. */
    verdict: FitVerdict | null
    /** Per-day assessments keyed by `day_number` (1-based). */
    days: Map<number, FitDayAssessment>
}

interface UseExperienceFitRecommendationArgs {
    /** Experience the user is placing — drives the `experience_fit` query. */
    experienceId: string | null
    tripId: string | null
    /** Only stream while the surface (the day-picker modal) is open. */
    enabled: boolean
}

/** Raw event shapes the `experience_fit` profile streams. `StreamEvent` doesn't
 *  declare these (they're feature-specific), so we read them off a narrowed view. */
interface FitDayEventData {
    day_number: number
    verdict: string
    assessment: string
    city?: string
    placement_hint?: string | null
}
interface FitVerdictEventData {
    verdict: string
    assessment: string
    best_day_number: number | null
}

const IDLE: ExperienceFitRecommendation = { status: 'idle', verdict: null, days: new Map() }

/**
 * Streams the AI day-fit recommendation for an experience via the existing ATA
 * stream (`input_data: {profile: 'experience_fit', experience_id}`). The profile
 * emits structured events — one `fit_verdict` (overall) and one `fit_day` per
 * itinerary day — which we accumulate into a verdict + a day-number→assessment
 * map for the day-picker to render. The stream is aborted when the experience
 * changes or the surface closes.
 */
export function useExperienceFitRecommendation({
    experienceId,
    tripId,
    enabled
}: UseExperienceFitRecommendationArgs): ExperienceFitRecommendation {
    const { data: agentId } = useQuery({
        queryKey: ['agentBySpace', ITINERARY_AGENT_SPACE],
        queryFn: () => getAgentBySpace(ITINERARY_AGENT_SPACE),
        staleTime: HOURS_24
    })

    const [state, setState] = useState<ExperienceFitRecommendation>(IDLE)

    useEffect(() => {
        if (!enabled || !experienceId || !tripId || !agentId) {
            setState(IDLE)
            return
        }

        const controller = new AbortController()
        let verdict: FitVerdict | null = null
        const days = new Map<number, FitDayAssessment>()
        setState({ status: 'loading', verdict: null, days: new Map() })

        const onEvent = (event: StreamEvent) => {
            // `fit_day` / `fit_verdict` aren't in the typed StreamEvent union —
            // read them off a narrowed view of the runtime payload.
            const ev = event as unknown as { type: string; data?: FitDayEventData | FitVerdictEventData }
            if (ev.type === 'fit_verdict' && ev.data) {
                const d = ev.data as FitVerdictEventData
                verdict = { verdict: d.verdict, assessment: d.assessment, bestDayNumber: d.best_day_number ?? null }
                setState({ status: 'streaming', verdict, days: new Map(days) })
            } else if (ev.type === 'fit_day' && ev.data) {
                const d = ev.data as FitDayEventData
                days.set(d.day_number, {
                    dayNumber: d.day_number,
                    verdict: d.verdict,
                    assessment: d.assessment,
                    city: d.city,
                    placementHint: d.placement_hint ?? null
                })
                setState({ status: 'streaming', verdict, days: new Map(days) })
            } else if (ev.type === 'finish') {
                setState({ status: 'done', verdict, days: new Map(days) })
            } else if (ev.type === 'error') {
                setState((s) => ({ ...s, status: 'error' }))
            }
        }

        // Enable the day-fit skill via the `skills` field (leave `source`
        // untouched — the backend keys this profile off the skill).
        streamProfile(
            {
                agentId,
                tripId,
                inputData: { profile: 'experience_fit', experience_id: experienceId },
                skills: ['schedule_shortlisted']
            },
            { onEvent, signal: controller.signal }
        )
            .then((terminal) => {
                if (controller.signal.aborted) return
                if (terminal.kind === 'error') setState((s) => ({ ...s, status: 'error' }))
                else setState((s) => (s.status === 'error' ? s : { ...s, status: 'done' }))
            })
            .catch(() => {
                if (!controller.signal.aborted) setState((s) => ({ ...s, status: 'error' }))
            })

        return () => controller.abort()
    }, [enabled, experienceId, tripId, agentId])

    return state
}
