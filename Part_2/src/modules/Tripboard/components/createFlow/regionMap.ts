/**
 * Frontend fallback mapping from country name → region.
 *
 * Used when the backend's LocationResponse.region is missing/empty so the
 * createFlow's RegionalSection can still group countries under ASIA / EUROPE /
 * AMERICAS / OCEANIA / AFRICA instead of dumping everything into "Other".
 *
 * Keys are lowercased country names. Add entries as new countries appear.
 */
const REGION_BY_COUNTRY: Record<string, string> = {
    // Asia
    'japan': 'Asia',
    'thailand': 'Asia',
    'south korea': 'Asia',
    'china': 'Asia',
    'indonesia': 'Asia',
    'vietnam': 'Asia',
    'india': 'Asia',
    'singapore': 'Asia',
    'malaysia': 'Asia',
    'philippines': 'Asia',
    'cambodia': 'Asia',
    'laos': 'Asia',
    'sri lanka': 'Asia',
    'nepal': 'Asia',
    'bhutan': 'Asia',
    'maldives': 'Asia',
    'taiwan': 'Asia',
    'hong kong': 'Asia',
    'macau': 'Asia',

    // Europe
    'france': 'Europe',
    'italy': 'Europe',
    'spain': 'Europe',
    'portugal': 'Europe',
    'germany': 'Europe',
    'austria': 'Europe',
    'switzerland': 'Europe',
    'greece': 'Europe',
    'netherlands': 'Europe',
    'belgium': 'Europe',
    'united kingdom': 'Europe',
    'ireland': 'Europe',
    'iceland': 'Europe',
    'norway': 'Europe',
    'sweden': 'Europe',
    'denmark': 'Europe',
    'finland': 'Europe',
    'czech republic': 'Europe',
    'hungary': 'Europe',
    'croatia': 'Europe',
    'poland': 'Europe',
    'turkey': 'Europe',

    // Oceania
    'new zealand': 'Oceania',
    'australia': 'Oceania',
    'fiji': 'Oceania',

    // Americas
    'united states': 'Americas',
    'canada': 'Americas',
    'mexico': 'Americas',
    'brazil': 'Americas',
    'argentina': 'Americas',
    'peru': 'Americas',
    'chile': 'Americas',
    'colombia': 'Americas',

    // Africa
    'south africa': 'Africa',
    'egypt': 'Africa',
    'morocco': 'Africa',
    'kenya': 'Africa',
    'tanzania': 'Africa',

    // Middle East
    'uae': 'Middle East',
    'united arab emirates': 'Middle East',
    'jordan': 'Middle East',
    'israel': 'Middle East',
    'saudi arabia': 'Middle East',
    'qatar': 'Middle East',
}

export function regionFromCountryName(name: string | undefined): string | undefined {
    if (!name) return undefined
    return REGION_BY_COUNTRY[name.toLowerCase()]
}
