// RestaurantEvent.tsx
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Typography from '@/components/shared/Typography'
import { BaseEventLayout } from './BaseEventLayout'
import SafeImage from './SafeImage'
import { AiSuggestionsList } from './AiSuggestion'
import { EventOverlayPortal } from './EventOverlayPortal'
import { createPortal } from 'react-dom'
import SneakPeekModal from '@/modules/Acitvities/components/SneakPeekModal'
import { useIsMobile } from '../hooks/ItineraryHook'
import { Heart, Star, MapPin } from 'lucide-react'
import { HERO_IMAGE_MAX_HEIGHT_PX } from '../constants'
import { placePhotoProxyUrl } from '../utils/mealPlaceImage'

/**
 * Format a Google Places price level (0-4) into a dollar-sign string.
 *
 * 0 → "Free", 1 → "$", 2 → "$$", 3 → "$$$", 4 → "$$$$".
 * Returns null if the level is missing or out of range so the caller
 * can omit the badge entirely rather than render an empty pill.
 */
const formatPriceLevel = (level: number | null | undefined): string | null => {
    if (level == null) return null
    if (level === 0) return 'Free'
    if (level >= 1 && level <= 4) return '$'.repeat(level)
    return null
}

export const RestaurantEvent = ({
    eventInfo,
    onEdit,
    onDelete,
    canEdit = true
}: {
    eventInfo: any
    onEdit?: (eventInfo: any) => void
    onDelete?: (eventInfo: any) => void
    canEdit?: boolean
    onViewMap?: (experienceId: string, dayIndex?: number) => void
}) => {
    const props = eventInfo.event.extendedProps
    const title = eventInfo.event.title || 'Restaurant Visit'
    const start = eventInfo.event.start
    const end = eventInfo.event.end
    const isHighlighted = props.isHighlighted || false
    const [expanded, setExpanded] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)
    const [overlayStyle, setOverlayStyle] = useState<any>(null)
    const isMobile = useIsMobile()
    const MEAL_IMAGE_MAP: Record<string, string[]> = {
        breakfast: ['https://media.rimigo.com/1765760238217_image-ct6TpZ91pix5oetpcsAiRNdWwloxva.png'],
        lunch: ['https://media.rimigo.com/1765760260371_image-g5x4D885dtv5R6gsLOR4xfwmaN8Vne.png'],
        dinner: [
            'https://media.rimigo.com/1765795179203_image-7QufcMTGFHaF0gEiQwJ2Ki8ZVJekLL.png',
            'https://media.rimigo.com/1765795179901_image-HbCnYirZv0o05ffcBstUMZcPgOwlWQ.png',
            'https://media.rimigo.com/1765795180519_image-NLrIRa8dkKTGFrmmVD65dRmyISi2De.png'
        ]
    }

    const FALLBACK_IMAGES = [
        'https://media.rimigo.com/1765760280370_image-lajTvnCG0rsoksTEwSYSZaFk9DdR4b.png',
        'https://media.rimigo.com/1765760260371_image-g5x4D885dtv5R6gsLOR4xfwmaN8Vne.png'
    ]
    const getRandomFrom = (arr: string[], seed = 0) => arr[seed % arr.length]

    const getMealTypeFromSlotType = (slotType?: string) => {
        if (!slotType) return null
        if (['morning'].includes(slotType)) return 'breakfast'
        if (['afternoon'].includes(slotType)) return 'lunch'
        if (['evening', 'night'].includes(slotType)) return 'dinner'
        return null
    }

    const getMealTypeFromTime = (start?: Date) => {
        if (!start) return null
        const hour = start.getUTCHours()
        if (hour < 11) return 'breakfast'
        if (hour < 17) return 'lunch'
        return 'dinner'
    }

    const formatTimeNoConvert = (value: string | Date) => {
        if (value instanceof Date) {
            const hours = value.getUTCHours()
            const minutes = value.getUTCMinutes()
            const period = hours >= 12 ? 'PM' : 'AM'
            const hour12 = hours % 12 || 12
            return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
        }

        if (typeof value === 'string') {
            const timePart = value.split('T')[1]?.slice(0, 5) || ''
            let [hour, minute] = timePart.split(':').map(Number)
            const period = hour >= 12 ? 'PM' : 'AM'
            hour = hour % 12 || 12
            return `${hour}:${minute.toString().padStart(2, '0')} ${period}`
        }
        return ''
    }

    const timeRange = start && end ? `${formatTimeNoConvert(start)} - ${formatTimeNoConvert(end)}` : 'Time unavailable'

    // Calculate duration in minutes
    const durationMinutes = start && end ? (end.getTime() - start.getTime()) / (1000 * 60) : 0
    const isShortDuration = durationMinutes < 70 // Less than 1h 10m

    const dayIndex = eventInfo.event.extendedProps.dayIndex ?? 0

    const suggestion = props?.suggestion_reasons ?? []
    const mealTypeFromData = props?.slotData?.meal_type
    const slotType = props?.slot_type
    const inferredFromSlot = getMealTypeFromSlotType(slotType)
    const inferredFromTime = getMealTypeFromTime(start)

    const finalMealType = mealTypeFromData || inferredFromSlot || inferredFromTime

    // ── Image source priority ──────────────────────────────────────────
    // 0. ``place_id`` via the photo proxy (/curation/places/<id>/photo/) —
    //    resolved on demand, stable, never expires. Preferred whenever the
    //    slot carries a place_id (the meal enricher now stores place_id only).
    // 1. ``photo_url`` — LEGACY pre-resolved Google CDN URL on pre-proxy
    //    slots that have no place_id. May be expired.
    // 2. ``display_props.landscape_image`` — V2 generator pipeline image.
    // 3. ``MEAL_IMAGE_MAP[mealType]`` — hardcoded breakfast/lunch/dinner
    //    placeholder so the card never renders blank.
    // 4. ``FALLBACK_IMAGES`` — last resort.
    const placeId: string | undefined = props?.slotData?.place_id
    const proxyPhotoUrl: string | undefined = placeId ? placePhotoProxyUrl(placeId) : undefined
    const placesPhotoUrl: string | undefined = props?.slotData?.photo_url
    const displayPropsImage: string | undefined = props?.slotData?.display_props?.landscape_image
    const realPhoto = proxyPhotoUrl || placesPhotoUrl || displayPropsImage
    const hasRealPhoto = !!realPhoto
    const image =
        realPhoto ||
        (finalMealType && MEAL_IMAGE_MAP[finalMealType]
            ? getRandomFrom(MEAL_IMAGE_MAP[finalMealType], dayIndex)
            : getRandomFrom(FALLBACK_IMAGES, dayIndex))

    // ── Places metadata for the info bar ───────────────────────────────
    // These are populated by the meal enricher when the slot was
    // resolved against Google Places. Old V2-generated meals only carry
    // ``meal_type`` so all of these are undefined and the info bar
    // simply doesn't render.
    const placeName: string | undefined = props?.slotData?.name
    // Place slots use the user-entered title as the authoritative label;
    // only meal/restaurant slots substitute the attached Google Place
    // name (which is often a fuller "Refresh Seafood Restaurant" vs.
    // the action-y "Dinner at Refresh").
    const isPlaceKind = (props?.kind || props?.type) === 'place'
    const heroDisplayTitle = isPlaceKind ? title : (placeName || title)
    const formattedAddress: string | undefined = props?.slotData?.formatted_address
    const rating: number | undefined = props?.slotData?.rating
    const userRatingsCount: number | undefined = props?.slotData?.user_ratings_count
    const priceLevelString: string | null = formatPriceLevel(props?.slotData?.price_level)
    const hasInfoBar = rating != null || priceLevelString != null || formattedAddress != null

    // Hero layout: only when we have a real (Places-resolved or
    // V2-generated) photo. Without a real photo, hero would be a
    // full-bleed placeholder which doesn't add any value, so we keep
    // the compact thumbnail layout for legacy meals.
    const useHeroLayout = hasRealPhoto && !isShortDuration
    const isTallEnoughForBigInfo = durationMinutes >= 90

    // Update overlay position and close on scroll
    useLayoutEffect(() => {
        if (!expanded) return

        const updatePosition = () => {
            if (!cardRef.current) return
            const rect = cardRef.current.getBoundingClientRect()
            setOverlayStyle({
                position: 'fixed',
                top: rect.bottom,
                left: rect.left,
                width: rect.width,
                zIndex: 9999
            })
        }

        const close = () => setExpanded(false)
        updatePosition()

        const calendarRoot = document.getElementById('calendar-root')
        const fcScroller = calendarRoot?.querySelector('.fc-scroller')

        window.addEventListener('resize', close)
        window.addEventListener('scroll', close, true)
        window.addEventListener('wheel', close, { passive: true })
        window.addEventListener('touchmove', close, { passive: true })
        calendarRoot?.addEventListener('scroll', close, { passive: true })
        fcScroller?.addEventListener('scroll', close, { passive: true })

        return () => {
            window.removeEventListener('resize', close)
            window.removeEventListener('scroll', close, true)
            window.removeEventListener('wheel', close)
            window.removeEventListener('touchmove', close)
            calendarRoot?.removeEventListener('scroll', close)
            fcScroller?.removeEventListener('scroll', close)
        }
    }, [expanded])

    return (
        <>
            <div
                ref={cardRef}
                data-day-index={props.dayIndex}
                data-slot-index={props.slotIndex}
                className={`h-full ${suggestion.length > 0 ? 'cursor-pointer' : ''}`}
                onMouseEnter={() => !isMobile && suggestion.length > 0 && setExpanded(true)}
                onMouseLeave={() => !isMobile && suggestion.length > 0 && setExpanded(false)}
                onClick={() => isShortDuration && suggestion.length > 0 && setExpanded((prev) => !prev)}>
                <BaseEventLayout
                    slotData={eventInfo.event}
                    onDeleteClick={() => onDelete?.(eventInfo.event)}
                    onEditClick={() => onEdit?.(eventInfo.event)}
                    flexDirection="col"
                    bgColor={isHighlighted ? '#F1EDFE' : ''}
                    slotType="meal"
                    canEdit={canEdit}
                    noPadding={useHeroLayout}>
                    {useHeroLayout ? (
                        /* ── Hero layout: full-bleed Places photo with title
                             overlay + info bar at the bottom showing
                             rating · price · address. The info bar is the
                             distinctive meal-card element — experience cards
                             use a similar full-bleed photo but without this
                             bottom row, so the meal card is intuitively
                             recognizable as a restaurant. ── */
                        <>
                            <SafeImage
                                src={image}
                                alt="restaurant"
                                fill
                                radius={12}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent rounded-xl" />
                            <div className="absolute bottom-0 left-0 right-0 p-2.5 z-[1]">
                                <p
                                    className={`text-white font-semibold font-manrope leading-[16px] ${isShortDuration ? 'text-[12px] line-clamp-1' : 'text-[13px] line-clamp-2'}`}>
                                    {heroDisplayTitle}
                                </p>
                                {isTallEnoughForBigInfo && (
                                    <p className="text-white/70 text-[11px] font-manrope font-medium mt-0.5">
                                        {timeRange}
                                    </p>
                                )}
                                {hasInfoBar && (
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                        {rating != null && (
                                            <span className="flex items-center gap-0.5 text-white/95 text-[10px] font-manrope font-semibold">
                                                <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                                                {rating.toFixed(1)}
                                                {userRatingsCount != null && (
                                                    <span className="font-medium text-white/70">
                                                        ({userRatingsCount.toLocaleString()})
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                        {priceLevelString != null && (
                                            <span className="text-white/90 text-[10px] font-manrope font-semibold">
                                                · {priceLevelString}
                                            </span>
                                        )}
                                        {formattedAddress != null && isTallEnoughForBigInfo && (
                                            <span className="flex items-center gap-0.5 text-white/70 text-[10px] font-manrope font-medium line-clamp-1 flex-1">
                                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                                <span className="truncate">{formattedAddress}</span>
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* ── Compact layout: thumbnail + title + time, with
                             an optional rating · price line below time when
                             slot_data carries Places metadata. Used for
                             short slots and for legacy meals with no real
                             photo. ── */
                        <>
                            <div className="flex items-start gap-2">
                                <SafeImage
                                    className="w-12 h-12 rounded-[8px] object-cover"
                                    src={image}
                                    alt="restaurant"
                                />
                                <div className="flex flex-col gap-0.5 pr-4 flex-1">
                                    <Typography
                                        size="14"
                                        weight="semibold"
                                        family="manrope"
                                        lineHeight="18px"
                                        color="grey-0">
                                        {title}
                                    </Typography>
                                    <Typography
                                        size="12"
                                        family="manrope"
                                        weight="medium"
                                        color="grey-0">
                                        {timeRange}
                                    </Typography>
                                    {hasInfoBar && (
                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                            {rating != null && (
                                                <span className="flex items-center gap-0.5 text-grey-1 text-[11px] font-manrope font-semibold">
                                                    <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                                                    {rating.toFixed(1)}
                                                    {userRatingsCount != null && (
                                                        <span className="font-medium text-grey-2">
                                                            ({userRatingsCount.toLocaleString()})
                                                        </span>
                                                    )}
                                                </span>
                                            )}
                                            {priceLevelString != null && (
                                                <span className="text-grey-1 text-[11px] font-manrope font-semibold">
                                                    · {priceLevelString}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {!isMobile && isShortDuration && suggestion.length > 0 && (
                                <div className="flex items-center gap-1 px-2 py-0.5 w-fit mr-auto rounded-md">
                                    <Typography
                                        size="11"
                                        weight="medium"
                                        family="manrope"
                                        color="primary-light">
                                        +{suggestion.length} Suggestion{suggestion.length > 1 ? 's' : ''}
                                    </Typography>
                                </div>
                            )}

                            {props.additionalInfo && (
                                <div className="rounded-[4px] bg-grey-4 py-0.5 px-2">
                                    <Typography
                                        size="11"
                                        weight="medium"
                                        family="manrope"
                                        color="grey-1">
                                        {props.additionalInfo}
                                    </Typography>
                                </div>
                            )}

                            {isMobile && suggestion.length > 0 && <AiSuggestionsList suggestions={suggestion} />}
                            {!isMobile && !isShortDuration && expanded && suggestion.length > 0 && <AiSuggestionsList suggestions={suggestion} />}
                        </>
                    )}
                </BaseEventLayout>
            </div>

            {!isMobile && isShortDuration && expanded && overlayStyle && suggestion.length > 0 && (
                <EventOverlayPortal>
                    <div
                        style={overlayStyle}
                        onClick={(e) => e.stopPropagation()}
                        className="pointer-events-auto overflow-hidden rounded-xl border border-grey-4 bg-white shadow-[0_12px_32px_-8px_rgba(15,23,42,0.12)] animate-in fade-in slide-in-from-top-2 duration-200">
                        <AiSuggestionsList suggestions={suggestion} />
                    </div>
                </EventOverlayPortal>
            )}
        </>
    )
}

// VisitEvent.tsx
export const VisitEvent = ({
    eventInfo,
    onEdit,
    onDelete,
    canEdit = true
}: {
    eventInfo: any
    onEdit?: (eventInfo: any) => void
    onDelete?: (eventInfo: any) => void
    canEdit?: boolean
    onViewMap?: (experienceId: string, dayIndex?: number) => void
}) => {
    const props = eventInfo.event.extendedProps
    const title = eventInfo.event.title || 'Visit'
    const start = eventInfo.event.start
    const end = eventInfo.event.end
    const isHighlighted = props.isHighlighted || false

    const [expanded, setExpanded] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)
    const [overlayStyle, setOverlayStyle] = useState<any>(null)

    const formatTimeNoConvert = (value: string | Date) => {
        if (value instanceof Date) {
            const hours = value.getUTCHours()
            const minutes = value.getUTCMinutes()
            const period = hours >= 12 ? 'PM' : 'AM'
            const hour12 = hours % 12 || 12
            return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
        }

        if (typeof value === 'string') {
            const timePart = value.split('T')[1]?.slice(0, 5) || ''
            let [hour, minute] = timePart.split(':').map(Number)
            const period = hour >= 12 ? 'PM' : 'AM'
            hour = hour % 12 || 12
            return `${hour}:${minute.toString().padStart(2, '0')} ${period}`
        }
        return ''
    }

    const timeRange = start && end ? `${formatTimeNoConvert(start)} - ${formatTimeNoConvert(end)}` : 'Time unavailable'

    // Calculate duration in minutes
    const durationMinutes = start && end ? (end.getTime() - start.getTime()) / (1000 * 60) : 0
    const isShortDuration = durationMinutes < 70 // Less than 1h 10m

    const image = props.image || ''
    const hasImage = !!image && !image.includes('placeholder')
    const suggestion = props?.suggestion_reasons ?? []
    const suggestionPriority = props?.slotData?.suggestion_priority ?? null
    const isHeroPriority = suggestionPriority === 0
    const useHeroLayout = hasImage && isHeroPriority

    // Adaptive layout based on duration
    const isTall = durationMinutes >= 120

    // Update overlay position and close on scroll
    useLayoutEffect(() => {
        if (!expanded) return

        const updatePosition = () => {
            if (!cardRef.current) return
            const rect = cardRef.current.getBoundingClientRect()
            setOverlayStyle({
                position: 'fixed',
                top: rect.bottom,
                left: rect.left,
                width: rect.width,
                zIndex: 9999
            })
        }

        const close = () => setExpanded(false)
        updatePosition()

        const calendarRoot = document.getElementById('calendar-root')
        const fcScroller = calendarRoot?.querySelector('.fc-scroller')

        window.addEventListener('resize', close)
        window.addEventListener('scroll', close, true)
        window.addEventListener('wheel', close, { passive: true })
        window.addEventListener('touchmove', close, { passive: true })
        calendarRoot?.addEventListener('scroll', close, { passive: true })
        fcScroller?.addEventListener('scroll', close, { passive: true })

        return () => {
            window.removeEventListener('resize', close)
            window.removeEventListener('scroll', close, true)
            window.removeEventListener('wheel', close)
            window.removeEventListener('touchmove', close)
            calendarRoot?.removeEventListener('scroll', close)
            fcScroller?.removeEventListener('scroll', close)
        }
    }, [expanded])

    const isMobile = useIsMobile()

    return (
        <>
            <div
                ref={cardRef}
                data-day-index={props.dayIndex}
                data-slot-index={props.slotIndex}
                className={`h-full ${suggestion.length > 0 ? 'cursor-pointer' : ''}`}
                onMouseEnter={() => !isMobile && suggestion.length > 0 && setExpanded(true)}
                onMouseLeave={() => !isMobile && suggestion.length > 0 && setExpanded(false)}
                onClick={() => isShortDuration && suggestion.length > 0 && setExpanded((prev) => !prev)}>
                <BaseEventLayout
                    slotData={eventInfo.event}
                    onDeleteClick={() => onDelete?.(eventInfo.event)}
                    onEditClick={() => onEdit?.(eventInfo.event)}
                    flexDirection="col"
                    slotType="visit"
                    bgColor={isHighlighted ? '#F1EDFE' : ''}
                    noPadding={useHeroLayout}
                    canEdit={canEdit}>
                    {useHeroLayout ? (
                        /* ── Hero image-fill layout (priority 0 only) ── */
                        <>
                            <SafeImage
                                src={image}
                                alt="visit"
                                fill
                                radius={12}
                            />
                            {/* Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent rounded-xl" />

                            {/* Bottom content over gradient */}
                            <div className="absolute bottom-0 left-0 right-0 p-2.5 z-[1]">
                                <p
                                    className={`text-white font-semibold font-manrope leading-[16px] ${isShortDuration ? 'text-[12px] line-clamp-1' : 'text-[13px] line-clamp-2'}`}>
                                    {title}
                                </p>
                                {isTall && <p className="text-white/70 text-[11px] font-manrope font-medium mt-0.5">{timeRange}</p>}
                                {!isMobile && suggestion.length > 0 && (
                                    <p className="text-white/60 text-[10px] font-manrope font-medium mt-0.5">
                                        +{suggestion.length} Suggestion{suggestion.length > 1 ? 's' : ''}
                                    </p>
                                )}
                            </div>
                        </>
                    ) : (
                        /* ── Regular thumbnail layout ── */
                        <>
                            <div className="flex flex-row items-start gap-2">
                                {hasImage ? (
                                    <SafeImage
                                        className="w-12 h-12 rounded-[8px] object-cover"
                                        src={image}
                                        alt="visit"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-[8px] bg-grey-5 shrink-0 flex items-center justify-center">
                                        <span className="text-grey-2 text-lg font-semibold font-manrope">{title.charAt(0)}</span>
                                    </div>
                                )}
                                <div className="flex flex-col gap-0.5 pr-4 flex-1">
                                    <Typography
                                        size="14"
                                        weight="semibold"
                                        family="manrope"
                                        lineHeight="18px"
                                        color="grey-0">
                                        {title}
                                    </Typography>
                                    <Typography
                                        size="12"
                                        weight="medium"
                                        family="manrope"
                                        color="grey-0">
                                        {timeRange}
                                    </Typography>
                                </div>
                                {isShortDuration && suggestion.length > 0 && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 w-fit ml-auto rounded-md">
                                        <Typography
                                            size="11"
                                            weight="medium"
                                            family="manrope"
                                            color="primary-light">
                                            +{suggestion.length} Suggestion{suggestion.length > 1 ? 's' : ''}
                                        </Typography>
                                    </div>
                                )}
                            </div>

                            {props.additionalInfo && (
                                <div className="rounded-[4px] bg-grey-4 py-0.5 px-2">
                                    <Typography
                                        size="11"
                                        weight="medium"
                                        family="manrope"
                                        color="grey-1">
                                        {props.additionalInfo}
                                    </Typography>
                                </div>
                            )}

                            {isMobile && suggestion.length > 0 && <AiSuggestionsList suggestions={suggestion} />}
                            {!isMobile && !isShortDuration && expanded && suggestion.length > 0 && <AiSuggestionsList suggestions={suggestion} />}
                        </>
                    )}
                </BaseEventLayout>
            </div>

            {!isMobile && isShortDuration && expanded && overlayStyle && suggestion.length > 0 && (
                <EventOverlayPortal>
                    <div
                        style={overlayStyle}
                        onClick={(e) => e.stopPropagation()}
                        className="pointer-events-auto overflow-hidden rounded-xl border border-grey-4 bg-white shadow-[0_12px_32px_-8px_rgba(15,23,42,0.12)] animate-in fade-in slide-in-from-top-2 duration-200">
                        <AiSuggestionsList suggestions={suggestion} />
                    </div>
                </EventOverlayPortal>
            )}
        </>
    )
}

// ExperienceEvent.tsx
export const ExperienceEvent = ({
    eventInfo,
    onEdit,
    onDelete,
    canEdit = true,
    shortlistedExperienceIds,
    onViewMap
}: {
    eventInfo: any
    onEdit?: (eventInfo: any) => void
    onDelete?: (eventInfo: any) => void
    canEdit?: boolean
    shortlistedExperienceIds?: Set<string>
    onViewMap?: (experienceId: string, dayIndex?: number) => void
}) => {
    const props = eventInfo.event.extendedProps
    const title = eventInfo.event.title || 'Experience'
    const start = eventInfo.event.start
    const end = eventInfo.event.end
    const experienceId = props?.slotData?.id
    const isHighlighted = props.isHighlighted || false

    const [sneakPeekExperienceId, setSneakPeekExperienceId] = useState<string | null>(null)
    const [expanded, setExpanded] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)
    const [overlayStyle, setOverlayStyle] = useState<any>(null)
    const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const isMobile = useIsMobile()

    const setExpandedTrue = useCallback(() => {
        if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current)
            leaveTimeoutRef.current = null
        }
        setExpanded(true)
    }, [])
    const setExpandedFalseDelayed = useCallback(() => {
        leaveTimeoutRef.current = setTimeout(() => setExpanded(false), 120)
    }, [])

    useEffect(() => () => {
        if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current)
    }, [])

    // Check if this experience is shortlisted using the passed shortlist data
    const isShortlisted = useMemo(() => {
        if (!experienceId || !shortlistedExperienceIds) return false
        return shortlistedExperienceIds.has(experienceId)
    }, [experienceId, shortlistedExperienceIds])

    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            if (!experienceId) return
            // Don't open sneak peek when clicking delete/edit (same as DesktopKanbanView — delete opens delete modal)
            if ((e.target as HTMLElement).closest('[data-action="delete"]') || (e.target as HTMLElement).closest('[data-action="edit"]')) return
            e.stopPropagation()
            setSneakPeekExperienceId(experienceId)
        },
        [experienceId]
    )

    const handleCloseSneakPeek = useCallback(() => {
        setSneakPeekExperienceId(null)
    }, [])

    const formatTimeNoConvert = (value: string | Date) => {
        if (value instanceof Date) {
            const h = value.getUTCHours()
            const m = value.getUTCMinutes()
            const p = h >= 12 ? 'PM' : 'AM'
            const h12 = h % 12 || 12
            return `${h12}:${m.toString().padStart(2, '0')} ${p}`
        }

        if (typeof value === 'string') {
            const [h, m] = value.split('T')[1]?.slice(0, 5).split(':').map(Number)
            const p = h >= 12 ? 'PM' : 'AM'
            return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${p}`
        }
        return ''
    }

    const timeRange = start && end ? `${formatTimeNoConvert(start)} - ${formatTimeNoConvert(end)}` : 'Time unavailable'

    // Calculate duration in minutes
    const durationMinutes = start && end ? (end.getTime() - start.getTime()) / (1000 * 60) : 0
    const isShortDuration = durationMinutes < 70 // Less than 1h 10m

    const image = props?.slotData?.display_props?.landscape_image || ''
    const hasImage = !!image
    const suggestion = props?.suggestion_reasons ?? []
    const suggestionPriority = props?.slotData?.suggestion_priority ?? null
    const isHeroPriority = suggestionPriority === 0 || suggestionPriority === 2
    const useHeroLayout = hasImage && isHeroPriority
    const constrainImageHeight = useHeroLayout && durationMinutes > 180

    // Adaptive layout based on duration
    const isTall = durationMinutes >= 120

    // Update overlay position and close on scroll (same as DesktopKanbanView)
    useLayoutEffect(() => {
        if (!expanded) return

        const updatePosition = () => {
            if (!cardRef.current) return
            const rect = cardRef.current.getBoundingClientRect()
            setOverlayStyle({
                position: 'fixed' as const,
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                zIndex: 9999
            })
        }

        const close = () => setExpanded(false)
        updatePosition()

        const calendarRoot = document.getElementById('calendar-root')
        const fcScroller = calendarRoot?.querySelector('.fc-scroller')

        window.addEventListener('resize', close)
        window.addEventListener('scroll', close, true)
        window.addEventListener('wheel', close, { passive: true })
        window.addEventListener('touchmove', close, { passive: true })
        calendarRoot?.addEventListener('scroll', close, { passive: true })
        fcScroller?.addEventListener('scroll', close, { passive: true })

        return () => {
            window.removeEventListener('resize', close)
            window.removeEventListener('scroll', close, true)
            window.removeEventListener('wheel', close)
            window.removeEventListener('touchmove', close)
            calendarRoot?.removeEventListener('scroll', close)
            fcScroller?.removeEventListener('scroll', close)
        }
    }, [expanded])
    return (
        <>
            <div
                ref={cardRef}
                className={
                    experienceId
                        ? 'cursor-pointer h-full w-full'
                        : suggestion.length > 0
                          ? 'cursor-pointer h-full w-full'
                          : 'cursor-default h-full w-full'
                }
                onMouseEnter={() => !isMobile && suggestion.length > 0 && setExpandedTrue()}
                onMouseLeave={() => !isMobile && suggestion.length > 0 && setExpandedFalseDelayed()}
                onClick={handleClick}>
                <BaseEventLayout
                    slotData={eventInfo.event}
                    disableClick={true}
                    onDeleteClick={() => onDelete?.(eventInfo.event)}
                    onEditClick={() => onEdit?.(eventInfo.event)}
                    flexDirection="col"
                    slotType="experience"
                    canEdit={canEdit}
                    noPadding={useHeroLayout}
                    bgColor={isHighlighted ? '#F1EDFE' : ''}>
                    {useHeroLayout ? (
                        /* ── Hero image-fill layout (priority 0/2); cap height when duration > 3h ── */
                        constrainImageHeight ? (
                            <div
                                className="w-full relative overflow-hidden rounded-xl shrink-0"
                                style={{ height: HERO_IMAGE_MAX_HEIGHT_PX, maxHeight: HERO_IMAGE_MAX_HEIGHT_PX }}>
                                <SafeImage
                                    src={image}
                                    alt="experience"
                                    fill
                                    radius={12}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent rounded-xl" />
                                {isShortlisted && (
                                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-md px-1.5 py-0.5 z-[1]">
                                        <Heart className="w-2.5 h-2.5 fill-secondary-red text-secondary-red" />
                                        <span className="text-[10px] font-semibold font-manrope text-red-500">Wishlist</span>
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 p-2.5 z-[1]">
                                    <p
                                        className={`text-white font-semibold font-manrope leading-[16px] ${isShortDuration ? 'text-[12px] line-clamp-1' : 'text-[13px] line-clamp-2'}`}>
                                        {title}
                                    </p>
                                    {isTall && <p className="text-white/70 text-[11px] font-manrope font-medium mt-0.5">{timeRange}</p>}
                                    {!isMobile && suggestion.length > 0 && (
                                        <p className="text-white/60 text-[10px] font-manrope font-medium mt-0.5">
                                            +{suggestion.length} Suggestion{suggestion.length > 1 ? 's' : ''}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <>
                                <SafeImage
                                    src={image}
                                    alt="experience"
                                    fill
                                    radius={12}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent rounded-xl" />
                                {isShortlisted && (
                                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-md px-1.5 py-0.5 z-[1]">
                                        <Heart className="w-2.5 h-2.5 fill-secondary-red text-secondary-red" />
                                        <span className="text-[10px] font-semibold font-manrope text-red-500">Wishlist</span>
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 p-2.5 z-[1]">
                                    <p
                                        className={`text-white font-semibold font-manrope leading-[16px] ${isShortDuration ? 'text-[12px] line-clamp-1' : 'text-[13px] line-clamp-2'}`}>
                                        {title}
                                    </p>
                                    {isTall && <p className="text-white/70 text-[11px] font-manrope font-medium mt-0.5">{timeRange}</p>}
                                    {!isMobile && suggestion.length > 0 && (
                                        <p className="text-white/60 text-[10px] font-manrope font-medium mt-0.5">
                                            +{suggestion.length} Suggestion{suggestion.length > 1 ? 's' : ''}
                                        </p>
                                    )}
                                </div>
                            </>
                        )
                    ) : (
                        /* ── Regular thumbnail layout ── */
                        <>
                            <div className="flex flex-row items-start gap-2">
                                {hasImage ? (
                                    <SafeImage
                                        className="w-12 h-12 rounded-[8px] object-cover"
                                        src={image}
                                        alt="experience"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-[8px] bg-grey-5 shrink-0 flex items-center justify-center">
                                        <span className="text-grey-2 text-lg font-semibold font-manrope">{title.charAt(0)}</span>
                                    </div>
                                )}
                                <div className="flex flex-col gap-0.5 pr-4 flex-1">
                                    <Typography
                                        size="14"
                                        weight="semibold"
                                        family="manrope"
                                        lineHeight="18px"
                                        color="grey-0">
                                        {title}
                                    </Typography>
                                    <Typography
                                        size="12"
                                        weight="medium"
                                        family="manrope"
                                        color="grey-0">
                                        {timeRange}
                                    </Typography>
                                    {isShortlisted && (
                                        <div className="flex items-center gap-1 bg-secondary-red/20 rounded-md px-1.5 py-0.5 w-fit">
                                            <Heart className="w-3 h-3 fill-secondary-red text-secondary-red" />
                                            <Typography
                                                size="11"
                                                weight="semibold"
                                                family="manrope"
                                                color="secondary-red">
                                                From your wishlist
                                            </Typography>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {!isMobile && isShortDuration && suggestion.length > 0 && (
                                <div className="flex items-center gap-1 px-2 py-0.5 w-fit mr-auto rounded-md">
                                    <Typography
                                        size="11"
                                        weight="medium"
                                        family="manrope"
                                        color="primary-light">
                                        +{suggestion.length} Suggestion{suggestion.length > 1 ? 's' : ''}
                                    </Typography>
                                </div>
                            )}

                            {props.additionalInfo && (
                                <div className="rounded-[4px] bg-grey-4 py-0.5 px-2">
                                    <Typography
                                        size="11"
                                        weight="medium"
                                        family="manrope"
                                        color="grey-1">
                                        {props.additionalInfo}
                                    </Typography>
                                </div>
                            )}

                            {isMobile && suggestion.length > 0 && <AiSuggestionsList suggestions={suggestion} />}
                        </>
                    )}
                </BaseEventLayout>
            </div>
            {!isMobile && expanded && overlayStyle && suggestion.length > 0 && (
                <EventOverlayPortal>
                    <div
                        style={overlayStyle}
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={setExpandedTrue}
                        onMouseLeave={setExpandedFalseDelayed}
                        className="pointer-events-auto overflow-hidden rounded-xl border border-grey-4 bg-white shadow-[0_12px_32px_-8px_rgba(15,23,42,0.12)] animate-in fade-in slide-in-from-top-2 duration-200">
                        <AiSuggestionsList suggestions={suggestion} />
                    </div>
                </EventOverlayPortal>
            )}

            {sneakPeekExperienceId &&
                createPortal(
                    <SneakPeekModal
                        attachments={eventInfo.event.extendedProps.attachments}
                        isOpen={true}
                        onClose={handleCloseSneakPeek}
                        experienceId={sneakPeekExperienceId}
                        displayName={title}
                        onViewMap={onViewMap ? () => onViewMap(sneakPeekExperienceId, props.dayIndex) : undefined}
                    />,
                    document.body
                )}
        </>
    )
}

// StayEvent.tsx
export const StayEvent = ({
    eventInfo,
    onEdit,
    onDelete,
    canEdit = true
}: {
    eventInfo: any
    onEdit?: (eventInfo: any) => void
    onDelete?: (eventInfo: any) => void
    canEdit?: boolean
    onViewMap?: (experienceId: string, dayIndex?: number) => void
}) => {
    const props = eventInfo.event.extendedProps
    const title = eventInfo.event.title || 'Stay'
    const start = eventInfo.event.start
    const end = eventInfo.event.end
    const isHighlighted = props.isHighlighted || false

    const [expanded, setExpanded] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)
    const [overlayStyle, setOverlayStyle] = useState<any>(null)
    const isMobile = useIsMobile()

    const formatTimeNoConvert = (value: string | Date) => {
        if (value instanceof Date) {
            const hours = value.getUTCHours()
            const minutes = value.getUTCMinutes()
            const period = hours >= 12 ? 'PM' : 'AM'
            const hour12 = hours % 12 || 12
            return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
        }

        if (typeof value === 'string') {
            const timePart = value.split('T')[1]?.slice(0, 5) || ''
            let [hour, minute] = timePart.split(':').map(Number)
            const period = hour >= 12 ? 'PM' : 'AM'
            hour = hour % 12 || 12
            return `${hour}:${minute.toString().padStart(2, '0')} ${period}`
        }
        return ''
    }

    const timeRange = start && end ? `${formatTimeNoConvert(start)} - ${formatTimeNoConvert(end)}` : 'Time unavailable'

    // Calculate duration in minutes
    const durationMinutes = start && end ? (end.getTime() - start.getTime()) / (1000 * 60) : 0
    const isShortDuration = durationMinutes < 70 // Less than 1h 10m

    const image = 'https://rimigo-misc-images.s3.ap-south-1.amazonaws.com/explore_stays.png'
    const suggestion = props?.suggestion_reasons ?? []

    // Update overlay position and close on scroll
    useLayoutEffect(() => {
        if (!expanded) return

        const updatePosition = () => {
            if (!cardRef.current) return
            const rect = cardRef.current.getBoundingClientRect()
            setOverlayStyle({
                position: 'fixed',
                top: rect.bottom,
                left: rect.left,
                width: rect.width,
                zIndex: 9999
            })
        }

        const close = () => setExpanded(false)
        updatePosition()

        const calendarRoot = document.getElementById('calendar-root')
        const fcScroller = calendarRoot?.querySelector('.fc-scroller')

        window.addEventListener('resize', close)
        window.addEventListener('scroll', close, true)
        window.addEventListener('wheel', close, { passive: true })
        window.addEventListener('touchmove', close, { passive: true })
        calendarRoot?.addEventListener('scroll', close, { passive: true })
        fcScroller?.addEventListener('scroll', close, { passive: true })

        return () => {
            window.removeEventListener('resize', close)
            window.removeEventListener('scroll', close, true)
            window.removeEventListener('wheel', close)
            window.removeEventListener('touchmove', close)
            calendarRoot?.removeEventListener('scroll', close)
            fcScroller?.removeEventListener('scroll', close)
        }
    }, [expanded])

    return (
        <>
            <div
                ref={cardRef}
                data-day-index={props.dayIndex}
                data-slot-index={props.slotIndex}
                className={`h-full ${suggestion.length > 0 ? 'cursor-pointer' : ''}`}
                onMouseEnter={() => !isMobile && suggestion.length > 0 && setExpanded(true)}
                onMouseLeave={() => !isMobile && suggestion.length > 0 && setExpanded(false)}
                onClick={() => !isMobile && isShortDuration && suggestion.length > 0 && setExpanded((prev) => !prev)}>
                <BaseEventLayout
                    slotData={eventInfo.event}
                    onDeleteClick={() => onDelete?.(eventInfo.event)}
                    onEditClick={() => onEdit?.(eventInfo.event)}
                    flexDirection="col"
                    slotType="meal"
                    bgColor={isHighlighted ? '#F1EDFE' : ''}
                    canEdit={canEdit}>
                    <div className="flex flex-row items-start gap-2">
                        <SafeImage
                            className="w-12 h-12 rounded-[8px] object-cover"
                            src={image}
                            alt="stay"
                        />
                        <div className="flex flex-col gap-0.5 pr-4 flex-1">
                            <Typography
                                size="14"
                                weight="semibold"
                                family="manrope"
                                lineHeight="18px"
                                color="grey-0">
                                {title}
                            </Typography>
                            <Typography
                                size="12"
                                family="manrope"
                                weight="medium"
                                color="grey-0">
                                {timeRange}
                            </Typography>
                        </div>
                    </div>
                    {!isMobile && isShortDuration && suggestion.length > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 w-fit mr-auto rounded-md">
                            <Typography
                                size="11"
                                weight="medium"
                                family="manrope"
                                color="primary-light">
                                +{suggestion.length} Suggestion{suggestion.length > 1 ? 's' : ''}
                            </Typography>
                        </div>
                    )}

                    {props.additionalInfo && (
                        <div className="rounded-[4px] bg-grey-4 py-0.5 px-2">
                            <Typography
                                size="11"
                                weight="medium"
                                family="manrope"
                                color="grey-1">
                                {props.additionalInfo}
                            </Typography>
                        </div>
                    )}

                    {isMobile && suggestion.length > 0 && <AiSuggestionsList suggestions={suggestion} />}
                    {!isMobile && !isShortDuration && expanded && suggestion.length > 0 && <AiSuggestionsList suggestions={suggestion} />}
                </BaseEventLayout>
            </div>
            {!isMobile && isShortDuration && expanded && overlayStyle && suggestion.length > 0 && (
                <EventOverlayPortal>
                    <div
                        style={overlayStyle}
                        onClick={(e) => e.stopPropagation()}
                        className="pointer-events-auto overflow-hidden rounded-xl border border-grey-4 bg-white shadow-[0_12px_32px_-8px_rgba(15,23,42,0.12)] animate-in fade-in slide-in-from-top-2 duration-200">
                        <AiSuggestionsList suggestions={suggestion} />
                    </div>
                </EventOverlayPortal>
            )}
        </>
    )
}
