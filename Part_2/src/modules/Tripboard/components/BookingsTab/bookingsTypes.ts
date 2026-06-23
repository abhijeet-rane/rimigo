export interface ProviderOption {
    provider: string
    price: number
    cheapest: boolean
    unit?: string
    url?: string | null
    logoUrl?: string | null
}

export interface BookingIcon {
    emoji: string
    bg: string
    color: string
}

export interface UnifiedBooking {
    id: string
    category: 'flights' | 'stays' | 'activities' | 'mustHaves'
    name: string
    day: { num: number | null; date: string }
    // urgency: string | null  // TODO: backend support needed
    groupKey: string | null
    groupMode?: 'pick' | 'browse'
    icon: BookingIcon
    details: string
    highlight?: string
    options: ProviderOption[]
    landscapeImage?: string
    /** Original identifiers for mutation actions */
    _slotId?: string
    _sectionId?: string
    _entityId?: string
    _cityId?: string
    _zentrumHubId?: string
    _isExcluded?: boolean
}

export const CATEGORIES: Record<string, { label: string; icon: string }> = {
    flights: { label: 'Flights', icon: '✈️' },
    stays: { label: 'Stays', icon: '🏨' },
    activities: { label: 'Activities', icon: '🎟️' },
    // Curated (rimigo_internal-populated) categories — surface in the cost
    // overview breakdown + sticky bar pills once they carry a total.
    transport: { label: 'Transport', icon: '🚗' },
    ancillary: { label: 'Ancillaries', icon: '🧳' },
    mustHaves: { label: 'Must Haves', icon: '📱' }
}

export const CATEGORY_ORDER = ['flights', 'stays', 'activities', 'transport', 'ancillary', 'mustHaves'] as const
