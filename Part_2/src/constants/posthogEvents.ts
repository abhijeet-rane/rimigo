/** PostHog buttonPage identifier for the deferred leadgen wizard (v2 flow) */
export const LEADGEN_V2_BUTTON_PAGE = 'lead_gen_v2'

/** PostHog buttonPage identifier for the tripboard flow (v1) */
export const TRIPBOARD_V1_BUTTON_PAGE = 'tripboard_v1'

/** PostHog buttonPage identifier for Talk-to-Expert surfaces in the Tripboard header */
export const TRIPBOARD_HEADER_BUTTON_PAGE = 'tripboard_header'

/** PostHog buttonName identifiers for Talk-to-Expert */
export const TALK_TO_EXPERT_BUTTON_NAMES = {
    OPEN: 'talk_to_expert_click',
    PROMPT_CLICK: 'callback_prompt_click',
    SUBMIT: 'callback_submit',
    CANCEL: 'callback_cancel'
} as const

/** PostHog event names for AI Expert attachments */
export const EXPERT_ATTACHMENT_EVENTS = {
    ADD_STARTED: 'expert_attachment_add_started',
    ADD_COMPLETED: 'expert_attachment_add_completed',
    ADD_FAILED: 'expert_attachment_add_failed',
    REMOVED: 'expert_attachment_removed'
} as const
