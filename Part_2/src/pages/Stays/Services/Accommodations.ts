import { getAccommodations } from '../Apis/accommodationsAPI'
import type { GetAccommodationsParams, AccommodationsResponse, Accommodation, BudgetCategory, Pagination } from '../Types/accommodationTypes'

/**
 * Fetch accommodations — always hits the API (no client-side cache).
 */
export const fetchAccommodations = async (params: GetAccommodationsParams): Promise<AccommodationsResponse> => {
    return getAccommodations(params)
}

// Export types for convenience
export type { Accommodation, BudgetCategory, Pagination, GetAccommodationsParams }
