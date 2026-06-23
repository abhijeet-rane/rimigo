import { SearchDestinationCardData } from '@/lib/api/OnboardingApi'
import { LocationResponse } from '../api/onboardingAPI'
import { LocationPersonalizationResponse } from '@/api/curation/locationPersonalizationAPI'

export const getPrioritizedCountriesToSearchDestinationCardData = (locations: LocationResponse[]): SearchDestinationCardData[] => {
    if (!locations) return []
    return locations.map((location) => ({
        id: location.country_id,
        title: location.country_name,
        imageUrl: location.icon_url,
        bannerImageUrl: location.banner_img_url,
        isLive: location.is_live
    }))
}

export const getLiveCountriesToSearchDestinationCardData = (locations: LocationPersonalizationResponse[]): SearchDestinationCardData[] => {
    if (!locations) return []
    return locations.map((location) => ({
        id: location.country_id,
        title: location.country_name,
        imageUrl: location.icon_url,
        bannerImageUrl: location.banner_img_url
    }))
}

/**
 * Normalize a live-countries entry into the prioritized `LocationResponse`
 * shape so downstream wizard components (DestinationPicker, RegionalSection,
 * etc.) can keep treating both sources uniformly. Missing prioritized-only
 * fields are filled with safe defaults; `region` is flattened from
 * `{id, name}` to its string name because consumers use it as a group key.
 */
export const liveCountryToLocationResponse = (c: LocationPersonalizationResponse): LocationResponse => ({
    id: c.country_id,
    country_id: c.country_id,
    country_name: c.country_name,
    best_months: [],
    peak_season: [],
    recommended_for_travel_purpose: [],
    recommended_for_group_type: [],
    recommended_for_occasions: [],
    icon_url: c.icon_url,
    flag_icon_url: c.flag_icon_url,
    banner_img_url: c.banner_img_url,
    suggestion_priority: 0,
    is_live: true,
    region: c.region?.name,
})
