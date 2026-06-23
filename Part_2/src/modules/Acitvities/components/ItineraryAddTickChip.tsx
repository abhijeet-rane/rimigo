import { Check, Plus } from 'lucide-react'
import { useItineraryAddItem } from '../hooks/useItineraryAddItem'

interface ItineraryAddTickChipProps {
    experienceId: string
    experienceName: string
    /** Card thumb forwarded to the day-picker. */
    experienceImage?: string | null
}

/**
 * Small circular tick chip (sibling to the heart on Best Things cards).
 * Renders nothing without an ItineraryAddContext.
 */
const ItineraryAddTickChip = ({ experienceId, experienceName, experienceImage }: ItineraryAddTickChipProps) => {
    const { isAdded, shouldHide, handleAdd } = useItineraryAddItem(experienceId, experienceName, experienceImage)

    if (shouldHide) return null

    return (
        <button
            type="button"
            aria-label={isAdded ? 'Added to itinerary' : 'Add to itinerary'}
            aria-pressed={isAdded}
            onClick={handleAdd}
            className={`rounded-full border p-2 shadow-sm hover:shadow-md transition-all ${
                isAdded
                    ? 'bg-[#16a34a] border-[#16a34a] cursor-default'
                    : 'bg-white border-feature-card-border cursor-pointer'
            }`}>
            {isAdded ? (
                <Check className="w-4 h-4 text-white stroke-[3]" />
            ) : (
                <Plus className="w-4 h-4 text-grey-0 stroke-[2.5]" />
            )}
        </button>
    )
}

export default ItineraryAddTickChip
