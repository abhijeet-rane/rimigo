import { useQuery } from '@tanstack/react-query'
import { fetchRatesHistogram } from '@/pages/Stays/Services/RatesHistogram'
import type { GuestsData } from '@/components/common/SearchBar/modals/GuestsModal'

interface UseFilterRatesHistogramParams {
    cityId: string
    checkIn: string
    checkOut: string
    guestsData: GuestsData
    /** Gate the request — typically true only on the For You view. */
    enabled?: boolean
}

/**
 * Rates histogram fetch for the merged Filters dialog's Budget slider.
 *
 * The query key matches `StaysExploreSection`'s rates query exactly so React
 * Query dedupes the network call (one in-flight stream serves both the budget
 * slider and the For You list). Status `completed` and `estimated` both count
 * as "ready" — same convention as the explore section.
 */
export const useFilterRatesHistogram = ({
    cityId,
    checkIn,
    checkOut,
    guestsData,
    enabled = true,
}: UseFilterRatesHistogramParams) => {
    const query = useQuery({
        queryKey: [
            'explore-rates',
            cityId,
            checkIn,
            checkOut,
            guestsData.adults,
            guestsData.children,
            guestsData.infants,
            (guestsData.children_age ?? []).join(','),
        ],
        queryFn: () =>
            fetchRatesHistogram({
                cityId,
                check_in: checkIn,
                check_out: checkOut,
                num_adults: guestsData.adults,
                child_ages: guestsData.children_age,
                num_infants: guestsData.infants,
            }),
        enabled: enabled && Boolean(cityId && checkIn && checkOut),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: 2,
    })

    const histogram = query.data?.data
    const isReady = histogram?.status === 'completed' || histogram?.status === 'estimated'

    return { histogram, isReady, query }
}
