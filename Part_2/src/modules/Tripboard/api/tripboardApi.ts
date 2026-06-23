import apiClient from '@/lib/api/apiClient'
import { ApiResponse, ContentCollection } from '@/modules/ContentCollection/types/contentCollection'

export const tripboardApi = {
    /**
     * Get traveler collection(s) by trip_id
     * GET /api/traveler-collections/?trip_id=<trip_id>
     * For invited/co-traveler access, pass ownerId to use is_invited=true&traveler_id=<ownerId>
     */
    getCollectionByTripId: async (tripId: string, ownerId?: string): Promise<ApiResponse<ContentCollection[]>> => {
        let url = `/api/traveler-collections/?trip_id=${encodeURIComponent(tripId)}`
        if (ownerId) {
            url += `&is_invited=true&traveler_id=${encodeURIComponent(ownerId)}`
        }
        const response = await apiClient.get(url)
        return response.data
    }
}
