import { ActivitiesCityCardData } from '@/modules/Acitvities/adapters/activitiesCitiesAdapter'
import { Airport } from '@/api/flights/airportSearchAPI'

export interface GuestsData {
    adults: number
    children: number
    infants: number
    children_age: number[]
}

export interface CityRouteItem {
    city: ActivitiesCityCardData
    nights: number | 'auto' // default 'auto'; min 1, max 10 when set manually
    geoLocation?: { lat: number; lng: number } // resolved via Mapbox geocoding
}

export interface WizardState {
    // Step 1: Dates
    dateMode: 'exact' | 'flexible'
    startDate: Date | null
    endDate: Date | null
    flexibleDuration: 7 | 14 | 21 | null
    flexibleMonths: string[] // e.g. ['2026-03', '2026-04']

    // Step 2: Cities & Route
    departureCity: Airport | null
    returnCity: Airport | null // null = same as departure
    cities: CityRouteItem[]
    aiRouteOptimize: boolean

    // Step 3: Preferences
    preferences: string // purpose / describe your interests (free text + from floating prompts)
    groupSetup: GuestsData
    budgetTier: 'budget' | 'moderate' | 'premium' | null
    stayBudgetRange: { min: number; max: number } // per night stay budget range in INR
    travelStyles: string[]
    dietaryRestrictions: string[]
}

export interface StepProps {
    state: WizardState
    onChange: (partial: Partial<WizardState>) => void
    onNext: () => void
    onBack: () => void
    /** When true, the step should disable submit (e.g. while itinerary is being generated) */
    isSubmitting?: boolean
}

export const INITIAL_WIZARD_STATE: WizardState = {
    dateMode: 'exact',
    startDate: null,
    endDate: null,
    flexibleDuration: null,
    flexibleMonths: [],
    departureCity: null,
    returnCity: null,
    cities: [],
    aiRouteOptimize: true,
    preferences: '',
    groupSetup: { adults: 1, children: 0, infants: 0, children_age: [] },
    budgetTier: null,
    stayBudgetRange: { min: 7000, max: 15000 },
    travelStyles: [],
    dietaryRestrictions: []
}

export const BUDGET_MAP: Record<'budget' | 'moderate' | 'premium', number> = {
    budget: 50000,
    moderate: 150000,
    premium: 400000
}

/** Default nightly stay budget range per budget tier (INR) */
export const STAY_BUDGET_RANGE_MAP: Record<'budget' | 'moderate' | 'premium', { min: number; max: number }> = {
    budget: { min: 1000, max: 3000 },
    moderate: { min: 3000, max: 8000 },
    premium: { min: 8000, max: 25000 }
}

export const TRAVEL_STYLE_OPTIONS = ['Adventure', 'Cultural', 'Relaxation', 'Foodie', 'Nightlife', 'Family-friendly', 'Romantic', 'Photography']

export const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-free', 'None']

export type WizardSubmitData = {
    preferences: string
    cities: ActivitiesCityCardData[]
    startDate: Date
    endDate: Date
    budget: number
    stayBudgetRange: { min: number; max: number }
    groupSetup: GuestsData
    startLocation: Airport | null
    endLocation: Airport | null
    dietaryRestrictions: string[]
    cityGeoLocations?: { cityId: string; lat: number; lng: number; nights: number | 'auto' }[]
}
