import { getTravelerTrips, TravelerTripsData } from '@/pages/Landing/api/travelerTrips'
import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { TRIP_QUERY_KEYS } from '../queryKeys'

export const useTravelerTripsAPI = (travelerId: string, refetchOnMount: boolean = false, refetchOnWindowFocus: boolean = false): UseQueryResult<TravelerTripsData, Error> => {
    return useQuery({
        queryKey: TRIP_QUERY_KEYS.travelerTrips(travelerId),
        queryFn: () => getTravelerTrips(travelerId),
        enabled: !!travelerId,
        refetchOnWindowFocus: refetchOnWindowFocus,
        refetchOnMount: refetchOnMount,
    })
}