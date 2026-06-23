export interface OnboardingGuideStructure {
    home: {
        set_criteria_guide: boolean
        customised_needs_guide: boolean
    }
    stays: {
        set_criteria_guide: boolean
        smart_search_guide: boolean
        hand_picked_hotels_guide: boolean
    }
}

export interface OnboardingGuideResponse {
    message: string
    response_code: string
    data: OnboardingGuideStructure
}

export type OnboardingGuideUpdatePayload = OnboardingGuideStructure
