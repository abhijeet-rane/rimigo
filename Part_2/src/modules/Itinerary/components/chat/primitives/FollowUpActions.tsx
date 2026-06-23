import React, { useState, useCallback } from 'react'
import { STAR_PRIMARY_DEFAULT } from '@/constants/icons/svgFromCDN'
import type {
    CustomActionAction,
    DismissAction,
    IntentAction,
    ReplyAction,
} from '@/modules/AtaAgent/types/AIAssisstantWindowTypes'

/**
 * FollowUpActions — tappable inline action chips on concierge responses.
 *
 * Sister surface to ``InlinePresentOptionsCard`` (cards w/ descriptions);
 * this component is the lightweight 2-3 chip row that ends a message
 * which would otherwise sit on "want me to X?". Backed by the BE's
 * ``follow_up_actions`` tool — see
 * :mod:`trip.services.ata.concierge.tools.follow_up_actions`.
 *
 * Visual spec lifted from the Rimigo Design System
 * ``Follow-Up Actions.html`` handover — solid variant (recommended)
 * with the silent-hide dismissal and selected+dimmed loading modes.
 *
 * Renders nothing for ``navigation`` actions — those continue to
 * route through the existing ``ResponseActions`` pill row in
 * ``AIAssistantWindow.tsx``. ``custom_action`` chips render here but,
 * on tap, fire an in-app affordance (e.g. open the invite modal)
 * instead of posting back — the parent's ``onAction`` owns that branch.
 */

export type FollowUpChipAction =
    | IntentAction
    | ReplyAction
    | DismissAction
    | CustomActionAction

type Variant = 'solid' | 'tinted' | 'soft'
/** ``default`` = the inline chip look. ``suggestion`` = the starter-pill
 *  language used above the input bar (white pill, primary text, primary
 *  border, leading star) so a promoted follow-up reads as a suggestion, plus a
 *  staggered entrance so the traveler notices when the set refreshes. */
type Tone = 'default' | 'suggestion'
type DismissalMode = 'silent' | 'fade' | 'check'
type LoadingMode = 'selected' | 'processing'

type Phase = 'idle' | 'loading' | 'resolved'

interface FollowUpActionsProps {
    actions: FollowUpChipAction[]
    /** Fires for intent/reply taps. Parent forwards to sendPromptMessage
     *  with the ``<selection>`` envelope. Dismiss taps stay local (no
     *  LLM call, no user bubble). The ``idx`` is the position of the
     *  tapped chip in ``actions`` — the parent stamps it into the
     *  envelope as ``selected_action_idx`` so the BE can mark the
     *  source Interaction's chosen chip on revisit. */
    onAction: (
        action: IntentAction | ReplyAction | CustomActionAction,
        idx: number,
    ) => void
    variant?: Variant
    dismissalMode?: DismissalMode
    loadingMode?: LoadingMode
    /** Render the row as visibly-disabled (e.g. revisiting an old turn
     *  whose chips no longer apply). */
    stale?: boolean
    /** Index of a chip already picked on a previous turn (read from
     *  ``output_data.selected_follow_up.idx`` on revisit). When set,
     *  renders the matching chip in ``selected`` state and peers as
     *  ``dimmed`` — same affordance ``present_options`` shows for past
     *  picks. */
    preselectedIdx?: number | null
    /** Visual language for the chips. ``suggestion`` is used for the row
     *  promoted above the input bar. */
    tone?: Tone
}

// Suggestion-pill language — mirrors ``ActionChips`` (the default starter
// chips) so a promoted follow-up reads as "a suggestion above the input",
// not a stray button.
const SUGGESTION_ACTIVE =
    'bg-white text-primary-default border border-primary-default hover:bg-primary-default/[0.06]'

// Sized to match the surrounding chat density (assistant message body
// ~14-15px). The design spec called for min-h 44 / py-2.5 / 14px text,
// but in the live concierge surface that reads too generous next to the
// message bubbles. Tighter padding + 13px keeps the chip group quiet
// while still clearing the 36px tap target on mobile.
const CHIP_BASE =
    'rounded-[12px] px-2.5 py-1 min-h-[30px] text-[13px] font-medium font-manrope ' +
    'transition-all whitespace-nowrap inline-flex items-center gap-1 shrink-0 ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-default focus-visible:ring-offset-1'

const VARIANTS: Record<
    Variant,
    {
        primary: string
        secondary: string
        selectedPrimary: string
        selectedSecondary: string
    }
> = {
    solid: {
        primary:
            'bg-primary-default text-white border border-transparent hover:bg-primary-dark shadow-[0_2px_8px_rgba(112,17,246,0.18)]',
        secondary: 'bg-white text-grey_0 border border-grey_4 hover:border-grey_2',
        selectedPrimary:
            'bg-primary-default text-white border border-transparent ring-2 ring-primary-default/30',
        selectedSecondary:
            'bg-white text-grey_0 border border-primary-default ring-2 ring-primary-default/25',
    },
    tinted: {
        primary:
            'bg-primary-default/10 text-primary-default border border-primary-default/30 hover:bg-primary-default/15 hover:border-primary-default/45',
        secondary: 'bg-white text-grey_1 border border-grey_4 hover:bg-grey_5 hover:border-grey_3',
        selectedPrimary: 'bg-primary-default text-white border border-transparent',
        selectedSecondary: 'bg-grey_5 text-grey_0 border border-grey_3',
    },
    soft: {
        primary:
            'bg-primary-default/[0.08] text-primary-default border border-primary-default/15 hover:bg-primary-default/[0.14]',
        secondary: 'bg-grey_5 text-grey_1 border border-transparent hover:bg-grey_4/70',
        selectedPrimary: 'bg-primary-default text-white border border-transparent',
        selectedSecondary:
            'bg-primary-default/15 text-primary-default border border-primary-default/30',
    },
}

const CheckGlyph: React.FC<{ light: boolean }> = ({ light }) => (
    <svg
        width="10"
        height="10"
        viewBox="0 0 16 16"
        fill="none"
        stroke={light ? 'currentColor' : '#7011F6'}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
        aria-hidden>
        <path d="M3 8 L7 12 L13 4" />
    </svg>
)

type ChipState = 'active' | 'disabled' | 'stale' | 'selected' | 'dimmed'

interface FollowUpChipProps {
    action: FollowUpChipAction
    variant: Variant
    state: ChipState
    onTap?: () => void
    tone?: Tone
    /** Position in the group — drives the staggered entrance delay so the
     *  refreshed set reveals left-to-right and catches the eye. */
    index?: number
}

const FollowUpChip: React.FC<FollowUpChipProps> = ({
    action,
    variant,
    state,
    onTap,
    tone = 'default',
    index = 0,
}) => {
    const v = VARIANTS[variant]
    const isSuggestion = tone === 'suggestion'
    // Staggered reveal — replays whenever the chip set remounts (the parent
    // keys the row on the action signature), so an updated set visibly
    // rebuilds rather than silently swapping.
    const entrance = isSuggestion
        ? { className: 'animate-chip-in', style: { animationDelay: `${index * 0.06}s` } }
        : { className: '', style: undefined as React.CSSProperties | undefined }

    // Visual policy: every chip renders with the same tone regardless of
    // ``action.style`` — we deliberately don't promote ``style: 'primary'``
    // to a filled-purple chip. The persona still records which option
    // was recommended (so the BE can route on it / downstream analytics
    // can read it), but the user surface treats the group as a uniform
    // set. The only chip that ever looks distinct is the one the user
    // taps — the ``selected`` state keeps its ring+check as a "you
    // picked this" marker, not as a tonal escalation.

    if (state === 'disabled' || state === 'stale') {
        return (
            <button
                type="button"
                disabled
                aria-disabled
                className={`${CHIP_BASE} bg-grey_5 text-grey_3 cursor-default border border-grey_4 ${
                    state === 'stale' ? 'opacity-60' : 'opacity-50'
                }`}>
                {action.cta}
            </button>
        )
    }

    if (state === 'selected') {
        return (
            <button
                type="button"
                disabled
                className={`${CHIP_BASE} ${v.selectedSecondary} cursor-default`}>
                {action.cta}
                <CheckGlyph light={false} />
            </button>
        )
    }

    if (state === 'dimmed') {
        return (
            <button
                type="button"
                disabled
                className={`${CHIP_BASE} ${v.secondary} opacity-40 cursor-default`}>
                {action.cta}
            </button>
        )
    }

    return (
        <button
            type="button"
            tabIndex={0}
            aria-label={action.cta}
            onClick={onTap}
            style={entrance.style}
            className={`${CHIP_BASE} ${isSuggestion ? SUGGESTION_ACTIVE : v.secondary} active:scale-[0.97] cursor-pointer ${entrance.className}`}>
            {isSuggestion && (
                <img
                    src={STAR_PRIMARY_DEFAULT}
                    alt=""
                    aria-hidden
                    className="h-3 w-3 flex-shrink-0"
                />
            )}
            {action.cta}
        </button>
    )
}

const DotPulse: React.FC = () => (
    <span className="inline-flex items-center gap-1" aria-label="loading">
        {[0, 1, 2].map((i) => (
            <span
                key={i}
                className="inline-block rounded-full"
                style={{
                    width: 5,
                    height: 5,
                    background: '#7011F6',
                    animation: `fua-pulse 1.1s ${i * 0.16}s infinite ease-in-out`,
                }}
            />
        ))}
        <style>{`
            @keyframes fua-pulse {
                0%, 80%, 100% { transform: scale(0.55); opacity: 0.4; }
                40%           { transform: scale(1);    opacity: 1;   }
            }
        `}</style>
    </span>
)

const FollowUpActions: React.FC<FollowUpActionsProps> = ({
    actions,
    onAction,
    variant = 'solid',
    dismissalMode = 'silent',
    loadingMode = 'selected',
    stale = false,
    preselectedIdx = null,
    tone = 'default',
}) => {
    const [tappedIdx, setTappedIdx] = useState<number | null>(null)
    const [phase, setPhase] = useState<Phase>('idle')

    const handleTap = useCallback(
        (action: FollowUpChipAction, idx: number) => {
            if (phase !== 'idle' || stale || preselectedIdx !== null) return
            setTappedIdx(idx)
            setPhase('loading')

            if (action.action === 'dismiss') {
                // Local-only resolution; give the eye a beat to register
                // the tap before collapsing the row.
                window.setTimeout(() => setPhase('resolved'), 220)
                return
            }

            // intent / reply route through the parent's sendPromptMessage.
            onAction(action, idx)
        },
        [onAction, phase, preselectedIdx, stale],
    )

    if (actions.length === 0) return null

    if (phase === 'resolved' && dismissalMode === 'silent') {
        return null
    }

    if (phase === 'resolved' && dismissalMode === 'fade') {
        return (
            <div className="text-[12px] text-grey_3 italic font-manrope py-1">
                Dismissed
            </div>
        )
    }

    const tappedAction = tappedIdx !== null ? actions[tappedIdx] : null
    const isProcessingPill =
        phase === 'loading' &&
        loadingMode === 'processing' &&
        tappedAction?.action !== 'dismiss'

    if (isProcessingPill) {
        return (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary-default/[0.08] border border-primary-default/15 px-3.5 py-2 min-h-[36px]">
                <DotPulse />
                <span className="text-[13px] font-medium text-primary-default font-manrope">
                    Processing…
                </span>
            </div>
        )
    }

    // Suggestion tone (promoted above the input bar): on mobile the row is a
    // single horizontal scroller — ``pl-4`` keeps the first chip's left margin,
    // no right padding so it runs edge-to-edge, scrollbar hidden. On ``md+`` it
    // reverts to a wrapping row with symmetric ``px-4`` padding. (The slot's
    // ``motion.div`` adds no horizontal padding, so these are the only insets.)
    const groupClass =
        tone === 'suggestion'
            // First-chip left inset: the messages container's ``px-4`` (16px) +
            // the assistant message's 2px rail, nudged a touch further so the
            // first chip sits just past where the assistant text begins.
            ? 'mt-2 flex gap-1.5 pt-1 flex-nowrap overflow-x-auto scrollbar-hide pl-3.5 ' +
              'md:flex-wrap md:overflow-visible md:pl-3.5 md:pr-4'
            : 'mt-2 flex flex-wrap gap-1.5 pt-1'

    return (
        <div
            role="group"
            aria-label="Suggested actions"
            className={groupClass}>
            {actions.map((action, idx) => {
                let chipState: ChipState = 'active'
                if (preselectedIdx !== null) {
                    // Persisted-render path: a prior pick is recorded
                    // on the source Interaction. Render the chosen
                    // chip as ``selected`` (with the check glyph),
                    // peers as ``dimmed`` and untappable.
                    chipState = preselectedIdx === idx ? 'selected' : 'dimmed'
                } else if (stale) {
                    chipState = 'stale'
                } else if (phase === 'loading' || phase === 'resolved') {
                    chipState = tappedIdx === idx ? 'selected' : 'dimmed'
                }
                return (
                    <FollowUpChip
                        key={`${action.action}-${idx}`}
                        action={action}
                        variant={variant}
                        state={chipState}
                        tone={tone}
                        index={idx}
                        onTap={() => handleTap(action, idx)}
                    />
                )
            })}
        </div>
    )
}

export default FollowUpActions
