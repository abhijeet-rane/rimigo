/**
 * Card Registry — single source of truth for output_type → card component mapping.
 *
 * `handlesText: true` means the card renders `data.response` internally,
 * so the outer chat bubble must NOT render a duplicate text paragraph.
 *
 * `propsMapper` transforms a ChatMessage + context into the props that the
 * specific component expects. When absent, the renderer passes
 * `{ data: message.results, ...resolvedHooks }` by default.
 *
 * All card components are lazy-loaded to reduce the initial bundle size.
 */
import { ComponentType, lazy } from 'react'
import type { ChatMessage } from '@/modules/AtaAgent/types/AIAssisstantWindowTypes'
import { dispatchCustomAction } from '@/modules/Itinerary/utils/dispatchCustomAction'

// ── Lazy card component imports ─────────────────────────────────────────────
const AlternativesCarousel = lazy(() => import('./AlternativesCarousel'))
const InlinePresentOptionsCard = lazy(() => import('./InlinePresentOptionsCard'))
const DiscoveryMapPanel = lazy(() => import('./DiscoveryMapPanel'))
const NavigationCard = lazy(() => import('./NavigationCard'))
const CostBreakdownCard = lazy(() => import('./CostBreakdownCard'))
const ExplanationCard = lazy(() => import('./ExplanationCard'))
const DateShiftCard = lazy(() => import('./DateShiftCard'))
const TripMetaUpdateCard = lazy(() => import('./TripMetaUpdateCard'))
const TravelInfoCard = lazy(() => import('./TravelInfoCard'))
const TransportLogisticsCard = lazy(() => import('./TransportLogisticsCard'))
const DynamicFormCard = lazy(() => import('./DynamicFormCard'))
const FlightSearchResultsCard = lazy(() => import('./FlightSearchResultsCard'))
const HotelSearchResultsCard = lazy(() => import('./HotelSearchResultsCard'))
const ClarificationCard = lazy(() => import('./ClarificationCard'))
const ErrorWithGuidanceCard = lazy(() => import('./ErrorWithGuidanceCard'))
const RouteChangePlanCard = lazy(() => import('./RouteChangePlanCard'))
const RouteOptionsCard = lazy(() => import('./RouteOptionsCard'))
const DelayEvaluationCard = lazy(() => import('./DelayEvaluationCard'))
const DelayConfirmationCard = lazy(() => import('./DelayConfirmationCard'))
const PreviewCard = lazy(() => import('./PreviewCard'))
const ItineraryCreationCard = lazy(() => import('./ItineraryCreationCard'))

// Special-case components (outside chat/ directory)
const ItineraryUpdateOutput = lazy(() => import('@/pages/Stays/Components/ItineraryUpdateOutput'))
const MissingFieldsSection = lazy(() => import('@/modules/AtaAgent/components/Chat/sections/MissingFieldsSection'))
const CategoryRecommendationOutput = lazy(() => import('@/pages/Stays/Components/CategoryRecommendationOutput'))

// ── Context types for propsMapper ──────────────────────────────────────────

export interface CardRenderContext {
    hooks: {
        onNavigateToSlot?: (dayIndex: number, slotIndex: number) => void
        onSendAgentMessage?: (message: string, metadata?: Record<string, any>) => void
        onRefreshItinerary?: () => void
        onViewChangeClick?: (changes?: any) => void
        onClose?: () => void
    }
    sendPromptMessage: (message: string, threadId?: string | null, metadata?: Record<string, any>) => void
    features: any[] | null
    allInteractions: any[]
    assistantType: string
    inputData: any
    handleMissingFieldsNext: (...args: any[]) => void
    /** Optimistic selections captured the moment the user taps an option
     *  in the streaming carousel — keyed by the carousel's interaction id,
     *  value is the chosen option id. Bridges the gap between click time
     *  and the BE stamping ``output_data.selected_id`` on the persisted
     *  child Interaction. Consulted as a fallback when the persisted
     *  record doesn't yet carry a selection. */
    presentOptionsLocalSelections?: Record<string, string>
}

// ── Registry types ──────────────────────────────────────────────────────────

export interface CardRegistryEntry {
    /** The React component to render for this output_type */
    component: ComponentType<any>
    /**
     * When true the card renders `data.response` (or equivalent) internally.
     * The outer chat bubble should suppress its own text paragraph to avoid
     * duplicating the response text.
     */
    handlesText: boolean
    /** Which keys from ItineraryHooksConfig this card needs passed as props */
    requiredHooks?: string[]
    /**
     * Optional function to transform ChatMessage + context into the props
     * that this particular component expects. When absent, the renderer
     * passes { data: message.results, ...resolvedHooks } by default.
     */
    propsMapper?: (message: ChatMessage, context: CardRenderContext) => Record<string, any> | null
}

// ── Registry ────────────────────────────────────────────────────────────────

export const CARD_REGISTRY: Record<string, CardRegistryEntry> = {
    // ── Standard itinerary interaction cards ─────────────────────────────
    alternatives: {
        component: AlternativesCarousel,
        handlesText: true,
        requiredHooks: ['onSendAgentMessage'],
    },
    discovery: {
        component: DiscoveryMapPanel,
        handlesText: true,
        requiredHooks: ['onSendAgentMessage'],
    },
    navigation: {
        component: NavigationCard,
        handlesText: true,
        requiredHooks: ['onNavigateToSlot'],
    },
    cost_estimate: {
        component: CostBreakdownCard,
        handlesText: true,
    },
    explanation: {
        component: ExplanationCard,
        handlesText: true,
        requiredHooks: ['onNavigateToSlot'],
    },
    date_shift: {
        component: DateShiftCard,
        handlesText: true,
        requiredHooks: ['onRefreshItinerary'],
    },
    trip_meta_update: {
        component: TripMetaUpdateCard,
        handlesText: true,
    },
    travel_info: {
        component: TravelInfoCard,
        handlesText: true,
    },
    transport_logistics: {
        component: TransportLogisticsCard,
        handlesText: true,
    },
    dynamic_form: {
        component: DynamicFormCard,
        handlesText: true,
        requiredHooks: ['onSendAgentMessage'],
    },
    flight_search_results: {
        component: FlightSearchResultsCard,
        handlesText: false, // does NOT render data.response
    },
    hotel_search_results: {
        component: HotelSearchResultsCard,
        handlesText: true,
    },
    clarification: {
        component: ClarificationCard,
        handlesText: true,
        requiredHooks: ['onSendAgentMessage'],
    },
    error_with_guidance: {
        component: ErrorWithGuidanceCard,
        handlesText: true,
        requiredHooks: ['onSendAgentMessage'],
    },
    route_change_plan: {
        component: RouteChangePlanCard,
        handlesText: true,
        requiredHooks: ['onSendAgentMessage', 'onRefreshItinerary'],
    },
    route_options: {
        component: RouteOptionsCard,
        handlesText: true,
        requiredHooks: ['onSendAgentMessage'],
    },
    delay_evaluation: {
        component: DelayEvaluationCard,
        handlesText: true,
        requiredHooks: ['onSendAgentMessage'],
    },
    delay_confirmation: {
        component: DelayConfirmationCard,
        handlesText: true,
        requiredHooks: ['onSendAgentMessage', 'onRefreshItinerary'],
    },
    preview_changes: {
        component: PreviewCard,
        handlesText: true,
        requiredHooks: ['onSendAgentMessage', 'onRefreshItinerary'],
    },

    // ── Special-case output types with propsMapper ──────────────────────

    update: {
        component: ItineraryUpdateOutput,
        handlesText: true,
        propsMapper: (message, ctx) => {
            const results = message.results as any
            if (!results || Array.isArray(results) || !results.response) return null
            return {
                data: {
                    response: results.response || '',
                    understood: results.understood || '',
                    changes: results.changes || { days_updated: 0, summaries: [] },
                    itinerary_id: results.itinerary_id,
                    feasibility_warnings: results.feasibility_warnings,
                },
                onViewChangeClick: ctx.hooks.onViewChangeClick,
                onNavigateToSlot: ctx.hooks.onNavigateToSlot,
                onRefreshItinerary: ctx.hooks.onRefreshItinerary,
                onClose: ctx.hooks.onClose,
            }
        },
    },

    missing_fields: {
        component: MissingFieldsSection,
        handlesText: true,
        propsMapper: (message, ctx) => ({
            features: ctx.features,
            featureIdentifier: (message.results as any)?.feature_identifier ?? null,
            missingFields: (message as any).missingFields ?? null,
            interactionId: message.interactionId ?? null,
            onHandleNext: ctx.handleMissingFieldsNext,
            providedData: (message.results as any)?.provided_data ?? null,
        }),
    },

    category_recommendation: {
        component: CategoryRecommendationOutput,
        handlesText: true,
        propsMapper: (message) => {
            const results = message.results as any
            if (!results || Array.isArray(results) || !results.recommendation) return null
            return {
                recommendation: results.recommendation,
                tips: results.tips,
                high_level_itinerary: results.high_level_itinerary,
            }
        },
    },

    itinerary: {
        component: ItineraryCreationCard,
        handlesText: true,
        propsMapper: (message) => ({
            data: {
                content: message.content,
                response: (message.results as any)?.executive_summary,
            },
        }),
    },

    // Concierge ``present_options`` tool creates a child Interaction
    // with ``output_type: "present_options"`` so the carousel survives
    // the stream-to-persisted swap. The streaming path renders via the
    // live ``PRESENT_OPTIONS`` event in useConciergeStream; this entry
    // handles the case where the user reopens the trip later or the
    // stream has already finished.
    present_options: {
        component: InlinePresentOptionsCard,
        handlesText: true,  // carousel stands alone; no sibling text bubble
        propsMapper: (message, ctx) => {
            const results = message.results as any
            if (!results) return null
            const items = Array.isArray(results.items) ? results.items : []
            if (items.length === 0) return null

            // Backend stamps the user's carousel choice onto this
            // Interaction's ``output_data`` when they pick an option —
            // read it back so a revisit / history reload shows the
            // same tile as selected and clicks are no-ops. See
            // ``_persist_option_selection`` in the streaming service.
            //
            // ``presentOptionsLocalSelections`` is the optimistic
            // fallback for the window between click time and the BE
            // stamping ``selected_id`` — without it, the user sees the
            // carousel render briefly *unselected* after the streaming
            // card has unmounted (next turn started) but before the
            // persisted record carries the choice.
            const bePreselectedId =
                typeof results.selected_id === 'string' || typeof results.selected_id === 'number'
                    ? String(results.selected_id)
                    : undefined
            const localPreselectedId =
                message.interactionId && ctx.presentOptionsLocalSelections
                    ? ctx.presentOptionsLocalSelections[message.interactionId]
                    : undefined
            const preselectedId = bePreselectedId ?? localPreselectedId

            // Staleness rule:
            //   • Latest interaction in thread → never stale. The
            //     carousel IS the current ask; its age is irrelevant
            //     until a newer turn appears.
            //   • Superseded by a newer interaction → 5 min fuse.
            //     Once a later turn exists, the trip state has moved
            //     on and earlier choices are semantically stale.
            //   • Already selected → treat as non-interactive; no
            //     stale check needed (the choice already fired).
            // Re-checked at click time inside the card so a
            // never-refreshed page whose clock has drifted past the
            // threshold still blocks selection.
            const timestampMs = message.timestamp
                ? new Date(message.timestamp).getTime()
                : undefined
            const isLatest = _isLatestInteraction(
                message.interactionId ?? '',
                timestampMs,
                ctx.allInteractions,
            )
            const STALE_AFTER_MS = isLatest ? undefined : 5 * 60 * 1000
            const stale =
                !preselectedId &&
                STALE_AFTER_MS !== undefined &&
                timestampMs !== undefined &&
                Date.now() - timestampMs > STALE_AFTER_MS

            return {
                title: results.title,
                kind: results.kind,
                items,
                // The child Interaction's own id is the source for
                // selection correlation — matches what the streaming
                // path passes.
                interactionId: message.interactionId ?? '',
                allowTextReply: results.allow_text_reply ?? true,
                multiSelect: results.multi_select === true,
                interactive: !preselectedId,
                preselectedId,
                stale,
                staleAfter: STALE_AFTER_MS,
                timestamp: timestampMs,
                onSelect: (text: string, metadata: Record<string, unknown>) => {
                    // Route through sendPromptMessage with the
                    // selection envelope exactly like the streaming
                    // path does — keeps the backend's <selection>
                    // parsing contract consistent.
                    const envelope = `${text}<selection>${JSON.stringify(metadata)}</selection>`
                    ctx.sendPromptMessage(envelope, undefined, metadata as any)
                },
                // Collection-window chrome — present ONLY when the backend
                // stamped a collection (saved picks / experiences / vouchers)
                // onto this carousel via present_options' ``collection`` arg.
                // Count + See-all are backend-owned; the card then renders an
                // honest "Showing N of M" header + a "See all M" that fires the
                // same dispatch as the persona's custom_action chips. Absent for
                // a plain 2-3 pick-set (the card stays a normal carousel).
                totalCount: results.total_count,
                shownCount: results.shown_count,
                viewAll: results.view_all,
                collectionLabel: results.collection_label,
                onViewAll: (token: string) => dispatchCustomAction(token),
            }
        },
    },
}

// ── Lookup helper ───────────────────────────────────────────────────────────

export function getCardEntry(outputType: string): CardRegistryEntry | undefined {
    return CARD_REGISTRY[outputType]
}

/**
 * True when no later interaction exists in the thread — i.e. this
 * interaction IS the latest. Used by the ``present_options``
 * propsMapper to decide whether the carousel is still semantically
 * current: the latest turn's options are never stale, while options
 * from a superseded turn get a short 3-minute fuse before we refuse
 * the click.
 *
 * Falls back to ``false`` on missing / unparseable timestamps so a
 * bad interaction doc doesn't accidentally keep the card alive past
 * its window.
 */
function _isLatestInteraction(
    interactionId: string,
    timestampMs: number | undefined,
    allInteractions: any[],
): boolean {
    if (!interactionId || timestampMs === undefined) return false
    for (const i of allInteractions) {
        if (!i || i.id === interactionId) continue
        // The carousel is a CHILD Interaction created mid-turn; its PARENT
        // (the turn's reply record, whose output_data.interaction_ids lists
        // this child) is committed seconds AFTER the child, so without this
        // exclusion the parent always "supersedes" its own carousel and the
        // latest turn's choices expire after the 5-min fuse. A carousel is
        // only superseded by a genuinely NEWER turn, never by its own.
        const childIds = i.output_data?.interaction_ids
        if (Array.isArray(childIds) && childIds.map(String).includes(interactionId)) continue
        const raw = i.updated_at ?? i.created_at
        if (!raw) continue
        const other = new Date(raw).getTime()
        if (!Number.isFinite(other)) continue
        if (other > timestampMs) return false
    }
    return true
}
