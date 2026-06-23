import { Plus } from 'lucide-react'

/** Select / Selected button shown beside the hotel name on the list-view card.
 *
 * Mobile unselected: purple `+` icon (no text).
 * Mobile selected:   hidden (the green check circle in the image overlay handles it).
 * Desktop unselected: purple "Add to itinerary" text.
 * Desktop selected:   green "Added" text.
 */
export function SelectItineraryButton({
    isSelected,
    hasConflict = false,
    tooltip,
    onClick,
}: {
    isSelected: boolean
    hasConflict?: boolean
    tooltip?: string
    onClick: (e: React.MouseEvent) => void
}) {
    return (
        <button
            type="button"
            aria-label={tooltip || 'Add to itinerary'}
            title={tooltip || 'Add to itinerary'}
            onClick={(e) => { e.stopPropagation(); onClick(e) }}
            className="shrink-0 cursor-pointer focus:outline-none relative">
            {isSelected ? (
                <>
                    {/* Mobile selected: hidden — image overlay shows the green check */}
                    {/* Desktop selected: green "Added" text */}
                    <span className="hidden sm:inline text-[14px] font-bold font-red-hat-display text-[#00A878] tracking-[-0.24px] leading-4 whitespace-nowrap">
                        In your Itinerary
                    </span>
                </>
            ) : (
                <>
                    {/* Mobile unselected: purple + icon */}
                    <span className="flex sm:hidden items-center justify-center w-6 h-6 rounded-full border border-primary-default text-primary-default">
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </span>
                    {/* Desktop unselected: purple "Add to itinerary" text */}
                    <span className="hidden sm:inline text-[14px] font-bold font-red-hat-display text-primary-default tracking-[-0.24px] leading-4 whitespace-nowrap">
                        Add to Itinerary
                    </span>
                </>
            )}
            {hasConflict && !isSelected && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-1 -top-1 flex h-2 w-2 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-default/60 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-default" />
                </span>
            )}
        </button>
    )
}
