import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import ListCard from '@/components/ListCard'
import ItineraryAddButton from '@/modules/Acitvities/components/ItineraryAddButton'
import SingleExperienceReelsView from '@/modules/Acitvities/components/SneakPeakModal/SingleExperienceReelsView'
import { useIsMobile } from '@/hooks/use-mobile'
import { STAR_PRIMARY_DEFAULT } from '@/constants/icons/svgFromCDN'
import { triggerAssistantPrompt } from '@/pages/Stays/Components/assistantController'
import { formatShortMonthDay } from '@/utils/dateUtils'
import type { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

interface ItineraryDayLite {
    date: string | Date
    slots?: Array<{
        entity_id?: string
        kind?: string
        entity_model?: string
        start_time?: string
        order?: number
    }>
}

interface InYourItineraryViewProps {
    days: ItineraryDayLite[]
    /** Experiences placed on the itinerary. Used to enrich slot ids with
     *  the card data (image, title, city). Missing entries are skipped. */
    experiences: ExperienceCardData[]
    onCardClick?: (experienceId: string) => void
    onSneakPeekClick?: (e: React.MouseEvent, experienceId: string) => void
}

const formatTime = (t?: string): string | null => {
    if (!t) return null
    const m = /^(\d{1,2}):(\d{2})/.exec(t)
    if (!m) return null
    let h = parseInt(m[1], 10)
    const min = m[2]
    const ampm = h >= 12 ? 'pm' : 'am'
    h = h % 12
    if (h === 0) h = 12
    return `${h}:${min}${ampm}`
}

const isExperienceSlot = (slot: { entity_model?: string; kind?: string }): boolean =>
    slot.entity_model === 'experiences' ||
    slot.kind === 'experience' ||
    slot.kind === 'tour' ||
    slot.kind === 'activity'

/**
 * In-your-itinerary subview for the Tripboard Activities tab.
 *
 * Day rows span edge-to-edge (negative-margin bleed cancels the parent's
 * px-4) and use the page background under the dividers — matching the
 * spec. Each row collapses on tap; the expanded body shows ListCards for
 * the day's experiences with a "Day N at HH:MM" subtitle and an "Added"
 * pill via the shared ItineraryAddContext.
 *
 * Heart/shortlist is intentionally not surfaced here — the Shortlist tab
 * is the source of truth for that state.
 */
const InYourItineraryView: React.FC<InYourItineraryViewProps> = ({
    days,
    experiences,
    onCardClick,
    onSneakPeekClick
}) => {
    const isMobile = useIsMobile()
    const { trackButtonClickCustom } = usePostHog()

    // "Help me choose" hand-off for the empty-day state — mirrors the
    // pill in BestThingsForLeisureSection so the user gets one familiar
    // way of asking the AI concierge to plan content for them. Includes
    // the day context in the prompt so the assistant can target the
    // specific gap (e.g. "Day 2 is open — fill it").
    const handleHelpMeChoose = useCallback(
        (dayNumber: number, iso: string) => {
            trackButtonClickCustom?.({
                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                buttonName: POSTHOG_EVENTS.ACTIVITIES_IN_ITINERARY_HELP_ME_CHOOSE_CLICK,
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: { day_number: dayNumber }
            })
            const prompt = `Day ${dayNumber} (${iso}) is open on my itinerary — pick a few activities that match my trip and place them on this day.`
            void triggerAssistantPrompt(prompt)
        },
        [trackButtonClickCustom]
    )

    const handleCardClick = useCallback(
        (experienceId: string) => {
            trackButtonClickCustom?.({
                buttonPage: POSTHOG_PAGES.ITINERARY_VIEW_PAGE,
                buttonName: POSTHOG_EVENTS.ACTIVITIES_IN_ITINERARY_CARD_CLICK,
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: { experience_id: experienceId }
            })
            onCardClick?.(experienceId)
        },
        [trackButtonClickCustom, onCardClick]
    )

    const experiencesById = useMemo(() => {
        const map = new Map<string, ExperienceCardData>()
        for (const exp of experiences) {
            if (exp.id) map.set(exp.id, exp)
        }
        return map
    }, [experiences])

    // Pre-compute per-day slot lists (filtered to experience-kind slots and
    // sorted by start_time so cards mirror the itinerary timeline).
    const dayRows = useMemo(() => {
        return days.map((day, idx) => {
            const iso =
                typeof day.date === 'string'
                    ? day.date.split('T')[0]
                    : new Date(day.date).toISOString().split('T')[0]
            const slots = (day.slots || [])
                .filter(isExperienceSlot)
                .slice()
                .sort((a, b) => {
                    const at = a.start_time || ''
                    const bt = b.start_time || ''
                    if (at !== bt) return at < bt ? -1 : 1
                    return (a.order ?? 0) - (b.order ?? 0)
                })
            return {
                key: iso + idx,
                idx,
                iso,
                dayNumber: idx + 1,
                slots
            }
        })
    }, [days])

    // Start with every day collapsed so the user gets a bird's-eye view of
    // the whole itinerary and expands the day they care about. `-1` = none open.
    const [openIdx, setOpenIdx] = useState<number>(-1)

    // Re-anchor when the underlying days change (city switch, itinerary
    // refetch) — keep the user's open day if it still has activities,
    // otherwise collapse back to the all-closed overview.
    useEffect(() => {
        setOpenIdx((prev) => {
            if (prev >= 0 && prev < dayRows.length && dayRows[prev]?.slots.length) return prev
            return -1
        })
    }, [dayRows])

    // Mobile-only reels — shows the tapped activity's OWN videos. Desktop
    // falls back to the parent's SneakPeekModal via onSneakPeekClick.
    const [reelsExperienceId, setReelsExperienceId] = useState<string | null>(null)
    const isReelsOpen = reelsExperienceId !== null && isMobile

    const reelsExperience = useMemo(
        () => (reelsExperienceId ? experiencesById.get(reelsExperienceId) ?? null : null),
        [experiencesById, reelsExperienceId]
    )

    const handleWatchReelClick = useCallback(
        (e: React.MouseEvent, experienceId: string) => {
            e.stopPropagation()
            if (isMobile) {
                setReelsExperienceId(experienceId)
                return
            }
            onSneakPeekClick?.(e, experienceId)
        },
        [isMobile, onSneakPeekClick]
    )

    if (dayRows.length === 0) {
        return (
            <div className="px-4 py-10 text-center text-[14px] text-grey-1 font-red-hat-display">
                No itinerary days available yet.
            </div>
        )
    }

    return (
        // Negative-mx cancels the parent wrapper's `px-4` so the day rows
        // and their dividers reach the page edges (spec: full-width). The
        // inner content reapplies horizontal padding per row.
        <div className="flex flex-col pb-12 -mx-4">
            {dayRows.map(({ key, idx, iso, dayNumber, slots }) => {
                const count = slots.length
                const isOpen = openIdx === idx
                return (
                    <div
                        key={key}
                        className="border-b border-grey-4 last:border-b-0">
                        <button
                            type="button"
                            onClick={() => setOpenIdx((prev) => (prev === idx ? -1 : idx))}
                            aria-expanded={isOpen}
                            className="w-full py-4 px-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-grey-5/50 transition-colors">
                            <span className="text-[16px] font-bold font-red-hat-display text-grey-0 shrink-0">
                                Day {dayNumber}
                                <span className="text-grey-1 font-medium"> · {formatShortMonthDay(iso)}</span>
                            </span>
                            <span className="flex items-center gap-2 text-[13px] font-medium font-red-hat-display text-grey-1 min-w-0">
                                {count > 0 && (
                                    /* Rectangular stacked thumbnails — a visual
                                       preview of what's planned before the user
                                       expands the row. Up to 3 cards; the rest
                                       implied by the count. Slightly rounded
                                       (rounded-[4px]) and white-bordered for a
                                       crisp deck look that matches the cards
                                       inside. */
                                    <span
                                        className="flex shrink-0 items-center"
                                        aria-hidden>
                                        {slots
                                            .slice(0, 3)
                                            .map((slot, i) => {
                                                const exp = slot.entity_id
                                                    ? experiencesById.get(slot.entity_id)
                                                    : undefined
                                                if (!exp?.image) return null
                                                return (
                                                    <img
                                                        key={`${slot.entity_id}-${i}`}
                                                        src={exp.image}
                                                        alt=""
                                                        className="w-8 h-6 rounded-[4px] object-cover border border-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
                                                        style={{
                                                            marginLeft: i === 0 ? 0 : -10,
                                                            zIndex: 3 - i
                                                        }}
                                                    />
                                                )
                                            })
                                            .filter(Boolean)}
                                    </span>
                                )}
                                <span className="shrink-0">
                                    {count} {count === 1 ? 'activity' : 'activities'}
                                </span>
                                {isOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                            </span>
                        </button>
                        <div
                            style={{
                                // Material standard ease — smooth and snappy
                                // close. grid-template-rows interpolation can
                                // be janky on mid-tier mobile so we use both
                                // grid-rows + opacity together; opacity owns
                                // the visual fade, grid-rows owns the height.
                                // Shorter duration (220ms) to avoid the user
                                // perceiving the close as sluggish.
                                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                                transitionDuration: '220ms',
                                transitionProperty: 'grid-template-rows, opacity'
                            }}
                            className={`grid will-change-[grid-template-rows] ${
                                isOpen
                                    ? 'grid-rows-[1fr] opacity-100'
                                    : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                            }`}>
                            <div className="overflow-hidden">
                                {count > 0 ? (
                                    /* Desktop caps at 2 cards per row so each
                                       card keeps a comfortable width next to
                                       the map column — the 3-col grid made
                                       cards shrink to ~120px which broke the
                                       Watch Reel + title layout. */
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6 px-4 pb-4">
                                        {slots.map((slot, slotIdx) => {
                                            const expId = slot.entity_id
                                            const exp = expId ? experiencesById.get(expId) : undefined
                                            if (!expId || !exp) return null
                                            const timeLabel = formatTime(slot.start_time)
                                            const subtitle = `Day ${dayNumber}${timeLabel ? ` at ${timeLabel}` : ''}`
                                            const displayTitle = exp.title || 'Activity'
                                            return (
                                                <div
                                                    key={`${expId}-${slotIdx}`}
                                                    className="relative w-full">
                                                    <ListCard
                                                        image={exp.image}
                                                        images={exp.images}
                                                        imageAlt={displayTitle}
                                                        title={displayTitle}
                                                        city={subtitle}
                                                        fullHeight={!isMobile}
                                                        className="group w-full"
                                                        onClick={() => handleCardClick(expId)}
                                                        showShortlistButton={false}
                                                        showSneakPeekButton
                                                        onSneakPeekClick={(e) => handleWatchReelClick(e, expId)}
                                                        sneakPeekUserImage={exp.image}
                                                        sneakPeekButtonLabel="Watch Reel"
                                                        titleTrailing={
                                                            <ItineraryAddButton
                                                                experienceId={expId}
                                                                experienceName={displayTitle}
                                                                experienceImage={exp.image}
                                                            />
                                                        }
                                                    />
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    /* Empty-day state — no body chrome / icons,
                                       just a short line + the same "Help me
                                       choose" pill used in BestThings so the
                                       user has one consistent way to ask the
                                       AI to plan content for them. */
                                    <div className="py-6 px-4 flex flex-col items-center gap-3 text-center">
                                        <p className="text-[13px] text-grey-1 font-red-hat-display max-w-[280px]">
                                            Pick an activity yourself or let the assistant plan this day for you.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => handleHelpMeChoose(dayNumber, iso)}
                                            className="inline-flex items-center gap-1.5 rounded-full bg-white text-primary-default text-[12px] font-semibold px-3 py-1.5 border border-primary-default hover:bg-primary-default-80 transition-colors shrink-0">
                                            <img
                                                src={STAR_PRIMARY_DEFAULT}
                                                alt=""
                                                className="w-3.5 h-3.5"
                                            />
                                            Help me choose
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            })}

            {/* Mobile Watch-Reel reels view — the tapped activity's own videos. */}
            {isReelsOpen && reelsExperienceId && (
                <SingleExperienceReelsView
                    isOpen={isReelsOpen}
                    onClose={() => setReelsExperienceId(null)}
                    experienceId={reelsExperienceId}
                    experienceName={reelsExperience?.title}
                    fallbackImageUrl={reelsExperience?.image}
                />
            )}
        </div>
    )
}

export default InYourItineraryView
