/**
 * Inline options carousel for PRESENT_OPTIONS events — streaming-native.
 *
 * Appears the moment the concierge's ``present_options`` tool returns,
 * without waiting for the full turn to finish. The user can tap a
 * choice the instant it's visible; the rest of the assistant's narration
 * keeps streaming above the card.
 *
 * Works with a loose ``items`` payload shape — the concierge's tool is
 * free to include any fields on each item; we render what's there and
 * degrade gracefully when a field is missing. The selection callback
 * receives the structured intent metadata the existing
 * ``<selection>`` envelope flow expects, so it integrates cleanly with
 * ``submitConciergeMessage`` / ``onSendAgentMessage``.
 *
 * Design:
 *   * Soft glass card with staggered entry per item — feels like the
 *     model is laying down options as it thinks.
 *   * Primary option is visually distinguished (if the tool marks one
 *     as ``recommended`` or ``is_recommended``).
 *   * Thumbnails are square, rounded, and lazy; fallback to a gradient
 *     token avatar using the first letter of the title.
 *   * Clicked item fades the others and shows a small "sent" state for
 *     300ms before the parent stream advances.
 *   * Keyboard: arrow keys navigate, Enter selects. Focus ring uses
 *     ``primary-default`` to match the theme.
 */
import React, { Suspense, lazy, useCallback, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Play } from 'lucide-react'

import ChatCardShell from './primitives/ChatCardShell'
import ResponseText from './primitives/ResponseText'
import ExperienceOptionCard from './ExperienceOptionCard'
import { adaptConciergeExperienceCardData } from '@/modules/Experiences/adapters/experienceAdapter'
import FlightTransportCard from '../FlightTransportCard'
import type { CompactFlightData } from '../transportSlotRenderers'
import type { ExperienceCardData } from '@/modules/Experiences/types/experienceCardTypes'
import { placePhotoProxyUrl } from '@/modules/Itinerary/utils/mealPlaceImage'

// Lazy — the reels stack (player, shorts fetch) is heavy and only needed the
// moment a Watch Reel pill is actually tapped; keeps the chat bundle lean.
const SingleExperienceReelsView = lazy(
    () => import('@/modules/Acitvities/components/SneakPeakModal/SingleExperienceReelsView')
)

// ── Types ───────────────────────────────────────────────────────────────────

/** Shape we try to read from each PresentOption item. All fields optional. */
interface OptionItemLoose {
    id?: string | number
    title?: string
    name?: string
    subtitle?: string
    description?: string
    image?: string
    image_url?: string
    thumbnail?: string
    price?: string
    price_display?: string
    is_recommended?: boolean
    recommended?: boolean
    badge?: string
    meta?: string
    structured_data?: Record<string, unknown>
}

interface InlinePresentOptionsCardProps {
    /** The title the concierge passed to ``present_options``. */
    title?: string
    /** Carousel kind hint — used for accessible label + empty-state copy. */
    kind?: string
    /** Raw items array from the PRESENT_OPTIONS event. */
    items: Array<Record<string, unknown>>
    /** ``interaction_id`` of the child Interaction document; passed
     *  through to the selection callback so the backend can correlate
     *  the user's tap with the carousel that produced it. */
    interactionId: string
    /** Whether the user may also reply in plain text. When ``false`` we
     *  render a subtle footnote ("Tap a choice to continue"). */
    allowTextReply?: boolean
    /** When ``false`` clicks are disabled — used while the stream is
     *  still resolving or during abort. */
    interactive?: boolean
    /** When ``true`` the options are from a past turn that's too old
     *  to act on. Clicking a tile shows a friendly "that choice has
     *  expired" hint instead of firing the selection. Typically set
     *  by the parent from the interaction's wall-clock age. */
    stale?: boolean
    /** Optional — when the parent passes this, the card re-checks
     *  age at click time against the current wall clock. Protects
     *  the never-refreshed case where ``stale`` was computed stale
     *  at last render (possibly false) but the clock has since
     *  advanced past the 5-minute threshold. */
    staleAfter?: number
    /** Optional — wall-clock timestamp (ms epoch) of the interaction
     *  that produced these options. Used with ``staleAfter`` for the
     *  at-click-time re-check. */
    timestamp?: number
    /** When set, render the tile with this id as already selected on
     *  mount and refuse further clicks. Used when revisiting a turn
     *  whose selection the backend has already stamped onto the
     *  child Interaction's ``output_data.selected_id``. */
    preselectedId?: string
    /** Multi-select mode (backend ``present_options(multi_select=true)``,
     *  used for prioritize-asks). Tiles toggle instead of firing; a confirm
     *  bar submits ONE selection envelope with ``selected_items=[...]``. */
    multiSelect?: boolean
    /** Called when the user picks an option. ``text`` is human-readable
     *  (goes into the chat as the user's message); ``metadata`` carries
     *  the structured intent payload and ``source_interaction_id``.
     *  Parent is responsible for submitting via the assistant controller. */
    onSelect: (text: string, metadata: Record<string, unknown>) => void
    // ── Collection-window mode (optional) ──────────────────────────────
    // Present ONLY when the backend stamped a `collection` onto this carousel
    // (the traveler's saved picks / a city's experiences / vouchers). The
    // count + See-all route are BACKEND-OWNED — rendered verbatim, never
    // recomputed or model-authored. Absent → a plain 2-3 alternatives picker.
    /** Authoritative total in the collection (e.g. 9 saved). */
    totalCount?: number
    /** How many cards are shown now (= items.length). */
    shownCount?: number
    /** Structured "See all" route — a custom_action token (e.g. open_experience_shortlist). */
    viewAll?: { action?: string; cta?: string }
    /** Category label for the count header, e.g. "saved" / "experiences in Kyoto". */
    collectionLabel?: string
    /** Fires the viewAll custom_action token (→ dispatchCustomAction). */
    onViewAll?: (token: string) => void
}

// ── Component ───────────────────────────────────────────────────────────────

const InlinePresentOptionsCard: React.FC<InlinePresentOptionsCardProps> = ({
    title,
    kind,
    items,
    interactionId,
    allowTextReply = true,
    interactive = true,
    stale = false,
    staleAfter,
    timestamp,
    preselectedId,
    multiSelect = false,
    onSelect,
    totalCount,
    shownCount,
    viewAll,
    collectionLabel,
    onViewAll
}) => {
    // Seed from preselectedId when revisiting a past turn whose
    // choice the backend already stamped. Falls back to null for a
    // fresh carousel.
    const [selectedId, setSelectedId] = useState<string | null>(preselectedId ?? null)
    // Shown when the user taps a stale option — we don't silently
    // swallow the click; we explain why it didn't do anything so they
    // know to start a fresh turn.
    const [expiredHintShown, setExpiredHintShown] = useState(false)
    // Watch Reel viewer — per-card shorts feed (same affordance as the
    // Activities tab cards). Holds the tapped experience's identity.
    const [reelExperience, setReelExperience] = useState<{
        id: string
        name?: string
        image?: string
    } | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)

    const normalized = useMemo(() => items.map((raw, idx) => normalizeItem(raw, idx)), [items])
    // Ref mirror so confirm callbacks read the latest normalized list without
    // re-memoizing the callback on every items change.
    const normalizedRef = useRef(normalized)
    normalizedRef.current = normalized

    // Collection-window chrome (optional). When the backend stamped a
    // collection, `totalCount` is the AUTHORITATIVE total — rendered verbatim,
    // never recomputed from items.length. `hasMore` drives the "See all" + peek.
    const isCollection = typeof totalCount === 'number'
    const collShown = shownCount ?? normalized.length
    const collTotal = typeof totalCount === 'number' ? totalCount : collShown
    const hasMore = isCollection && collTotal > collShown
    const collLabel = (collectionLabel ?? '').trim()
    const viewAllToken = viewAll?.action
    const showSeeAll = hasMore && !!viewAllToken
    const handleViewAll = useCallback(() => {
        if (viewAllToken) onViewAll?.(viewAllToken)
    }, [viewAllToken, onViewAll])

    // Carousel layout/card variant. Experience and flight carousels render
    // backend-hydrated, type-specific cards; every other kind keeps the
    // generic tile. Experiences lay out as a full-width horizontal shelf
    // (swipeable on mobile); flights stack as a vertical column.
    const variant: 'experience' | 'flight' | 'place' | 'generic' =
        kind === 'experience_carousel'
            ? 'experience'
            : kind === 'flight_carousel'
              ? 'flight'
              : kind === 'restaurant_carousel' || kind === 'places_carousel'
                ? 'place'
                : 'generic'

    // Multi-select mode: toggled ids + the one-shot confirmed latch.
    // Recommended picks arrive PRE-selected (smart default): the check badge +
    // ring make the default visible, and one tap reverses it — transparency
    // and reversibility are what keep a pre-checked default trustworthy.
    const [multiSelectedIds, setMultiSelectedIds] = useState<Set<string>>(
        () => new Set(
            multiSelect
                ? items
                      .map((raw, idx) => normalizeItem(raw, idx))
                      .filter((i) => i.recommended)
                      .map((i) => i.id)
                : []
        )
    )
    const [multiConfirmed, setMultiConfirmed] = useState(false)

    // Re-check staleness at interaction time against the live wall clock.
    // The never-refreshed case: ``stale`` was computed on some prior render
    // when age was still <threshold, but the user has since idled past it.
    const isClickStale = useCallback(
        () => stale || (staleAfter !== undefined && timestamp !== undefined && Date.now() - timestamp > staleAfter),
        [stale, staleAfter, timestamp]
    )

    const handleMultiConfirm = useCallback(() => {
        if (isClickStale()) {
            setExpiredHintShown(true)
            return
        }
        if (!interactive || multiConfirmed || multiSelectedIds.size === 0) return
        const chosen = normalizedRef.current.filter((i) => multiSelectedIds.has(i.id))
        if (chosen.length === 0) return
        setMultiConfirmed(true)
        const text = `Picked: ${chosen.map((i) => i.displayTitle).join(', ')}`
        onSelect(text, {
            action: 'present_options_select_multi',
            selected_items: chosen.map((i) => ({
                id: i.id,
                title: i.displayTitle,
                structured_data: i.structuredData
            })),
            kind,
            source_interaction_id: interactionId
        })
    }, [isClickStale, interactive, multiConfirmed, multiSelectedIds, onSelect, interactionId, kind])

    const handleSelect = useCallback(
        (item: NormalizedItem) => {
            const clickStale = isClickStale()
            if (clickStale) {
                setExpiredHintShown(true)
                return
            }
            // Multi-select: taps toggle membership until the confirm bar
            // fires the single combined envelope.
            if (multiSelect) {
                if (!interactive || multiConfirmed) return
                setMultiSelectedIds((prev) => {
                    const next = new Set(prev)
                    if (next.has(item.id)) next.delete(item.id)
                    else next.add(item.id)
                    return next
                })
                return
            }
            if (!interactive || selectedId) return
            setSelectedId(item.id)
            // Prefer the tool's ``on_select.action_text`` — that's the
            // canonical user-side message the concierge authored for
            // this choice. Falls back to a title-based message only if
            // the tool didn't provide one.
            const actionText = item.actionText ?? `Pick ${item.displayTitle}`
            onSelect(actionText, {
                action: 'present_options_select',
                selected_id: item.id,
                selected_title: item.displayTitle,
                kind,
                source_interaction_id: interactionId,
                structured_data: item.structuredData
            })
        },
        [isClickStale, interactive, selectedId, onSelect, interactionId, kind, multiSelect, multiConfirmed]
    )

    // Keyboard nav: arrow keys move focus between option buttons, Enter
    // triggers select. Focus stays within the grid.
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!containerRef.current) return
        const buttons = Array.from(containerRef.current.querySelectorAll<HTMLButtonElement>('[data-option-btn]'))
        const currentIndex = buttons.findIndex((b) => b === document.activeElement)
        if (currentIndex === -1) return
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault()
            buttons[(currentIndex + 1) % buttons.length]?.focus()
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault()
            buttons[(currentIndex - 1 + buttons.length) % buttons.length]?.focus()
        }
    }, [])

    if (normalized.length === 0) return null

    return (
        <ChatCardShell
            intent="neutral"
            role="region"
            ariaLabel={`Options: ${title ?? kind ?? 'choices'}`}
            // Mobile: every present_options block breaks out to calc(90vw - 16px)
            // so cards aren't cramped in the narrow chat column. Desktop: 86% of
            // the column — the assistant *text* now spans the full column, but
            // carousels keep their previous (narrower) width so they don't read
            // as edge-to-edge slabs. (The flight card used to break out to 125%,
            // which overflowed the 50vw panel and clipped the right edge.)
            // ``!`` wins over the shell's baked-in ``w-full``. (Tailwind
            // arbitrary calc: ``_`` → space.)
            className="!w-[calc(90vw_-_16px)] sm:!w-[86%]">
            {title && (
                <ResponseText
                    text={title}
                    size="title"
                />
            )}

            {isCollection && (
                <div className="flex items-center justify-between gap-3 -mt-0.5 mb-1">
                    <span className="text-[12.5px] text-grey_2 font-manrope">
                        {hasMore ? `Showing ${collShown} of ${collTotal}` : `${collTotal}`}
                        {collLabel ? ` ${collLabel}` : ''}
                    </span>
                    {showSeeAll && (
                        <button
                            type="button"
                            onClick={handleViewAll}
                            className="shrink-0 text-[12.5px] font-semibold text-primary-default font-manrope hover:underline rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-default focus-visible:ring-offset-1">
                            See all {collTotal}
                        </button>
                    )}
                </div>
            )}

            <motion.div
                ref={containerRef}
                onKeyDown={handleKeyDown}
                role={multiSelect ? 'group' : 'radiogroup'}
                aria-multiselectable={multiSelect || undefined}
                aria-label={title ?? 'Options'}
                className={
                    variant === 'experience' || variant === 'place'
                        ? 'flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-1 px-1 pb-2 scrollbar-hide'
                        : variant === 'flight'
                          ? 'flex flex-col gap-3'
                          : 'grid gap-2 grid-cols-1'
                }>
                {normalized.map((item, idx) => {
                    const isSelected = multiSelect
                        ? multiSelectedIds.has(item.id)
                        : selectedId === item.id
                    const isDimmed = multiSelect
                        ? multiConfirmed && !multiSelectedIds.has(item.id)
                        : selectedId !== null && selectedId !== item.id
                    const tileInteractive = interactive && (multiSelect ? !multiConfirmed : !selectedId)
                    const onItemSelect = () => handleSelect(item)
                    const hydrated = item.hydrationStatus === 'hydrated' && !!item.cardData

                    if (variant === 'experience' && hydrated) {
                        return (
                            <ExperienceOptionShelfItem
                                key={item.id}
                                item={item}
                                isSelected={isSelected}
                                isDimmed={isDimmed}
                                interactive={tileInteractive}
                                onSelect={onItemSelect}
                                multi={multiSelect}
                                onWatchReel={(exp) => setReelExperience(exp)}
                            />
                        )
                    }
                    if (variant === 'flight' && hydrated && hasFlightFields(item.cardData)) {
                        return (
                            <FlightOptionCard
                                key={item.id}
                                item={item}
                                isSelected={isSelected}
                                isDimmed={isDimmed}
                                interactive={tileInteractive}
                                onSelect={onItemSelect}
                            />
                        )
                    }
                    if (variant === 'place' && hydrated && hasPlaceFields(item.cardData)) {
                        return (
                            <PlaceOptionShelfItem
                                key={item.id}
                                item={item}
                                isSelected={isSelected}
                                isDimmed={isDimmed}
                                interactive={tileInteractive}
                                onSelect={onItemSelect}
                                multi={multiSelect}
                            />
                        )
                    }
                    // Fallback: generic tile. In the experience shelf, wrap it
                    // so it keeps the shelf's card width and snap behavior.
                    const tile = (
                        <OptionTile
                            item={item}
                            index={idx}
                            isSelected={isSelected}
                            isDimmed={isDimmed}
                            interactive={tileInteractive}
                            onSelect={onItemSelect}
                        />
                    )
                    if (variant === 'experience' || variant === 'place') {
                        return (
                            <div
                                key={item.id}
                                className="snap-start shrink-0 w-[90%] max-w-[300px] sm:w-[280px]">
                                {tile}
                            </div>
                        )
                    }
                    return <React.Fragment key={item.id}>{tile}</React.Fragment>
                })}
                {/* Collection peek card — a partial trailing card signals more
                    exist (defeats the illusion of completeness) and doubles as
                    a See-all tap target. Shelf layouts only. */}
                {hasMore && (variant === 'experience' || variant === 'place') && (
                    <button
                        type="button"
                        onClick={showSeeAll ? handleViewAll : undefined}
                        aria-label={`See all — ${collTotal - collShown} more`}
                        className={`snap-start shrink-0 w-[140px] sm:w-[148px] min-h-[88px] rounded-2xl border border-dashed border-primary-default/40 bg-primary-default/[0.04] flex flex-col items-center justify-center text-center px-3 touch-manipulation [-webkit-tap-highlight-color:transparent] ${showSeeAll ? 'hover:bg-primary-default/[0.08] cursor-pointer' : 'cursor-default'} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-default focus-visible:ring-offset-1`}>
                        <span className="text-[20px] font-bold text-primary-default font-manrope tabular-nums">+{collTotal - collShown}</span>
                        <span className="text-[12px] text-grey_2 font-manrope mt-0.5">more{collLabel ? ` ${collLabel}` : ''}</span>
                        {showSeeAll && <span className="mt-2 text-[12px] font-semibold text-primary-default font-manrope">See all</span>}
                    </button>
                )}
            </motion.div>

            {/* Multi-select tray — status + select-all on the left (what's in),
                the outcome-worded commit on the right (what happens next).
                One combined envelope on confirm. */}
            {multiSelect && !expiredHintShown && !stale && (
                <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between gap-3 mt-2.5 rounded-2xl bg-primary-default/[0.05] border border-primary-default/10 px-3.5 py-2.5">
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <span aria-live="polite" className="text-[13px] font-bold text-grey_0 font-manrope tabular-nums">
                            {multiConfirmed ? (
                                `${multiSelectedIds.size} on their way to your trip`
                            ) : multiSelectedIds.size > 0 ? (
                                <>
                                    <motion.span
                                        key={multiSelectedIds.size}
                                        initial={{ scale: 1.25, opacity: 0.4 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ duration: 0.15 }}
                                        className="inline-block text-primary-default">
                                        {multiSelectedIds.size}
                                    </motion.span>
                                    {` pick${multiSelectedIds.size === 1 ? '' : 's'} in`}
                                </>
                            ) : (
                                'Nothing picked yet'
                            )}
                        </span>
                        <span className="text-[11.5px] text-grey_2 font-manrope truncate">
                            {multiConfirmed
                                ? 'You can move or remove any of them later.'
                                : 'Tap any card to change your mind.'}
                        </span>
                        {!multiConfirmed && interactive && (
                            <button
                                type="button"
                                onClick={() =>
                                    setMultiSelectedIds(
                                        multiSelectedIds.size === normalized.length
                                            ? new Set()
                                            : new Set(normalized.map((i) => i.id))
                                    )
                                }
                                className="self-start mt-0.5 text-[11.5px] font-semibold text-primary-default font-manrope hover:underline rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-default focus-visible:ring-offset-1">
                                {multiSelectedIds.size === normalized.length ? 'Clear all' : 'Select all'}
                            </button>
                        )}
                    </div>
                    {!multiConfirmed && (
                        <button
                            type="button"
                            onClick={handleMultiConfirm}
                            disabled={multiSelectedIds.size === 0 || !interactive}
                            className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold font-manrope transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-default focus-visible:ring-offset-1 ${
                                multiSelectedIds.size > 0 && interactive
                                    ? 'bg-primary-default text-white hover:bg-primary-default/90 active:scale-[0.98] shadow-[0_2px_10px_rgba(0,0,0,0.12)]'
                                    : 'bg-grey_6 text-grey_3 cursor-not-allowed'
                            }`}>
                            {multiSelectedIds.size > 0
                                ? `Add ${multiSelectedIds.size} to my trip`
                                : 'Add to my trip'}
                        </button>
                    )}
                </motion.div>
            )}

            {!allowTextReply && !selectedId && !multiSelect && !expiredHintShown && !stale && (
                <p className="text-xs text-grey_2 font-manrope mt-1">Tap a choice to continue.</p>
            )}
            {expiredHintShown && (
                <p className="text-xs text-grey_2 font-manrope mt-1 italic">
                    That choice has expired — send a new message if you still need help.
                </p>
            )}

            {reelExperience && (
                <Suspense fallback={null}>
                    <SingleExperienceReelsView
                        isOpen
                        onClose={() => setReelExperience(null)}
                        experienceId={reelExperience.id}
                        experienceName={reelExperience.name}
                        fallbackImageUrl={reelExperience.image}
                    />
                </Suspense>
            )}
        </ChatCardShell>
    )
}

export default InlinePresentOptionsCard

// ── Tile ────────────────────────────────────────────────────────────────────

interface OptionTileProps {
    item: NormalizedItem
    index: number
    isSelected: boolean
    isDimmed: boolean
    interactive: boolean
    onSelect: () => void
}

const OptionTile: React.FC<OptionTileProps> = ({ item, index, isSelected, isDimmed, interactive, onSelect }) => {
    // Content-first card — no big letter thumbnail. The prior decorative
    // letter square (A / R / L) looked like a failed image placeholder
    // and added no information; content cards read cleaner without it.
    // Images render inline as a small rounded block above the title IF
    // the tool actually supplies one; otherwise the card is just
    // title + subtitle + optional price.
    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{
                opacity: isDimmed ? 0.55 : 1,
                y: 0
            }}
            transition={{ duration: 0.22, delay: index * 0.04 }}
            className={`relative ${isDimmed ? 'pointer-events-none' : ''}`}>
            <button
                type="button"
                data-option-btn
                role="radio"
                aria-checked={isSelected}
                disabled={!interactive}
                onClick={onSelect}
                // ``[-webkit-tap-highlight-color:transparent]`` kills the
                // default iOS blue flash that otherwise fires on top of
                // our ``active:scale-[0.99]`` feedback. Also ``touch-manipulation``
                // removes the 300ms tap delay on older mobile browsers.
                className={`
                    group relative w-full flex flex-col items-stretch text-left overflow-hidden
                    rounded-2xl bg-white
                    px-4 py-3.5 min-h-[88px]
                    transition-all duration-200
                    touch-manipulation [-webkit-tap-highlight-color:transparent]
                    border ${isSelected ? 'border-primary-default ring-2 ring-primary-default/35 shadow-sm' : 'border-grey_5/60'}
                    ${interactive && !isSelected ? 'hover:border-primary-default/40 hover:shadow-sm active:scale-[0.99] cursor-pointer' : ''}
                    ${!interactive ? 'cursor-default' : ''}
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-default focus-visible:ring-offset-1
                `}>
                {item.recommended && <RecommendedBadge />}
                {isSelected && <SelectedCheck />}
                {item.image && <OptionImage item={item} />}
                <OptionBody
                    item={item}
                    hasBadge={item.recommended}
                />
            </button>
        </motion.div>
    )
}

const OptionImage: React.FC<{ item: NormalizedItem }> = ({ item }) => {
    const [errored, setErrored] = useState(false)
    if (!item.image || errored) return null
    return (
        <div className="h-24 w-full rounded-lg bg-grey_6 overflow-hidden mb-2">
            <img
                src={item.image}
                alt={item.displayTitle}
                loading="lazy"
                onError={() => setErrored(true)}
                className="w-full h-full object-cover"
            />
        </div>
    )
}

const OptionBody: React.FC<{ item: NormalizedItem; hasBadge: boolean }> = ({ item, hasBadge }) => {
    return (
        <div className={`flex flex-col gap-1 min-w-0 ${hasBadge ? 'mt-1' : ''}`}>
            <span className="text-[14px] font-semibold text-grey_0 font-manrope leading-5 line-clamp-2">{item.displayTitle}</span>
            {item.displaySubtitle && (
                <span className="text-[12.5px] text-grey_2 font-manrope leading-[1.45] line-clamp-2">{item.displaySubtitle}</span>
            )}
            {item.priceLabel && <span className="mt-0.5 text-[12px] font-medium text-primary-default font-manrope">{item.priceLabel}</span>}
        </div>
    )
}

const RecommendedBadge: React.FC = () => (
    <span className="inline-flex self-start items-center gap-1 px-2 py-0.5 rounded-full bg-primary-default/10 text-primary-default text-[10px] font-semibold font-manrope mb-1">
        <svg
            viewBox="0 0 10 10"
            className="w-2.5 h-2.5"
            aria-hidden="true"
            fill="currentColor">
            <path d="M5 0.5 L6.3 3.7 L9.5 4 L7 6.1 L7.8 9.3 L5 7.5 L2.2 9.3 L3 6.1 L0.5 4 L3.7 3.7 Z" />
        </svg>
        <span>Recommended</span>
    </span>
)

const SelectedCheck: React.FC = () => (
    <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary-default flex items-center justify-center text-white z-10"
        aria-label="Selected">
        <svg
            viewBox="0 0 16 16"
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M3 8 L7 12 L13 4" />
        </svg>
    </motion.span>
)

// ── Typed option cards (experience / flight) ──────────────────────────────────

interface TypedOptionCardProps {
    item: NormalizedItem
    isSelected: boolean
    isDimmed: boolean
    interactive: boolean
    onSelect: () => void
    /** Multi-select mode: whole-card tap toggles, corner check badge carries
     *  the state, button renders the Add/✓ Added toggle morphology. */
    multi?: boolean
}

/** Mirror FlightTransportCard's required-field guard so we can fall back to
 *  the generic tile when the cached flight payload is too thin to render a
 *  non-null card. */
function hasFlightFields(cardData?: Record<string, unknown>): boolean {
    if (!cardData) return false
    const f = cardData as CompactFlightData
    return Boolean(f.airline && f.flight_number && f.origin && f.destination && f.departure_time && f.arrival_time)
}

function formatFlightPrice(flight: CompactFlightData): string | null {
    const { price, currency } = flight
    if (price === undefined || price === null) return null
    if (typeof price === 'number') return `${currency || 'INR'} ${price.toLocaleString()}`
    const s = String(price).trim()
    return s || null
}

const SelectButton: React.FC<{
    isSelected: boolean
    interactive: boolean
    onSelect: () => void
    fullWidth?: boolean
    /** Multi-select morphology: the button is a TOGGLE, so the weights invert —
     *  unselected is the louder "Add" invite (outline), selected is the calmer
     *  confirmed state (tonal "✓ Added"). The heavy filled treatment stays
     *  reserved for the single-select commit, where a tap IS the commit. */
    multi?: boolean
}> = ({
    isSelected,
    interactive,
    onSelect,
    fullWidth = true,
    multi = false
}) => (
    <button
        type="button"
        data-option-btn
        {...(multi
            ? { 'aria-pressed': isSelected }
            : { role: 'radio', 'aria-checked': isSelected })}
        disabled={!interactive}
        onClick={(e) => {
            // Whole-card tap toggles in multi mode — keep the button's own
            // tap from double-firing through the card wrapper.
            e.stopPropagation()
            onSelect()
        }}
        className={`
            ${fullWidth ? 'w-full' : 'px-5'} py-2 rounded-xl text-[12px] font-semibold font-manrope
            transition-all touch-manipulation [-webkit-tap-highlight-color:transparent]
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-default focus-visible:ring-offset-1
            ${
                multi
                    ? isSelected
                        ? 'bg-primary-default/12 text-primary-default border border-primary-default/30'
                        : 'bg-white text-primary-default border border-primary-default/40'
                    : isSelected
                      ? 'bg-primary-default text-white'
                      : 'bg-primary-default/10 text-primary-default'
            }
            ${interactive && !isSelected ? (multi ? 'hover:bg-primary-default/[0.06] active:scale-[0.98] cursor-pointer' : 'hover:bg-primary-default/15 active:scale-[0.99] cursor-pointer') : ''}
            ${interactive && multi && isSelected ? 'hover:bg-primary-default/[0.18] active:scale-[0.98] cursor-pointer' : ''}
            ${!interactive ? 'cursor-default' : ''}
        `}>
        {multi ? (isSelected ? '✓ Added' : 'Add') : isSelected ? 'Selected' : 'Select'}
    </button>
)

/** Corner check badge over the card photo — the unambiguous selection organ.
 *  Ghost circle when unselected (signals "this card toggles"), filled check
 *  with an overshoot pop when selected. */
const SelectionCheckBadge: React.FC<{ isSelected: boolean }> = ({ isSelected }) => (
    <span
        aria-hidden="true"
        className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
        {isSelected ? (
            <motion.span
                key="on"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.15, 1] }}
                transition={{ duration: 0.22, times: [0, 0.7, 1], ease: 'easeOut' }}
                className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-default text-white shadow-[0_2px_8px_rgba(0,0,0,0.25)] ring-2 ring-white">
                <svg viewBox="0 0 12 12" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 6.2 L4.8 9 L10 3.4" />
                </svg>
            </motion.span>
        ) : (
            <span className="block w-7 h-7 rounded-full border-2 border-white/90 bg-black/15 backdrop-blur-[2px] shadow-[0_1px_4px_rgba(0,0,0,0.2)]" />
        )}
    </span>
)

/** Calm "Top fit" chip over the photo's top-left — names the AI's reasoning
 *  without competing with the selection state (selection = right corner,
 *  recommendation = left corner; two corners, two meanings). */
const TopFitChip: React.FC = () => (
    <span className="absolute top-2.5 left-2.5 z-10 pointer-events-none inline-flex items-center gap-1 px-2 py-[3px] rounded-full bg-white/92 backdrop-blur-[2px] text-primary-default text-[10px] font-bold font-manrope shadow-[0_1px_4px_rgba(0,0,0,0.18)]">
        <svg viewBox="0 0 10 10" className="w-2.5 h-2.5" aria-hidden="true" fill="currentColor">
            <path d="M5 0.5 L6.3 3.7 L9.5 4 L7 6.1 L7.8 9.3 L5 7.5 L2.2 9.3 L3 6.1 L0.5 4 L3.7 3.7 Z" />
        </svg>
        Top fit
    </span>
)

const ExperienceOptionShelfItem: React.FC<
    TypedOptionCardProps & {
        /** Opens the per-experience reels viewer (same affordance as the
         *  Activities tab cards' "Watch Reel"). */
        onWatchReel?: (exp: { id: string; name?: string; image?: string }) => void
    }
> = ({ item, isSelected, isDimmed, interactive, onSelect, multi = false, onWatchReel }) => {
    const experience = useMemo(
        () => adaptConciergeExperienceCardData(item.cardData as Record<string, unknown>),
        [item.cardData]
    )
    // "View details" — open the experience detail in a new tab (matches the
    // window.open('/experiences/:id') pattern used across the app). Keeps
    // the chat context intact while letting the traveler inspect details.
    const openDetail = useCallback(() => {
        if (experience?.id) window.open(`/experiences/${experience.id}`, '_blank', 'noopener,noreferrer')
    }, [experience])

    // Multi-select: the WHOLE card is the toggle target (generous mobile hit
    // area) — but taps that originate on a real control (View details, the
    // Add button, links) keep their own job and never double as a toggle.
    const handleCardTap = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (!multi || !interactive) return
            const origin = e.target as HTMLElement
            if (origin.closest('button, a')) return
            onSelect()
        },
        [multi, interactive, onSelect]
    )

    const canWatchReel = Boolean(onWatchReel && experience?.id)
    const handleWatchReel = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation()
            if (experience?.id) {
                onWatchReel?.({
                    id: experience.id,
                    name: experience.title,
                    image: experience.images?.[0] ?? experience.image
                })
            }
        },
        [experience, onWatchReel]
    )

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: isDimmed ? 0.55 : 1, y: isSelected && multi ? -2 : 0 }}
            transition={{ duration: 0.18 }}
            onClick={handleCardTap}
            className={`group snap-start shrink-0 w-[90%] max-w-[300px] sm:w-[280px] flex flex-col gap-2 ${isDimmed ? 'pointer-events-none' : ''} ${multi && interactive ? 'cursor-pointer' : ''}`}>
            <div
                className={`relative flex-1 rounded-2xl transition-shadow duration-150 ${
                    isSelected
                        ? 'ring-2 ring-primary-default shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
                        : multi
                          ? 'ring-1 ring-grey_5'
                          : ''
                }`}>
                {multi && <SelectionCheckBadge isSelected={isSelected} />}
                {multi && item.recommended && <TopFitChip />}
                {/* Watch Reel — same pill as the Activities tab cards: top-left,
                    hover-revealed on desktop, always visible on mobile. Drops
                    below the Top-fit chip when both occupy the left corner. */}
                {canWatchReel && (
                    <div
                        className={`absolute left-2.5 z-10 flex opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity ${
                            multi && item.recommended ? 'top-10' : 'top-2.5'
                        }`}>
                        <button
                            type="button"
                            aria-label={`Watch reel — ${item.displayTitle}`}
                            onClick={handleWatchReel}
                            className="inline-flex items-center gap-1.5 pl-1 pr-3 py-1.5 rounded-[8px] bg-white/80 hover:bg-white border border-feature-card-border hover:shadow-md transition-all shadow-[0px_2px_8px_#aeaeae]">
                            <span className="w-5 h-7 rounded-[4px] bg-white flex items-center justify-center">
                                <Play className="w-3 h-3 text-grey-0 ml-0.5" />
                            </span>
                            <span className="text-[12px] font-[600] font-red-hat-display">Watch Reel</span>
                        </button>
                    </div>
                )}
                <ExperienceOptionCard
                    data={experience}
                    reason={item.displaySubtitle}
                    onView={openDetail}
                    action={
                        <SelectButton
                            isSelected={isSelected}
                            interactive={interactive}
                            onSelect={onSelect}
                            fullWidth={false}
                            multi={multi}
                        />
                    }
                />
            </div>
        </motion.div>
    )
}

const FlightOptionCard: React.FC<TypedOptionCardProps> = ({ item, isSelected, isDimmed, interactive, onSelect }) => {
    const flight = item.cardData as CompactFlightData
    const priceLabel = formatFlightPrice(flight)
    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: isDimmed ? 0.55 : 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className={`flex flex-col gap-2 ${isDimmed ? 'pointer-events-none' : ''}`}>
            <div className={isSelected ? 'rounded-xl ring-2 ring-primary-default/35' : ''}>
                <FlightTransportCard flight={flight} />
            </div>
            <div className="flex items-center justify-between gap-3">
                {priceLabel ? (
                    <span className="text-[14px] font-bold text-grey_0 font-manrope tabular-nums whitespace-nowrap">
                        {priceLabel}
                    </span>
                ) : (
                    <span />
                )}
                <div className="w-[128px]">
                    <SelectButton
                        isSelected={isSelected}
                        interactive={interactive}
                        onSelect={onSelect}
                    />
                </div>
            </div>
        </motion.div>
    )
}

// ── Restaurant / place option shelf item ──────────────────────────────────────
// Restaurants & places use the SAME layout as experiences: the rich
// ExperienceOptionCard (image + title + AI reason + View/Select footer) in a
// horizontal shelf. We map the backend meal/place ``slot_data`` onto the
// experience card shape; "View details" points at the place's Google Maps.

/** Backend ``slot_data`` shape produced by the meal / place enrichers (plus a
 *  couple of experience-DB-match fallbacks the place path can return). */
interface RawPlaceCardData {
    place_id?: string
    name?: string
    title?: string
    formatted_address?: string
    address?: string
    location?: { latitude?: number; longitude?: number }
    latitude?: number
    longitude?: number
    photo_url?: string
    display_props?: { landscape_image?: string }
    verified_photos?: Array<{ url?: string }>
    google_maps_uri?: string
}

function hasPlaceFields(cardData?: Record<string, unknown>): boolean {
    return typeof (cardData as RawPlaceCardData | undefined)?.name === 'string'
}

/** Map the backend place/meal ``slot_data`` onto the ``ExperienceCardData`` the
 *  shared ExperienceOptionCard renders. Only the image + title are surfaced by
 *  that card; the rest are filled with sensible empties to satisfy the type. */
function placeToExperienceCardData(cardData: Record<string, unknown>): ExperienceCardData {
    const cd = cardData as RawPlaceCardData
    const image =
        (cd.place_id ? placePhotoProxyUrl(cd.place_id, 800) : undefined) ??
        cd.photo_url ??
        cd.display_props?.landscape_image ??
        (Array.isArray(cd.verified_photos) ? cd.verified_photos.find((p) => p?.url)?.url : undefined) ??
        ''
    return {
        id: cd.place_id ?? cd.name ?? 'place',
        title: cd.name ?? cd.title ?? 'Place',
        name: cd.name,
        city_name: '',
        city_id: '',
        price: { lower_bound: null, upper_bound: null, currency: null },
        image,
        images: image ? [image] : undefined,
        suggestion_priority: null,
        short_description: null
    }
}

/** "View details" target for a place — its Google Maps page, falling back to a
 *  lat/lng map search. Returns undefined when neither is available (the card
 *  then omits the View affordance). */
function placeMapsUrl(cardData: Record<string, unknown>): string | undefined {
    const cd = cardData as RawPlaceCardData
    if (cd.google_maps_uri) return cd.google_maps_uri
    const lat = cd.location?.latitude ?? cd.latitude
    const lng = cd.location?.longitude ?? cd.longitude
    if (lat != null && lng != null) {
        return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    }
    return undefined
}

const PlaceOptionShelfItem: React.FC<TypedOptionCardProps> = ({ item, isSelected, isDimmed, interactive, onSelect }) => {
    const place = useMemo(() => placeToExperienceCardData(item.cardData as Record<string, unknown>), [item.cardData])
    const mapsUrl = useMemo(() => placeMapsUrl(item.cardData as Record<string, unknown>), [item.cardData])
    const openMaps = useCallback(() => {
        if (mapsUrl) window.open(mapsUrl, '_blank', 'noopener,noreferrer')
    }, [mapsUrl])

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: isDimmed ? 0.55 : 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className={`snap-start shrink-0 w-[90%] max-w-[300px] sm:w-[280px] flex flex-col gap-2 ${isDimmed ? 'pointer-events-none' : ''}`}>
            <div className={`flex-1 ${isSelected ? 'rounded-2xl ring-2 ring-primary-default/40' : ''}`}>
                <ExperienceOptionCard
                    data={place}
                    reason={item.displaySubtitle}
                    onView={mapsUrl ? openMaps : undefined}
                    action={
                        <SelectButton
                            isSelected={isSelected}
                            interactive={interactive}
                            onSelect={onSelect}
                            fullWidth={false}
                        />
                    }
                />
            </div>
        </motion.div>
    )
}

// ── Normalization ───────────────────────────────────────────────────────────

interface NormalizedItem {
    id: string
    displayTitle: string
    displaySubtitle?: string
    image?: string
    priceLabel?: string
    recommended: boolean
    /** The canonical user-side message the concierge tool authored for
     *  this choice (``on_select.action_text``). When present, used as
     *  the prompt fired on select — feels much more natural than
     *  ``Pick {title}``. */
    actionText?: string
    /** The continuation directive that flows back as the next-turn
     *  ``<selection>`` envelope. Prefer the tool's ``on_select.structured_data``
     *  (now backend-enriched with a resolved ``entity_id`` / ``flight_reference``),
     *  falling back to a top-level ``structured_data`` and finally the whole
     *  raw item for legacy shapes — so selection data is never lost. */
    structuredData: unknown
    /** Backend-hydrated, type-specific card payload (experience serializer
     *  shape or compact flight dict). Present only when ``hydrationStatus``
     *  is ``"hydrated"``. */
    cardData?: Record<string, unknown>
    /** ``"hydrated"`` when the backend attached ``cardData`` for an
     *  experience/flight carousel; ``"fallback"`` (or undefined) means the
     *  generic tile should render from ``display``. */
    hydrationStatus?: string
    raw: OptionItemLoose
}

function normalizeItem(raw: unknown, index: number): NormalizedItem {
    const obj = (raw ?? {}) as OptionItemLoose & {
        display?: Record<string, unknown>
        on_select?: Record<string, unknown>
    }
    // The concierge ``present_options`` tool emits items in the
    // ``{display: {...}, on_select: {...}}`` shape — read from
    // ``display`` first so titles/subtitles/badges render correctly,
    // falling back to top-level fields for legacy shapes.
    const display = (obj.display ?? {}) as Record<string, unknown>
    const onSelect = (obj.on_select ?? {}) as Record<string, unknown>
    const idRaw = obj.id ?? (obj.structured_data as Record<string, unknown> | undefined)?.id
    const id = idRaw !== undefined && idRaw !== null ? String(idRaw) : `option-${index}`
    const displayTitle = firstString(display.title as unknown, display.name as unknown, obj.title, obj.name) ?? 'Option'
    const displaySubtitle = firstString(display.subtitle as unknown, display.description as unknown, obj.subtitle, obj.description, obj.meta)
    const image = firstString(
        display.image_url as unknown,
        display.image as unknown,
        display.thumbnail as unknown,
        obj.image_url,
        obj.image,
        obj.thumbnail
    )
    const priceLabel = firstString(display.price_display as unknown, display.price as unknown, obj.price_display, obj.price)
    // "Recommended" reads from EITHER an explicit flag OR a human
    // ``badge`` string that signals recommendation ("My pick",
    // "Recommended"). The backend persona uses free-form badge text so
    // be permissive here.
    const badgeStr = firstString(display.badge as unknown)
    const badgeSignalsRec = Boolean(badgeStr && /recommend|my pick|pick|top|best/i.test(badgeStr))
    const recommended = Boolean(display.recommended ?? display.is_recommended ?? obj.is_recommended ?? obj.recommended) || badgeSignalsRec
    const actionText = firstString(onSelect.action_text as unknown)
    // Continuation directive precedence: the tool's authored (and now
    // backend-enriched) ``on_select.structured_data`` wins; then a legacy
    // top-level ``structured_data``; finally the whole raw item so older
    // loose shapes never lose their selection payload.
    const structuredData = onSelect.structured_data ?? obj.structured_data ?? obj
    const cardDataRaw = (obj as { card_data?: unknown }).card_data
    const cardData = cardDataRaw && typeof cardDataRaw === 'object' ? (cardDataRaw as Record<string, unknown>) : undefined
    const hydrationStatus = firstString((obj as { hydration_status?: unknown }).hydration_status)
    return {
        id,
        displayTitle,
        displaySubtitle,
        image,
        priceLabel,
        recommended,
        actionText,
        structuredData,
        cardData,
        hydrationStatus,
        raw: obj
    }
}

function firstString(...candidates: Array<unknown>): string | undefined {
    for (const c of candidates) {
        if (typeof c === 'string' && c.trim()) return c.trim()
    }
    return undefined
}
