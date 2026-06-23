import { useQuery } from '@tanstack/react-query'
import { getAgentBySpace } from '@/api/ataAPI/ataApi'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'

export const useItineraryAgentId = () => {
    const { data: itineraryAgentId } = useQuery({
        queryKey: ['agentBySpace', 'itinerary_agent'],
        queryFn: () => getAgentBySpace('itinerary_agent'),
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    return itineraryAgentId
}
