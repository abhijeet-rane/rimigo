import { ReactNode } from 'react'
import ShortlistButton from '@/components/common/ShortlistButton'
import { useShortlistHidden } from '../context/ShortlistDisplayContext'

interface CardShortlistOverlayProps {
    isShortlisted: boolean
    isShortlisting: boolean
    onToggle: () => Promise<void> | void
    /** Distance from the top of the card. Defaults to `top-3` (matches list/group cards). */
    topClassName?: string
    /** Optional sibling rendered to the LEFT of the heart inside the same overlay (e.g. an
     *  "Add to itinerary" tick chip on Best Things cards). */
    leading?: ReactNode
}

/** Absolute-positioned heart button. Suppressed when `ShortlistDisplayProvider` marks the subtree as hidden. */
const CardShortlistOverlay: React.FC<CardShortlistOverlayProps> = ({
    isShortlisted,
    isShortlisting,
    onToggle,
    topClassName = 'top-3',
    leading
}) => {
    if (useShortlistHidden()) return null
    return (
        <div className={`absolute right-3 ${topClassName} z-10 flex items-center gap-2`}>
            {leading}
            <ShortlistButton
                ariaLabel="Save to shortlist"
                isShortlisted={isShortlisted}
                onShortlist={async () => {
                    await onToggle()
                }}
                isLoading={isShortlisting}
            />
        </div>
    )
}

export default CardShortlistOverlay
