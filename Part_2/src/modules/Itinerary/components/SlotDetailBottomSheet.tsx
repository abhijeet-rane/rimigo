import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { X, Clock, ExternalLink } from 'lucide-react'
import Typography from '@/components/shared/Typography'
import {
    SlotDetailPanelBody,
    slotDetailHeaderDerived,
    getSlotVenueName,
    getSlotDirectionsUrl,
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

interface SlotDetailBottomSheetProps {
    event: any
    isOpen: boolean
    onClose: () => void
    /** When slot is an experience/visit opened from notes sheet, open full SneakPeek */
    onViewFullExperience?: () => void
    /** Transport detail only — renders the Edit pencil + footer CTA. */
    onEdit?: () => void
    /** Transport detail only — renders the Delete icon. */
    onDelete?: () => void
}

export const SlotDetailBottomSheet = ({ event, isOpen, onClose, onViewFullExperience, onEdit, onDelete }: SlotDetailBottomSheetProps) => {
    const { style, title, timeRange, estimatedCost, currency } = slotDetailHeaderDerived(event)
    const Icon = style.icon
    const venueName = getSlotVenueName(event)
    const useTransportHero = isTransportSlotHeroRenderable(event)

    // Photo banner — only for meal / restaurant / place slots with a
    // real Places / V2 photo. Stock meal placeholders skipped to
    // match the desktop modal's policy (see SlotDetailDesktopModal).
    const { image: heroImage, hasRealPhoto } = resolveMealPlaceImage(event, event?.dayIndex ?? 0)
    const showHeroImage = hasRealPhoto && !!heroImage

    const experienceId = event?.slotData?.id || event?.slot_data?.id
    const showExperienceCta = Boolean(onViewFullExperience) && Boolean(experienceId) && (event?.type === 'experience' || event?.type === 'visit')

    const directionsUrl = getSlotDirectionsUrl(event)

    const footer =
        showExperienceCta || directionsUrl ? (
            <div className="flex flex-col gap-2">
                {directionsUrl && (
                    <a
                        href={directionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full rounded-xl border border-grey-3 bg-white py-3 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer">
                        <span className="text-[14px] font-medium font-manrope text-grey-0">Get Directions</span>
                        <ExternalLink
                            size={15}
                            className="text-grey-0"
                        />
                    </a>
                )}
                {showExperienceCta && (
                    <button
                        type="button"
                        onClick={onViewFullExperience}
                        className="w-full rounded-xl bg-grey-0 py-3 text-center active:scale-[0.98] transition-transform cursor-pointer">
                        <span className="text-[14px] font-semibold font-manrope text-white">View full experience</span>
                    </button>
                )}
            </div>
        ) : null

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-[9997]"
                    />

                    {/* Bottom Sheet */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="fixed inset-x-0 bottom-0 z-[9998] bg-white rounded-t-[20px] shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Drag handle */}
                        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
                            <div className="w-9 h-1 rounded-full bg-grey-4" />
                        </div>

                        {/* Photo banner (meal / place with real photo only) */}
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

                        {/* Header */}
                        {useTransportHero ? (
                            <>
                                <TransportJourneyHeader
                                    event={event}
                                    onClose={onClose}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                                <div
                                    className="flex flex-1 flex-col gap-3.5 overflow-y-auto overscroll-contain px-4 pb-6 pt-4"
                                    style={{ scrollbarWidth: 'none' }}>
                                    {(() => {
                                        const flightPreview = getFlightPreviewProps(event)
                                        if (flightPreview) {
                                            return (
                                                <>
                                                    <FlightSlotPreviewCard
                                                        sectionId={flightPreview.sectionId}
                                                        leg={flightPreview.leg}
                                                        onClose={onClose}
                                                    />
                                                    {!isTransportDetailEmpty(event) && (
                                                        <>
                                                            <TransportCostChip event={event} />
                                                            <SlotDetailPanelBody
                                                                event={event}
                                                                footer={footer}
                                                                onClose={onClose}
                                                            />
                                                        </>
                                                    )}
                                                </>
                                            )
                                        }
                                        return isTransportDetailEmpty(event) ? (
                                            <TransportEmptyState
                                                event={event}
                                                onEdit={onEdit}
                                            />
                                        ) : (
                                            <>
                                                <TransportCostChip event={event} />
                                                <SlotDetailPanelBody
                                                    event={event}
                                                    footer={footer}
                                                    onClose={onClose}
                                                />
                                            </>
                                        )
                                    })()}
                                </div>
                                <TransportDetailFooter
                                    event={event}
                                    onEdit={onEdit}
                                />
                            </>
                        ) : (
                            <>
                                <div className="px-4 pt-1 pb-3 shrink-0">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            {/* Title + Kind pill row */}
                                            <div className="flex items-start gap-2">
                                                <Typography
                                                    size="18"
                                                    weight="semibold"
                                                    family="redhat"
                                                    color="grey-0"
                                                    className="leading-tight flex-1 min-w-0">
                                                    {venueName || title}
                                                </Typography>
                                                <div
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${style.bg} shrink-0 mt-0.5`}>
                                                    <Icon
                                                        size={11}
                                                        className={style.text}
                                                    />
                                                    <span className={`text-[10px] font-semibold font-manrope ${style.text}`}>{style.label}</span>
                                                </div>
                                            </div>

                                            {/* Time + Cost + Directions row */}
                                            <div className="flex items-center gap-3 mt-1.5">
                                                {timeRange && (
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
                                                )}
                                                {estimatedCost && (
                                                    <Typography
                                                        size="13"
                                                        weight="semibold"
                                                        family="manrope"
                                                        color="grey-0">
                                                        {currency} {estimatedCost}
                                                    </Typography>
                                                )}
                                            </div>
                                        </div>

                                        {/* Close button */}
                                        <button
                                            onClick={onClose}
                                            className="w-8 h-8 rounded-full bg-grey-5 flex items-center justify-center shrink-0 mt-1">
                                            <X
                                                size={16}
                                                className="text-grey-1"
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Scrollable Content */}
                                <div
                                    className="flex-1 overflow-y-auto overscroll-contain px-4 pb-8"
                                    style={{ scrollbarWidth: 'none' }}>
                                    <SlotDetailPanelBody
                                        event={event}
                                        footer={footer}
                                        onClose={onClose}
                                    />
                                </div>
                            </>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
