import { createPortal } from 'react-dom'
import { ExternalLink } from 'lucide-react'
import CreatorAvatar from '@/components/Collection/CreatorAvatar'

interface CollectionCreatorBarProps {
    /** Creator display name — fills "{name}'s tripboard". */
    name: string
    /** Creator avatar (Instagram profile image, or the Rimigo compass). */
    imageUrl?: string | null
    /** Rimigo fallback (no external creator): show the compass, no IG badge. */
    isRimigo?: boolean
    /** Opens the creator's full collection / tripboard. */
    onViewTrip: () => void
    /**
     * 'floating' — mobile-only pill pinned to the bottom of the viewport.
     *   Portaled to <body> so it pins correctly inside the Activities tab's
     *   inner scroll container (same reason WatchDiscoverFloatingButton does).
     * 'inline'   — desktop-only compact button placed in the breadcrumb row.
     */
    variant: 'floating' | 'inline'
}

/**
 * "These experiences are from {name}'s tripboard" → View trip CTA, shown on
 * the in-tab collection listing. Mobile: a floating bottom pill. Desktop: a
 * compact button slotted into the breadcrumb row.
 */
const CollectionCreatorBar: React.FC<CollectionCreatorBarProps> = ({ name, imageUrl, isRimigo, onViewTrip, variant }) => {
    if (variant === 'inline') {
        // Desktop: the full bar as a rounded lavender pill (avatar + copy +
        // CTA), matching the mobile band's look, slotted at the right of the
        // breadcrumb row.
        return (
            <div className="hidden md:flex ml-auto shrink-0 items-center gap-3 rounded-full border border-[#D9CEF6] bg-[#ECE7FB] py-1.5 pl-2 pr-2">
                <CreatorAvatar
                    name={name}
                    imageUrl={imageUrl}
                    isRimigo={isRimigo}
                    size={34}
                    badgeClassName="w-3.5 h-3.5"
                    badgeIconClassName="w-2.5 h-2.5"
                />
                <p className="text-[13px] leading-tight font-manrope font-medium text-grey-0 whitespace-nowrap">
                    These experiences are from <span className="font-bold">{name}</span>&apos;s tripboard
                </p>
                <button
                    type="button"
                    onClick={onViewTrip}
                    className="inline-flex items-center gap-1.5 rounded-full bg-grey-0 text-white px-4 py-2 text-[13px] font-bold font-red-hat-display hover:bg-grey-1 transition-colors cursor-pointer">
                    View trip
                    <ExternalLink className="w-3.5 h-3.5" />
                </button>
            </div>
        )
    }

    if (typeof document === 'undefined') return null

    // Full-width band stuck to the bottom edge (NOT a floating card) — soft
    // lavender background with a top border/shadow for separation, matching
    // the app's other bottom CTA bars.
    return createPortal(
        <div
            className="md:hidden fixed inset-x-0 bottom-0 z-40 bg-[#ECE7FB] border-t border-[#D9CEF6] shadow-[0_-2px_12px_rgba(0,0,0,0.06)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex items-center gap-3 px-4 py-3">
                <CreatorAvatar
                    name={name}
                    imageUrl={imageUrl}
                    isRimigo={isRimigo}
                    size={40}
                    badgeClassName="w-3.5 h-3.5"
                    badgeIconClassName="w-2.5 h-2.5"
                />
                <p className="flex-1 min-w-0 text-[13px] leading-[18px] font-manrope font-medium text-grey-0">
                    These experiences are from <span className="font-bold">{name}</span>&apos;s tripboard
                </p>
                <button
                    type="button"
                    onClick={onViewTrip}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-grey-0 text-white px-4 py-2.5 text-[13px] font-bold font-red-hat-display hover:bg-grey-1 transition-colors cursor-pointer">
                    View trip
                    <ExternalLink className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>,
        document.body
    )
}

export default CollectionCreatorBar
