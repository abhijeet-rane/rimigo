import { Check, Plus } from 'lucide-react'
import { useItineraryAddItem } from '../hooks/useItineraryAddItem'

interface ItineraryAddButtonProps {
    experienceId: string
    experienceName: string
    /** Card thumb forwarded to the day-picker (Best Things / all-listing
     *  cards aren't always in the section's experiences map). */
    experienceImage?: string | null
}

/**
 * Card-corner "+Add" / "Added" affordance.
 * Renders nothing without an ItineraryAddContext.
 */
const ItineraryAddButton = ({ experienceId, experienceName, experienceImage }: ItineraryAddButtonProps) => {
    const { isAdded, shouldHide, handleAdd } = useItineraryAddItem(experienceId, experienceName, experienceImage)

    if (isAdded) {
        return (
            <span
                aria-label="Added to itinerary"
                className="inline-flex items-center gap-1 rounded border border-primary-default bg-primary-default-80 px-2.5 py-1 text-[12px] font-bold font-red-hat-display text-primary-default shrink-0 cursor-default">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                Added
            </span>
        )
    }

    if (shouldHide) return null

    return (
        <button
            type="button"
            aria-label="Add to itinerary"
            onClick={handleAdd}
            className="inline-flex items-center gap-1 rounded border border-grey-4 bg-white px-2.5 py-1 text-[13px] font-bold font-red-hat-display text-primary-default hover:bg-grey-5 transition-colors shrink-0 cursor-pointer">
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            Add
        </button>
    )
}

export default ItineraryAddButton
