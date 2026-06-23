import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { TokenStorage } from '@/lib/api/tokenStorage'

export const getBasicTravelerData = async (travelerId: string) => {
    try {
        const response = await apiClient.post(`${API_CONFIG.BASE_URL}/api/travelers/basic/`, {
            traveler_id: travelerId
        })
        return response
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

interface UpdateTravelerData {
    name: string
    gender?: string
    email?: string
}

export const updateTraveler = async (travelerId: string, payload: UpdateTravelerData) => {
    try {
        // PATCH request to update traveler
        const requestPayload: { name: string; gender?: string; email?: string } = {
            name: payload.name
        }

        // Add gender if provided
        if (payload.gender) {
            requestPayload.gender = payload.gender
        }

        // Add email if provided
        if (payload.email) {
            requestPayload.email = payload.email
        }

        const response = await apiClient.patch(`${API_CONFIG.BASE_URL}/api/travelers/${travelerId}/`, requestPayload)

        // If successful, update the local storage user info
        const currentUser = await TokenStorage.getUserInfo()
        const updatedUser = {
            ...currentUser,
            ...response.data // merge updated fields
        }
        await TokenStorage.setUserInfo(updatedUser)

        return response.data
    } catch (e) {
        throw new Error((e as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

export interface TravelerSource {
    id: string
    name: string
    is_account_created?: boolean
    entity_name?: string | null
    media?: {
        thumbnail_url?: string | null
        instagram_profile_url?: string | null
    }
    metadata?: Record<string, unknown>
}
export interface Traveler {
    id: string
    name: string
    email: string
    phone: string
    type: string
    country_code: string
    date_of_birth: string | null
    nationality: string | null
    passport_number: string | null
    passport_expiry: string | null
    dietary_preferences: string[]
    medical_conditions: string[]
    age: number | null
    gender: string | null
    source: TravelerSource
    returning_source: TravelerSource
    user_icon_url: string | null
    created_at: string
    updated_at: string
}

/**
 * Fetch full traveler details by travelerId
 */
export const getTravelerDetails = async (travelerId: string): Promise<Traveler> => {
    try {
        const response = await apiClient.get<Traveler>(`${API_CONFIG.BASE_URL}/api/travelers/${travelerId}/`)
        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}

/**
 * Traveler summary returned by by-phone API
 * Response shape: { message, response_code, data: { id, name } }
 */
export interface TravelerByPhoneData {
    id: string
    name: string
}

/**
 * Fetch traveler by phone number
 * GET /api/travelers/by-phone/?phone=...
 * Response: { message, response_code, data: { id, name } }
 */
export interface TravelerExpert {
    id: string
    name: string | null
    user_icon_url: string | null
}

/**
 * Fetch minimal author profile for comment authors.
 * GET /api/travelers/<id>/expert/ — gateway-cached (24h LRU).
 */
export const getTravelerExpert = async (expertId: string): Promise<TravelerExpert> => {
    const response = await apiClient.get<{ data?: TravelerExpert } & TravelerExpert>(
        `${API_CONFIG.BASE_URL}/api/travelers/${expertId}/expert/`
    )
    return response.data?.data ?? response.data
}

export const getTravelerByPhone = async (phone: string): Promise<TravelerByPhoneData | null> => {
    try {
        const response = await apiClient.get<{ message?: string; response_code?: string; data?: TravelerByPhoneData }>(
            `${API_CONFIG.BASE_URL}/api/travelers/phone/`,
            { params: { phone: phone.trim() } }
        )
        const data = response.data?.data
        return data?.id ? { id: data.id, name: data.name } : null
    } catch {
        return null
    }
}
