import { IATAFeature } from '@/api/ataAPI/types/getATAByAgentIdTypes'
import { MissingFields } from '@/modules/AtaAgent/types/AIAssisstantWindowTypes'
import { getAtaAgentByIdentifier } from '@/modules/AtaAgent/utils/getAtaAgentByIdentifier'

interface MissingFieldsSectionProps {
    features: IATAFeature[] | null
    missingFields: MissingFields | null
    providedData: Record<string, unknown> | null
    featureIdentifier: string | null
    interactionId: string | null
    onHandleNext: (payload: {
        assistant_identifier: string
        all_preferences: Record<string, unknown>
        feature: IATAFeature
        interactionId: string | null
    }) => void
}

const MissingFieldsSection = ({ features, providedData, featureIdentifier, interactionId, onHandleNext }: MissingFieldsSectionProps) => {
    // get the feature from the featureIdentifier
    const feature = features?.find((feature) => feature.identifier === featureIdentifier)

    if (!feature) return null
    // get ata component
    const contentBasedOnIdentifier = getAtaAgentByIdentifier({
        identifier: feature.identifier,
        feature: feature as IATAFeature,
        assistantIdentifier: featureIdentifier ?? '',
        providedData: providedData,
        onComplete: (payload) => {
            onHandleNext({
                ...payload,
                interactionId
            })
        }
    })

    return (
        <div>
            <div>
                <p>I need a bit more information to finish this recommendation.</p>
            </div>
            <div>{contentBasedOnIdentifier}</div>
        </div>
    )
}

export default MissingFieldsSection
