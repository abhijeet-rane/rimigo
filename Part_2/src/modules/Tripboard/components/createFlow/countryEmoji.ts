/**
 * Country-name → flag-emoji fallback. Used by the journey strip on the
 * cities-question frame when only a country_name string is available
 * (e.g., the departure city config doesn't carry a flag URL).
 *
 * Covers the popular departure cities + the common Where step destinations.
 * Unknown countries return undefined so the caller can fall back gracefully.
 */
const COUNTRY_EMOJI: Record<string, string> = {
    // Asia
    'india':       '🇮🇳',
    'japan':       '🇯🇵',
    'thailand':    '🇹🇭',
    'south korea': '🇰🇷',
    'china':       '🇨🇳',
    'indonesia':   '🇮🇩',
    'vietnam':     '🇻🇳',
    'singapore':   '🇸🇬',
    'malaysia':    '🇲🇾',
    'philippines': '🇵🇭',
    'cambodia':    '🇰🇭',
    'laos':        '🇱🇦',
    'sri lanka':   '🇱🇰',
    'nepal':       '🇳🇵',

    // Europe
    'france':         '🇫🇷',
    'italy':          '🇮🇹',
    'spain':          '🇪🇸',
    'portugal':       '🇵🇹',
    'germany':        '🇩🇪',
    'austria':        '🇦🇹',
    'switzerland':    '🇨🇭',
    'greece':         '🇬🇷',
    'netherlands':    '🇳🇱',
    'belgium':        '🇧🇪',
    'united kingdom': '🇬🇧',
    'ireland':        '🇮🇪',
    'iceland':        '🇮🇸',
    'norway':         '🇳🇴',
    'sweden':         '🇸🇪',
    'denmark':        '🇩🇰',
    'finland':        '🇫🇮',
    'czech republic': '🇨🇿',
    'hungary':        '🇭🇺',
    'croatia':        '🇭🇷',
    'poland':         '🇵🇱',
    'turkey':         '🇹🇷',

    // Oceania
    'new zealand': '🇳🇿',
    'australia':   '🇦🇺',

    // Americas
    'united states': '🇺🇸',
    'usa':           '🇺🇸',
    'canada':        '🇨🇦',
    'mexico':        '🇲🇽',
    'brazil':        '🇧🇷',
    'argentina':     '🇦🇷',
    'peru':          '🇵🇪',
    'chile':         '🇨🇱',

    // Africa
    'south africa': '🇿🇦',
    'egypt':        '🇪🇬',
    'morocco':      '🇲🇦',
    'kenya':        '🇰🇪',
    'tanzania':     '🇹🇿',

    // Middle East
    'uae':                  '🇦🇪',
    'united arab emirates': '🇦🇪',
    'jordan':               '🇯🇴',
    'israel':               '🇮🇱',
}

export function countryEmoji(name: string | undefined): string | undefined {
    if (!name) return undefined
    return COUNTRY_EMOJI[name.toLowerCase()]
}
