/**
 * How step — personalise the trip.
 *
 *   "Personalise your trip"
 *
 *   ┌─ SET BUDGET ────────────────── ₹3,000 - ₹6,000 /night ─┐
 *   │  [₹]──●─────────────────────●────────────────         │
 *   │  Economy        Mid-range            Luxury           │
 *   └────────────────────────────────────────────────────────┘
 *
 *   ── divider ──
 *
 *   Set your pace
 *   [🧘 Relaxed]   [🧘 Balanced]   [🧘 Fully Packed]
 *
 *   ── divider ──
 *
 *   Dietary preferences
 *   [△ Non-veg]  [▣ Veg]  [△ Egg]
 *
 *   ── divider ──
 *
 *   Tell us what you need ✨
 *   ┌────────────────────────────────────────────────────────┐
 *   │  Describe your interests here                          │
 *   └────────────────────────────────────────────────────────┘
 *   suggestion chip carousel (horizontal scroll)
 */
import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
    YOGA_ICON,
    WALK,
    RUN,
    SPARKLES_ICON,
} from '@/constants/thiingsIcons'
import { WizardBackButton } from './WizardBackButton'
import { SectionError } from './SectionError'

export type PaceId = 'relaxed' | 'balanced' | 'fully_packed'
export type DietId = 'non_veg' | 'veg' | 'egg'

export interface HowFrameProps {
    /** Selected stay type (server value, e.g. 'hotel'), or null until picked. */
    stayType: string | null
    budgetRange: { min: number; max: number }
    pace: PaceId | null
    /** Multi-select set of dietary preferences. Empty when nothing picked. */
    diet: Set<DietId>
    notes: string
    onChangeStayType: (v: string) => void
    onChangeBudgetRange: (r: { min: number; max: number }) => void
    onChangePace: (p: PaceId) => void
    /** Toggle membership of `d` in the diet set. */
    onToggleDiet: (d: DietId) => void
    onChangeNotes: (n: string) => void
    /** Mobile step-back (inline in the heading). Omitted → no arrow. */
    onBack?: () => void
    /** AI-generated prompt suggestions fetched from the itinerary-prompts API.
     *  Falls back to a static set while loading / on failure. */
    // promptSuggestions?: string[]
    /** Set by the parent when "Plan my trip" is clicked with a required section
     *  unfilled — drives a scroll-to + red flash on that section. `nonce` makes
     *  repeat clicks re-trigger. */
    invalidSection?: { section: 'stay' | 'pace' | 'diet'; nonce: number } | null
    /** Fired when a prompt-suggestion chip is tapped (for analytics). */
    // onPromptSelect?: (text: string) => void
}

/** Stay-type tiles. Images + server values mirror the onboarding
 *  AccommodationQuestionPage so the option set stays consistent. */
const STAY_TYPES: { value: string; label: string; image: string }[] = [
    { value: 'hotel', label: 'Hotels', image: 'https://media.rimigo.com/1762969381503_979b383adae45bd59fd46549d77bc008.png' },
    { value: 'apartment', label: 'Apartments', image: 'https://media.rimigo.com/1762969408875_510e3418ed645cb39ef86268f055ecf3.png' },
    { value: 'hostel', label: 'Hostels', image: 'https://media.rimigo.com/1762969437181_776c5421023659febad0f8c947abc3a5.png' },
    { value: 'unique_stays', label: 'Unique Stays', image: 'https://media.rimigo.com/1762969493399_edf6adf4c9f2548092ccc247119db364.png' },
]

const PACES: { id: PaceId; label: string; subtitle: string; icon: string }[] = [
    { id: 'relaxed',      label: 'Relaxed',      subtitle: 'More downtime, 1-2 activities',  icon: YOGA_ICON },
    { id: 'balanced',     label: 'Balanced',     subtitle: 'Mix of exploring & rest',        icon: WALK },
    { id: 'fully_packed', label: 'Fully Packed', subtitle: 'See as much as possible per day', icon: RUN },
]

const DIETS: { id: DietId; label: string }[] = [
    { id: 'non_veg', label: 'Non-veg' },
    { id: 'veg',     label: 'Veg' },
    { id: 'egg',     label: 'Egg' },
]

/** Dummy AI-style prompt suggestions shown under the free-text box. Clicking
 *  one fills the textarea. Swap for the real `fetchItineraryPrompts` result
 *  when wiring the backend. */
// const PROMPT_SUGGESTIONS = [
//     'I am travelling with a kid and want to visit kid-friendly places',
//     'I want to have a relaxed vacation and come back with happy memories',
//     'I want a mix of culture, food and relaxation with some adventure',
//     'As a solo traveler, I want to explore local markets and hidden gems',
// ]

/** Slider track range for the per-night budget. Anchored at ₹500 (Economy
 *  floor) and ₹25,000 (Luxury ceiling) to keep the thumbs interactive across
 *  the whole "Economy → Mid-range → Luxury" continuum. */
const BUDGET_MIN = 500
const BUDGET_MAX = 25000

export function HowFrame({
    stayType,
    budgetRange,
    pace,
    diet,
    notes,
    onChangeStayType,
    onChangeBudgetRange,
    onChangePace,
    onToggleDiet,
    onChangeNotes,
    onBack,
    // promptSuggestions,
    invalidSection,
    // onPromptSelect,
}: HowFrameProps) {
    // Prefer live API prompts; fall back to the static set while they load.
    // const suggestions = promptSuggestions && promptSuggestions.length > 0 ? promptSuggestions : PROMPT_SUGGESTIONS

    // A section's error shows only while it's the flagged one AND still empty,
    // so it clears the moment the user fills it.
    const stayError = invalidSection?.section === 'stay' && !stayType
    const paceError = invalidSection?.section === 'pace' && !pace
    const dietError = invalidSection?.section === 'diet' && diet.size === 0
    // INR currency formatter used in the budget card header ("₹3,000 - ₹6,000").
    const inr = useMemo(
        () => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }),
        [],
    )

    return (
        <div className="mx-auto w-full max-w-[690px] pt-8">
            <div className="mb-6 flex items-start gap-1.5">
                <WizardBackButton onBack={onBack} />
                <h2
                    className="text-left text-[20px] leading-[26px] md:text-[24px] md:leading-[32px]"
                    style={{
                        color: 'var(--text-primary, #0D0C0D)',
                        fontFamily: 'var(--font-family-title, "Red Hat Display")',
                        fontWeight: 600,
                        letterSpacing: '-0.48px',
                    }}
                >
                    Personalise your trip
                </h2>
            </div>

            {/* Section: Stay type — 2x2 tiles. Picking one reveals the budget. */}
            <div className="mb-8">
                <h3 className="mb-4" style={sectionHeadingStyle}>
                    What kind of stays do you prefer?
                </h3>
                <div className="flex flex-wrap gap-3">
                    {STAY_TYPES.map((s) => (
                        <StayTile
                            key={s.value}
                            label={s.label}
                            image={s.image}
                            selected={stayType === s.value}
                            onClick={() => onChangeStayType(s.value)}
                        />
                    ))}
                </div>

                {/* Budget — animates in once a stay type is chosen. */}
                <AnimatePresence initial={false}>
                    {stayType && (
                        <motion.div
                            key="budget"
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden' }}
                        >
                            <BudgetCard
                                range={budgetRange}
                                onChange={onChangeBudgetRange}
                                formatter={inr}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
                <SectionError show={stayError} nonce={invalidSection?.nonce} message="Please pick the kind of stays you prefer" />
            </div>

            <Divider />

            {/* Section 3: Pace tiles — single row, 3 columns. */}
            <div className="mb-8 mt-8">
                <h3 className="mb-4" style={sectionHeadingStyle}>
                    Set your pace
                </h3>
                {/* Segmented control: tiles butt up against each other inside
                    a single rounded outline. Individual tile borders are
                    suppressed; the wrapper draws the outer border. */}
                <div
                    className="grid grid-cols-3 overflow-hidden"
                    style={{
                        borderRadius: 12,
                        border: '1px solid var(--color-grey-4, #E0E0E0)',
                        background: 'var(--surface-raised, #FFF)',
                    }}
                >
                    {PACES.map((p, i) => (
                        <PaceTile
                            key={p.id}
                            icon={p.icon}
                            label={p.label}
                            subtitle={p.subtitle}
                            selected={pace === p.id}
                            isFirst={i === 0}
                            onClick={() => onChangePace(p.id)}
                        />
                    ))}
                </div>
                <SectionError show={paceError} nonce={invalidSection?.nonce} message="Please set your pace" />
            </div>

            <Divider />

            {/* Section 4: Dietary preferences — single select per design. */}
            <div className="mb-8 mt-8">
                <h3 className="mb-4" style={sectionHeadingStyle}>
                    Dietary preferences
                </h3>
                <div className="flex flex-wrap gap-3">
                    {DIETS.map((d) => (
                        <DietPill
                            key={d.id}
                            id={d.id}
                            label={d.label}
                            selected={diet.has(d.id)}
                            onClick={() => onToggleDiet(d.id)}
                        />
                    ))}
                </div>
                <SectionError show={dietError} nonce={invalidSection?.nonce} message="Please pick a dietary preference" />
            </div>

            <Divider />

            {/* Section 5: Free-text notes + suggestion chips. */}
            <div className="mb-8 mt-8">
                <h3 className="mb-3 flex items-center gap-2" style={sectionHeadingStyle}>
                    Tell us what you need
                    <img
                        src={SPARKLES_ICON}
                        alt=""
                        aria-hidden
                        style={{ width: 20, height: 20, flexShrink: 0 }}
                    />
                </h3>
                <textarea
                    value={notes}
                    onChange={(e) => onChangeNotes(e.target.value)}
                    placeholder="Describe your interests here"
                    rows={4}
                    className="w-full resize-none rounded-2xl px-4 py-3 outline-none transition-colors focus:outline-none"
                    style={{
                        border: '1px solid var(--border-focus, #7011F6)',
                        background: 'var(--surface-raised, #FFF)',
                        color: 'var(--text-primary, #0D0C0D)',
                        fontFamily: 'var(--font-family-body, Manrope)',
                        fontSize: '14px',
                        fontWeight: 500,
                        lineHeight: '20px',
                        letterSpacing: '-0.28px',
                    }}
                />

                {/* AI-style prompt suggestions. Clicking one fills the box.
                    Horizontal scroll so the row never wraps awkwardly. */}
                {/* <div
                    className="mt-3 flex gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {suggestions.map((text) => (
                        <button
                            key={text}
                            type="button"
                            onClick={() => {
                                onPromptSelect?.(text)
                                onChangeNotes(text)
                            }}
                            className="flex w-[240px] shrink-0 items-start gap-2 rounded-2xl border bg-white px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-sunken,#F5F4F7)]"
                            style={{
                                borderColor: notes === text ? 'var(--border-focus, #7011F6)' : 'var(--color-grey-4, #E0E0E0)',
                                background: notes === text ? 'var(--surface-brand-subtle, #F0E5FE)' : 'var(--surface-raised, #FFF)',
                            }}
                        >
                            <Sparkles
                                size={16}
                                strokeWidth={2}
                                className="mt-0.5 shrink-0"
                                style={{ color: 'var(--text-brand, #7011F6)' }}
                            />
                            <span
                                className="line-clamp-3"
                                style={{
                                    color: 'var(--text-tertiary, #4F4F50)',
                                    fontFamily: 'var(--font-family-body, Manrope)',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    lineHeight: '18px',
                                    letterSpacing: '-0.26px',
                                }}
                            >
                                {text}
                            </span>
                        </button>
                    ))}
                </div> */}
            </div>
        </div>
    )
}

interface StayTileProps {
    label: string
    image: string
    selected: boolean
    onClick: () => void
}

function StayTile({ label, image, selected, onClick }: StayTileProps) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className="flex cursor-pointer items-center gap-2.5 px-4 py-2.5 transition-colors"
            style={{
                borderRadius: 999,
                border: selected ? '1.5px solid var(--border-focus, #7011F6)' : '1px solid var(--color-grey-4, #E0E0E0)',
                background: selected ? 'var(--surface-brand-subtle, #F0E5FE)' : 'var(--surface-raised, #FFF)',
            }}
        >
            <img
                src={image}
                alt=""
                aria-hidden
                className="object-contain"
                style={{ width: 24, height: 24, flexShrink: 0, aspectRatio: '1 / 1' }}
            />
            <span
                className="truncate"
                style={{
                    color: selected ? 'var(--text-brand, #7011F6)' : '#000',
                    fontFamily: 'var(--font-family-title, "Red Hat Display")',
                    fontSize: '15px',
                    fontWeight: 600,
                    lineHeight: '20px',
                    letterSpacing: '-0.3px',
                }}
            >
                {label}
            </span>
        </button>
    )
}

// ── Sub-components ───────────────────────────────────────────────────────────

const sectionHeadingStyle: React.CSSProperties = {
    color: 'var(--text-primary, #0D0C0D)',
    fontFamily: 'var(--font-family-body, Manrope)',
    fontSize: '16px',
    fontWeight: 600,
    lineHeight: '20px',
    letterSpacing: '-0.32px',
}

function Divider() {
    return (
        <hr
            style={{
                border: 'none',
                borderTop: '1px solid var(--color-grey-4, #E0E0E0)',
            }}
        />
    )
}

interface PaceTileProps {
    icon: string
    label: string
    subtitle: string
    selected: boolean
    /** True for the leftmost tile. We only draw a left-side divider on the
     *  2nd and 3rd tiles so adjacent borders don't double up. */
    isFirst: boolean
    onClick: () => void
}

function PaceTile({ icon, label, subtitle, selected, isFirst, onClick }: PaceTileProps) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className="flex cursor-pointer flex-col items-center px-3 py-4 text-center transition-colors"
            style={{
                borderLeft: isFirst
                    ? 'none'
                    : '1px solid var(--color-grey-4, #E0E0E0)',
                background: selected
                    ? 'var(--surface-brand-subtle, #F0E5FE)'
                    : 'transparent',
            }}
        >
            {icon ? (
                <img
                    src={icon}
                    alt=""
                    aria-hidden
                    className="object-contain"
                    style={{ width: 30, height: 30, flexShrink: 0, aspectRatio: '1 / 1' }}
                />
            ) : (
                <span
                    aria-hidden
                    style={{
                        width: 30,
                        height: 30,
                        flexShrink: 0,
                        borderRadius: 8,
                        background: 'var(--color-grey-5, #F5F5F5)',
                    }}
                />
            )}
            <span
                style={{
                    marginTop: 8,
                    color: selected ? 'var(--Text-Brand, #7011F6)' : '#000',
                    textAlign: 'center',
                    fontFamily: 'var(--font-family-title, "Red Hat Display")',
                    fontSize: '13px',
                    fontWeight: 600,
                    lineHeight: 'var(--line-height-2xs, 16px)',
                    letterSpacing: '-0.24px',
                }}
            >
                {label}
            </span>
            <span
                style={{
                    color: selected ? 'var(--Text-Brand-Strong, #430A94)' : 'var(--Text-Tertiary, #4F4F50)',
                    textAlign: 'center',
                    fontFamily: 'var(--font-family-body, Manrope)',
                    fontSize: 'var(--font-size-2xs, 11px)',
                    fontWeight: 600,
                    lineHeight: 'var(--line-height-2xs, 16px)',
                    letterSpacing: '-0.22px',
                }}
            >
                {subtitle}
            </span>
        </button>
    )
}

interface DietPillProps {
    id: DietId
    label: string
    selected: boolean
    onClick: () => void
}

function DietPill({ id, label, selected, onClick }: DietPillProps) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className="inline-flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors"
            style={{
                borderRadius: 8,
                border: selected
                    ? '1.5px solid var(--border-focus, #7011F6)'
                    : '1px solid var(--color-grey-4, #E0E0E0)',
                background: selected
                    ? 'var(--surface-brand-subtle, #F0E5FE)'
                    : 'var(--surface-raised, #FFF)',
                color: selected ? 'var(--text-brand, #7011F6)' : '#000',
                fontFamily: 'var(--font-family-title, "Red Hat Display")',
                fontSize: '16px',
                fontWeight: 550,
                lineHeight: '20px',
                letterSpacing: '-0.32px',
            }}
        >
            <DietGlyph id={id} />
            {label}
        </button>
    )
}

/** FSSAI-style food-label glyph — square outline with a coloured marker.
 *  Veg: green dot. Egg: amber dot. Non-veg: brown triangle. Rendered inline so
 *  glyphs always scale crisply alongside the 3D thiings illustrations. */
function DietGlyph({ id }: { id: DietId }) {
    const colorMap: Record<DietId, string> = {
        non_veg: '#A05A2C',
        veg: '#1AB35E',
        egg: '#E8A33D',
    }
    const color = colorMap[id]
    return (
        <span
            aria-hidden
            className="relative flex items-center justify-center"
            style={{
                width: 20,
                height: 20,
                flexShrink: 0,
                border: `1.5px solid ${color}`,
                borderRadius: 3,
            }}
        >
            {id === 'non_veg' ? (
                <span
                    style={{
                        width: 0,
                        height: 0,
                        borderLeft: '5px solid transparent',
                        borderRight: '5px solid transparent',
                        borderBottom: `8px solid ${color}`,
                    }}
                />
            ) : (
                <span
                    style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: color,
                    }}
                />
            )}
        </span>
    )
}

interface BudgetCardProps {
    range: { min: number; max: number }
    onChange: (r: { min: number; max: number }) => void
    formatter: Intl.NumberFormat
}

function BudgetCard({ range, onChange, formatter }: BudgetCardProps) {
    return (
        <div
            className="rounded-2xl p-4"
            style={{
                border: '1px solid var(--color-grey-4, #E0E0E0)',
                background: 'var(--surface-raised, #FFF)',
            }}
        >
            {/* Always one line: the value never wraps; the heading takes the
                remaining width and truncates with an ellipsis if a 5-digit
                amount leaves no room — so the row height never jumps as the
                user drags the slider. */}
            <div className="mb-3 flex items-center gap-2">
                <span
                    className="min-w-0 flex-1 truncate"
                    style={{
                        color: 'var(--text-primary, #0D0C0D)',
                        fontFamily: 'var(--font-family-body, Manrope)',
                        fontSize: '14px',
                        fontWeight: 600,
                        lineHeight: '20px',
                        letterSpacing: '-0.28px',
                    }}
                >
                    What&rsquo;s your budget per night?
                </span>
                <span
                    className="shrink-0 whitespace-nowrap"
                    style={{
                        color: 'var(--text-primary, #0D0C0D)',
                        fontFamily: 'var(--font-family-body, Manrope)',
                        fontSize: '14px',
                        fontWeight: 600,
                        lineHeight: '20px',
                        letterSpacing: '-0.28px',
                    }}
                >
                    {formatter.format(range.min)} - {formatter.format(range.max)}
                </span>
            </div>
            {/* ₹ icon sits flush against the track so the line reads as one
                continuous slider anchored at the rupee badge (per the design). */}
            <div className="mt-2 flex items-center">
                <span
                    aria-hidden
                    className="z-10 flex shrink-0 items-center justify-center"
                    style={{
                        // Wider oval pill (matches the budget design) — not a circle.
                        width: 56,
                        height: 36,
                        borderRadius: 999,
                        border: '1px solid var(--color-grey-4, #E0E0E0)',
                        background: '#FFF',
                        color: '#7011F6',
                        fontSize: '18px',
                        fontWeight: 700,
                    }}
                >
                    ₹
                </span>
                <RangeSlider
                    min={BUDGET_MIN}
                    max={BUDGET_MAX}
                    value={range}
                    onChange={onChange}
                />
            </div>
            <div className="mt-2 flex items-center justify-between">
                {(['Economy', 'Mid-range', 'Luxury'] as const).map((label, i) => {
                    // Each tier owns a third of the track; it highlights only
                    // while the selected range overlaps it.
                    const tierSpan = (BUDGET_MAX - BUDGET_MIN) / 3
                    const tierStart = BUDGET_MIN + i * tierSpan
                    const tierEnd = tierStart + tierSpan
                    const active = range.min < tierEnd && range.max > tierStart
                    return (
                        <span
                            key={label}
                            style={{
                                color: active ? 'var(--primary-indigo, #7011F6)' : 'var(--color-grey-4, #E0E0E0)',
                                fontFamily: 'var(--font-family-body, Manrope)',
                                fontSize: '12px',
                                fontWeight: active ? 600 : 500,
                                lineHeight: '16px',
                                letterSpacing: '-0.24px',
                            }}
                        >
                            {label}
                        </span>
                    )
                })}
            </div>
        </div>
    )
}

interface RangeSliderProps {
    min: number
    max: number
    value: { min: number; max: number }
    onChange: (r: { min: number; max: number }) => void
}

/** Two-handle range slider. Renders the indigo selection band between the
 *  handles on top of the grey track. Inputs are layered so both thumbs are
 *  reachable; pointer-events on the tracks are disabled so clicks land on the
 *  topmost thumb. */
function RangeSlider({ min, max, value, onChange }: RangeSliderProps) {
    const pct = (n: number) => ((n - min) / (max - min)) * 100
    const leftPct = pct(value.min)
    const rightPct = pct(value.max)

    return (
        <div className={`relative h-6 flex-1 ${SLIDER_CLASS}`}>
            {/* Base track — Grey-4 so only the selected band reads as active. */}
            <div
                className="absolute left-0 right-0 top-1/2 -translate-y-1/2 rounded-full"
                style={{ height: 4, background: 'var(--color-grey-4, #E0E0E0)' }}
            />
            {/* Indigo selection band */}
            <div
                className="absolute top-1/2 -translate-y-1/2 rounded-full"
                style={{
                    height: 4,
                    left: `${leftPct}%`,
                    right: `${100 - rightPct}%`,
                    background: 'var(--primary-indigo, #7011F6)',
                }}
            />
            {/* Min input */}
            <input
                type="range"
                min={min}
                max={max}
                value={value.min}
                step={100}
                onChange={(e) => {
                    const next = Math.min(Number(e.target.value), value.max - 500)
                    onChange({ ...value, min: next })
                }}
                className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
                style={sliderInputStyle}
            />
            {/* Max input */}
            <input
                type="range"
                min={min}
                max={max}
                value={value.max}
                step={100}
                onChange={(e) => {
                    const next = Math.max(Number(e.target.value), value.min + 500)
                    onChange({ ...value, max: next })
                }}
                className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
                style={sliderInputStyle}
            />
            {/* Thumb styling — inlined so it scopes to this slider only. */}
            <style>{`
                .${SLIDER_CLASS} input[type="range"] { -webkit-appearance: none; appearance: none; }
                .${SLIDER_CLASS} input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: var(--primary-indigo, #7011F6);
                    border: 2px solid #FFF;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(13, 12, 13, 0.16);
                }
                .${SLIDER_CLASS} input[type="range"]::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: var(--primary-indigo, #7011F6);
                    border: 2px solid #FFF;
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(13, 12, 13, 0.16);
                }
            `}</style>
        </div>
    )
}

const SLIDER_CLASS = 'how-budget-slider'
const sliderInputStyle: React.CSSProperties = { background: 'transparent' }
