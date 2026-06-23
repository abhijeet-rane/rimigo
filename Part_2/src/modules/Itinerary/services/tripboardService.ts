/**
 * Automated Tripboard Creation Service
 *
 * Orchestrates creating a full tripboard (content collection) from a generated itinerary.
 * Steps: create collection → link to trip → add experiences → add stays → add food → add fixed sections → clone to traveler.
 */

import { contentCollectionApi } from '@/modules/ContentCollection/api/contentCollectionApi'
import {
    ENTITY_TYPE_DOS_DONTs,
    ENTITY_TYPE_ITINERARY,
    ENTITY_TYPE_LINKS,
    ENTITY_TYPE_RESTAURANT,
    ENTITY_TYPE_TIPS,
    ENTITY_TYPE_VISA
} from '@/modules/ContentCollection/lib/collectionConfig'
import { getAccommodations } from '@/pages/Stays/Apis/accommodationsAPI'
import { fetchRatesHistogram } from '@/pages/Stays/Services/RatesHistogram'
import type { IItineraryCompletedResponse } from '../hooks/ItineraryHook'
import { FIXED_LINKS, FIXED_TIPS, FIXED_DOS_DONTS, getVisaSection } from './tripboardConstants'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TripboardCreationParams {
    itineraryId: string
    tripId: string
    travelerId: string
    tripName: string
    countryIds: string[]
    countryName: string
    itineraryData: IItineraryCompletedResponse
    wizardData: {
        startDate: string // YYYY-MM-DD
        endDate: string // YYYY-MM-DD
        groupSetup: { adults: number; children: number; infants: number }
        stayBudgetRange: { min: number; max: number }
        dietaryRestrictions: string[]
    }
}

interface CityDateRange {
    id: string
    name: string
    checkIn: string // YYYY-MM-DD
    checkOut: string // YYYY-MM-DD
}

interface MealSlot {
    name: string
    cityId: string
    cityName: string
}

interface ExperienceSlot {
    entityId: string
    name: string
    cityId: string
    cityName: string
    landscapeImage?: string
    date?: string // YYYY-MM-DD from itinerary day
    location?: { latitude: number; longitude: number; address?: string }
}

// ─── Progress Callback Types ─────────────────────────────────────────────────

export type TripboardStepId =
    | 'create_collection'
    | 'set_context'
    | 'add_experiences'
    | 'add_stays'
    | 'add_restaurants'
    | 'add_fixed_sections'
    | 'create_overview'
    | 'clone_to_traveler'

export type TripboardStepStatus = 'pending' | 'active' | 'completed' | 'error'

export interface TripboardStep {
    id: TripboardStepId
    label: string
    description?: string
    status: TripboardStepStatus
}

export type OnProgressCallback = (steps: TripboardStep[]) => void

/** Default step definitions in display order */
export const TRIPBOARD_STEPS: TripboardStep[] = [
    {
        id: 'create_collection',
        label: 'Creating your tripboard',
        description: 'Setting up a new collection for your trip...',
        status: 'pending'
    },
    {
        id: 'set_context',
        label: 'Linking trip details',
        description: 'Connecting your itinerary and destinations...',
        status: 'pending'
    },
    {
        id: 'add_experiences',
        label: 'Adding experiences',
        description: 'Curating activities from your itinerary...',
        status: 'pending'
    },
    {
        id: 'add_stays',
        label: 'Finding the best hotels',
        description: 'This takes up to 30 seconds — we\'re searching across providers for your dates and budget...',
        status: 'pending'
    },
    {
        id: 'add_restaurants',
        label: 'Picking restaurants',
        description: 'Matching dining spots along your route...',
        status: 'pending'
    },
    {
        id: 'add_fixed_sections',
        label: 'Adding travel essentials',
        description: 'Visa info, tips, dos & don\'ts...',
        status: 'pending'
    },
    {
        id: 'create_overview',
        label: 'Building trip overview',
        description: 'Summarizing your trip highlights...',
        status: 'pending'
    },
    {
        id: 'clone_to_traveler',
        label: 'Finalizing your tripboard',
        description: 'Almost done! Saving to your collection...',
        status: 'pending'
    }
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalize an ISO date string (e.g. "2026-04-05T00:00:00Z") to YYYY-MM-DD.
 */
function toDateOnly(dateStr: string): string {
    if (!dateStr) return dateStr
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
    // Has time portion — strip it
    return dateStr.split('T')[0]
}

/**
 * Extract unique cities with their check-in/check-out date ranges from itinerary days.
 *
 * Hotel check-out is the morning AFTER the last night.  If a city spans days
 * Apr 5, 6, 7 the traveler sleeps nights 5→6, 6→7, 7→8 so check-out = Apr 8.
 * We track the last day here, then add one day at the end.
 */
function extractCitiesFromItinerary(days: NonNullable<IItineraryCompletedResponse['days']>): CityDateRange[] {
    const cityMap = new Map<string, { id: string; name: string; firstDay: string; lastDay: string }>()

    for (const day of days) {
        const city = day.base_city
        if (!city?.id) continue

        const dateOnly = toDateOnly(day.date)

        if (!cityMap.has(city.id)) {
            cityMap.set(city.id, {
                id: city.id,
                name: city.name,
                firstDay: dateOnly,
                lastDay: dateOnly
            })
        } else {
            const existing = cityMap.get(city.id)!
            if (dateOnly > existing.lastDay) existing.lastDay = dateOnly
            if (dateOnly < existing.firstDay) existing.firstDay = dateOnly
        }
    }

    // Convert to CityDateRange — checkOut is the day after the last night
    return Array.from(cityMap.values()).map((city) => {
        const lastDate = new Date(city.lastDay + 'T00:00:00')
        lastDate.setDate(lastDate.getDate() + 1)
        const checkOut = lastDate.toISOString().split('T')[0]

        return {
            id: city.id,
            name: city.name,
            checkIn: city.firstDay,
            checkOut
        }
    })
}

/**
 * Extract unique experience entity IDs from itinerary slots, grouped by city.
 */
function extractExperiencesFromItinerary(days: NonNullable<IItineraryCompletedResponse['days']>): ExperienceSlot[] {
    const experiences: ExperienceSlot[] = []
    const seenIds = new Set<string>()

    for (const day of days) {
        for (const slot of day.slots || []) {
            if (slot.kind === 'experience' && slot.entity_id && !seenIds.has(slot.entity_id)) {
                seenIds.add(slot.entity_id)
                const loc = slot.location || slot.slot_data?.location
                const lat = loc?.latitude
                const lng = loc?.longitude
                experiences.push({
                    entityId: slot.entity_id,
                    name: slot.title || slot.slot_data?.name || 'Experience',
                    cityId: day.base_city?.id || '',
                    cityName: day.base_city?.name || '',
                    landscapeImage: slot.slot_data?.display_props?.landscape_image || slot.attachments?.[0]?.url || '',
                    date: toDateOnly(day.date),
                    ...(lat != null && lng != null ? { location: { latitude: lat, longitude: lng, address: (loc as { address?: string })?.address } } : {})
                })
            }
        }
    }

    return experiences
}

/**
 * Extract unique restaurant/meal names from itinerary slots, grouped by city.
 */
function extractMealsFromItinerary(days: NonNullable<IItineraryCompletedResponse['days']>): MealSlot[] {
    const meals: MealSlot[] = []
    const seenNames = new Set<string>()

    for (const day of days) {
        for (const slot of day.slots || []) {
            if (slot.kind === 'meal' || slot.kind === 'restaurant') {
                const name = slot.title || slot.slot_data?.name
                if (name && !seenNames.has(name.toLowerCase())) {
                    seenNames.add(name.toLowerCase())
                    meals.push({
                        name,
                        cityId: day.base_city?.id || '',
                        cityName: day.base_city?.name || ''
                    })
                }
            }
        }
    }

    return meals
}

/**
 * Derive group type string from group setup numbers.
 */
/**
 * Map wizard group setup to the stays API group_type values.
 * Valid values: solo_traveler, couple, family_with_kids, friends_group, family_group
 */
function deriveGroupType(groupSetup: { adults: number; children: number; infants: number }): string {
    const { adults, children, infants } = groupSetup
    if (children > 0 || infants > 0) return 'family_with_kids'
    if (adults === 1) return 'solo_traveler'
    if (adults === 2) return 'couple'
    return 'friends_group'
}

/**
 * Derive default city preferences based on group type.
 */
function deriveCityPreferences(groupType: string): string[] {
    const base = ['city_center', 'station_nearby']
    if (groupType === 'couple') return [...base, 'nightlife', 'great_view']
    if (groupType === 'family_with_kids') return [...base, 'restaurant_nearby', 'supermarkets_nearby']
    if (groupType === 'friends_group') return [...base, 'nightlife']
    return base // solo_traveler
}

/**
 * Generate section order in same range as AddSectionModal (1–1000).
 */
function generateSectionOrder(): number {
    return Math.floor(Math.random() * 1000) + 1
}

// ─── Section Populators ───────────────────────────────────────────────────────

/**
 * Search for handpicked stays in each city and add them to the collection.
 *
 * The backend needs a "warm-up" request (rates histogram) before accommodation
 * data is available.  The stays page does this too — it polls the histogram
 * endpoint until `status === 'completed'` and only then fetches listings.
 *
 * Flow per city:
 *   1. Fire rates_histogram (polls up to ~40 s until backend is ready)
 *   2. Fetch handpicked accommodations
 *   3. Add each stay as a section in the collection
 *
 * Returns count of stays added.
 */
async function populateStays(
    identifier: string,
    cities: CityDateRange[],
    wizardData: TripboardCreationParams['wizardData']
): Promise<number> {
    const groupType = deriveGroupType(wizardData.groupSetup)
    const cityPreferences = deriveCityPreferences(groupType)
    const { adults, children, infants } = wizardData.groupSetup
    let addedCount = 0

    // Step A: Warm up all cities in parallel (each city polls independently)
    const warmupResults = await Promise.allSettled(
        cities.map((city) =>
            fetchRatesHistogram({
                cityId: city.id,
                check_in: city.checkIn,
                check_out: city.checkOut,
                num_adults: adults,
                child_ages: children > 0 ? Array(children).fill(8) : [],
                num_infants: infants
            })
        )
    )

    warmupResults.forEach(() => {})

    // Step B: Fetch accommodations & add to collection (sequentially per city to maintain order)
    for (const city of cities) {
        try {
            const response = await getAccommodations({
                cityId: city.id,
                check_in_date: city.checkIn,
                check_out_date: city.checkOut,
                travel_purpose: 'leisure_relaxation',
                group_type: groupType,
                city_preferences: cityPreferences,
                budget_range: wizardData.stayBudgetRange,
                min_match_score: 7, // Handpicked threshold
                limit: 6,
                page: 1,
                order_by: { relevance: -1 },
                include_hot_picks: true
            })

            const stays = response?.data?.data || []

            // Add each stay as a section (sequentially to maintain order)
            for (let i = 0; i < stays.length; i++) {
                const stay = stays[i]
                try {
                    await contentCollectionApi.addStayToCollection(
                        identifier,
                        stay.zentrum_hub_id,
                        stay.name,
                        undefined,
                        generateSectionOrder(),
                        {
                            banner_img: stay.content?.[0] || '',
                            location_tag: stay.curated_labels?.[0]?.label || '',
                            city_id: city.id,
                            city_name: city.name,
                            category: stay.category || undefined,
                            start_date: city.checkIn,
                            end_date: city.checkOut
                        }
                    )
                    addedCount++
                } catch {
                    // Skip this stay, continue with others
                }
            }
        } catch {
            // Skip this city, continue with others
        }
    }
    return addedCount
}

/**
 * Add experiences from itinerary slots to the collection.
 * Iterates sequentially to preserve itinerary ordering, with per-item
 * error handling so a single failure doesn't block the rest.
 * Returns count of experiences successfully added.
 */
async function populateExperiences(identifier: string, experienceSlots: ExperienceSlot[]): Promise<number> {
    let addedCount = 0

    for (const exp of experienceSlots) {
        try {
            await contentCollectionApi.addExperienceToCollection(
                identifier,
                exp.entityId,
                exp.name,
                undefined,
                generateSectionOrder(),
                {
                    display_props: exp.landscapeImage ? { landscape_image: exp.landscapeImage } : undefined,
                    city_id: exp.cityId || undefined,
                    city_name: exp.cityName || undefined,
                    start_date: exp.date || undefined,
                    ...(exp.location ? { location: { latitude: exp.location.latitude, longitude: exp.location.longitude, address: exp.location.address } } : {})
                }
            )
            addedCount++
        } catch {
            // Skip this experience, continue with others
        }
    }
    return addedCount
}

/**
 * Match restaurant names from meal slots to Google Places and add them to the collection.
 * Returns count of restaurants added.
 */
async function populateRestaurants(identifier: string, mealSlots: MealSlot[]): Promise<number> {
    let addedCount = 0

    for (const meal of mealSlots) {
        try {
            const place = await contentCollectionApi.getPlacePreview(meal.name, meal.cityName)
            // Use lat/lng from backend getPlacePreview API
            const lat = place.latitude
            const lng = place.longitude

            const linksValue: Record<string, unknown> = {
                maps_url: place.google_maps_url || '',
                photo_url: place.preview_url || '',
                address: meal.cityName
            }
            if (lat != null && lng != null && !(lat === 0 && lng === 0)) {
                linksValue.latitude = lat
                linksValue.longitude = lng
            }

            // Payload shape matches AddFoodItemModal: id, section_type, title, description, sections_order, entity_type, blocks, metadata (including location)
            const restaurantPayload: {
                id: string
                section_type: string
                title: string
                description: null
                sections_order: number
                entity_type: string
                blocks: unknown[]
                metadata?: Record<string, unknown>
            } = {
                id: crypto.randomUUID(),
                section_type: 'restaurant',
                title: place.official_name || meal.name,
                description: null,
                sections_order: generateSectionOrder(),
                entity_type: ENTITY_TYPE_RESTAURANT,
                blocks: [{ block_type: 'links', value: linksValue }]
            }
            restaurantPayload.metadata = {
                city_id: meal.cityId,
                city_name: meal.cityName,
                ...(place.preview_url ? { photo_url: place.preview_url } : {}),
                ...(lat != null && lng != null && !(lat === 0 && lng === 0)
                    ? {
                          location: {
                              latitude: lat,
                              longitude: lng,
                              address: (linksValue.address as string) || undefined
                          }
                      }
                    : {})
            }
            await contentCollectionApi.addSection(identifier, restaurantPayload)
            addedCount++
        } catch {
            // Skip if place not found — non-blocking
        }
    }
    return addedCount
}

/**
 * Add fixed sections: links, visa, tips, dos & don'ts.
 * Returns count of sections added.
 */
async function populateFixedSections(identifier: string, countryName: string): Promise<number> {
    let addedCount = 0

    // ── Links (payload shape matches AddLinkModal) ──
    for (const link of FIXED_LINKS) {
        try {
            const linksPayload = {
                id: crypto.randomUUID(),
                section_type: 'links',
                title: link.title,
                description: link.description ?? null,
                sections_order: generateSectionOrder(),
                entity_type: ENTITY_TYPE_LINKS,
                blocks: [
                    {
                        block_type: 'links',
                        label: link.label,
                        description: link.description ?? null,
                        value: {
                            text: link.description ?? null,
                            items: [{ url: link.url, platform: null }]
                        }
                    }
                ]
            }
            await contentCollectionApi.addSection(identifier, linksPayload)
            addedCount++
        } catch {
            // Skip this link section
        }
    }

    // ── Visa (payload shape matches AddLinkModal) ──
    try {
        const visa = getVisaSection(countryName)
        const visaPayload = {
            id: crypto.randomUUID(),
            section_type: 'visa',
            title: visa.title,
            description: visa.description ?? null,
            sections_order: generateSectionOrder(),
            entity_type: ENTITY_TYPE_VISA,
            blocks: [
                {
                    block_type: 'links',
                    label: visa.label,
                    description: visa.description ?? null,
                    value: {
                        text: visa.description ?? null,
                        items: [{ url: visa.url, platform: null }]
                    }
                }
            ]
        }
        await contentCollectionApi.addSection(identifier, visaPayload)
        addedCount++
    } catch {
        // Skip visa section
    }

    // ── Tips (payload shape matches TipsTabContent) ──
    for (const tip of FIXED_TIPS) {
        try {
            const tipsPayload = {
                id: crypto.randomUUID(),
                section_type: 'tips',
                title: 'Tips',
                description: null as string | null,
                sections_order: generateSectionOrder(),
                entity_type: ENTITY_TYPE_TIPS,
                blocks: [
                    {
                        block_type: 'text',
                        label: tip.label,
                        description: null as string | null,
                        value: { text: tip.text }
                    }
                ]
            }
            await contentCollectionApi.addSection(identifier, tipsPayload)
            addedCount++
        } catch {
            // Skip this tip
        }
    }

    // ── Dos & Don'ts (payload shape matches AddSectionModal) ──
    try {
        const dosDontsPayload = {
            id: crypto.randomUUID(),
            section_type: 'dos_donts',
            title: "Travel Dos & Don'ts",
            description: null as string | null,
            sections_order: generateSectionOrder(),
            entity_type: ENTITY_TYPE_DOS_DONTs,
            blocks: [
                { block_type: 'text_list', label: 'DOs', value: { items: FIXED_DOS_DONTS.dos } },
                { block_type: 'text_list', label: "DON'Ts", value: { items: FIXED_DOS_DONTS.donts } }
            ]
        }
        await contentCollectionApi.addSection(identifier, dosDontsPayload)
        addedCount++
    } catch (err) {
        toast.error(`Failed to add dos/donts section: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }

    return addedCount
}

/**
 * Create the overview metadata record for the collection.
 *
 * This enables the "Overview" tab in the collection view. The metadata
 * contains: trip route (cities + nights), highlight counts, and seasonal info
 * derived from the itinerary and wizard data.
 */
async function populateOverviewMetadata(
    identifier: string,
    cities: CityDateRange[],
    experienceSlots: ExperienceSlot[],
    stayCount: number,
    restaurantCount: number,
    countryCount: number,
    wizardData: TripboardCreationParams['wizardData']
): Promise<void> {
    const experienceCount = experienceSlots.length

    // Build landscape_images from top 8 experience images
    const landscapeImages: Array<{ id: string; url: string }> = experienceSlots
        .filter((exp) => exp.landscapeImage)
        .slice(0, 8)
        .map((exp) => ({
            id: exp.entityId,
            url: exp.landscapeImage!
        }))

    // Build trip_route from cities with calculated nights per city
    const tripRoute = cities.map((city) => {
        const checkIn = new Date(city.checkIn)
        const checkOut = new Date(city.checkOut)
        const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
        return {
            id: city.id,
            name: city.name,
            nights
        }
    })

    const totalNights = tripRoute.reduce((sum, c) => sum + c.nights, 0)

    // Build seasonal_info cards from wizard dates
    const startDate = new Date(wizardData.startDate)
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const travelMonth = monthNames[startDate.getMonth()]

    const seasonalInfo: Array<{ label: string; description: string }> = [
        {
            label: 'Travel Period',
            description: `${travelMonth} ${startDate.getFullYear()}`
        },
        {
            label: 'Ideal Duration',
            description: `${totalNights} nights`
        }
    ]

    // Build trip_highlights (label = count, description = type)
    const tripHighlights: Array<{ label: string; description: string }> = []
    if (experienceCount > 0) {
        tripHighlights.push({ label: String(experienceCount), description: 'activities' })
    }
    if (stayCount > 0) {
        tripHighlights.push({ label: String(stayCount), description: 'stays' })
    }
    if (restaurantCount > 0) {
        tripHighlights.push({ label: String(restaurantCount), description: 'restaurants' })
    }
    if (cities.length > 0) {
        tripHighlights.push({ label: String(cities.length), description: 'cities' })
    }

    // Highlight counts
    const highlightCounts = {
        countries: countryCount,
        cities: cities.length,
        activities: experienceCount,
        stays: stayCount,
        restaurants: restaurantCount
    }

    try {
        await contentCollectionApi.createContentCollectionMetadata(identifier, {
            metadata: {
                trip_route: tripRoute,
                seasonal_info: seasonalInfo,
                trip_highlights: tripHighlights,
                highlights: highlightCounts,
                ideal_duration: `${totalNights} nights`,
                source: 'automated_tripboard'
            },
            landscape_images: landscapeImages.length > 0 ? landscapeImages : undefined
        })
    } catch (err) {
        toast.error(`Failed to create overview metadata: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

/**
 * Creates a full tripboard from a generated itinerary.
 *
 * Flow:
 * 1. Create content collection
 * 2. Link to trip (set trip context)
 * 3. In parallel: add experiences, stays, restaurants, fixed sections
 * 4. Create overview metadata (enables the Overview tab)
 * 5. Clone to traveler collection
 */
export async function createTripboard(
    params: TripboardCreationParams,
    onProgress?: OnProgressCallback
): Promise<string> {
    const { tripId, travelerId, tripName, countryIds, countryName, itineraryData, wizardData } = params

    const days = itineraryData.days || []
    if (days.length === 0) {
        throw new Error('No itinerary days to create tripboard from')
    }

    // ── Progress tracking helper ──
    const steps = TRIPBOARD_STEPS.map((s) => ({ ...s }))

    function updateStep(stepId: TripboardStepId, status: TripboardStepStatus) {
        const step = steps.find((s) => s.id === stepId)
        if (step) step.status = status
        onProgress?.(steps.map((s) => ({ ...s })))
    }

    // Extract data from itinerary
    const cities = extractCitiesFromItinerary(days)
    const mealSlots = extractMealsFromItinerary(days)
    const experienceSlots = extractExperiencesFromItinerary(days)

    // Step 1: Create content collection (same API and payload shape as CreateCollectionModal: name, description, countryIds)
    updateStep('create_collection', 'active')
    const collectionName = `${tripName} Tripboard`
    const collectionDescription = `Your personalized travel essentials for ${tripName}.`

    const createResponse = await contentCollectionApi.createCollection(collectionName, collectionDescription || null, countryIds, tripId)
    const identifier = createResponse.data.identifier

    if (!identifier) {
        updateStep('create_collection', 'error')
        throw new Error('Failed to create collection — no identifier returned')
    }
    updateStep('create_collection', 'completed')

    // Step 2: Set trip context + attach itinerary section + store wizard data
    updateStep('set_context', 'active')
    try {
        await contentCollectionApi.updateCollectionContext(identifier, {
            trip_id: tripId,
            country_id: countryIds,
            city_id: cities.map((c) => c.id)
        })
    } catch (err) {
        toast.error(`Failed to set trip context: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }

    // Store wizard data + sync timestamp in collection metadata (for future itinerary sync)
    try {
        const groupType = deriveGroupType(wizardData.groupSetup)
        await contentCollectionApi.updateCollectionMetadata(identifier, {
            source: 'automated_tripboard',
            itinerary_synced_at: new Date().toISOString(),
            wizard_data: {
                group_type: groupType,
                budget_range: wizardData.stayBudgetRange,
                city_preferences: deriveCityPreferences(groupType),
                travel_purpose: 'leisure_relaxation'
            }
        })
    } catch (err) {
        // Non-critical — sync will still work with defaults
        console.warn('Failed to store wizard data in collection metadata:', err)
    }

    // Step 2b: Attach itinerary section (payload shape matches AddSectionModal: id, section_type, title, description, sections_order, entity_type, blocks)
    try {
        const itineraryPayload = {
            id: crypto.randomUUID(),
            section_type: 'itinerary',
            title: 'Itinerary',
            description: null as string | null,
            sections_order: generateSectionOrder(),
            entity_type: ENTITY_TYPE_ITINERARY,
            blocks: [] as unknown[]
        }
        await contentCollectionApi.addSection(identifier, {
            ...itineraryPayload,
            entity_id: params.itineraryId
        } as Parameters<typeof contentCollectionApi.addSection>[1])
    } catch (err) {
        toast.error(`Failed to attach itinerary section: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
    updateStep('set_context', 'completed')

    // Step 3: Populate all sections in parallel
    updateStep('add_experiences', 'active')
    updateStep('add_stays', 'active')
    updateStep('add_restaurants', 'active')
    updateStep('add_fixed_sections', 'active')

    const populationTasks = [
        populateExperiences(identifier, experienceSlots),
        populateStays(identifier, cities, wizardData),
        populateRestaurants(identifier, mealSlots),
        populateFixedSections(identifier, countryName)
    ]

    // const taskNames = ['Experiences', 'Stays', 'Restaurants', 'Fixed Sections']
    const stepIds: TripboardStepId[] = ['add_experiences', 'add_stays', 'add_restaurants', 'add_fixed_sections']
    const results = await Promise.allSettled(populationTasks)

    let successCount = 0
    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            updateStep(stepIds[index], 'completed')
            successCount++
        } else {
            updateStep(stepIds[index], 'error')
        }
    })

    if (successCount === 0) {
        toast.error('All tripboard sections failed to populate. The collection may be empty.')
    }

    // Step 4: Create overview metadata
    updateStep('create_overview', 'active')

    const staysResult = results[1]
    const restaurantsResult = results[2]
    const stayCount = staysResult.status === 'fulfilled' ? (typeof staysResult.value === 'number' ? staysResult.value : 0) : 0
    const restaurantCount = restaurantsResult.status === 'fulfilled' ? (typeof restaurantsResult.value === 'number' ? restaurantsResult.value : 0) : 0

    await populateOverviewMetadata(identifier, cities, experienceSlots, stayCount, restaurantCount, countryIds.length, wizardData)
    updateStep('create_overview', 'completed')

    // Step 5: Clone to traveler collection
    updateStep('clone_to_traveler', 'active')
    let finalIdentifier = identifier // fallback to original if clone fails
    try {
        const cloneResponse = await contentCollectionApi.cloneToTravelerCollection(identifier, travelerId, tripId)
        // Use the cloned collection's identifier (the traveler's copy)
        const clonedIdentifier = (cloneResponse as any)?.data?.identifier
            ?? (cloneResponse as any)?.identifier
        if (clonedIdentifier) {
            finalIdentifier = clonedIdentifier
        }
        updateStep('clone_to_traveler', 'completed')
    } catch (err) {
        toast.error(`Failed to clone tripboard to your collection: ${err instanceof Error ? err.message : 'Unknown error'}`)
        updateStep('clone_to_traveler', 'error')
    }

    return finalIdentifier
}
