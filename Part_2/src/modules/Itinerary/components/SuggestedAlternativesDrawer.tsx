import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, ArrowLeftRight, ChevronRight, Star, MapPin, Clock } from 'lucide-react'
import SafeImage from './SafeImage'
import { cn } from '@/lib/utils'

export interface AlternativeSlot {
    id: string
    title: string
    image?: string | null
    rating?: number | null
    ratingCount?: number | null
    location?: string | null
    duration?: string | null
    priceLabel?: string | null
    tags?: string[]
    reason?: string
}

interface SuggestedAlternativesDrawerProps {
    isOpen: boolean
    onClose: () => void
    alternatives: AlternativeSlot[]
    currentTitle: string
    onSwap: (alternative: AlternativeSlot) => void
    isLoading?: boolean
}

function AlternativeCard({
    alt,
    onSwap,
    swapPending
}: {
    alt: AlternativeSlot
    onSwap: (alt: AlternativeSlot) => void
    swapPending: boolean
}) {
    const [hovered, setHovered] = useState(false)

    return (
        <div
            className={cn(
                'group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-200',
                hovered
                    ? 'border-primary-default/40 shadow-[0_6px_20px_rgba(112,17,246,0.12)]'
                    : 'border-grey-4 shadow-[0_2px_8px_rgba(15,23,42,0.06)]',
                'bg-white'
            )}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}>
            {alt.image && (
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                    <SafeImage
                        src={alt.image}
                        alt={alt.title}
                        fill
                        className={cn(
                            'object-cover transition-transform duration-500 ease-out',
                            hovered ? 'scale-[1.04]' : 'scale-100'
                        )}
                    />
                    <div
                        className="absolute inset-0"
                        style={{
                            background: 'linear-gradient(to top, rgba(13,12,13,0.55) 0%, transparent 55%)'
                        }}
                        aria-hidden
                    />
                    {alt.priceLabel && (
                        <span className="absolute bottom-2 left-2 rounded-md bg-white/90 px-2 py-0.5 font-manrope text-[11px] font-bold text-grey-0 shadow-sm">
                            {alt.priceLabel}
                        </span>
                    )}
                    {alt.rating != null && (
                        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-white/90 px-2 py-0.5 font-manrope text-[11px] font-bold text-amber-700 shadow-sm">
                            <Star
                                size={10}
                                className="fill-amber-500 text-amber-500"
                            />
                            {alt.rating.toFixed(1)}
                            {alt.ratingCount != null && (
                                <span className="font-normal text-grey-2">({alt.ratingCount.toLocaleString()})</span>
                            )}
                        </span>
                    )}
                </div>
            )}

            <div className="flex flex-1 flex-col gap-2 p-3">
                <p className="line-clamp-2 font-manrope text-[13px] font-semibold leading-[17px] text-grey-0">
                    {alt.title}
                </p>

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    {alt.location && (
                        <span className="flex items-center gap-1 font-manrope text-[11px] text-grey-2">
                            <MapPin
                                size={10}
                                className="shrink-0 text-grey-3"
                            />
                            {alt.location}
                        </span>
                    )}
                    {alt.duration && (
                        <span className="flex items-center gap-1 font-manrope text-[11px] text-grey-2">
                            <Clock
                                size={10}
                                className="shrink-0 text-grey-3"
                            />
                            {alt.duration}
                        </span>
                    )}
                </div>

                {alt.tags && alt.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {alt.tags.slice(0, 3).map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full bg-primary-default/8 px-2 py-0.5 font-manrope text-[10px] font-semibold text-primary-default">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {alt.reason && (
                    <p className="line-clamp-2 font-manrope text-[11px] leading-[15px] text-grey-2 italic">
                        {alt.reason}
                    </p>
                )}

                <button
                    type="button"
                    disabled={swapPending}
                    onClick={() => onSwap(alt)}
                    className={cn(
                        'mt-auto flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-manrope text-[12px] font-semibold transition-all duration-200',
                        swapPending
                            ? 'cursor-not-allowed bg-grey-5 text-grey-3'
                            : 'cursor-pointer bg-primary-default text-white hover:bg-primary-dark active:scale-[0.98]'
                    )}>
                    <ArrowLeftRight
                        size={13}
                        className="shrink-0"
                    />
                    {swapPending ? 'Swapping…' : 'Swap in'}
                </button>
            </div>
        </div>
    )
}

function SkeletonCard() {
    return (
        <div className="flex flex-col overflow-hidden rounded-xl border border-grey-4 bg-white">
            <div className="aspect-[16/9] w-full animate-skeleton rounded-none" />
            <div className="flex flex-col gap-2 p-3">
                <div className="h-4 w-3/4 animate-skeleton rounded-md" />
                <div className="h-3 w-1/2 animate-skeleton rounded-md" />
                <div className="mt-1 h-7 w-full animate-skeleton rounded-lg" />
            </div>
        </div>
    )
}

export function SuggestedAlternativesDrawer({
    isOpen,
    onClose,
    alternatives,
    currentTitle,
    onSwap,
    isLoading = false
}: SuggestedAlternativesDrawerProps) {
    const [swappingId, setSwappingId] = useState<string | null>(null)
    const drawerRef = useRef<HTMLDivElement>(null)

    const handleSwap = useCallback(
        async (alt: AlternativeSlot) => {
            setSwappingId(alt.id)
            try {
                await onSwap(alt)
            } finally {
                setSwappingId(null)
                onClose()
            }
        },
        [onSwap, onClose]
    )

    useEffect(() => {
        if (!isOpen) {
            setSwappingId(null)
        }
    }, [isOpen])

    return (
        <AnimatePresence initial={false}>
            {isOpen && (
                <motion.div
                    ref={drawerRef}
                    key="alternatives-drawer"
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -8 }}
                    transition={{
                        height: { type: 'spring', damping: 26, stiffness: 340, mass: 0.7 },
                        opacity: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
                        y: { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
                    }}
                    style={{ overflow: 'hidden' }}
                    className="relative z-[15] w-full">
                    <div
                        className="rounded-b-2xl border border-t-0 border-primary-default/25 bg-white"
                        style={{
                            background: 'linear-gradient(to bottom, #fdfaff 0%, #ffffff 100%)',
                            boxShadow: '0 8px 24px -4px rgba(112,17,246,0.10), 0 2px 8px -2px rgba(15,23,42,0.06)'
                        }}>
                        <div className="flex items-center justify-between border-b border-primary-default/10 px-3 py-2.5">
                            <div className="flex items-center gap-2">
                                <div
                                    className="flex h-5 w-5 items-center justify-center rounded-full"
                                    style={{ background: 'linear-gradient(135deg, #7011f6 0%, #ab72fb 100%)' }}>
                                    <ArrowLeftRight
                                        size={10}
                                        className="text-white"
                                    />
                                </div>
                                <span className="font-red-hat-display text-[12px] font-[645] tracking-[-0.24px] text-grey-0">
                                    Alternatives
                                </span>
                                <span className="font-manrope text-[11px] text-grey-2 truncate max-w-[120px]">
                                    instead of "{currentTitle}"
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex h-6 w-6 items-center justify-center rounded-full text-grey-2 transition-colors hover:bg-grey-5 hover:text-grey-0"
                                aria-label="Close alternatives">
                                <X size={14} />
                            </button>
                        </div>

                        <div className="p-3">
                            {isLoading ? (
                                <div className="grid grid-cols-2 gap-2.5">
                                    <SkeletonCard />
                                    <SkeletonCard />
                                </div>
                            ) : alternatives.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 py-6 text-center">
                                    <div
                                        className="flex h-10 w-10 items-center justify-center rounded-full"
                                        style={{ background: '#f5edff' }}>
                                        <ArrowLeftRight
                                            size={18}
                                            className="text-primary-default"
                                        />
                                    </div>
                                    <p className="font-red-hat-display text-[13px] font-semibold text-grey-0">
                                        No alternatives found
                                    </p>
                                    <p className="max-w-[240px] font-manrope text-[12px] text-grey-2">
                                        We couldn't find alternatives for this slot right now.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2.5">
                                    {alternatives.map((alt) => (
                                        <AlternativeCard
                                            key={alt.id}
                                            alt={alt}
                                            onSwap={handleSwap}
                                            swapPending={swappingId === alt.id}
                                        />
                                    ))}
                                </div>
                            )}

                            {!isLoading && alternatives.length > 0 && (
                                <button
                                    type="button"
                                    className="mt-2.5 flex w-full items-center justify-center gap-1 font-manrope text-[11px] font-semibold text-primary-default transition-opacity hover:opacity-70"
                                    onClick={onClose}>
                                    Keep current slot
                                    <ChevronRight size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
