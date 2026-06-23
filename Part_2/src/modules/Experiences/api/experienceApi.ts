import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import { IExploreExperiencesParams, CountryExploreExperience } from '../types/experienceType'
import type { CuratedExperienceItem, CuratedExperiencesResponse } from '../types/curatedExperienceType'
import type { ExperiencePreferenceAPIResponse } from '@/modules/Onboarding/adapters/experiencePreferenceAdapters'
import { adaptCuratedExperiencesResponse } from '../adapters'

export const getAllCitiesByCountryWithExperiences = async (countryId: string) => {
    const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/cities/?country_name=${countryId}&has_experiences=true&is_paginated=false`)
    return response.data
}

export const fetchPublicExploreExperiences = async ({ country_id, page = 1, limit = 12, city_ids, search_query }: IExploreExperiencesParams) => {
    let url = `${API_CONFIG.BASE_URL}/curation/experience-explore/?country=${country_id}&page=${page}&limit=${limit}`

    if (city_ids) {
        url += `&cities=${city_ids}`
    }

    if (search_query) {
        url += `&search_query=${encodeURIComponent(search_query)}`
    }

    const response = await apiClient.get(url)
    return response.data
}

export const fetchCategoryList = async (country_id: string) => {
    const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/experiences/category-list/?country_id=${country_id}`)
    return response.data
}

export const fetchExperiencesByCountry = async (
    country_id: string,
    page = 1,
    limit = 20,
    priorityFilters?: string[],
    cityIds?: string[],
    maxLimit?: number,
    travelerExperiencePreferences?: string[],
    sortByPriority = false
) => {
    let url = `${API_CONFIG.BASE_URL}/curation/experiences/country/${country_id}/explore/?page=${page}&limit=${limit}&sort_by_priority=${sortByPriority}`

    // Add priority filters if provided
    if (priorityFilters && priorityFilters.length > 0) {
        const priorityParams = priorityFilters.join(',')
        url += `&suggestion_priority=${priorityParams}`
    }

    // Add city filters if provided
    if (cityIds && cityIds.length > 0) {
        const cityParams = cityIds.join(',')
        url += `&city_ids=${cityParams}`
    }

    // Add traveler experience preferences if provided
    if (travelerExperiencePreferences && travelerExperiencePreferences.length > 0) {
        const preferencesParams = travelerExperiencePreferences.join(',')
        url += `&traveler_experience_preferences=${preferencesParams}`
    }

    // Add max_limit if provided
    if (maxLimit !== undefined) {
        url += `&max_limit=${maxLimit}`
    }

    const response = await apiClient.get(url)
    return response.data
}

/**
 * Raw API response type for city explore API (without has_more)
 */
interface CityExploreApiRawResponse {
    city_id: string
    city_name: string
    total_experiences: number
    page: number
    limit: number
    data: CountryExploreExperience[]
}

/**
 * Response type for city explore API (with computed has_more)
 */
export interface CityExploreApiResponse extends CityExploreApiRawResponse {
    has_more: boolean
}

export interface CityCuratedExperiencesApiResponse {
    city_id: string
    city_name: string
    total_experiences: number
    page: number
    limit: number
    total_pages: number
    data: CuratedExperienceItem[]
}

/**
 * Fetch experiences by city using city explore API
 * Used when country_id is not present
 */
export const fetchExperiencesByCity = async (
    city_id: string,
    page = 1,
    limit = 20,
    priorityFilters?: string[],
    maxLimit?: number,
    travelerExperiencePreferences?: string[],
    sortByPriority = false
): Promise<CityExploreApiResponse> => {
    let url = `${API_CONFIG.BASE_URL}/curation/experiences/city/${city_id}/explore/?page=${page}&limit=${limit}&sort_by_priority=${sortByPriority}`

    // Add priority filters if provided
    if (priorityFilters && priorityFilters.length > 0) {
        const priorityParams = priorityFilters.join(',')
        url += `&suggestion_priority=${priorityParams}`
    }

    // Add traveler experience preferences if provided
    if (travelerExperiencePreferences && travelerExperiencePreferences.length > 0) {
        const preferencesParams = travelerExperiencePreferences.join(',')
        url += `&traveler_experience_preferences=${preferencesParams}`
    }

    // Add max_limit if provided
    if (maxLimit !== undefined) {
        url += `&max_limit=${maxLimit}`
    }

    const response = await apiClient.get<CityExploreApiRawResponse>(url)
    const data = response.data

    // Calculate has_more based on pagination
    const hasMore = data.page * data.limit < data.total_experiences

    return {
        ...data,
        has_more: hasMore
    }
}

export const fetchCuratedExperiences = async (
    countryId?: string | null,
    cityId?: string | null,
    page = 1,
    limit = 20,
    travelerExperiencePreferences: string[] = [],
    tripMonth?: string | number | null,
    travelerGroupType?: string | null,
    baseCityIds?: string[]
): Promise<CuratedExperiencesResponse> => {
    let tripMonthValue: string | number | undefined
    if (tripMonth !== undefined && tripMonth !== null) {
        const parsedMonth = Number(tripMonth)
        tripMonthValue = Number.isNaN(parsedMonth) ? tripMonth : parsedMonth
    }

    const payload: Record<string, unknown> = {
        traveler_experience_preferences: travelerExperiencePreferences,
        page,
        limit
    }

    if (tripMonthValue !== undefined) {
        payload.trip_month = tripMonthValue
    }

    if (travelerGroupType) {
        payload.traveler_group_type = travelerGroupType
    }

    if (baseCityIds && baseCityIds.length > 0) {
        payload.base_city_ids = baseCityIds
    }

    if (countryId) {
        const response = await apiClient.post(`${API_CONFIG.BASE_URL}/curation/country/${countryId}/curated-experiences/`, payload)
        // Adapt the response to normalized format (adapter handles wrapped responses)
        return adaptCuratedExperiencesResponse(response.data)
    }

    if (cityId) {
        const response = await apiClient.post(`${API_CONFIG.BASE_URL}/curation/city/${cityId}/curated-experiences/`, payload)
        // Adapt the response to normalized format (adapter handles wrapped responses)
        return adaptCuratedExperiencesResponse(response.data)
    }

    // If neither countryId nor cityId is provided, throw an error
    throw new Error('Either countryId or cityId must be provided')
}

export const getExperienceDetailsById = async (experienceId: string, groupType?: string, travelPurpose?: string, preferences?: string[]) => {
    try {
        const params = new URLSearchParams({
            experience_id: experienceId,
            group_type: groupType ?? '',
            travel_purpose: travelPurpose ?? ''
        })
        if (preferences && preferences.length > 0) {
            params.append('experience_preferences', preferences.join(','))
        }
        const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/experience-curation/details/?${params.toString()}`)
        return response.data
    } catch {
        throw new Error('Failed to fetch experience details')
    }
}

export const getExperienceFloatingQuestions = async (floatingQuestionsCacheKey: string) => {
    return apiClient.get(
        `${API_CONFIG.BASE_URL}/curation/experience-curation/floating-questions/?floating_questions_cache_key=${floatingQuestionsCacheKey}`
    )
}

export const getCountryExperienceType = async (countryId: string): Promise<ExperiencePreferenceAPIResponse[]> => {
    const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/country/${countryId}/experience-preferences/`)
    return response.data.data
}

export const getCityExperienceType = async (cityId: string): Promise<ExperiencePreferenceAPIResponse[]> => {
    const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/cities/${cityId}/experience-preferences/`)
    return response.data
}

/**
 * Get experience details by identifier/slug for public pages
 * Uses default values for personalization to enable public access
 */
// SSR-safe fetch function (doesn't use apiClient which requires browser APIs)
export const getExperienceDetailsBySlugSSR = async (
    identifier: string,
    groupType: string = 'couple',
    travelPurpose: string = 'leisure_relaxation',
    preferences: string[] = ['cultural'],
    tripMonth: number = new Date().getMonth() + 1
) => {
    try {
        const params = new URLSearchParams({
            identifier: identifier,
            group_type: groupType,
            travel_purpose: travelPurpose,
            trip_month: String(tripMonth)
        })
        if (preferences.length > 0) {
            params.append('experience_preferences', preferences.join(','))
        }
        // Use native fetch for SSR compatibility
        const response = await fetch(`${API_CONFIG.BASE_URL}/curation/experience-curation/details/?${params.toString()}`, {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`)
        }

        const data = await response.json()
        return data
    } catch {
        throw new Error('Failed to fetch experience details')
    }
}

export const getExperienceDetailsBySlug = async (
    identifier: string,
    groupType: string = 'couple',
    travelPurpose: string = 'leisure_relaxation',
    preferences: string[] = ['cultural'],
    tripMonth: number = new Date().getMonth() + 1
) => {
    try {
        const params = new URLSearchParams({
            identifier:identifier,
            group_type: groupType,
            travel_purpose: travelPurpose,
            trip_month: String(tripMonth)
        })
        if (preferences.length > 0) {
            params.append('experience_preferences', preferences.join(','))
        }
        const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/experience-curation/details/?${params.toString()}`)
        return response.data
    } catch {
        throw new Error('Failed to fetch experience details')
    }
}

export const getExperienceSneakPeek = async (experienceId: string) => {
    try {
        const response = await apiClient.get(`${API_CONFIG.BASE_URL}/curation/experience-curation/sneak-peek/`, {
            params: {
                experience_id: experienceId
            }
        })
        // Response is wrapped in { message, response_code, data }
        return response.data?.data || response.data
    } catch {
        throw new Error('Failed to fetch experience sneak peek')
    }
}
