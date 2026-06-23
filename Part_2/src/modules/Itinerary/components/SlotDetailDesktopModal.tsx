import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Clock } from 'lucide-react'
import Typography from '@/components/shared/Typography'
import {
    SlotDetailPanelBody,
    slotDetailHeaderDerived,
    getSlotVenueName,
    DirectionsButton,
    TransportJourneyHeader,
    TransportCostChip,
    TransportDetailFooter,
    TransportEmptyState,
    isTransportSlotHeroRenderable,
    isTransportDetailEmpty
} from './slotDetailShared'
import FlightSlotPreviewCard, { getFlightPreviewProps } from './FlightSlotPreviewCard'
import SafeImage from './SafeImage'
import { resolveMealPlaceImage } from '../utils/mealPlaceImage'

type Props = {
    event: any | null
    isOpen: boolean
    onClose: () => void
    /** Transport detail only — renders the Edit pencil + footer CTA. */
    onEdit?: () => void
    /** Transport detail only — renders the Delete icon. */
    onDelete?: () => void
}

/** Centered desktop dialog for slot notes / attachments / suggestions (non–experience cards). */
export function SlotDetailDesktopModal({ event, isOpen, onClose, onEdit, onDelete }: Props) {
    const frozenEventRef = useRef<any>(null)
    if (event) frozenEventRef.current = event
    const displayEvent = event ?? frozenEventRef.current

    const closeAll = useCallback(() => {
        onClose()
    }, [onClose])

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeAll()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isOpen, closeAll])

    if (!displayEvent) return null

    const { style, title, timeRange, estimatedCost, currency } = slotDetailHeaderDerived(displayEvent)
    const Icon = style.icon
    const venueName = getSlotVenueName(displayEvent)
    const useTransportHero = isTransportSlotHeroRenderable(displayEvent)

    // Photo banner — only for meal / restaurant / place slots, and
    // only when we actually have a real venue photo (Places CDN URL
    // or V2 display image). Stock meal placeholders are deliberately
    // skipped here: a detail modal full-width food tile would look
    // misleading for a place card and generic for a meal. Falls back
    // to no banner in those cases.
    const { image: heroImage, hasRealPhoto } = resolveMealPlaceImage(displayEvent, displayEvent.dayIndex ?? 0)
    const showHeroImage = hasRealPhoto && !!heroImage

    const modal = (
        <AnimatePresence
            onExitComplete={() => {
                if (!isOpen) frozenEventRef.current = null
            }}>
            {isOpen && (
                <>
                    <motion.div
                        key="slot-detail-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        onClick={closeAll}
                        className="fixed inset-0 z-[9996] bg-black/45 backdrop-blur-[2px]"
                    />

                    <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            key="slot-detail-panel"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="slot-detail-desktop-title"
                            initial={{ opacity: 0, scale: 0.96, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 8 }}
                            transition={{ type: 'spring', damping: 30, stiffness: 380, mass: 0.85 }}
                            className={`pointer-events-auto flex max-h-[min(85dvh,760px)] w-full flex-col overflow-hidden border border-grey-4/90 bg-white shadow-[0_32px_64px_-12px_rgba(20,8,60,0.32)] ${
                                useTransportHero ? 'max-w-[560px] rounded-[18px]' : 'max-w-lg rounded-2xl'
                            }`}>
                            {useTransportHero ? (
                                <>
                                    <TransportJourneyHeader
                                        event={displayEvent}
                                        onClose={closeAll}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                    />
                                    <div
                                        className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
                                        style={{ scrollbarWidth: 'thin' }}>
                                        {(() => {
                                            const flightPreview = getFlightPreviewProps(displayEvent)
                                            // Flight slots get the rich preview as their primary
                                            // body — replaces the generic "Route set" empty state.
                                            // Notes / attachments / cost still render below when
                                            // the user has added them.
                                            if (flightPreview) {
                                                return (
                                                    <>
                                                        <FlightSlotPreviewCard
                                                            sectionId={flightPreview.sectionId}
                                                            leg={flightPreview.leg}
                                                            onClose={closeAll}
                                                        />
                                                        {!isTransportDetailEmpty(displayEvent) && (
                                                            <>
                                                                <TransportCostChip event={displayEvent} />
                                                                <SlotDetailPanelBody
                                                                    event={displayEvent}
                                                                    onClose={closeAll}
                                                                />
                                                            </>
                                                        )}
                                                    </>
                                                )
                                            }
                                            // Non-flight transport slots keep the original
                                            // empty-state / detail-body branch.
                                            return isTransportDetailEmpty(displayEvent) ? (
                                                <TransportEmptyState
                                                    event={displayEvent}
                                                    onEdit={onEdit}
                                                />
                                            ) : (
                                                <>
                                                    <TransportCostChip event={displayEvent} />
                                                    <SlotDetailPanelBody
                                                        event={displayEvent}
                                                        onClose={closeAll}
                                                    />
                                                </>
                                            )
                                        })()}
                                    </div>
                                    <TransportDetailFooter
                                        event={displayEvent}
                                        onEdit={onEdit}
                                    />
                                </>
                            ) : (
                                <>
                                    {showHeroImage && (
                                        <div className="relative w-full aspect-[2/1] shrink-0 border-b border-grey-4/70">
                                            <SafeImage
                                                src={heroImage}
                                                alt={title || 'Slot photo'}
                                                fill
                                                radius={0}
                                            />
                                        </div>
                                    )}
                                    <div className="flex shrink-0 items-start justify-between gap-3 border-b border-grey-4/70 bg-white px-5 pb-4 pt-5">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start gap-2">
                                                <Typography
                                                    id="slot-detail-desktop-title"
                                                    size="18"
                                                    weight="semibold"
                                                    family="redhat"
                                                    color="grey-0"
                                                    className="leading-tight flex-1 min-w-0">
                                                    {venueName || title}
                                                </Typography>
                                                <div
                                                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 ${style.bg} mt-0.5`}>
                                                    <Icon
                                                        size={11}
                                                        className={style.text}
                                                    />
                                                    <span className={`text-[10px] font-semibold font-manrope ${style.text}`}>{style.label}</span>
                                                </div>
                                            </div>
                                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                                                {timeRange ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock
                                                            size={12}
                                                            className="text-grey-2"
                                                        />
                                                        <Typography
                                                            size="13"
                                                            weight="medium"
                                                            family="manrope"
                                                            color="grey-2">
                                                            {timeRange}
                                                        </Typography>
                                                    </div>
                                                ) : null}
                                                {estimatedCost ? (
                                                    <Typography
                                                        size="13"
                                                        weight="semibold"
                                                        family="manrope"
                                                        color="grey-0">
                                                        {currency} {estimatedCost}
                                                    </Typography>
                                                ) : null}
                                                <DirectionsButton event={displayEvent} />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={closeAll}
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-grey-5 transition-colors hover:bg-grey-4/80"
                                            aria-label="Close">
                                            <X
                                                size={18}
                                                className="text-grey-1"
                                            />
                                        </button>
                                    </div>
                                    <div
                                        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4"
                                        style={{ scrollbarWidth: 'thin' }}>
                                        <SlotDetailPanelBody
                                            event={displayEvent}
                                            onClose={closeAll}
                                        />
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )

    return typeof document !== 'undefined' ? createPortal(modal, document.body) : null
}
