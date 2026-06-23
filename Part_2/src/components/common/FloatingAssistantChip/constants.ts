import type { VoiceUiState } from './types'

/** Human-readable label shown for each voice state in the voice box. */
export const VOICE_STATE_LABEL: Record<VoiceUiState, string> = {
    idle: '',
    connecting: 'Connecting…',
    listening: 'Listening…',
    thinking: 'Thinking…',
    speaking: 'Speaking…',
}

/** Itinerary / Tripboard context — day-level planning questions. */
export const SUGGESTIONS_ITINERARY = [
    'Suggest activities',
    'Change dates',
    'Edit cities',
]

/** Stays Explore (city-level hotel browsing). */
export const SUGGESTIONS_STAYS_EXPLORE = [
    'Cheapest reliable stays',
    'Hotels near metro station',
    'Stays under ₹20,000 a night',
    'Hotels with infinity pool',
    'Best riverside hotels',
    'Couple-friendly hotels',
    'Family-friendly stays',
    'Walk to the main station',
]

/** Stay Detail (single hotel — amenity & policy questions). */
export const SUGGESTIONS_STAY_DETAIL = [
    'Is parking available?',
    'Are pets allowed here?',
    'Vegetarian breakfast?',
    'What time is check-in?',
    'How far from the airport?',
    'Tell me about amenities',
    'Is it good for couples?',
    'Cheaper nearby options',
]

/** Activity / Experience Detail. */
export const SUGGESTIONS_ACTIVITY_DETAIL = [
    'Best tickets to buy',
    'What time should I go?',
    'How long does it take?',
    'Is it kid-friendly?',
    'Things to know before going',
    'Nearby food options',
    'Is it worth the price?',
    'Cheaper alternatives',
]

/** Fallback — used when no context matches. */
export const DEFAULT_SUGGESTIONS = SUGGESTIONS_ITINERARY

/**
 * Pick the right suggestion set for a given `AssistantType`. Callers pass the
 * return value through the `suggestions` prop on FloatingAssistantChip.
 */
export const getSuggestionsForAssistantType = (type?: string | null): string[] => {
    switch (type) {
        case 'ItineraryExpertChat':
            return SUGGESTIONS_ITINERARY
        case 'HotelSmartSearch':
            return SUGGESTIONS_STAYS_EXPLORE
        case 'HotelExpertChat':
            return SUGGESTIONS_STAY_DETAIL
        case 'ExperienceExpertChat':
        case 'BurjKhalifaExpertChat':
            return SUGGESTIONS_ACTIVITY_DETAIL
        default:
            return DEFAULT_SUGGESTIONS
    }
}

export const DEFAULT_PILL_PROMPTS = [
    'Can you add another day to my trip',
    'Best local food spots near my stay',
    'Plan a relaxing day 2 in my itinerary',
]

// ---------------------------------------------------------------------------
// Per-context heading strings (shown in the expanded card's top banner).
// ---------------------------------------------------------------------------

export const HEADING_ITINERARY = 'Edit your itinerary the way you want'
export const HEADING_STAYS_EXPLORE = 'Ask anything about stays here'
export const HEADING_STAY_DETAIL = 'Ask anything about this stay'
export const HEADING_ACTIVITY_DETAIL = 'Ask anything about this activity'

export const DEFAULT_HEADING = HEADING_ITINERARY

/**
 * CTA verb shown in the desktop pill ("Edit:" / "Ask:") and mobile placeholder.
 * Itinerary / Tripboard surfaces are editable → "Edit". Stay / activity detail
 * + stays explore are informational → "Ask".
 */
export const getCtaVerbForAssistantType = (type?: string | null): string => {
    switch (type) {
        case 'ItineraryExpertChat':
            return 'Edit'
        case 'HotelSmartSearch':
        case 'HotelExpertChat':
        case 'ExperienceExpertChat':
        case 'BurjKhalifaExpertChat':
            return 'Ask'
        default:
            return 'Edit'
    }
}

/** Mobile read-only input placeholder text per assistant type. */
export const getMobilePlaceholderForAssistantType = (type?: string | null): string => {
    switch (type) {
        case 'ItineraryExpertChat':
            return 'Edit anything in your itinerary'
        case 'HotelSmartSearch':
            return 'Ask anything about stays here'
        case 'HotelExpertChat':
            return 'Ask anything about this stay'
        case 'ExperienceExpertChat':
        case 'BurjKhalifaExpertChat':
            return 'Ask anything about this activity'
        default:
            return 'Edit anything in your itinerary'
    }
}

/** Pick the heading text that matches a given `AssistantType`. */
export const getHeadingForAssistantType = (type?: string | null): string => {
    switch (type) {
        case 'ItineraryExpertChat':
            return HEADING_ITINERARY
        case 'HotelSmartSearch':
            return HEADING_STAYS_EXPLORE
        case 'HotelExpertChat':
            return HEADING_STAY_DETAIL
        case 'ExperienceExpertChat':
        case 'BurjKhalifaExpertChat':
            return HEADING_ACTIVITY_DETAIL
        default:
            return DEFAULT_HEADING
    }
}

/** Gradient that uses the site's theme tokens so the assistant stays on-brand. */
export const PURPLE_GRADIENT =
    'linear-gradient(115deg, var(--color-primary-dark) 0%, var(--color-primary-default) 35%, var(--color-primary-light) 55%, var(--color-primary-default) 75%, var(--color-primary-dark) 100%)'

/**
 * Shadow values derived from the theme palette:
 *   --color-primary-dark     (#4d1d91 → 77,29,145)
 *   --color-primary-default  (#7011f6 → 112,17,246)
 */
export const SHADOW = {
    dark: 'rgba(77,29,145,0.45)',
    defaultSoft: 'rgba(112,17,246,0.3)',
    darkSoft: 'rgba(77,29,145,0.2)',
    darkMed: 'rgba(77,29,145,0.3)',
    darkHeavy: 'rgba(77,29,145,0.4)',
} as const

/** Gradient animation config — reused across every gradient surface. */
export const GRADIENT_ANIM = {
    animate: { backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] as [string, string, string] },
    transition: { duration: 6.5, repeat: Infinity, ease: 'linear' as const },
} as const

export const GRADIENT_STYLE = {
    background: PURPLE_GRADIENT,
    backgroundSize: '220% 220%',
} as const

/** Default timing for the chip's state machine. */
export const DEFAULT_AUTO_EXPAND_MS = 2500
export const DEFAULT_AUTO_COLLAPSE_MS = 4000
export const PILL_PROMPT_CYCLE_MS = 2600

/** Default ARIA label. */
export const DEFAULT_ARIA_LABEL = 'Open AI assistant'
