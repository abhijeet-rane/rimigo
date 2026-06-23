/**
 * Google Analytics Configuration
 * Centralized constants for Google Analytics event tracking
 */

// Event Names
export const GA_EVENTS = {
    // Authentication Events
    LOGIN_SUCCESS: 'login_success',
    
    // Experience/Tour Events
    BOOK_TOUR_CLICK: 'book_tour_click',
    
    // Stays Events
    AFFILIATE_LINK_CLICK: 'stay_card_affiliate_link_click',
    HOTEL_DETAIL_DEAL_CLICK: 'hotel_detail_deal_click',
    
    // Itinerary Events
    PLAN_ITINERARY_CLICK: 'plan_itinerary_click',
    
    // Onboarding Events
    LEADGEN_COMPLETE: 'leadgen_complete',
    
    // Add more event names here as needed
} as const

// Event Categories
export const GA_EVENT_CATEGORIES = {
    AUTHENTICATION: 'Authentication',
    EXPERIENCE: 'Experience',
    STAYS: 'Stays',
    ITINERARY: 'Itinerary',
    ONBOARDING: 'Onboarding',
    // Add more categories here as needed
} as const

// Event Labels (commonly used labels)
export const GA_EVENT_LABELS = {
    // Add commonly used labels here if needed
} as const

// Google Analytics Measurement ID
export const GA_MEASUREMENT_ID = 'G-M3CS69WLTC'

// Type exports for better type safety
export type GAEventName = typeof GA_EVENTS[keyof typeof GA_EVENTS]
export type GAEventCategory = typeof GA_EVENT_CATEGORIES[keyof typeof GA_EVENT_CATEGORIES]

