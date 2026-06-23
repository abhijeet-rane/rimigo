import { IATAFeature } from '@/api/ataAPI/types/getATAByAgentIdTypes'
import BurjKhalifaTicketRecommendationInput from '../components/Chat/Inputs/BurjKhalifa/BurjKhalifaTicketRecommendationInput'

interface BurjKhalifaPayload {
    assistant_identifier: string
    all_preferences: Record<string, unknown>
    feature: IATAFeature
}

interface GetAtaAgentByIdentifierProps {
    identifier: string
    feature: IATAFeature
    assistantIdentifier: string
    providedData?: Record<string, unknown> | null
    onComplete?: (payload: BurjKhalifaPayload) => void
}

export const getAtaAgentByIdentifier = ({
    identifier,
    feature,
    assistantIdentifier,
    providedData,
    onComplete
}: GetAtaAgentByIdentifierProps): React.ReactNode | null => {
    switch (identifier) {
        case 'burj_khalifa_recommendation':
            return (
                <BurjKhalifaTicketRecommendationInput
                    feature={feature}
                    assistantIdentifier={assistantIdentifier}
                    providedData={providedData}
                    onComplete={onComplete}
                />
            )

        // add different cases for  different identifiers here
        default:
            return null
    }
}
