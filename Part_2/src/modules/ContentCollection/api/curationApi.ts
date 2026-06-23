import apiClient from '@/lib/api/apiClient'

export interface CurationExperienceItem {
    id: string
    name: string
    display_props?: {
        landscape_image?: string
        portrait_image?: string
        description?: string
        [key: string]: unknown
    }
    content?: {
        verified_photos?: Array<{ id: string; url: string; [key: string]: unknown }>
        [key: string]: unknown
    }
    base_city?: { id?: string; name?: string; [key: string]: unknown }
    location?: { latitude?: number; longitude?: number; address?: string; [key: string]: unknown }
    short_description?: string
    [key: string]: unknown
}

export interface CurationExperiencesResponse {
    data?: CurationExperienceItem[]
    results?: CurationExperienceItem[]
}

/**
 * Search experiences for curation
 * GET /curation/experiences/?base_city=...&name=...
 */
export const getCurationExperiences = async (

    name?: string
): Promise<CurationExperienceItem[]> => {
    const params: Record<string, string> = {  }
    if (name != null && name.trim() !== '') {
        params.name = name.trim()
    }
    const response = await apiClient.get<CurationExperiencesResponse>('/curation/experiences/', {
        params
    })
    const data = response.data
    const list = data?.data ?? data?.results ?? (Array.isArray(data) ? data : [])
    return Array.isArray(list) ? list : []
}
