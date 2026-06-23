import { useQuery } from '@tanstack/react-query'
import { getAgentBySpace } from '@/api/ataAPI/ataApi'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import { useTravelerTrips } from '@/pages/Landing/context/travelerTripsContext'
import SearchHeader from '@/components/common/SearchHeader'
import type { ItineraryHooksConfig } from './chat/types'

interface SearchHeaderCalendarProps {
    hooksConfig?: ItineraryHooksConfig
    /** When true, hides the floating expert/assistant button (e.g. when showing Create Itinerary Wizard) */
    hideAssistant?: boolean
}

const SearchHeaderCalendar = ({ hooksConfig, hideAssistant = false }: SearchHeaderCalendarProps) => {
    const { activeTrip } = useTravelerTrips()

    // Define the agent space (same as CalendarAssistant)
    const ATA_AGENT_SPACE = 'itinerary_agent'

    const activeTripId = activeTrip?.trip_id

    // Fetch agent ID by space (just like in CalendarAssistant)
    const { data: agentId, isLoading: isAgentIdLoading } = useQuery({
        queryKey: ['agentBySpace', ATA_AGENT_SPACE],
        queryFn: () => getAgentBySpace(ATA_AGENT_SPACE),
        enabled: true,
        staleTime: HOURS_24 // Cache for 24 hours since agent IDs don't change frequently
    })
    const isAssistantEnabled = !hideAssistant && !isAgentIdLoading && !!agentId && !!activeTripId
    return (
        <SearchHeader
            iconSrc="https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/explore_stays.png"
            pageName="Itinerary"
            centerTitleOnMobile
            initialActiveSegment={null}
            whereConfig={{ enabled: false }}
            whenConfig={{ enabled: false }}
            guestsConfig={{ enabled: false }}
            preferencesConfig={{ enabled: false }}
            // Assistant configuration - only enable if agent ID is loaded and not hidden (e.g. in wizard)
            assistantConfig={{
                enabled: isAssistantEnabled,
                ataId: agentId,
                tripId: activeTrip?.trip_id || undefined,
                assistantType: 'ItineraryExpertChat',
                entityType: 'trip_id',
                entityId: activeTripId ?? '',
                inputData: {
                    trip_id: activeTripId ?? ''
                },
                hooksConfig: hooksConfig
            }}
            filterConfig={{ enabled: false }}
            sortConfig={{ enabled: false }}
        />
    )
}

export default SearchHeaderCalendar
