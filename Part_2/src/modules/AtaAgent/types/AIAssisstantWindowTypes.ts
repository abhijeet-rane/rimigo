import type { AttachmentCoverage, AttachmentKind } from './Attachments'

export type MissingFields = {
    [key: string]: string | null
} | null

/** Polymorphic response-action envelope emitted by the concierge.
 *
 *  Two emission paths share this shape:
 *  1. **Post-hoc derived** — :mod:`trip.services.ata.concierge.response_actions`
 *     walks the trajectory and emits ``navigation`` CTAs after specific
 *     tool calls (``get_budget_details`` → budget tab,
 *     ``apply_patch`` → itinerary tab).
 *  2. **LLM-attached follow-up actions** — the agent calls the
 *     ``follow_up_actions`` tool to attach 2-3 tappable CTAs to its
 *     message (intent / reply / dismiss / navigation).
 *
 *  The two streams are merged on the BE at the FINISH boundary
 *  (``response_actions.merge_actions``); the FE renders them as a single
 *  list, dispatching by ``action`` discriminator. ``style`` is the
 *  visual hierarchy hint from the LLM-attached path; the post-hoc path
 *  doesn't set it (defaults to secondary). */
export type ResponseActionStyle = 'primary' | 'secondary'

export type NavigationAction = {
    action: 'navigation'
    cta: string
    style?: ResponseActionStyle
    action_data: { type?: 'navigation'; path: string }
}

/** Structured pick. ``intent`` is a verb-shaped name the orchestration
 *  layer routes on; ``value``/``context`` carry the payload. The chat
 *  sends ``cta`` as the visible user message + the full ``action_data``
 *  inside a ``<selection>...</selection>`` envelope so the BE's
 *  history_loader stitches it onto the next-turn user message. */
export type IntentAction = {
    action: 'intent'
    cta: string
    style?: ResponseActionStyle
    action_data: {
        type?: 'intent'
        intent: string
        value?: unknown
        context?: Record<string, unknown>
    }
}

/** Types-a-message-for-you. ``action_data.message`` appears as the
 *  traveler's visible next-turn input. */
export type ReplyAction = {
    action: 'reply'
    cta: string
    style?: ResponseActionStyle
    action_data: { type?: 'reply'; message: string }
}

/** Clean decline. No LLM call, no user bubble — the chip just hides.
 *  ``reason`` is analytics-only. */
export type DismissAction = {
    action: 'dismiss'
    cta: string
    style?: ResponseActionStyle
    action_data?: { type?: 'dismiss'; reason?: string }
}

/** Fires an in-app affordance in place (opens a modal/panel) without
 *  navigating away or posting back to the agent. ``action`` is a token
 *  the frontend dispatches on (e.g. ``open_invite``) — handled locally,
 *  no LLM round trip. */
export type CustomActionAction = {
    action: 'custom_action'
    cta: string
    style?: ResponseActionStyle
    action_data: { type?: 'custom_action'; action: string }
}

export type ResponseAction =
    | NavigationAction
    | IntentAction
    | ReplyAction
    | DismissAction
    | CustomActionAction

export type ChatMessage = {
    type: 'user' | 'assistant'
    content: string | React.ReactNode
    timestamp: Date
    isLoading?: boolean
    loadingStatus?: 'queued' | 'in_progress'

    // input required
    isInputRequired?: boolean

    // missing fields
    missingFields?: MissingFields | null
    feature_identifier?: string | null

    // TODO: Remove any
    inputStructure?: any

    elapsedMs?: number
    isError?: boolean
    errorMessage?: string
    errorType?: string
    suggestedActions?: string[]
    retryQuery?: string
    interactionId?: string
    /** Coverage cards for any attachments included in this turn
     *  (Tripboard AI Assistant). Rendered as ✓ Covered / ✗ Missing
     *  with one-tap follow-up chips. */
    attachmentCoverage?: AttachmentCoverage[]
    /** Echo of the attachment ids consumed by this turn. */
    attachmentIds?: string[]
    /** Lightweight per-attachment summary (kind, title, source_url,
     *  filename) that the BE stamps onto user-turn interactions when
     *  attachments were included. Used to render inline chips below
     *  the user message bubble — never the wall of structured context
     *  that gets prepended to user_text_input for the LLM. */
    attachmentsSummary?: Array<{
        attachment_id: string
        kind: AttachmentKind
        title?: string
        source_url?: string | null
        filename?: string | null
    }>
    loaderConfig?: any // UIConfig from OutputLoadingComponent
    results?:
        | any[]
        | {
              recommendation?: {
                  recommended_ticket_category: string
                  reasons_for_recommendation: string
                  bookingLinks: Array<{
                      platform: string
                      platformID: string
                      affiliate_link: string
                      cost_in_inr: string
                  }>
                  other_ticket_categories?: Array<{
                      category_name: string
                      key_highlights: string
                      bookingLinks: Array<{
                          platform: string
                          platformID: string
                          affiliate_link: string
                          cost_in_inr: string
                      }>
                  }>
              }
              tips?: Array<{ tip_text: string }>
              high_level_itinerary?: Array<{
                  itinerary_step: {
                      title: string
                      description: string
                      image_url: string
                  }
              }>
          }
        | {
              feature_identifier: string
              provided_data: Record<string, unknown> | null
          }
    outputType?: string
    /** True when the concierge applied a patch during this interaction.
     *  Drives the "View Changes" button: on click, navigate to
     *  ``/tripboard?tab=itinerary`` (or refresh if already there) so
     *  the traveler sees the updated itinerary. Set from the backend's
     *  ``output_data.itinerary_updated`` flag in ItineraryInteractionService. */
    itineraryUpdated?: boolean
    /** Response-time CTAs derived from tool calls in this turn. The
     *  concierge backend builds these in ``response_actions.derive_actions``
     *  after the agent finishes; the renderer shows one button per
     *  action below the assistant's text reply. Empty / undefined means
     *  no CTA. */
    actions?: ResponseAction[]
    /** The follow_up_actions chip the traveler previously picked on this
     *  assistant turn, stamped onto ``output_data.selected_follow_up``
     *  by ``_persist_follow_up_action_selection`` on the BE. Drives the
     *  chip strip's ``preselectedIdx`` so the picked chip renders in
     *  its ``selected`` state on revisit and peers go ``dimmed``.
     *  ``idx`` is the position in the ``actions[]`` envelope. */
    selectedFollowUp?: {
        idx: number
        cta?: string
        action_data?: Record<string, unknown>
        selected_at?: string
    }
    structuredData?: {
        text: string
        reasoning?: string
        urls?: string[] | null
        images?: string[] | null
        output_type: 'experience_chat_response' | 'hotel_chat_response' | 'faq_response'
        content: {
            paragraphs?: string[] | null
            bullet_lists?: Array<{ items: string[] }> | null
            numbered_lists?: Array<{ items: string[] }> | null
            sections?: Array<{
                header: string
                content: Array<
                    { type: 'paragraph'; text: string } | { type: 'bullet_list'; items: string[] } | { type: 'numbered_list'; items: string[] }
                >
            }> | null
        }
        experience?: {
            id: string
            identifier: string
            name: string
        }
        zentrum_hub_id?: string
        location_field?: {
            latitude: number
            longitude: number
            name?: string
        }
        locations?: Array<{
            name: string
            latitude: number
            longitude: number
        }>
    }
}
