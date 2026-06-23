/**
 * Pure function that converts backend interactions into ChatMessage objects.
 *
 * Extracted from AIAssistantWindow.getChatMessages() so it can be tested
 * independently and reused by other chat surfaces.
 *
 * Loading / error / queued / in_progress states are intentionally left out —
 * those require component-level context (activeTrip, features, loaderConfig).
 * The caller should handle them before delegating to this function.
 */
import type { ChatMessage, ResponseAction } from '@/modules/AtaAgent/types/AIAssisstantWindowTypes'
import type { CARD_REGISTRY } from './cardRegistry'

/**
 * Pull the response-action list off ``output_data.actions``.
 *
 * Backend emits a typed envelope (``{action, cta, action_data}``) per
 * tool that has a registered builder — see
 * :mod:`trip.services.ata.concierge.response_actions`. The shape is
 * already validated server-side, but old interactions written before
 * the field existed simply won't have it. Defensive narrowing here
 * keeps a malformed payload from breaking the chat render.
 */
const extractActions = (outputData: unknown): ResponseAction[] | undefined => {
    const raw = (outputData as { actions?: unknown } | null | undefined)?.actions
    if (!Array.isArray(raw) || raw.length === 0) return undefined
    return raw.filter(
        (a): a is ResponseAction =>
            typeof a === 'object' &&
            a !== null &&
            typeof (a as { action?: unknown }).action === 'string' &&
            typeof (a as { cta?: unknown }).cta === 'string' &&
            typeof (a as { action_data?: unknown }).action_data === 'object',
    )
}

/**
 * Pull the previously-picked chip metadata off ``output_data.selected_follow_up``.
 *
 * BE writer: ``_persist_follow_up_action_selection`` in
 * ``trip/services/ata/StreamingItineraryInteractionService.py`` stamps
 * this when the traveler taps a chip on a follow_up_actions row. On
 * revisit the FE renders the picked chip in its ``selected`` state via
 * ``preselectedIdx``; peers go ``dimmed``.
 *
 * Defensive narrowing: only accept the shape we actually consume. Old
 * interactions (pre-feature) simply won't have the field.
 */
const extractSelectedFollowUp = (
    outputData: unknown,
): { idx: number; cta?: string; action_data?: Record<string, unknown>; selected_at?: string } | undefined => {
    const raw = (outputData as { selected_follow_up?: unknown } | null | undefined)?.selected_follow_up
    if (typeof raw !== 'object' || raw === null) return undefined
    const idx = (raw as { idx?: unknown }).idx
    if (typeof idx !== 'number') return undefined
    const cta = (raw as { cta?: unknown }).cta
    const actionData = (raw as { action_data?: unknown }).action_data
    const selectedAt = (raw as { selected_at?: unknown }).selected_at
    return {
        idx,
        cta: typeof cta === 'string' ? cta : undefined,
        action_data:
            typeof actionData === 'object' && actionData !== null
                ? (actionData as Record<string, unknown>)
                : undefined,
        selected_at: typeof selectedAt === 'string' ? selectedAt : undefined,
    }
}

/**
 * Tripboard AI Assistant: the BE prepends a structured `[Attached
 * context]…[/Attached context]` block to ``user_text_input`` so the
 * LLM sees the extracted insights. New interactions also persist a
 * clean ``display_user_text``; for older interactions written before
 * that change we strip the block on the FE so the user bubble shows
 * just their typed message.
 */
const ATTACHED_CONTEXT_RE = /^\[Attached context[\s\S]*?\[\/Attached context\]\s*\n*/

const stripAttachmentContextPrefix = (text: string): string => {
    if (!text || typeof text !== 'string') return text
    if (!text.startsWith('[Attached context')) return text
    return text.replace(ATTACHED_CONTEXT_RE, '').trim()
}

const pickUserDisplayText = (interaction: any): string => {
    const display = interaction?.input_data?.display_user_text
    if (typeof display === 'string' && display.trim()) return display
    const raw =
        interaction?.input_data?.user_text_input ||
        interaction?.input_data?.question ||
        ''
    return stripAttachmentContextPrefix(raw)
}

// ── Default fallback text per output_type ───────────────────────────────────

const DEFAULT_RESPONSE_TEXT: Record<string, string> = {
    alternatives: 'Here are some alternatives.',
    discovery: 'Here are nearby places.',
    navigation: 'Navigation result.',
    cost_estimate: 'Cost estimate.',
    explanation: 'Here is the explanation.',
    date_shift: 'Dates have been shifted.',
    trip_meta_update: 'Trip settings updated.',
    travel_info: 'Travel information.',
    transport_logistics: 'Transport information.',
    flight_search_results: 'Here are some flight options.',
    dynamic_form: 'Please fill in the form.',
    hotel_search_results: 'Here are some hotel options.',
    clarification: 'I need a bit more information.',
    error_with_guidance: 'Something went wrong. Here are some suggestions.',
    route_change_plan: 'Here is the route change plan.',
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Build ChatMessage[] from completed interactions.
 *
 * @param interactions  The full list of interactions (liveInteractions).
 * @param registry      The CARD_REGISTRY map so we know which output_types exist.
 * @param sessionMessages  Extra messages from the current chat session (appended at the end).
 * @returns Sorted array of ChatMessage.
 */
export function buildChatMessages(
    interactions: any[],
    registry: typeof CARD_REGISTRY,
    sessionMessages: ChatMessage[] = [],
): ChatMessage[] {
    const messages: ChatMessage[] = []

    // ── Pre-compute which failed interactions to hide ────────────────────
    // If a failed interaction is followed by another interaction with the
    // same user text (i.e. backend retried/delegated), skip the failed one
    // entirely — only show the final result.
    const hiddenInteractionIds = new Set<string>()
    for (let i = 0; i < interactions.length; i++) {
        const curr = interactions[i]
        if (curr.output_status !== 'failed') continue

        const currText = pickUserDisplayText(curr).trim().toLowerCase()
        if (!currText) continue

        for (let j = i + 1; j < interactions.length; j++) {
            const next = interactions[j]
            const nextText = pickUserDisplayText(next).trim().toLowerCase()
            if (nextText === currText) {
                hiddenInteractionIds.add(curr.id)
                break
            }
            if (nextText && nextText !== currText) break
        }
    }

    // ── Walk interactions ────────────────────────────────────────────────
    let lastUserText = ''

    interactions.forEach((interaction) => {
        if (hiddenInteractionIds.has(interaction.id)) return

        const outputStatus = interaction.output_status

        // Skip completed interactions without output_type
        if (outputStatus === 'completed' && !interaction.output_data?.output_type) {
            return
        }

        // ── User message ────────────────────────────────────────────────
        const isItineraryOutput = interaction.output_data?.output_type === 'itinerary'
        const rawUserText = isItineraryOutput
            ? 'Help me create my itinerary'
            : pickUserDisplayText(interaction)

        // Concierge rebuild: structured intent metadata is wrapped into a
        // <selection>...</selection> envelope appended to user_text_input.
        // Strip the envelope before showing the message in the chat
        // transcript so the user sees only the natural-language portion.
        const userText =
            typeof rawUserText === 'string'
                ? rawUserText.replace(/\n?<selection>[\s\S]*?<\/selection>\s*$/, '').trim()
                : rawUserText

        // Tripboard AI Assistant: surface a lightweight chip strip below
        // the user bubble for any attachments that were folded into this
        // turn. The BE persists ``attachments_summary`` per interaction.
        const attachmentsSummary = Array.isArray(
            interaction.input_data?.attachments_summary,
        )
            ? interaction.input_data.attachments_summary
            : undefined

        const normalizedText = typeof userText === 'string' ? userText.trim().toLowerCase() : ''
        // Every interaction is its own turn — show its prompt even if
        // repeated ("hello" → "hello"). Only collapse the synthetic
        // "Help me create my itinerary" label, which the itinerary
        // pipeline emits across several interactions for one action.
        const isSyntheticRepeat = isItineraryOutput && normalizedText === lastUserText
        if (userText && !isSyntheticRepeat) {
            messages.push({
                type: 'user',
                content: userText,
                timestamp: new Date(interaction.created_at),
                interactionId: interaction.id,
                attachmentsSummary,
            })
        }
        lastUserText = normalizedText

        // ── Loading / Error states — skip, let the caller handle ────────
        if (outputStatus === 'queued' || outputStatus === 'in_progress' || outputStatus === 'failed') {
            return
        }

        // ── Completed: map output_type → ChatMessage ────────────────────
        const outputType = interaction.output_data?.output_type as string | undefined
        const outputData = interaction.output_data

        if (!outputType) return

        // ── Special cases that have unique mapping logic ────────────────

        if (
            outputType === 'experience_chat_response' ||
            outputType === 'hotel_chat_response' ||
            outputType === 'faq_response'
        ) {
            messages.push({
                type: 'assistant',
                content: outputData.text || outputData.response || 'Response received',
                timestamp: new Date(interaction.updated_at),
                interactionId: interaction.id,
                outputType: outputData.output_type,
                structuredData: {
                    text: outputData.text || outputData.response || '',
                    reasoning: outputData.reasoning,
                    urls: outputData.urls || null,
                    images: outputData.images || null,
                    output_type: outputData.output_type as 'experience_chat_response' | 'hotel_chat_response',
                    content: outputData.content || {
                        paragraphs: null,
                        bullet_lists: null,
                        numbered_lists: null,
                        sections: null,
                    },
                    experience: outputData.experience,
                    zentrum_hub_id: outputData.zentrum_hub_id,
                    location_field: outputData.location_field,
                    locations: outputData.locations,
                },
            })
            return
        }

        if (outputType === 'update') {
            messages.push({
                type: 'assistant',
                content: outputData?.response || 'Your itinerary has been updated.',
                timestamp: new Date(interaction.updated_at),
                interactionId: interaction.id,
                outputType: 'update',
                results: {
                    response: outputData?.response,
                    understood: outputData?.understood,
                    changes: outputData?.changes,
                    itinerary_id: outputData?.itinerary_id,
                } as any,
            })
            return
        }

        if (outputType === 'missing_fields') {
            messages.push({
                type: 'assistant',
                content: 'I need a bit more information to finish this recommendation.',
                timestamp: new Date(interaction.updated_at),
                interactionId: interaction.id,
                results: {
                    feature_identifier: outputData?.feature_identifier || null,
                    provided_data: outputData?.provided_data || null,
                },
                outputType: 'missing_fields',
                missingFields: outputData?.provided_data || null,
                feature_identifier: outputData?.feature_identifier || null,
            })
            return
        }

        if (outputType === 'category_recommendation') {
            const result = outputData
            messages.push({
                type: 'assistant',
                content: "Here's your personalized recommendation",
                timestamp: new Date(interaction.updated_at),
                interactionId: interaction.id,
                results: {
                    recommendation: result.recommendation,
                    tips: result.tips,
                    high_level_itinerary: result.high_level_itinerary,
                },
                outputType: 'category_recommendation',
            })
            return
        }

        if (outputType === 'itinerary') {
            const executiveSummary =
                outputData?.response?.executive_summary ||
                outputData?.executive_summary ||
                'Your itinerary has been created successfully.'
            messages.push({
                type: 'assistant',
                content: executiveSummary,
                timestamp: new Date(interaction.updated_at),
                interactionId: interaction.id,
                outputType: 'itinerary',
                results: outputData?.response || outputData,
            })
            return
        }

        // ── Registry-based: output_types that follow the standard pattern ──
        // { response, ...data } → ChatMessage with outputType + results
        if (registry[outputType]) {
            messages.push({
                type: 'assistant',
                content: outputData?.response || DEFAULT_RESPONSE_TEXT[outputType] || 'Response received.',
                timestamp: new Date(interaction.updated_at),
                interactionId: interaction.id,
                outputType,
                results: outputData as any,
            })
            return
        }

        // ── Legacy fallbacks (not in registry) ──────────────────────────

        if (outputData?.results && outputData.results.length > 0) {
            const resultCount = outputData.results.length
            messages.push({
                type: 'assistant',
                content: `Found ${resultCount} perfect matches`,
                timestamp: new Date(interaction.updated_at),
                interactionId: interaction.id,
                results: outputData.results,
                outputType: outputData.output_type,
            })
            return
        }

        if (outputData?.result?.response?.faq_response) {
            messages.push({
                type: 'assistant',
                content: outputData.result.response.faq_response,
                timestamp: new Date(interaction.updated_at),
                interactionId: interaction.id,
            })
            return
        }

        if (outputData?.response && outputData?.output_type) {
            messages.push({
                type: 'assistant',
                content: outputData.response,
                timestamp: new Date(interaction.updated_at),
                interactionId: interaction.id,
                outputType: outputData.output_type,
                // Surface the backend's ``itinerary_updated`` signal so the
                // chat renderer can attach a "View Changes" button to this
                // message. Defaults to false when missing (old interactions
                // won't have the flag).
                itineraryUpdated: Boolean((outputData as { itinerary_updated?: boolean }).itinerary_updated),
                // Response-action CTAs derived by the concierge after tool
                // calls (e.g. ``get_budget_details`` → navigation to budget
                // tab). Renderer dispatches on ``action`` to pick the UI.
                actions: extractActions(outputData),
                selectedFollowUp: extractSelectedFollowUp(outputData),
            })
        }
    })

    // Session user messages are optimistic echoes. Once the persisted
    // copy loads they'd render twice for a split second. Drop a session
    // echo when a persisted user message with the same text exists within
    // 2 min (the in-flight turn); the time window stops an old repeated
    // prompt being swallowed before its own persisted copy arrives.
    const DUP_WINDOW_MS = 120_000
    const persistedUserStamps = messages
        .filter((m) => m.type === 'user')
        .map((m) => ({
            text: typeof m.content === 'string' ? m.content.trim().toLowerCase() : '',
            time: m.timestamp.getTime(),
        }))
    const dedupedSession = sessionMessages.filter((m) => {
        if (m.type !== 'user') return true
        const text = typeof m.content === 'string' ? m.content.trim().toLowerCase() : ''
        if (!text) return true
        const t = m.timestamp.getTime()
        const hasPersistedTwin = persistedUserStamps.some(
            (p) => p.text === text && Math.abs(p.time - t) <= DUP_WINDOW_MS,
        )
        return !hasPersistedTwin
    })
    messages.push(...dedupedSession)
    return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}
