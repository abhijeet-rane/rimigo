/**
 * Shared utility to build the ATA API payload for itinerary generation.
 *
 * Extracted from Itenerary.tsx's handleGenerateItinerary + CreateItineraryWizard's handleSubmit
 * so the same logic can be reused in TripboardCreateFlow's unified creation pipeline.
 */

import type { WizardState } from '../components/CreateItineraryWizard/types'
import { BUDGET_MAP, STAY_BUDGET_RANGE_MAP } from '../components/CreateItineraryWizard/types'
import type { LoaderCity } from '../components/ItineraryGenerationLoader'
import type { ItineraryAgentRequest } from '../hooks/ItineraryHook'
import type { SearchDestinationCardData } from '@/lib/api/OnboardingApi'
import { formatDateToYMD } from '@/utils/dateUtils'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface BuildItineraryPayloadParams {
    wizardState: WizardState
    /** One or more destinations; first is used as the primary country for the ATA request */
    destinations: SearchDestinationCardData[]
    tripId: string
    agentId: string
}

export interface BuildItineraryPayloadResult {
    sendParams: { agentId: string; request: ItineraryAgentRequest }
    generationCities: LoaderCity[]
    generationTotalDays: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Convert WizardState date fields to concrete Date objects (handles flexible mode). */
function computeDates(state: WizardState): { startDate: Date; endDate: Date } | null {
    if (state.dateMode === 'exact' && state.startDate && state.endDate) {
        return {
            startDate: state.startDate instanceof Date ? state.startDate : new Date(state.startDate),
            endDate: state.endDate instanceof Date ? state.endDate : new Date(state.endDate)
        }
    }

    if (state.dateMode === 'flexible' && state.flexibleDuration) {
        let startDate: Date
        if (state.flexibleMonths.length > 0) {
            const sorted = [...state.flexibleMonths].sort()
            const [year, month] = sorted[0].split('-').map(Number)
            startDate = new Date(year, month - 1, 1)
        } else {
            startDate = new Date()
            startDate.setDate(startDate.getDate() + 30)
        }
        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + state.flexibleDuration - 1)
        return { startDate, endDate }
    }

    return null
}

/** Build the user_text_input / preferences string from WizardState. */
function buildPreferencesText(state: WizardState): string {
    const parts: string[] = []

    if (state.preferences.trim()) {
        parts.push(state.preferences.trim())
    } else {
        parts.push('Help me create itinerary')
    }

    if (state.travelStyles.length > 0) {
        parts.push(`Travel style preferences: ${state.travelStyles.join(', ')}.`)
    }

    if (state.aiRouteOptimize) {
        parts.push('Please optimize the route order between cities for minimal travel time.')
    }

    // Route/nights prompt based on per-city night preferences
    const citiesWithNights = state.cities.filter((c) => typeof c.nights === 'number')
    if (citiesWithNights.length === state.cities.length && state.cities.length > 0) {
        const routeStr = state.cities.map((c) => `${c.city.cityName} (${c.nights} nights)`).join(' \u2192 ')
        parts.push(`Follow this exact route strictly: ${routeStr}. Do not change the route order or night distribution.`)
    } else if (citiesWithNights.length > 0) {
        const prefs = citiesWithNights.map((c) => `${c.nights} nights in ${c.city.cityName}`).join(', ')
        parts.push(`User prefers ${prefs}. For the remaining cities, optimize the night distribution.`)
    }

    return parts.join(' ')
}

// ─── Main ───────────────────────────────────────────────────────────────────────

/**
 * Builds the full itinerary generation payload from wizard state.
 *
 * Combines the logic from:
 * - CreateItineraryWizard/index.tsx `handleSubmit` (date/budget/preferences computation)
 * - Itenerary.tsx `handleGenerateItinerary` (ATA payload construction)
 */
export function buildItineraryPayload(params: BuildItineraryPayloadParams): BuildItineraryPayloadResult | null {
    const { wizardState, destinations, tripId, agentId } = params
    const destination = destinations[0]

    // 1. Compute dates
    const dates = computeDates(wizardState)
    if (!dates) return null
    const { startDate, endDate } = dates

    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // 2. Compute budget
    const budgetPerPerson = wizardState.budgetTier ? BUDGET_MAP[wizardState.budgetTier] : 150000
    const totalBudget = budgetPerPerson * Math.max(1, wizardState.groupSetup.adults)

    // 3. Build preferences text
    const preferences = buildPreferencesText(wizardState)

    // 4. Build cities_to_cover
    const citiesToCover = wizardState.cities.map((c) => ({
        id: c.city.cityId,
        name: c.city.cityName || c.city.cityId,
        nights: c.nights ?? 'auto'
    }))

    // 5. Format locations
    const formatLocation = (airport: { city_name?: string; country_name?: string } | null): string => {
        if (!airport) return 'Bangalore, India'
        return `${airport.city_name}, ${airport.country_name}`
    }

    const startingPoint = formatLocation(wizardState.departureCity)
    const endPoint = formatLocation(wizardState.returnCity ?? wizardState.departureCity)

    // 6. Format dietary restrictions
    // Mirror the original two-step logic: first filter out 'None', then fall back to ['none'] if empty
    const filteredRestrictions = wizardState.dietaryRestrictions.filter((d) => d !== 'None')
    const dietaryRestrictions =
        filteredRestrictions.length > 0
            ? filteredRestrictions.map((d) => d.toLowerCase().replace(/\s+/g, '_'))
            : ['none']

    // 7. Build loader cities for ItineraryGenerationLoader
    // Don't filter by image — the loader's map API fallback (useCitiesByIdsForMap) provides thumbnails
    const generationCities: LoaderCity[] = wizardState.cities.map((c) => ({
        name: c.city.cityName || '',
        image: c.city.image || '',
        lat: c.geoLocation?.lat ?? 0,
        lng: c.geoLocation?.lng ?? 0,
        nights: typeof c.nights === 'number' ? c.nights : 0,
        id: c.city.cityId
    }))

    // 8. Build the final ATA request
    const request: ItineraryAgentRequest = {
        input_data: {
            cities_to_cover: citiesToCover,
            country_id: destination.id,
            country_name: destination.title || '',
            user_text_input: preferences,
            total_days: totalDays,
            group_setup: {
                adults: wizardState.groupSetup.adults,
                children: wizardState.groupSetup.children,
                infants: wizardState.groupSetup.infants
            },
            purpose: preferences,
            total_budget: totalBudget,
            starting_point: startingPoint,
            start_date: formatDateToYMD(startDate) ?? '',
            end_date: formatDateToYMD(endDate) ?? '',
            end_point: endPoint,
            dietary_restrictions: dietaryRestrictions,
            stay_budget_range: wizardState.budgetTier
                ? STAY_BUDGET_RANGE_MAP[wizardState.budgetTier]
                : { min: 3000, max: 8000 }
        },
        space: 'trip_itinerary',
        thread_id: null,
        trip_id: tripId,
        entity_id: tripId,
        entity_type: 'trip_id'
    }

    return {
        sendParams: { agentId, request },
        generationCities,
        generationTotalDays: totalDays
    }
}
