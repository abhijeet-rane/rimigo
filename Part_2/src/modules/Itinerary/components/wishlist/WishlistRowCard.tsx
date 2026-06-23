import { useEffect, useRef, useState } from 'react'
import { Check, MoreVertical, CalendarPlus } from 'lucide-react'
import SafeImage from '@/modules/Itinerary/components/SafeImage'
import Typography from '@/components/shared/Typography'
import ShortlistButton from '@/components/common/ShortlistButton'

interface WishlistRowCardProps {
    image: string
    title: string
    cityName: string
    isShortlisted: boolean
    isShortlisting?: boolean
    /** True when this experience already sits on the itinerary — shows the
     *  "Added" tick, mirroring the Best Things to do explore cards. */
    isInItinerary?: boolean
    /** Row body click — opens the SneakPeek. */
    onClick: () => void
    onToggleShortlist: () => void
    /** Three-dot → "Add to itinerary" — opens the day-picker modal. Omitted in
     *  read-only/viewer contexts, where the kebab is hidden. */
    onAddToItinerary?: () => void
}

/**
 * Compact wishlist row: square thumbnail left, title + city stacked, heart
 * trailing (same on desktop + mobile — tapping it un-shortlists / removes the
 * item). Tapping the body opens the SneakPeek; the heart stops propagation so
 * it doesn't trigger it. When the item is already on the itinerary an "Added"
 * tick shows; a three-dot menu offers "Add to itinerary" for items that aren't.
 */
const WishlistRowCard = ({
    image,
    title,
    cityName,
    isShortlisted,
    isShortlisting,
    isInItinerary = false,
    onClick,
    onToggleShortlist,
    onAddToItinerary
}: WishlistRowCardProps) => {
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!menuOpen) return
        const onDocClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
        }
        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [menuOpen])

    return (
        <div
            onClick={onClick}
            className="group flex items-center gap-3.5 rounded-2xl border border-grey-4 bg-white p-2.5 pr-3 cursor-pointer hover:border-grey-3 transition-colors">
            <SafeImage
                src={image}
                alt={title}
                width={80}
                height={80}
                radius={14}
                className="shrink-0"
            />
            <div className="flex-1 min-w-0">
                <Typography
                    size="15"
                    weight="bold"
                    family="manrope"
                    color="grey-0"
                    className="line-clamp-1">
                    {title}
                </Typography>
                <Typography
                    size="13"
                    weight="medium"
                    family="manrope"
                    color="grey-2"
                    className="line-clamp-1 mt-1">
                    {cityName}
                </Typography>
                {isInItinerary && (
                    <span
                        aria-label="Added to itinerary"
                        className="mt-1.5 inline-flex items-center gap-1 rounded border border-primary-default bg-primary-default-80 px-2 py-0.5 text-[11px] font-bold font-red-hat-display text-primary-default">
                        <Check className="w-3 h-3 stroke-[3]" />
                        Added
                    </span>
                )}
            </div>

            <div
                className="flex shrink-0 items-center gap-1"
                onClick={(e) => e.stopPropagation()}>
                {/* Heart — same on desktop + mobile. Tapping un-shortlists
                    (removes) the item. */}
                <ShortlistButton
                    variant="surface"
                    isShortlisted={isShortlisted}
                    isLoading={isShortlisting}
                    onShortlist={onToggleShortlist}
                />

                {onAddToItinerary && !isInItinerary && (
                    <div
                        ref={menuRef}
                        className="relative">
                        <button
                            type="button"
                            aria-label="More options"
                            onClick={() => setMenuOpen((v) => !v)}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-grey-1 transition-colors hover:bg-grey-5 hover:text-grey-0">
                            <MoreVertical className="h-[18px] w-[18px]" />
                        </button>
                        {menuOpen && (
                            <div className="absolute right-0 top-[calc(100%+4px)] z-30 min-w-[190px] overflow-hidden rounded-xl border border-grey-4 bg-white py-1 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)]">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMenuOpen(false)
                                        onAddToItinerary()
                                    }}
                                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium font-manrope text-grey-0 transition-colors hover:bg-grey-5">
                                    <CalendarPlus className="h-4 w-4 text-primary-default" />
                                    Add to itinerary
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default WishlistRowCard
