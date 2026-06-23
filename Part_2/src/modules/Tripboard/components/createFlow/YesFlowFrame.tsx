/**
 * "Yes" branch of the When step — lets the user pick exact check-in and
 * check-out dates on a dual-month calendar. Spec values:
 *
 *   Chips:     309px wide, 12px padding, 4px gap, label Red Hat Display
 *              12/645/-0.24 grey-2; value Manrope 16/600/-0.32 grey-0.
 *   Calendar:  630×291 wrapper, 12px radius, grey-4 border, white bg.
 *   Day grid:  Manrope 16/500 black numbers; weekday header Red Hat Display
 *              11/645 grey-2; month caption Red Hat Display 16/550 grey-0.
 *   Selected:  range start/end use primary-indigo bg + white text;
 *              middle days use rgba(primary-indigo, 0.16) bg + indigo text.
 */
import { useMemo, useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { DayPicker, type DateRange } from 'react-day-picker'
import 'react-day-picker/style.css'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { WizardBackButton } from './WizardBackButton'
import { SectionError } from './SectionError'

export interface YesFlowFrameProps {
    checkIn: Date | null
    checkOut: Date | null
    onChange: (range: { checkIn: Date | null; checkOut: Date | null }) => void
    /** Mobile step-back (inline in the heading). Omitted → no arrow. */
    onBack?: () => void
    /** Parent flags missing dates on Next → scroll to + red helper. */
    invalidSection?: { nonce: number } | null
}

export function YesFlowFrame({ checkIn, checkOut, onChange, onBack, invalidSection }: YesFlowFrameProps) {
    const datesError = !!invalidSection && (!checkIn || !checkOut)
    /** Which field is currently being edited — drives the highlight outline
     *  on the CHECK-IN / CHECK-OUT chips. */
    const [activeField, setActiveField] = useState<'in' | 'out'>('in')
    /** Bumped whenever we need to force the DayPicker to remount (e.g., after
     *  resetting the range to a single-from state). The library can otherwise
     *  keep stale internal range state that doesn't match the controlled
     *  `selected` prop. */
    const [pickerKey, setPickerKey] = useState(0)

    /** Show one month on phones, two months side-by-side on desktop. Tracked
     *  via matchMedia so it stays in sync with viewport-resize events
     *  (rotations, dev-tools responsive mode). 768px matches Tailwind `md`. */
    const [isDesktop, setIsDesktop] = useState(() =>
        typeof window === 'undefined' ? true : window.matchMedia('(min-width: 768px)').matches,
    )
    useEffect(() => {
        if (typeof window === 'undefined') return
        const mq = window.matchMedia('(min-width: 768px)')
        const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
        mq.addEventListener('change', onChange)
        return () => mq.removeEventListener('change', onChange)
    }, [])

    const range: DateRange | undefined = useMemo(() => {
        if (!checkIn && !checkOut) return undefined
        return {
            from: checkIn ?? undefined,
            to: checkOut ?? undefined,
        }
    }, [checkIn, checkOut])

    const handleSelect = (
        next: DateRange | undefined,
        triggerDate: Date | undefined,
    ) => {
        // 1. Range is already complete and the user clicks again → reset:
        //    new click becomes the new check-in, check-out clears. Bump
        //    pickerKey so the library remounts with the new selection,
        //    otherwise its stale internal state hides the new check-in.
        if (checkIn && checkOut && triggerDate) {
            onChange({ checkIn: triggerDate, checkOut: null })
            setActiveField('out')
            setPickerKey((k) => k + 1)
            return
        }
        // 2. Only check-in is set and the user clicks an earlier date →
        //    treat that earlier date as the new check-in (never let
        //    check-out be < check-in). Same remount trick.
        if (checkIn && !checkOut && triggerDate && triggerDate < checkIn) {
            onChange({ checkIn: triggerDate, checkOut: null })
            setActiveField('out')
            setPickerKey((k) => k + 1)
            return
        }
        // 3. First click in the cycle (no prior selection): some
        //    react-day-picker v9 versions report `{from: X, to: X}` on the
        //    initial click, which would otherwise set both check-in AND
        //    check-out to the same day. Force the first click to set only
        //    check-in and remount so the picker's internal state matches.
        if (!checkIn && !checkOut && triggerDate) {
            onChange({ checkIn: triggerDate, checkOut: null })
            setActiveField('out')
            setPickerKey((k) => k + 1)
            return
        }
        if (!next) {
            onChange({ checkIn: null, checkOut: null })
            return
        }
        onChange({ checkIn: next.from ?? null, checkOut: next.to ?? null })
        if (next.from && !next.to) setActiveField('out')
        if (next.from && next.to) setActiveField('in')
    }

    return (
        <div className="mx-auto w-full max-w-[684px] pt-8">
            <div className="mb-6 flex items-start gap-1.5">
                <WizardBackButton onBack={onBack} />
                <h2
                    className="text-left"
                    style={{
                        color: 'var(--text-primary, #0D0C0D)',
                        fontFamily: 'var(--font-family-title, "Red Hat Display")',
                        fontSize: '24px',
                        fontWeight: 600,
                        lineHeight: '32px',
                        letterSpacing: '-0.48px',
                    }}
                >
                    Awesome! Select your dates
                </h2>
            </div>

            {/* Two 309px chips, side by side. */}
            <div className="mb-4 flex gap-3">
                <DateFieldChip
                    label="START DATE"
                    value={checkIn}
                    active={activeField === 'in'}
                    onClick={() => setActiveField('in')}
                />
                <DateFieldChip
                    label="END DATE"
                    value={checkOut}
                    active={activeField === 'out'}
                    onClick={() => setActiveField('out')}
                />
            </div>

            {/* Calendar wrapper — 684px wide on desktop (full-width on
                mobile), grey-4 border, 12px radius. */}
            <div
                className="rdp-custom w-full md:w-[684px]"
                style={{
                    minHeight: '291px',
                    borderRadius: '12px',
                    border: '1px solid var(--color-grey-4, #E0E0E0)',
                    background: 'var(--surface-raised, #FFF)',
                    padding: '12px 12px',
                }}
            >
                <DayPicker
                    key={pickerKey}
                    mode="range"
                    numberOfMonths={isDesktop ? 2 : 1}
                    // Bumping `pickerKey` remounts the picker; without an
                    // explicit starting month it would fall back to today and
                    // bounce the view back to the current month right after the
                    // user picked a start date. Anchor it to the selected
                    // check-in (then check-out) so the view stays put.
                    defaultMonth={checkIn ?? checkOut ?? undefined}
                    selected={range}
                    onSelect={handleSelect}
                    disabled={{ before: new Date() }}
                    showOutsideDays={false}
                    weekStartsOn={0}
                    formatters={{
                        formatWeekdayName: (date) =>
                            date
                                .toLocaleDateString(undefined, { weekday: 'short' })
                                .slice(0, 3)
                                .toUpperCase(),
                    }}
                    components={{
                        Chevron: ({ orientation }) =>
                            orientation === 'left' ? (
                                <ChevronLeft size={20} strokeWidth={2} />
                            ) : (
                                <ChevronRight size={20} strokeWidth={2} />
                            ),
                    }}
                />
                <CalendarStyleOverrides />
            </div>

            {/* Date-range + nights summary, BELOW the calendar. Smoothly expands
                in once both dates are picked so it never pops abruptly. */}
            <AnimatePresence initial={false}>
                {checkIn && checkOut && (
                    <motion.div
                        key="when-summary"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden">
                        <div className="mt-4 flex flex-col items-center gap-1.5">
                            <span
                                style={{
                                    color: 'var(--text-primary, #0D0C0D)',
                                    fontFamily: 'var(--font-family-title, "Red Hat Display")',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    letterSpacing: '-0.32px',
                                }}
                            >
                                {fmtRangeDay(checkIn)} &rarr; {fmtRangeDay(checkOut)}
                            </span>
                            <span
                                className="rounded-full px-3 py-1"
                                style={{
                                    background: 'var(--surface-brand-subtle, #F3ECFE)',
                                    color: 'var(--text-brand, #7011F6)',
                                    fontFamily: 'var(--font-family-body, Manrope)',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    lineHeight: '16px',
                                    letterSpacing: '-0.26px',
                                }}
                            >
                                {nightsBetween(checkIn, checkOut)} {nightsBetween(checkIn, checkOut) === 1 ? 'night' : 'nights'}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <SectionError show={datesError} nonce={invalidSection?.nonce} message="Please pick your travel dates" />
        </div>
    )
}

/** "Jul 13" — short month + day for the range summary. */
function fmtRangeDay(d: Date): string {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Nights between two dates (date-only gap). */
function nightsBetween(start: Date, end: Date): number {
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

interface DateFieldChipProps {
    label: string
    value: Date | null
    active: boolean
    onClick: () => void
}

function DateFieldChip({ label, value, active, onClick }: DateFieldChipProps) {
    const display = value
        ? value.toLocaleDateString(undefined, {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
          })
        : 'Select Date'
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex min-w-0 flex-1 flex-col items-start gap-1 rounded-xl bg-white text-left"
            style={{
                padding: '12px',
                border: active
                    ? '1.5px solid var(--border-focus, #7011F6)'
                    : '1px solid var(--color-grey-4, #E0E0E0)',
            }}
        >
            <span
                style={{
                    color: 'var(--color-grey-2, #747474)',
                    fontFamily: 'var(--font-family-title, "Red Hat Display")',
                    fontSize: '12px',
                    fontWeight: 645,
                    letterSpacing: '-0.24px',
                }}
            >
                {label}
            </span>
            <span
                style={{
                    color: value ? 'var(--color-grey-0, #101010)' : 'var(--color-grey-0, #101010)',
                    fontFamily: 'var(--font-family-body, Manrope)',
                    fontSize: '16px',
                    fontWeight: 600,
                    letterSpacing: '-0.32px',
                }}
            >
                {display}
            </span>
        </button>
    )
}

/**
 * Inline CSS overrides for react-day-picker v9. Scoped to the `.rdp-custom`
 * wrapper so we don't bleed styles into other consumers of the library.
 */
function CalendarStyleOverrides() {
    return (
        <style>{`
            /* Variables MUST be set on .rdp-root because the library scopes
               them with that selector — overriding on the outer .rdp-custom
               loses the specificity battle and the variables fall back to
               their blue/44px defaults. */
            .rdp-custom .rdp-root {
                --rdp-day-width: 36px;
                --rdp-day-height: 36px;
                --rdp-day_button-width: 34px;
                --rdp-day_button-height: 34px;
                --rdp-nav-height: 32px;
                --rdp-nav_button-height: 32px;
                --rdp-nav_button-width: 32px;
                --rdp-accent-color: #7011F6;
                --rdp-accent-background-color: rgba(112, 17, 246, 0.16);
                --rdp-selected-border: 0 solid transparent;
                --rdp-day_button-border: 0 solid transparent;
            }
            .rdp-custom .rdp,
            .rdp-custom .rdp-root {
                margin: 0;
                width: 100%;
                display: flex;
                justify-content: center;
            }
            /* Strip the library's default cell-level range tints so only the
               day_button shows the colored bg — otherwise the cell wrapper
               adds a faint outline around each highlighted run. */
            .rdp-custom .rdp-day,
            .rdp-custom .rdp-selected,
            .rdp-custom .rdp-range_start,
            .rdp-custom .rdp-range_middle,
            .rdp-custom .rdp-range_end {
                background: transparent !important;
                background-color: transparent !important;
            }
            /* Force side-by-side months — v9 ships its own .rdp-months
               rules that can leave the months stacked depending on the
               wrapper width. */
            .rdp-custom .rdp-months {
                display: flex !important;
                flex-direction: row !important;
                flex-wrap: nowrap !important;
                gap: 24px;
                justify-content: center !important;
                align-items: flex-start;
                position: relative;
                width: 100%;
            }
            /* Vertical divider centered in the gap between the two months.
               Spans the full height of .rdp-months which already sits inside
               the wrapper's 12px top/bottom padding — net 12px gap above
               and below the divider. Mobile renders a single month so the
               divider would land in the middle of the calendar; suppress it
               below the md breakpoint. */
            @media (min-width: 768px) {
                .rdp-custom .rdp-months::before {
                    content: '';
                    position: absolute;
                    left: 50%;
                    top: 0;
                    bottom: 0;
                    width: 1px;
                    background: var(--color-grey-4, #E0E0E0);
                    transform: translateX(-50%);
                    pointer-events: none;
                }
            }
            .rdp-custom .rdp-month {
                flex: 0 0 auto !important;
                /* Shrink-wrap to the day grid so the SAT column hugs the
                   right edge of the box (no trailing space). */
                width: fit-content !important;
                margin: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            /* The library's <table> sizes to its 7 cells (≈252px). Without
               this, the table sits at the left of the .rdp-month box; the
               margin-left/right auto centers it horizontally.
               border-spacing adds 7px between every day cell (horizontal
               + vertical), giving the design's "breathing" grid look. */
            .rdp-custom .rdp-month_grid {
                margin-left: auto !important;
                margin-right: auto !important;
                width: max-content !important;
                border-collapse: separate !important;
                border-spacing: 7px 7px !important;
            }
            .rdp-custom .rdp-weekdays,
            .rdp-custom .rdp-week {
                justify-content: center;
            }
            /* Divider is rendered via .rdp-months::before instead of a
               border on the second month, so no extra rule needed here. */
            .rdp-custom .rdp-month_caption,
            .rdp-custom .rdp-caption_label {
                color: var(--color-grey-0, #101010);
                font-family: var(--font-family-title, "Red Hat Display");
                font-size: 16px;
                font-weight: 550;
                line-height: 20px;
                letter-spacing: -0.32px;
                text-align: center;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                /* Caption row matches nav-button height (32px) so the prev/
                   next buttons and the month labels share the exact same
                   vertical center line. Forced with !important because v9
                   defaults to --rdp-nav-height which may resolve to 40px. */
                height: 32px !important;
                min-height: 32px !important;
                padding: 0 !important;
                margin: 4px 0 8px 0 !important;
            }
            /* Split the nav so the left chevron pins to the far left of the
               calendar and the right chevron to the far right, with the
               month captions centered between them. */
            .rdp-custom .rdp-nav {
                position: absolute !important;
                top: 0;
                left: 0;
                right: 0;
                display: flex !important;
                justify-content: space-between !important;
                pointer-events: none;
                z-index: 1;
                gap: 0;
            }
            .rdp-custom .rdp-button_previous,
            .rdp-custom .rdp-button_next {
                width: 32px;
                height: 32px;
                background: var(--color-grey-4, #E0E0E0);
                border-radius: 999px;
                color: var(--color-grey-0, #101010);
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border: none;
                pointer-events: auto;
                cursor: pointer;
                padding: 0;
                transition: background-color 150ms ease, transform 100ms ease;
            }
            .rdp-custom .rdp-button_previous:hover:not(:disabled),
            .rdp-custom .rdp-button_next:hover:not(:disabled) {
                background: #C8C7CA;
            }
            .rdp-custom .rdp-button_previous:active:not(:disabled),
            .rdp-custom .rdp-button_next:active:not(:disabled) {
                background: #ACAAAE;
                transform: scale(0.94);
            }
            .rdp-custom .rdp-button_previous:focus-visible,
            .rdp-custom .rdp-button_next:focus-visible {
                outline: 2px solid var(--border-focus, #7011F6);
                outline-offset: 2px;
            }
            .rdp-custom .rdp-button_previous:disabled,
            .rdp-custom .rdp-button_next:disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }
            /* Make the inner chevron SVG transparent to pointer events so
               the entire 32x32 button surface (including the icon) reliably
               registers clicks. Without this, the SVG eats clicks before
               they reach the button. */
            .rdp-custom .rdp-button_previous svg,
            .rdp-custom .rdp-button_next svg,
            .rdp-custom .rdp-button_previous svg *,
            .rdp-custom .rdp-button_next svg * {
                pointer-events: none;
            }
            .rdp-custom .rdp-weekdays { padding-bottom: 4px; }
            .rdp-custom .rdp-weekday {
                color: var(--color-grey-2, #747474);
                text-align: center;
                font-family: var(--font-family-title, "Red Hat Display");
                font-size: 11px;
                font-weight: 645;
                letter-spacing: -0.22px;
                text-transform: uppercase;
                padding-bottom: 6px;
            }
            .rdp-custom .rdp-day,
            .rdp-custom .rdp-day_button {
                color: var(--color-grey-0, #101010);
                text-align: center;
                font-family: var(--font-family-body, Manrope);
                font-size: 16px;
                font-weight: 500;
                letter-spacing: -0.32px;
                border-radius: 0;
            }
            .rdp-custom .rdp-day_button { width: 36px; height: 36px; padding: 0; }
            /* Any selected day gets the solid indigo bg by default — this
               covers the single-day case (only check-in set, no check-out
               yet) where the library labels the cell rdp-selected without
               rdp-range_start/end. */
            .rdp-custom .rdp-selected .rdp-day_button {
                background: var(--primary-indigo, #7011F6);
                color: #FFFFFF;
                border-radius: 0;
            }
            /* Range middle days override the catch-all with the 16% alpha
               background + indigo text. Declared AFTER so it wins. */
            .rdp-custom .rdp-range_middle .rdp-day_button {
                background: rgba(112, 17, 246, 0.16);
                color: var(--primary-indigo, #7011F6);
                border-radius: 0;
            }
            /* Range start / end days: solid indigo bg + white text, sharing
               the same square shape as the middle range so the selection
               renders as one continuous bar. */
            .rdp-custom .rdp-range_start .rdp-day_button,
            .rdp-custom .rdp-range_end .rdp-day_button,
            .rdp-custom .rdp-selected.rdp-range_start .rdp-day_button,
            .rdp-custom .rdp-selected.rdp-range_end .rdp-day_button {
                background: var(--primary-indigo, #7011F6);
                color: #FFFFFF;
                border-radius: 0;
            }
            .rdp-custom .rdp-disabled .rdp-day_button {
                color: var(--text-placeholder, #ACAAAE);
                opacity: 0.6;
            }
            /* Hover tint ONLY on non-selected days. Without the :not()
               guards, the hover rule (higher specificity) overrode the
               selected/range indigo fill — so on touch devices a just-picked
               day kept the pale hover colour until you tapped elsewhere. */
            .rdp-custom .rdp-day:not(.rdp-selected):not(.rdp-range_start):not(.rdp-range_middle):not(.rdp-range_end) .rdp-day_button:hover:not([disabled]) {
                background: rgba(112, 17, 246, 0.08);
            }
        `}</style>
    )
}
