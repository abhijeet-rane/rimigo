import type { HotelSuggestion } from '@/pages/Stays/Services'
import { getTomorrowDate, getDayAfterTomorrowDate } from '@/utils/dateUtils'

/** Build hotel detail URL consistent with StaysExplore / tripboard map (new tab). */
export function buildStayDetailUrlFromSuggestion(suggestion: HotelSuggestion): string | null {
    const referenceId = suggestion.referenceId || suggestion.id
    if (!referenceId) return null

    const params = new URLSearchParams()
    params.set('hotel_name', suggestion.name || suggestion.fullName || '')
    params.set('zentrum_hub_id', referenceId)

    if (suggestion.city) {
        params.set('city_name', suggestion.city)
        params.set(
            'city',
            suggestion.city
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
        )
    }
    params.set('city_id', '')
    params.set('review_type', 'complete')
    params.set('group_type', 'solo_traveler')
    params.set('travel_purpose', 'leisure_relaxation')
    params.set('check_in', getTomorrowDate())
    params.set('check_out', getDayAfterTomorrowDate())
    params.set('adults', '2')
    params.set('children', '0')
    params.set('infants', '0')

    return `/stays/${referenceId}?${params.toString()}`
}
