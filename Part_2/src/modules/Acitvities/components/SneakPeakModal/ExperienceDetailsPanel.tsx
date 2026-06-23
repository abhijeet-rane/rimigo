import React, { useRef, useState } from 'react'
import { Clock, MapPin, Plus, Heart } from 'lucide-react'
import type { SneakPeekResponse } from '@/modules/Experiences/types/sneakPeekTypes'
import CustomShimmer from '@/components/shared/Shimmer'
import SneakPeekDetailSections from './SneakPeekDetailSections'
import TipsList from '@/components/shared/TipsList'
import { Attachment, SneakPeekAttachments } from './SneakPeekAttachments'
import ToursCardModal from './ToursModalCard'
import AddToursDialog from '@/modules/Tripboard/components/AddToursDialog'
import { useUserInfo } from '@/hooks/useUserInfo'
import { TOUR_GUIDE_ICON } from '@/constants/thiingsIcons'

/**
 * Parses markdown-style links [text](url) and returns React elements
 * @param text - Text that may contain markdown links
 * @returns Array of React elements (text nodes and anchor tags)
 */
const parseMarkdownLinks = (text: string): React.ReactNode[] => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match
    let key = 0

    while ((match = linkRegex.exec(text)) !== null) {
        // Add text before the link
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index))
        }

        // Add the link
        const linkText = match[1]
        const linkUrl = match[2]
        parts.push(
            <a
                key={`link-${key++}`}
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-default hover:underline">
                {linkText}
            </a>
        )

        lastIndex = linkRegex.lastIndex
    }

    // Add remaining text after the last link (or entire text if no links found)
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex))
    }

    return parts
}

interface ExperienceDetailsPanelProps {
    sneakPeekData: SneakPeekResponse | undefined
    experienceName: string
    bestMonths: { value: string; description: string } | null
    duration: { value: string; description: string } | null
    walkingRequired: { value: string; description: string } | null
    valueForMoney: { value: string; description: string } | null
    onViewDetails: () => void
    isLoading: boolean
    onNoToursChange?: (hasNoTours: boolean) => void
    triggerType?: string
    attachments?: Attachment[]
    /** Itinerary slot — shown below description (same data as mobile bottom sheet). */
    slotNotes?: string
    slotSuggestionReasons?: string[]
    /** Wishlist binding shown as the desktop secondary CTA (right of "View Details"). */
    isShortlisted?: boolean
    isShortlisting?: boolean
    onShortlistToggle?: () => void
}

const ExperienceDetailsPanel: React.FC<ExperienceDetailsPanelProps> = ({
    sneakPeekData,
    experienceName,
    bestMonths,
    duration,
    attachments,
    walkingRequired,
    valueForMoney,
    onViewDetails,
    onNoToursChange,
    isLoading,
    triggerType,
    slotNotes,
    slotSuggestionReasons,
    isShortlisted = false,
    isShortlisting = false,
    onShortlistToggle
}) => {
    const safeAttachments = attachments ?? []
    const hasTips = Boolean((slotNotes && slotNotes.trim()) || (slotSuggestionReasons && slotSuggestionReasons.length > 0))
    const toursRef = useRef<HTMLDivElement>(null)
    const [hasNoTours, setHasNoTours] = useState(false)
    const { isRimigoInternal } = useUserInfo()
    const [isAddToursOpen, setIsAddToursOpen] = useState(false)
    const canAddTours = isRimigoInternal && !!sneakPeekData?.experience_id
    const handleToursEmptyChange = (isEmpty: boolean) => {
        setHasNoTours(isEmpty)
        onNoToursChange?.(isEmpty)
    }

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col h-full min-h-0 relative">
                {/* Scrollable Content with Shimmer */}
                <div className="flex flex-col overflow-y-auto p-6 space-y-4 flex-1 min-h-0 md:pb-32">
                    {/* Landscape Image Shimmer */}
                    <div className="shrink-0">
                        <CustomShimmer
                            height={200}
                            radius={8}
                            className="w-[200px] mb-4"
                        />
                    </div>

                    {/* Title Shimmer */}
                    <CustomShimmer
                        height={24}
                        className="w-3/4"
                    />

                    {/* Short Description Shimmer */}
                    <div className="space-y-2">
                        <CustomShimmer
                            height={16}
                            className="w-full"
                        />
                        <CustomShimmer
                            height={16}
                            className="w-5/6"
                        />
                    </div>

                    {/* Summary Cards Shimmer - Grid Layout */}
                    <div className="border border-grey-4 rounded-[12px] overflow-visible">
                        <div className="grid grid-cols-2 auto-rows-auto items-start">
                            {/* Card 1 */}
                            <div className="border-r border-b border-grey-4 min-h-0">
                                <div className="flex items-start gap-3 p-3">
                                    <CustomShimmer
                                        height={16}
                                        radius={4}
                                        className="w-4 mt-0.5 shrink-0"
                                    />
                                    <div className="flex-1 flex flex-col gap-2">
                                        <CustomShimmer
                                            height={16}
                                            className="w-24"
                                        />
                                        <CustomShimmer
                                            height={20}
                                            className="w-16"
                                        />
                                        <CustomShimmer
                                            height={12}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                            {/* Card 2 */}
                            <div className="border-b border-grey-4 min-h-0">
                                <div className="flex items-start gap-3 p-3">
                                    <CustomShimmer
                                        height={16}
                                        radius={4}
                                        className="w-4 mt-0.5 shrink-0"
                                    />
                                    <div className="flex-1 flex flex-col gap-2">
                                        <CustomShimmer
                                            height={16}
                                            className="w-20"
                                        />
                                        <CustomShimmer
                                            height={20}
                                            className="w-12"
                                        />
                                        <CustomShimmer
                                            height={12}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                            {/* Card 3 */}
                            <div className="border-r border-grey-4 min-h-0">
                                <div className="flex items-start gap-3 p-3">
                                    <CustomShimmer
                                        height={16}
                                        radius={4}
                                        className="w-4 mt-0.5 shrink-0"
                                    />
                                    <div className="flex-1 flex flex-col gap-2">
                                        <CustomShimmer
                                            height={16}
                                            className="w-28"
                                        />
                                        <CustomShimmer
                                            height={24}
                                            radius={8}
                                            className="w-16"
                                        />
                                        <CustomShimmer
                                            height={12}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                            {/* Card 4 */}
                            <div className="min-h-0">
                                <div className="flex items-start gap-3 p-3">
                                    <CustomShimmer
                                        height={16}
                                        radius={4}
                                        className="w-4 mt-0.5 shrink-0"
                                    />
                                    <div className="flex-1 flex flex-col gap-2">
                                        <CustomShimmer
                                            height={16}
                                            className="w-32"
                                        />
                                        <CustomShimmer
                                            height={24}
                                            radius={8}
                                            className="w-20"
                                        />
                                        <CustomShimmer
                                            height={12}
                                            className="w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons Shimmer */}
                <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-grey-4 p-6 pt-4 z-10">
                    <div className="flex gap-3">
                        <CustomShimmer
                            height={48}
                            radius={9999}
                            className="flex-1"
                        />
                        <CustomShimmer
                            height={48}
                            radius={9999}
                            className="flex-1"
                        />
                    </div>
                </div>
            </div>
        )
    }

    if (!sneakPeekData) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-grey-2">Failed to load experience details</p>
            </div>
        )
    }

    // Build location + timings strings
    const location = sneakPeekData.city_name || sneakPeekData.country_name || ''
    const timings = sneakPeekData.operating_hours || ''
    const isSlotTrigger = triggerType === 'itinerary_view_page'
    const toursBlock = (
        <div className="flex flex-col gap-3">
            {!hasNoTours && (
                <div ref={toursRef} className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[14px] font-semibold font-red-hat-display text-grey-0">
                            Exclusive tickets & tours
                        </p>
                        {canAddTours && (
                            <button
                                type="button"
                                onClick={() => setIsAddToursOpen(true)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-grey-3 text-[11px] font-manrope font-medium text-grey-1 hover:border-primary-default hover:text-primary-default cursor-pointer transition-colors"
                                title="Add a new tour to this experience">
                                <Plus className="w-3 h-3" />
                                Add tour
                            </button>
                        )}
                    </div>
                    <ToursCardModal
                        onEmptyChange={handleToursEmptyChange}
                        experienceId={sneakPeekData.experience_id}
                        bookingWindow={''}
                        triggerType={triggerType}
                    />
                </div>
            )}
            {hasNoTours && canAddTours && (
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[14px] font-semibold font-red-hat-display text-grey-0">
                        Exclusive tickets & tours
                    </p>
                    <button
                        type="button"
                        onClick={() => setIsAddToursOpen(true)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-dashed border-grey-3 text-[11px] font-manrope font-medium text-grey-1 hover:border-primary-default hover:text-primary-default cursor-pointer transition-colors"
                        title="Add a new tour to this experience">
                        <Plus className="w-3 h-3" />
                        Add tour
                    </button>
                </div>
            )}
            {hasNoTours && (
                <div className="flex flex-col items-center justify-center rounded-md border border-grey-4 bg-grey-5/40 px-6 py-8 text-center">
                    <img
                        src={TOUR_GUIDE_ICON}
                        alt=""
                        aria-hidden
                        className="w-14 h-14 mb-1"
                    />
                    <div className='flex items-center flex-col'>
                        <p className="text-[16px] font-semibold font-red-hat-display text-grey-0">
                            No tours available
                        </p>
                        <p className="text-[14px] font-medium font-manrope text-grey-2">
                            Please check back later
                        </p>
                    </div>
                </div>
            )}
        </div>
    )

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 relative">
            {/* Scrollable Content */}
            <div className="flex flex-col overflow-y-auto overflow-x-hidden p-6 max-md:pt-0 space-y-5 flex-1 min-h-0 md:pb-28">

                {/* ── Compact header: thumbnail + title + location + time ── */}
                {/* pr-24 avoids overlap with the absolute-positioned shortlist + close buttons in ModalContainer */}
                <div className="flex items-start gap-4 md:pr-24 max-md:hidden">
                    {sneakPeekData.landscape_image && (
                        <div className="w-[96px] h-[96px] rounded-xl overflow-hidden shrink-0">
                            <img
                                src={sneakPeekData.landscape_image}
                                alt={experienceName}
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-[18px] font-[550] font-red-hat-display leading-[24px] text-grey-0">
                            {experienceName}
                        </p>
                        {location && (
                            <div className="flex items-center gap-1.5 mt-1">
                                <MapPin size={14} className="text-grey-2 shrink-0" />
                                <span className="text-[13px] font-medium font-manrope text-grey-2">{location}</span>
                            </div>
                        )}
                        {timings && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <Clock size={14} className="text-grey-2 shrink-0" />
                                <span className="text-[13px] font-medium font-manrope text-grey-2">{timings}</span>
                            </div>
                        )}
                        {/* ── Short description — sits directly under the title
                            so the user reads context before scanning the
                            attachments / tips below. Desktop only; the
                            mobile sheet hides it per design. ── */}
                        {sneakPeekData.short_description && (
                            <p className="mt-2 text-[14px] font-medium font-manrope leading-[18px] text-grey-2 line-clamp-2">
                                {parseMarkdownLinks(sneakPeekData.short_description)}
                            </p>
                        )}
                    </div>
                </div>

                {/* Body sections — auto-divider between visible siblings via divide-y. */}
                <div className="flex flex-col [&>*+*]:mt-5 [&>*+*]:pt-5 [&>*+*]:border-t [&>*+*]:border-grey-4">
                    {safeAttachments.length > 0 && <SneakPeekAttachments attachments={safeAttachments} />}
                    {hasTips && <TipsList notes={slotNotes} suggestions={slotSuggestionReasons} />}
                    {isSlotTrigger && toursBlock}
                    <SneakPeekDetailSections
                        sneakPeekData={sneakPeekData}
                        bestMonths={bestMonths}
                        duration={duration}
                        walkingRequired={walkingRequired}
                        valueForMoney={valueForMoney}
                    />
                    {!isSlotTrigger && toursBlock}
                </div>
                {/* Keep ToursCardModal mounted while empty so its fetch + callback still run. */}
                {hasNoTours && (
                    <div className="hidden">
                        <ToursCardModal
                            onEmptyChange={handleToursEmptyChange}
                            experienceId={sneakPeekData.experience_id}
                            bookingWindow={''}
                            triggerType={triggerType}
                        />
                    </div>
                )}
            </div>

            {/* ── Sticky Action Buttons ── */}
            <div className="sticky bottom-0 max-md:hidden bg-white/95 backdrop-blur-sm border-t border-grey-4 px-6 py-4 z-10">
                <div className="flex gap-3">
                    {/* View Details — primary */}
                    <button
                        onClick={onViewDetails}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-grey-0 text-white hover:bg-grey-1 transition-colors cursor-pointer">
                        <span className="text-[14px] font-semibold font-manrope">View Details</span>
                    </button>

                    {/* Wishlist — secondary CTA. Active state mirrors the
                        rest of the app (primary-default fill + white text). */}
                    {onShortlistToggle && (
                        <button
                            type="button"
                            onClick={onShortlistToggle}
                            disabled={isShortlisting}
                            aria-pressed={isShortlisted}
                            aria-label={isShortlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-full transition-colors cursor-pointer disabled:opacity-60 ${
                                isShortlisted
                                    ? 'bg-primary-default text-white hover:bg-primary-light'
                                    : 'border border-grey-3 text-grey-0 hover:bg-grey-5'
                            }`}>
                            <Heart
                                size={16}
                                className={isShortlisted ? 'fill-white text-white' : 'text-grey-0'}
                            />
                            <span className="text-[14px] font-semibold font-manrope whitespace-nowrap">
                                {isShortlisted ? 'Added to wishlist' : 'Add to wishlist'}
                            </span>
                        </button>
                    )}
                </div>
            </div>
            {canAddTours && sneakPeekData?.experience_id && (
                <AddToursDialog
                    open={isAddToursOpen}
                    onOpenChange={setIsAddToursOpen}
                    experienceId={sneakPeekData.experience_id}
                    experienceName={experienceName}
                />
            )}
        </div>
    )
}

export default ExperienceDetailsPanel
