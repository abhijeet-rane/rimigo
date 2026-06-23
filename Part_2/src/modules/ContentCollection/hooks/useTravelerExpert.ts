import { useQuery } from '@tanstack/react-query'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { getTravelerExpert, TravelerExpert } from '@/api/travelerAPI/travelerAPI'

export function useTravelerExpert(expertId: string | null | undefined) {
    return useQuery<TravelerExpert>({
        queryKey: ['traveler-expert', expertId],
        queryFn: () => getTravelerExpert(expertId as string),
        enabled: !!expertId,
        staleTime: HOURS_24,
        gcTime: HOURS_24,
        retry: 1
    })
}
