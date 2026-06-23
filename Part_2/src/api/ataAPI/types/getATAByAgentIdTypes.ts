import { ICity, ICountry } from '@/types/curationTypes/locationTypes'

export interface IActivityInfo {
    name: string
    type: string
}

export interface IQuestion {
    id: string
    sequence: number
    expert_context: string
    title: string
    description: string
    type: string
    required: boolean
    options: IOption[]
    education_tips: string[]
}

export interface IOption {
    id: string
    name: string
    details: string[]
    pricing: string
}

export interface IVisitorInfo {
    adults: string
    children: string[]
    travel_dates: string
    budget_range: string
    special_requirements: string[]
}

export interface IOutputParameters {
    recommendation: IRecommendation
    tips: ITip[]
    high_level_itinerary: IHighLevelItinerary[]
    response_type: string
    success: boolean
}

export interface IRecommendation {
    recommended_ticket_category: string
    reasons_for_recommendation: string
    bookingLinks: IBookingLink[]
    other_ticket_categories: IOtherTicketCategory[]
}

export interface IBookingLink {
    platform: string
    platformID: string
    affiliate_link: string
    cost_in_inr: string
}

export interface IOtherTicketCategory {
    category_name: string
    key_highlights: string
    bookingLinks: IBookingLink[]
}

export interface ITip {
    tip_text: string
}

export interface IHighLevelItinerary {
    title: string
    description: string
    image_url: string
}

export interface ILoaderFormat {
    scanning: IScanning
    analyzing: IAnalyzing
    picking: IPicking
}

export interface IScanning {
    title: string
    description: string
    databaseText: string
    providersText: string
    providers: string[]
}

export interface IAnalyzing {
    title: string
    description: string
    criteriaHeading: string
    chips: string[]
    progressText: string
}

export interface IPicking {
    title: string
    description: string
    text: string
}

export interface IATAFeature {
    identifier: string
    name: string
    description: string
    icon_url: string
    input_parameters: IInputParameters
    output_parameters: IOutputParameters
    loader_format: ILoaderFormat
}

export interface IInputParameters {
    activity_info: IActivityInfo
    preference_questions: IQuestion[]
    visitor_info: IVisitorInfo
    question: string
    preferences: any
}

export interface GetATAByAgentIdResponse {
    id: string
    name: string
    identifier: string
    display_name: string
    description: string
    agent_type: string
    status: string
    development_status: string
    country: ICountry
    city: ICity
    category: string
    supported_languages: string[]
    api_endpoint: string
    routing_endpoint: string
    executor_path: string
    icon_url: string
    features: IATAFeature[]
    loader_format: ILoaderFormat
    placeholder_questions: string[]
    created_at: string
    updated_at: string
}
