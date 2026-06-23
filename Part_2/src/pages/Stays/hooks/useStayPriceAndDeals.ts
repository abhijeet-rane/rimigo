import { useQuery } from '@tanstack/react-query'
import { type PlatformPrice } from '@/api/hotelPriceCompare/hotelPriceCompareAPI'
import { useHotelDeals } from '@/hooks/useHotelDeals'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'

interface UseStayPriceAndDealsParams {
    zentrumHubId: string
    stayName: string
    ratePerNight: number | null
    cityName?: string
    tripId?: string
    checkIn?: string // YYYY-MM-DD format
    checkOut?: string // YYYY-MM-DD format
    adults?: number
    children?: number
    infants?: number
    childrenAge?: number[]
    rimigoPrice?: boolean
}

interface UseStayPriceAndDealsReturn {
    displayPrice: number
    isPriceLoading: boolean
    isPriceUnavailable: boolean
    deals: PlatformPrice[]
    isDealsLoading: boolean
}

/**
 * Custom hook to fetch price and deals for a stay from compare API
 * Price is determined from the cheapest deal returned by the compare API
 */
export const useStayPriceAndDeals = ({
    zentrumHubId,
    stayName,
    ratePerNight,
    cityName,
    tripId,
    checkIn,
    checkOut,
    adults = 2,
    children = 0,
    infants = 0,
    childrenAge = [],
    rimigoPrice = true
}: UseStayPriceAndDealsParams): UseStayPriceAndDealsReturn => {
    const finalAdults = adults || 2
    const finalChildren = children || 0
    const finalInfants = infants || 0
    const finalChildrenAge = childrenAge || []
    const finalTripId = tripId || '' // Default tripId like PricingSidebar

    // Use fetchSingleDeal from useHotelDeals hook (common function used across the app)
    const { fetchSingleDeal } = useHotelDeals()

    // Fetch deals using TanStack Query - only if both check-in and check-out dates are provided
    const {
        data: dealsData,
        isLoading: isDealsLoading
    } = useQuery({
        queryKey: [
            'stay-deals',
            zentrumHubId,
            checkIn,
            checkOut,
            finalAdults,
            finalChildren,
            finalInfants,
            JSON.stringify(finalChildrenAge),
            stayName,
            cityName,
            finalTripId
        ],
        queryFn: async () => {
            if (!checkIn || !checkOut || !zentrumHubId) {
                return []
            }

            try {
                // Use fetchSingleDeal from useHotelDeals hook (same as PricingSidebar)
                const platforms = await fetchSingleDeal({
                    zentrumHubId,
                    hotelName: stayName || 'Hotel',
                    city: cityName || '',
                    checkIn,
                    checkOut,
                    adults: finalAdults,
                    children: finalChildren,
                    childAges: finalChildrenAge,
                    tripId: finalTripId,
                    currency: 'INR',
                    rimigoPrice
                })

                return platforms || []
            } catch {
                return []
            }
        },
        enabled: !!zentrumHubId && !!checkIn && !!checkOut && !!finalTripId, // Only fetch if required params (including tripId) are provided
        staleTime: HOURS_24, // Cache for 5 minutes - deals can change
        gcTime: HOURS_24, // Keep in cache for 24 hours
        retry: 1 // Retry once on failure
    })

    // Determine display price from compare API deals (single source of truth)
    // Use the cheapest deal price, or fallback to ratePerNight only if no deals available
    const deals = dealsData || []
    const cheapestDeal = deals.length > 0 
        ? deals.reduce((cheapest, current) => 
            current.price < cheapest.price ? current : cheapest
          )
        : null
    
    // Only use ratePerNight as fallback if no deals are available
    // Compare API is the single source of truth for prices
    const displayPrice = cheapestDeal?.price ?? (ratePerNight || 0)
    const isPriceUnavailable = !isDealsLoading && deals.length === 0 && !ratePerNight

    return {
        displayPrice,
        isPriceLoading: isDealsLoading,
        isPriceUnavailable,
        deals,
        isDealsLoading
    }
}
