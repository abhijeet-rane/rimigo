import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { checkAvailability } from '../Apis/accommodationsAPI'
import { HOURS_12 } from '@/constants/commons/tanstackConstants'

interface UseStaysCheckAvailibilityPricesParams {
    accommodations: any[]
    enabled: boolean
    cityId?: string
    checkIn?: string
    checkOut?: string
    adults?: number
    childAges?: number[]
    tripId?: string
}

interface UseStaysCheckAvailibilityPricesReturn {
    checkAvailibilityPrices: Record<string, number | null>
    isFetchingCheckAvailibilityPrices: boolean
    unpricedHubIds: string[]
}

const extractHubId = (acc: any): string => {
    const raw = acc?.zentrum_hub_id ?? (typeof acc?.id === 'string' ? acc.id : acc?.id?.toString())
    return raw ?? ''
}

export const useStaysCheckAvailibilityPrices = ({
    accommodations,
    enabled,
    cityId,
    checkIn,
    checkOut,
    adults,
    childAges,
    tripId,
}: UseStaysCheckAvailibilityPricesParams): UseStaysCheckAvailibilityPricesReturn => {
    const unpricedHubIds = useMemo(() => {
        const ids: string[] = []
        const seen = new Set<string>()
        accommodations.forEach((acc) => {
            const hubId = extractHubId(acc)
            if (!hubId || seen.has(hubId)) return
            const rate = acc.rate_per_night ?? acc.estimated_rate
            if (typeof rate === 'number' && rate > 0) return
            seen.add(hubId)
            ids.push(hubId)
        })
        return ids.sort()
    }, [accommodations])

    const queryEnabled = enabled && unpricedHubIds.length > 0 && !!cityId && !!checkIn && !!checkOut

    const { data, isFetching } = useQuery({
        queryKey: ['stays-check-availibility-prices', cityId, checkIn, checkOut, adults, (childAges ?? []).join(','), unpricedHubIds],
        queryFn: async () => {
            const response = await checkAvailability({
                hotel_ids: unpricedHubIds,
                check_in: checkIn!,
                check_out: checkOut!,
                num_adults: adults,
                child_ages: childAges,
                city_id: cityId,
                trip_id: tripId,
            })
            const out: Record<string, number | null> = {}
            unpricedHubIds.forEach((id) => {
                const r = response.rates?.[id]
                out[id] = typeof r === 'number' && r > 0 ? r : null
            })
            return out
        },
        enabled: queryEnabled,
        staleTime: HOURS_12,
        gcTime: HOURS_12,
        retry: 1,
    })

    return {
        checkAvailibilityPrices: data ?? {},
        isFetchingCheckAvailibilityPrices: queryEnabled && isFetching,
        unpricedHubIds,
    }
}
