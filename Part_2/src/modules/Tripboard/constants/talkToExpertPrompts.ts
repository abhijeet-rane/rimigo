/**
 * Per-surface preset prompts shown in the "Talk to expert" modal.
 * Keyed by the subscription_intent string we pass to /api/callback-leads/.
 * Fallback is DEFAULT_TALK_TO_EXPERT_PROMPTS.
 */
export const DEFAULT_TALK_TO_EXPERT_PROMPTS = [
    'I want to find discounted rates for hotels',
    'Can you help me find suitable activities?',
    'Need help planning my itinerary'
] as const

export const TALK_TO_EXPERT_PROMPTS_BY_INTENT: Record<string, readonly string[]> = {
    tripboard_callback: [
        'I have questions about my trip',
        'Help me finalise hotels and activities',
        'Get me exclusive deals'
    ],

    stay_callback: [
        'I need better rates on this hotel',
        'Are there similar stays with better value?',
        'Help me understand what\u2019s included'
    ],

    activity_callback: [
        'Help me book this activity',
        'Suggest similar experiences nearby',
        'Is this activity worth the cost?'
    ],

    destination_callback: [
        'Help me pick the right destination',
        'What\u2019s the best time to visit?',
        'I need help planning my itinerary'
    ],

    premium: DEFAULT_TALK_TO_EXPERT_PROMPTS
}

export const getTalkToExpertPrompts = (intent?: string): readonly string[] => {
    if (!intent) return DEFAULT_TALK_TO_EXPERT_PROMPTS
    return TALK_TO_EXPERT_PROMPTS_BY_INTENT[intent] ?? DEFAULT_TALK_TO_EXPERT_PROMPTS
}
