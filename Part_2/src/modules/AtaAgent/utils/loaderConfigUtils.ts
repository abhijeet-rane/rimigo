import { ILoaderFormat, IATAFeature } from '@/api/ataAPI/types/getATAByAgentIdTypes'
import { PROVIDER_LOGOS } from '@/constants/providerLogos'

type ChipIcon = 'users' | 'utensils' | 'rupee' | 'check' | 'img' | 'route'

interface CriteriaChipConfig {
    text: string
    kind: 'default' | 'success'
    icon?: ChipIcon
    imgSrc?: string
}

interface UIConfig {
    scanning: {
        title: string
        description: string
        databaseText: string
        providersText: string
        providers?: string[]
    }
    analyzing: {
        title: string
        description: string
        criteriaHeading: string
        chips: CriteriaChipConfig[]
        progressText: string
    }
    picking: {
        title: string
        description: string
        text: string
        pillIcon?: string
    }
}

/**
 * Maps provider names from API to provider logo URLs
 */
const mapProviderToLogo = (providerName: string): string | undefined => {
    const providerMap: Record<string, string> = {
        GETYOURGUIDE: PROVIDER_LOGOS.AGODA, // Fallback if GETYOURGUIDE logo not available
        'BOOKING.COM': PROVIDER_LOGOS.BOOKING,
        BOOKING: PROVIDER_LOGOS.BOOKING,
        KLOOK: PROVIDER_LOGOS.TRIP_COM, // Fallback
        TRIP_COM: PROVIDER_LOGOS.TRIP_COM,
        GOOGLE: PROVIDER_LOGOS.RIMIGO, // Fallback
        AGODA: PROVIDER_LOGOS.AGODA
    }

    // Try exact match first
    if (providerMap[providerName]) {
        return providerMap[providerName]
    }

    // Try case-insensitive match
    const upperName = providerName.toUpperCase()
    for (const [key, value] of Object.entries(providerMap)) {
        if (key.toUpperCase() === upperName) {
            return value
        }
    }

    // Return undefined if no match found (component will handle gracefully)
    return undefined
}

/**
 * Maps group type to readable label
 */
const getGroupTypeLabel = (groupType: string): string => {
    const groupTypeMap: Record<string, string> = {
        couple: 'Couple',
        couple_with_children: 'Couple with Children',
        friends_group: 'Friends Group',
        immediate_family: 'Family',
        solo_traveler: 'Solo Traveler',
        family: 'Family'
    }
    return groupTypeMap[groupType] || groupType
}

/**
 * Maps budget range to readable label
 */
const getBudgetRangeLabel = (budgetRange: string): string => {
    const budgetMap: Record<string, string> = {
        low: 'Budget Friendly',
        medium: 'Moderate Budget',
        high: 'Premium Budget',
        budget_friendly: 'Budget Friendly',
        premium: 'Premium'
    }
    return budgetMap[budgetRange] || budgetRange
}

/**
 * Formats purpose type to readable label
 */
const getPurposeTypeLabel = (purposeType: string): string => {
    // Convert snake_case to Title Case
    return purposeType
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

/**
 * Converts traveler preferences to criteria chips
 */
const convertTravelerPreferencesToChips = (inputData: any): CriteriaChipConfig[] => {
    const chips: CriteriaChipConfig[] = []

    if (!inputData) {
        return chips
    }

    // Prioritize visitor_info if it exists (from IVisitorInfo structure)
    const visitorInfo = inputData.visitor_info
    const hasVisitorInfo = visitorInfo && (visitorInfo.adults || visitorInfo.children || visitorInfo.budget_range)

    // Extract group type
    if (inputData.group_type) {
        const groupTypeLabel = getGroupTypeLabel(inputData.group_type)
        chips.push({
            text: groupTypeLabel,
            kind: 'default',
            icon: 'users'
        })
    }

    // Extract adults and children
    // Prioritize visitor_info if it exists
    if (hasVisitorInfo) {
        const adults = visitorInfo.adults || '0'
        const children = visitorInfo.children || []
        let groupText = ''

        if (Array.isArray(children) && children.length > 0) {
            groupText = `${adults} adult${adults !== '1' ? 's' : ''}, ${children.length} child${children.length !== 1 ? 'ren' : ''}`
        } else if (adults && adults !== '0') {
            groupText = `${adults} adult${adults !== '1' ? 's' : ''}`
        }

        if (groupText) {
            chips.push({
                text: groupText,
                kind: 'default',
                icon: 'users'
            })
        }
    } else if (inputData.adults || inputData.children) {
        // Fallback to direct inputData fields
        const adults = typeof inputData.adults === 'number' ? String(inputData.adults) : inputData.adults || '0'
        const children = inputData.children
        let groupText = ''

        if (typeof children === 'string') {
            // Single child
            groupText = `${adults} adult${adults !== '1' ? 's' : ''}, ${children} child`
        } else if (Array.isArray(children) && children.length > 0) {
            // Multiple children
            groupText = `${adults} adult${adults !== '1' ? 's' : ''}, ${children.length} child${children.length !== 1 ? 'ren' : ''}`
        } else if (adults && adults !== '0') {
            // Only adults
            groupText = `${adults} adult${adults !== '1' ? 's' : ''}`
        }

        if (groupText) {
            chips.push({
                text: groupText,
                kind: 'default',
                icon: 'users'
            })
        }
    }

    // Extract budget range (prioritize visitor_info if it exists)
    if (hasVisitorInfo && visitorInfo.budget_range) {
        const budgetLabel = getBudgetRangeLabel(visitorInfo.budget_range)
        chips.push({
            text: budgetLabel,
            kind: 'default',
            icon: 'rupee'
        })
    } else if (inputData.budget_range) {
        const budgetLabel = getBudgetRangeLabel(inputData.budget_range)
        chips.push({
            text: budgetLabel,
            kind: 'default',
            icon: 'rupee'
        })
    }

    // Extract purpose type
    if (inputData.purpose_type) {
        const purposeLabel = getPurposeTypeLabel(inputData.purpose_type)
        chips.push({
            text: purposeLabel,
            kind: 'default',
            icon: 'check'
        })
    }

    // Extract travel dates (prioritize visitor_info if it exists)
    if (hasVisitorInfo && visitorInfo.travel_dates) {
        chips.push({
            text: `Travel dates: ${visitorInfo.travel_dates}`,
            kind: 'default',
            icon: 'check'
        })
    } else if (inputData.travel_dates) {
        chips.push({
            text: `Travel dates: ${inputData.travel_dates}`,
            kind: 'default',
            icon: 'check'
        })
    }

    // Extract special requirements (prioritize visitor_info if it exists)
    if (
        hasVisitorInfo &&
        visitorInfo.special_requirements &&
        Array.isArray(visitorInfo.special_requirements) &&
        visitorInfo.special_requirements.length > 0
    ) {
        visitorInfo.special_requirements.forEach((req: string) => {
            if (req) {
                chips.push({
                    text: req,
                    kind: 'success',
                    icon: 'check'
                })
            }
        })
    } else if (inputData.special_requirements && Array.isArray(inputData.special_requirements) && inputData.special_requirements.length > 0) {
        inputData.special_requirements.forEach((req: string) => {
            if (req) {
                chips.push({
                    text: req,
                    kind: 'success',
                    icon: 'check'
                })
            }
        })
    }

    return chips
}

/**
 * Converts user preferences to criteria chips
 * Preferences format: { "question_id": "option_id" } or { "question_id": ["option_id1", "option_id2"] }
 * Feature contains preference questions with options to map IDs to names
 */
const convertPreferencesToChips = (preferences: Record<string, unknown>, feature?: IATAFeature): CriteriaChipConfig[] => {
    const chips: CriteriaChipConfig[] = []

    if (!feature || !feature.input_parameters?.preference_questions) {
        return chips
    }

    // Iterate through preference questions to find matching selections
    feature.input_parameters.preference_questions.forEach((question) => {
        const questionId = question.id
        const selectedValue = preferences[questionId]

        if (!selectedValue) {
            return
        }

        // Handle array of selections (multi-select)
        if (Array.isArray(selectedValue)) {
            selectedValue.forEach((value) => {
                const option = question.options?.find((opt) => opt.id === value || opt.name === value)
                if (option) {
                    chips.push({
                        text: option.name,
                        kind: 'default',
                        icon: 'check'
                    })
                }
            })
        } else {
            // Handle single selection
            const selectedId = typeof selectedValue === 'string' ? selectedValue : String(selectedValue)
            const option = question.options?.find((opt) => opt.id === selectedId || opt.name === selectedId)

            if (option) {
                // Type assertion to access budget_type if it exists
                const optionWithBudget = option as { name: string; budget_type?: string }
                const budgetType = optionWithBudget.budget_type

                // Determine chip kind based on budget_type or other criteria
                const chipKind: 'default' | 'success' = budgetType === 'premium_experience' ? 'success' : 'default'

                // Determine icon based on option properties or question type
                let icon: ChipIcon = 'check'
                if (budgetType === 'budget_friendly') {
                    icon = 'rupee'
                } else if (budgetType === 'premium_experience') {
                    icon = 'check'
                }

                chips.push({
                    text: option.name,
                    kind: chipKind,
                    icon
                })
            }
        }
    })

    return chips
}

/**
 * Converts ILoaderFormat from ATA API to UIConfig for OutputLoadingComponent
 * Also incorporates user preferences into criteria chips
 */
export const convertLoaderFormatToUIConfig = (
    loaderFormat: ILoaderFormat,
    preferences?: Record<string, unknown>,
    feature?: IATAFeature,
    inputData?: any
): UIConfig | null => {
    // Map provider names to logo URLs
    if (!loaderFormat || !loaderFormat.scanning || !loaderFormat.analyzing || !loaderFormat.picking) return null

    const providerLogos =
        loaderFormat && loaderFormat?.scanning?.providers
            ? loaderFormat.scanning.providers?.map((provider) => mapProviderToLogo(provider)).filter((logo): logo is string => logo !== undefined)
            : []

    // Convert user preferences (from preference questions) to chips if available
    const preferenceChips = preferences && feature ? convertPreferencesToChips(preferences, feature) : []

    // Convert traveler preferences (group_type, budget_range, adults, children, etc.) to chips
    const travelerChips = inputData ? convertTravelerPreferencesToChips(inputData) : []

    // Combine preference chips and traveler chips
    const allChips = [...preferenceChips, ...travelerChips]

    // If no chips from preferences or traveler data, use the chips from loaderFormat as fallback
    // Note: loaderFormat.analyzing.chips is string[], so we convert them
    const fallbackChips: CriteriaChipConfig[] =
        allChips.length === 0
            ? loaderFormat.analyzing.chips.map((chipText) => ({
                  text: chipText,
                  kind: 'default',
                  icon: 'check'
              }))
            : allChips

    return {
        scanning: {
            title: loaderFormat.scanning.title,
            description: loaderFormat.scanning.description,
            databaseText: loaderFormat.scanning.databaseText,
            providersText: loaderFormat.scanning.providersText,
            providers: providerLogos && providerLogos.length > 0 ? providerLogos : undefined
        },
        analyzing: {
            title: loaderFormat.analyzing.title,
            description: loaderFormat.analyzing.description,
            criteriaHeading: loaderFormat.analyzing.criteriaHeading,
            chips: fallbackChips,
            progressText: loaderFormat.analyzing.progressText
        },
        picking: {
            title: loaderFormat.picking.title,
            description: loaderFormat.picking.description,
            text: loaderFormat.picking.text,
            pillIcon: '/icons/wand.png' // Default icon, can be customized if needed
        }
    }
}

/**
 * Gets the loader format from a feature, falling back to agent-level loader format
 */
export const getLoaderFormatFromFeature = (feature?: IATAFeature, agentLoaderFormat?: ILoaderFormat): ILoaderFormat | null => {
    // Priority: feature loader_format > agent loader_format
    if (feature?.loader_format) {
        return feature.loader_format
    }

    if (agentLoaderFormat) {
        return agentLoaderFormat
    }

    return null
}

/**
 * Extracts user preferences from interaction input_data
 * Returns both preference question answers and the full input_data for traveler preferences
 */
export const extractPreferencesFromInteraction = (
    inputData: any
): {
    preferences: Record<string, unknown>
    inputData: any
} => {
    if (!inputData) {
        return { preferences: {}, inputData: null }
    }

    // Preferences might be in different formats:
    // 1. Direct in input_data: { "question_id": "option_id" }
    // 2. Nested in preferences: input_data.preferences
    // 3. As part of all_preferences: input_data.all_preferences
    // 4. Nested in data.preferences: input_data.data?.preferences (for Burj Khalifa)

    let preferences: Record<string, unknown> = {}

    // Check for nested preferences in data.preferences (Burj Khalifa format)
    if (inputData.data?.preferences) {
        preferences = inputData.data.preferences as Record<string, unknown>
    } else if (inputData.all_preferences) {
        preferences = inputData.all_preferences as Record<string, unknown>
    } else if (inputData.preferences) {
        preferences = inputData.preferences as Record<string, unknown>
    } else {
        // Extract preference question IDs from input_data
        // Common preference question IDs from Burj Khalifa example
        const preferenceKeys = ['burj_khalifa_deck_level', 'burj_khalifa_timing']

        preferenceKeys.forEach((key) => {
            if (inputData[key]) {
                preferences[key] = inputData[key]
            }
        })

        // Also check for any other keys that might be preferences
        Object.keys(inputData).forEach((key) => {
            // Skip known non-preference keys
            const nonPreferenceKeys = [
                'user_text_input',
                'question',
                'space',
                'trip_id',
                'thread_id',
                'entity_type',
                'entity_id',
                'feature',
                'feature_identifier',
                'data',
                'city_id',
                'check_in',
                'check_out',
                'group_type',
                'purpose_type',
                'location_preference',
                'budget_range',
                'adults',
                'children',
                'visitor_info',
                'traveler_preferences'
            ]
            if (!nonPreferenceKeys.includes(key) && inputData[key] !== null && inputData[key] !== undefined) {
                // Check if it looks like a preference question answer (string or array)
                if (typeof inputData[key] === 'string' || Array.isArray(inputData[key])) {
                    preferences[key] = inputData[key]
                }
            }
        })
    }

    return { preferences, inputData }
}

export type { UIConfig, CriteriaChipConfig }
