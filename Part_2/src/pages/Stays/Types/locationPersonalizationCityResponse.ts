export type AccommodationBudgetCategory = {
    label: string
    min_value: number
    max_value: number | null
}

export type LocationPreferenceItem = {
    key: string
    label: string
    category: string
    icon: string
    description?: string
}

export type TopReviewAttribute = {
    rank: number
    attribute: string
    reasoning: string
}

export type StaysPreferences = {
    location_preferences: LocationPreferenceItem[]
    top_review_attributes: TopReviewAttribute[]
}

export type LocationPersonalizationCityResponse = {
    id: string
    city: string
    city_thumbnail_url: string | null
    tripboard_hero_image_url: string | null
    stay_guides: unknown[]
    stay_prompt_guides: unknown[]
    accommodation_budget_categories: AccommodationBudgetCategory[]
    preferences: {
        stays: StaysPreferences
    }
    created_at: string
    updated_at: string
    city_name: string
}