import { AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { getAgentBySpace } from '@/api/ataAPI/ataApi'
import { HOURS_24 } from '@/constants/commons/tanstackConstants'
import AIAssistantWindowCalender from '@/pages/Stays/Components/AiAssiantantWindowCalender'
import type { ItineraryHooksConfig } from './chat/types'

interface CalendarAssistantProps {
    isOpen: boolean
    onClose: () => void
    tripId?: string
    hooksConfig?: ItineraryHooksConfig
}

const CalendarAssistant = ({ isOpen, onClose, tripId, hooksConfig }: CalendarAssistantProps) => {
    const ATA_AGENT_SPACE = 'itinerary_agent'

    // Fetch agent ID by space (just like in HotelDetailPage)
    const { data: agentId, isLoading: isAgentIdLoading } = useQuery({
        queryKey: ['agentBySpace', ATA_AGENT_SPACE],
        queryFn: () => getAgentBySpace(ATA_AGENT_SPACE),
        enabled: true,
        staleTime: HOURS_24 // Cache for 24 hours since agent IDs don't change frequently
    })

    // Don't render if agent ID is still loading
    if (isAgentIdLoading || !agentId) {
        return null
    }

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div className="w-fit h-screen pb-30">
                        <AIAssistantWindowCalender
                            renderAsInline={true}
                            isOpen={isOpen}
                            onClose={onClose}
                            ataId={agentId}
                            tripId={tripId}
                            assistantType="ItineraryExpertChat"
                            entityType="itinerary"
                            entityId={tripId ?? ''}
                            inputData={{
                                trip_id: tripId ?? ''
                            }}
                            hooksConfig={hooksConfig}
                        />
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}

export default CalendarAssistant
