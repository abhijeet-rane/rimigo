import { useMemo } from 'react'
import type { CountryData } from '@/hooks/useCountries'
import type { SearchDestinationCardData } from '@/lib/api/OnboardingApi'

interface DestinationCountry {
    id: string
    name: string
}

interface CountryLookupItem {
    country_id: string
    flag_icon_url?: string
    icon_url?: string
    region?: { id: string; name: string } | string | null
}

interface ActiveTripLike {
    final_destination_countries?: DestinationCountry[]
}

/**
 * Derives switcher countries from active trip + location personalization data.
 * Returns empty array if only 1 or fewer destination countries.
 */
export const useSwitcherCountries = (
    activeTrip: ActiveTripLike | undefined,
    countries: CountryLookupItem[] | undefined
): CountryData[] => {
    return useMemo(() => {
        const destinationCountries = activeTrip?.final_destination_countries || []
        if (destinationCountries.length <= 1) return []

        const countryLookup = new Map(countries?.map(c => [c.country_id, c]) ?? [])

        return destinationCountries.map(c => {
            const match = countryLookup.get(c.id)
            return {
                country_id: c.id,
                country_name: c.name,
                flag_icon_url: match?.flag_icon_url ?? '',
                icon_url: match?.icon_url ?? '',
                region: match?.region ?? ''
            }
        }) as CountryData[]
    }, [activeTrip?.final_destination_countries, countries])
}

/**
 * Derives default destination from active trip's first country.
 * Used for existing-trip-no-collection scenario.
 */
export const useDefaultDestination = (
    activeTrip: ActiveTripLike | undefined
): SearchDestinationCardData | null => {
    return useMemo(() => {
        const countries = activeTrip?.final_destination_countries
        if (!countries || countries.length === 0) return null
        return { id: countries[0].id, title: countries[0].name, imageUrl: '', isLive: true }
    }, [activeTrip?.final_destination_countries])
}
