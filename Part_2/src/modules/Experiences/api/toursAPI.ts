import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import { ToursResponseType, TourDataStatusResponse } from '../types/toursResponseTypes'
import { toast } from 'sonner'

export const getToursForExperience = async (experienceId: string, checkIn?: string | null): Promise<ToursResponseType> => {
    try {
        const params = new URLSearchParams()
        if (checkIn) {
            params.append('check_in', checkIn)
        }
        const queryString = params.toString()
        const url = `${API_CONFIG.BASE_URL}/api/tours-experience-mapping/experience/${experienceId}/tours/${queryString ? `?${queryString}` : ''}`
        const response = await apiClient.get(url)
        return response.data
    } catch (error) {
        toast.error(`Error fetching tours for experience: ${error instanceof Error ? error.message : 'Unknown error'}`)
        throw error
    }
}

export const getTourDataStatus = async (cacheKey: string): Promise<TourDataStatusResponse> => {
    try {
        const response = await apiClient.get(
            `${API_CONFIG.BASE_URL}/api/tour-data-status/${cacheKey}/`
        )
        return response.data
    } catch (error) {
        toast.error(`Error fetching tour data status: ${error instanceof Error ? error.message : 'Unknown error'}`)
        throw error
    }
}
