// src/hooks/useAccommodationDeal.ts
import { useQuery } from '@tanstack/react-query'
import {
    getAccommodationDealResult,
    GetAccommodationDealResultResponse,
    requestAccommodationDeal,
    RequestDealAccommodationPayload
} from '../api/DealsDataApi'
import { decodeOccupancies } from '@/types/occupancy'

export const buildAccommodationDealPayload = (url: string, tripId?: string): RequestDealAccommodationPayload | null => {
    try {
        const parsedUrl = new URL(url)
        const params = Object.fromEntries(parsedUrl.searchParams.entries())

        // Parse child_ages from URL params
        // URL param is 'children_age' (comma-separated string like "5,7")
        let childAges: number[] = []
        if (params.children_age) {
            childAges = params.children_age
                .split(',')
                .filter(Boolean)
                .map((age) => parseInt(age.trim(), 10))
                .filter((age) => !Number.isNaN(age))
        } else if (params.child_ages) {
            // Fallback: try to parse as JSON or comma-separated
            try {
                childAges = JSON.parse(params.child_ages)
            } catch {
                // If JSON parse fails, treat as comma-separated string
                childAges = params.child_ages
                    .split(',')
                    .filter(Boolean)
                    .map((age) => parseInt(age.trim(), 10))
                    .filter((age) => !Number.isNaN(age))
            }
        }

        const adults = params.adults ? Number(params.adults) : 2 // default fallback
        const children = params.children ? Number(params.children) : 0

        const payload: RequestDealAccommodationPayload = {
            check_in: params.check_in,
            check_out: params.check_out,
            adults,
            children,
            // Backend expects child_ages to be empty when there are no children
            child_ages: children > 0 ? childAges : [],
            zentrum_hub_id: params.zentrum_hub_id,
            hotel_name: decodeURIComponent(params.hotel_name || ''),
            currency: params.currency || 'INR',
            city: params.city_name || params.city || '',
            trip_id: tripId || params.trip_id || ''
        }
        // Include multi-room occupancies if present in URL
        if (params.occupancies) {
            payload.occupancies = decodeOccupancies(params.occupancies)
        }
        return payload
    } catch (error) {
        return null
    }
}
export const useAccommodationDeal = (url: string, tripId?: string ,enabled: boolean = true ) => {
    return useQuery({
        queryKey: ['accommodationDeal', url, tripId],
        queryFn: async () => {
            const payload = buildAccommodationDealPayload(url, tripId)
            if (!payload) throw new Error('Invalid payload from URL')
            const response = await requestAccommodationDeal(payload)
            return response
        },
        enabled: !!url && enabled,
        staleTime: 5 * 60 * 1000, // 5 min — backend dedup returns same ID, avoid re-POST on every mount
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnMount: false
    })
}
export const useAccommodationDealResult = (hotelSearchRequestId?: string, dealsEnabled: boolean = true) => {
    const isEnabled = Boolean(hotelSearchRequestId) && dealsEnabled

    return useQuery<GetAccommodationDealResultResponse>({
        queryKey: ['accommodationDealResult', hotelSearchRequestId],
        queryFn: async () => {
            if (!hotelSearchRequestId) {
                throw new Error('Missing parameters')
            }
            return getAccommodationDealResult(hotelSearchRequestId)
        },

        enabled: isEnabled,
        refetchOnWindowFocus: false,
        refetchOnMount: false,

        staleTime: 5 * 60 * 1000, // 5 min — once COMPLETED, no need to re-poll
        gcTime: 10 * 60 * 1000,

        refetchInterval: (query) => {
            if (!isEnabled) return false

            const dealStatus = query?.state?.data?.deal_request_status

            if (!dealStatus) return 3000
            if (dealStatus === 'NOT_STARTED' || dealStatus === 'IN_PROGRESS' || dealStatus === 'PARTIAL') {
                return 3000
            }

            return false
        }
    })
}

// PARTIAL
