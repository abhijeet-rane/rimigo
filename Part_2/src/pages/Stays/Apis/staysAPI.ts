import apiClient from '@/lib/api/apiClient'
import { API_CONFIG } from '@/lib/api/apiConfig'
import { sseClient, type SSEEvent } from '@/lib/api/sseClient'
import type {
    GetRatesHistogramParams,
    RatesHistogramResponse,
    RatesHistogramData,
    RatesHistogramSSEResult,
    AccommodationFiltersResponse,
} from '../Types'

export const getStays = async (cityId: string, checkIn: string, checkOut: string) => {
    // TODO: Implement API call
    const response = await apiClient.get(`${API_CONFIG.BASE_URL}/api/stays?cityId=${cityId}&checkIn=${checkIn}&checkOut=${checkOut}`)
    return response.data
}

export const getStayById = async (stayId: string) => {
    // TODO: Implement API call
    const response = await apiClient.get(`${API_CONFIG.BASE_URL}/api/stays/${stayId}`)
    return response.data
}

export const filterStays = async (cityId: string, filters: Record<string, unknown>) => {
    // TODO: Implement API call
    const response = await apiClient.post(`${API_CONFIG.BASE_URL}/api/stays/filter`, {
        cityId,
        filters
    })
    return response.data
}

export const getPriceDistribution = async (cityId: string, checkIn: string, checkOut: string) => {
    // TODO: Implement API call
    const response = await apiClient.get(
        `${API_CONFIG.BASE_URL}/api/stays/price-distribution?cityId=${cityId}&checkIn=${checkIn}&checkOut=${checkOut}`
    )
    return response.data
}

/**
 * Fetch rates histogram for accommodations in a city
 * Returns price distribution buckets for available accommodations
 * May return 202 (processing) or 200 (completed) status
 */
export const getRatesHistogram = async (params: GetRatesHistogramParams): Promise<RatesHistogramResponse> => {
    const { cityId, check_in, check_out, num_adults = 2, child_ages = [], num_infants = 0 } = params

    const normalized = num_adults <= 2 ? { num_adults, child_ages, num_infants } : { num_adults: 2, child_ages: [], num_infants: 0 }

    // Build query parameters
    const queryParams = new URLSearchParams()
    queryParams.append('check_in', check_in)
    queryParams.append('check_out', check_out)
    queryParams.append('num_adults', normalized.num_adults.toString())
    queryParams.append('child_ages', JSON.stringify(normalized.child_ages))
    queryParams.append('num_infants', normalized.num_infants.toString())

    const url = `${API_CONFIG.BASE_URL}/curation/v2/cities/${cityId}/accommodations/rates_histogram/?${queryParams.toString()}`

    const response = await apiClient.get<RatesHistogramResponse>(url)
    return response.data
}

/**
 * Fetch rates histogram via SSE stream.
 * Replaces the polling-based fetchRatesHistogram with a single connection.
 *
 * @param params - City, dates, and guest configuration
 * @param options.onEvent - Called for every SSE event (queued → in_progress → completed)
 * @param options.signal - AbortSignal to cancel (e.g. on component unmount)
 * @returns Resolved SSEResult<RatesHistogramData>
 */
export const getRatesHistogramSSE = async (
    params: GetRatesHistogramParams,
    options?: {
        onEvent?: (event: SSEEvent<RatesHistogramData>) => void
        signal?: AbortSignal
    }
): Promise<RatesHistogramSSEResult> => {
    const { cityId, check_in, check_out, num_adults = 2, child_ages = [], num_infants = 0 } = params

    const normalized = num_adults <= 2 ? { num_adults, child_ages, num_infants } : { num_adults: 2, child_ages: [], num_infants: 0 }

    const queryParams = new URLSearchParams()
    queryParams.append('check_in', check_in)
    queryParams.append('check_out', check_out)
    queryParams.append('num_adults', normalized.num_adults.toString())
    queryParams.append('child_ages', JSON.stringify(normalized.child_ages))
    queryParams.append('num_infants', normalized.num_infants.toString())
    queryParams.append('stream', 'true')

    const url = `/curation/v2/cities/${cityId}/accommodations/rates_histogram/?${queryParams.toString()}`

    return sseClient<RatesHistogramData>({
        url,
        onEvent: options?.onEvent,
        signal: options?.signal,
        timeoutMs: 60_000, // rates generation can take 20-30s
    })
}

/**
 * Fetch available filters for accommodations in a city
 * Returns property types, amenities, and other filter options
 */
export const getAccommodationFilters = async (cityId: string): Promise<AccommodationFiltersResponse> => {
    const url = `${API_CONFIG.BASE_URL}/api/cities/${cityId}/filters/accommodations/`

    const response = await apiClient.get<AccommodationFiltersResponse>(url)
    return response.data
}

/**
 * Fetch personalized review summary for a hotel
 * Returns personalized summary and review tags
 * May return 202 (processing) or 200 (completed) status
 */
export const getReviewSummary = async (summaryRequestId: string): Promise<any> => {
    const url = `${API_CONFIG.BASE_URL}/stays/reviews/summary/?summary_request_id=${summaryRequestId}`

    const response = await apiClient.get(url)
    return response
}

/**
 * Get floating questions by request ID
 * May return 202 (processing) or 200 (completed) status
 */
export const getFloatingQuestions = async (questionsRequestId: string): Promise<any> => {
    const url = `${API_CONFIG.BASE_URL}/stays/floating-questions/?floating_questions_request_id=${questionsRequestId}`

    const response = await apiClient.get(url)
    return response
}
