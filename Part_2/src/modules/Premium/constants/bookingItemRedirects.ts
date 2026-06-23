/**
 * Configuration for booking item redirects based on entity_type and fulfillment_type
 * This mapping determines what redirect options are shown for different booking item types
 */

import { DEFAULT_LANDING_PAGE_ROUTE } from '@/routes/routes'

export interface BookingItemRedirectOption {
    /** Route path to navigate to */
    route: string
    /** Button text to display */
    label: string
    /** Optional: variant for button styling */
    variant?: 'primary' | 'secondary'
}

export interface BookingItemRedirectConfig {
    /** Redirect options available for this entity/fulfillment type combination */
    redirectOptions: BookingItemRedirectOption[]
    /** Optional: Title to display above redirect options */
    title?: string
    /** Optional: Description to display */
    description?: string
}

/**
 * Mapping of entity_type and fulfillment_type combinations to their redirect configurations
 * Key format: `${entity_type}:${fulfillment_type}` or just `${entity_type}` for type-agnostic configs
 */
export const BOOKING_ITEM_REDIRECT_CONFIG: Record<string, BookingItemRedirectConfig> = {
    // Plan + Subscription combination
    'plan:subscription': {
        title: 'Your Premium Plan is Active!',
        description: 'Start planning your next adventure or explore premium features.',
        redirectOptions: [
            {
                route: DEFAULT_LANDING_PAGE_ROUTE,
                label: 'Go to Home',
                variant: 'secondary'
            },
            {
                route: '/premium',
                label: 'View Premium Features',
                variant: 'primary'
            }
        ]
    },
    // Fallback for plan entity type (if fulfillment_type is not subscription)
    'plan': {
        title: 'Booking Complete',
        redirectOptions: [
            {
                route: DEFAULT_LANDING_PAGE_ROUTE,
                label: 'Go to Home',
                variant: 'secondary'
            },
            {
                route: '/premium',
                label: 'View Premium Features',
                variant: 'primary'
            }
        ]
    }
}

/**
 * Get redirect configuration for a booking item
 * @param entityType - The entity_type from booking item
 * @param fulfillmentType - The fulfillment_type from booking item (optional, only for internal type)
 * @param itemType - The type of booking item ('internal' or 'external')
 * @returns Configuration for redirects, or null if no config exists
 */
export const getBookingItemRedirectConfig = (
    entityType: string | null,
    fulfillmentType: string | null,
    itemType: 'internal' | 'external'
): BookingItemRedirectConfig | null => {
    if (!entityType) {
        return null
    }

    // For internal items, try specific combination first, then fallback to entity type only
    if (itemType === 'internal' && fulfillmentType) {
        const specificKey = `${entityType}:${fulfillmentType}`
        if (BOOKING_ITEM_REDIRECT_CONFIG[specificKey]) {
            return BOOKING_ITEM_REDIRECT_CONFIG[specificKey]
        }
    }

    // Fallback to entity type only
    if (BOOKING_ITEM_REDIRECT_CONFIG[entityType]) {
        return BOOKING_ITEM_REDIRECT_CONFIG[entityType]
    }

    return null
}

