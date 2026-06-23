import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'

export interface BestAreaHighlight {
    label: string
    icon?: string
}

export interface BestAreaFeatureProperties {
    id: string
    name: string
    whyRecommended: string
    highlights: BestAreaHighlight[]
    bbox: [number, number, number, number]
}

export interface BestAreaFeature {
    type: 'Feature'
    properties: BestAreaFeatureProperties
    geometry: GeoJSON.Polygon
}

export interface BestAreasGeoJSONResponse {
    type: 'FeatureCollection'
    features: BestAreaFeature[]
}

/**
 * Fetch best areas to stay for a city.
 * Returns a GeoJSON FeatureCollection. Empty features when none available.
 */
export const getBestAreas = async (cityId: string): Promise<BestAreasGeoJSONResponse> => {
    const url = `${API_CONFIG.BASE_URL}/curation/v2/cities/${cityId}/best-areas/`
    const response = await apiClient.get<BestAreasGeoJSONResponse>(url)
    return response.data
}
