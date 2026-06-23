/**
 * Who step — traveler-count + occasion picker.
 *
 * Each category renders a card with a 3D thiings illustration, a label,
 * an age-range subtitle, and a circular − / count / + control. The grid is
 * 2×2 on desktop and a single column on mobile. Occasion pills below it are
 * single-select.
 */
import { useEffect, useRef } from 'react'
import { ELDERS, ADULTS, CHILDREN, INFANTS } from '@/constants/thiingsIcons'
import { vacationPurposeOptions } from '@/modules/Onboarding/pages/TravelPurposeQuestionPage'
import { Stepper } from '@/components/shared/Stepper'
import { SectionError } from './SectionError'

export type TravelerKey = 'elders' | 'adults' | 'children' | 'infants'

export interface TravelerCounts {
    elders: number
    adults: number
    children: number
    infants: number
}

export type OccasionId =
    | 'leisure_relaxation'
    | 'honeymoon'
    | 'anniversary_trip'
    | 'birthday_celebration'
    | 'bachelor_bachelorette_trip'

export interface WhoFrameProps {
    counts: TravelerCounts
    occasion: OccasionId | null
    onChangeCount: (key: TravelerKey, next: number) => void
    onChangeOccasion: (occasion: OccasionId | null) => void
    /** Parent flags an unfilled section on Next → scroll to it + red helper. */
    invalidSection?: { section: 'travelers' | 'occasion'; nonce: number } | null
}

const TRAVELER_CATEGORIES: {
    key: TravelerKey
    label: string
    ageHint: string
    icon: string
    min: number
}[] = [
    { key: 'adults',   label: 'Adults',   ageHint: '18-59 years old', icon: ADULTS,   min: 0 },
    { key: 'children', label: 'Children', ageHint: '3-17 years old',  icon: CHILDREN, min: 0 },
    { key: 'infants',  label: 'Infants',  ageHint: '0-2 years old',   icon: INFANTS,  min: 0 },
    { key: 'elders',   label: 'Elders',   ageHint: '60+ years old',  icon: ELDERS,   min: 0 },
]

/** Resolve a thiings icon URL for each occasion. Looks the icon up by the
 *  shared `backendValue` so a single source of truth (`vacationPurposeOptions`)
 *  drives both the legacy travel-purpose page and this redesigned step. */
const occasionIcon = (id: OccasionId): string =>
    vacationPurposeOptions.find((o) => o.backendValue === id)?.imageSrc ?? ''

/** Eligibility rules per occasion (`null` = selectable). Rules use grown-ups
 *  (adults + elders) vs kids (children + infants). Occasions without an entry
 *  are always enabled. */
const OCCASION_RULES: Partial<Record<OccasionId, (counts: TravelerCounts) => string | null>> = {
    // Exactly a couple, no kids.
    honeymoon: ({ adults, elders, children, infants }) =>
        adults + elders !== 2 || children + infants > 0 ? 'Honeymoon is for a couple — set 2 adults/elders and no kids' : null,
    // A partnership (≥2 grown-ups).
    anniversary_trip: ({ adults, elders }) => (adults + elders < 2 ? 'Anniversary needs at least 2 adults or elders' : null),
    // An adults-only group (≥2 grown-ups, no kids).
    bachelor_bachelorette_trip: ({ adults, elders, children, infants }) =>
        adults + elders < 2 || children + infants > 0 ? 'Bachelor/ette is an adults-only group — no kids' : null
}

/** The default occasion used when the user picks none — it's intentionally
 *  NOT shown as a pill (leisure is the implicit baseline for any trip). */
export const DEFAULT_OCCASION: OccasionId = 'leisure_relaxation'

/** Occasion options mirror the desktop create flow: ids, labels and order all
 *  come from `vacationPurposeOptions` so both flows always offer the same set.
 *  `leisure_relaxation` is filtered out — it's the implicit default applied
 *  when nothing is selected, so showing it as a pill would be redundant.
 *  Only the count-based eligibility rules above are specific to this step. */
const OCCASIONS: { id: OccasionId; label: string; disabledReason?: (counts: TravelerCounts) => string | null }[] =
    vacationPurposeOptions
        .filter((o) => o.backendValue !== DEFAULT_OCCASION)
        .map((o) => ({
            id: o.backendValue as OccasionId,
            label: o.labelUi,
            disabledReason: OCCASION_RULES[o.backendValue as OccasionId]
        }))

/** Resolve the disabled reason for an occasion id (null = selectable). */
const occasionDisabledReason = (id: OccasionId, counts: TravelerCounts): string | null =>
    OCCASIONS.find((o) => o.id === id)?.disabledReason?.(counts) ?? null

export function WhoFrame({
    counts,
    occasion,
    onChangeCount,
    onChangeOccasion,
    invalidSection,
}: WhoFrameProps) {
    const totalTravelers = counts.elders + counts.adults + counts.children + counts.infants
    const travelersError = invalidSection?.section === 'travelers' && totalTravelers === 0

    const grownUps = counts.adults + counts.elders
    const hasDependents = counts.children > 0 || counts.infants > 0

    // Kids need ≥1 grown-up; infants capped at one per grown-up (lap-infant rule).
    const incrementDisabled = (key: TravelerKey): boolean => {
        if (key === 'children') return grownUps === 0
        if (key === 'infants') return grownUps === 0 || counts.infants >= grownUps
        return false
    }

    // Can't drop the last grown-up while kids are present, nor below the infant count.
    const decrementDisabled = (key: TravelerKey): boolean => {
        if (key === 'adults' || key === 'elders') {
            const nextGrownUps = grownUps - 1
            return counts[key] > 0 && ((hasDependents && nextGrownUps === 0) || nextGrownUps < counts.infants)
        }
        return false
    }

    // Clear the picked occasion if a count change makes it ineligible (e.g. an
    // elder added to a honeymoon). Ref + primitive deps so it runs only on a
    // real count change, not every render (counts is a fresh object each time).
    const onChangeOccasionRef = useRef(onChangeOccasion)
    onChangeOccasionRef.current = onChangeOccasion
    useEffect(() => {
        if (occasion && occasionDisabledReason(occasion, counts)) {
            onChangeOccasionRef.current(null)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [occasion, counts.adults, counts.elders, counts.children, counts.infants])

    return (
        <div className="mx-auto w-full max-w-[690px] pt-8">
            <h2
                className="mb-6 text-left"
                style={{
                    color: 'var(--text-primary, #0D0C0D)',
                    fontFamily: 'var(--font-family-title, "Red Hat Display")',
                    fontSize: '24px',
                    fontWeight: 600,
                    lineHeight: '32px',
                    letterSpacing: '-0.48px',
                }}
            >
                Tell us who&rsquo;s going on this trip
            </h2>

            {/* Section 1: Traveler counters — 2×2 on desktop, 1-col on mobile. */}
            <div className="mb-8">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {TRAVELER_CATEGORIES.map((cat) => (
                        <TravelerCard
                            key={cat.key}
                            icon={cat.icon}
                            label={cat.label}
                            ageHint={cat.ageHint}
                            count={counts[cat.key]}
                            min={cat.min}
                            incrementDisabled={incrementDisabled(cat.key)}
                            decrementDisabled={decrementDisabled(cat.key)}
                            onDecrement={() => onChangeCount(cat.key, Math.max(cat.min, counts[cat.key] - 1))}
                            onIncrement={() => onChangeCount(cat.key, counts[cat.key] + 1)}
                        />
                    ))}
                </div>
                {/* Explain the disabled + button when the lap-infant cap is hit. */}
                {counts.infants >= grownUps && counts.infants > 0 && (
                    <p
                        className="mt-2"
                        style={{
                            color: 'var(--text-tertiary, #4F4F50)',
                            fontFamily: 'var(--font-family-body, Manrope)',
                            fontSize: '12px',
                            fontWeight: 500,
                            lineHeight: '16px',
                            letterSpacing: '-0.24px',
                        }}
                    >
                        Each infant needs an adult or elder to travel with — add one more adult to bring another infant.
                    </p>
                )}
                <SectionError show={travelersError} nonce={invalidSection?.nonce} message="Add at least one traveler to continue" />
            </div>

            {/* Section 2: Occasion picker — single-select pills (optional;
                defaults to leisure when none is chosen). */}
            <div className="mb-8 mt-8">
                <h3
                    className="text-left"
                    style={{
                        color: 'var(--text-primary, #0D0C0D)',
                        fontFamily: 'var(--font-family-body, Manrope)',
                        fontSize: '16px',
                        fontWeight: 600,
                        lineHeight: '20px',
                        letterSpacing: '-0.32px',
                        marginBottom: '16px',
                    }}
                >
                    Any special occasion? <span style={{ color: 'var(--text-tertiary, #6B6970)', fontWeight: 500 }}>(optional)</span>
                </h3>
                <div className="flex flex-wrap gap-3">
                    {OCCASIONS.map((o) => {
                        const selected = occasion === o.id
                        const disabledReason = occasionDisabledReason(o.id, counts)
                        const disabled = disabledReason !== null
                        const iconUrl = occasionIcon(o.id)
                        return (
                            <button
                                key={o.id}
                                type="button"
                                aria-pressed={selected}
                                disabled={disabled}
                                title={disabledReason ?? undefined}
                                onClick={() => onChangeOccasion(selected ? null : o.id)}
                                className="inline-flex items-center gap-2 rounded-full px-4 py-2 transition-colors disabled:cursor-not-allowed enabled:cursor-pointer"
                                style={{
                                    border: selected
                                        ? '1.5px solid var(--border-focus, #7011F6)'
                                        : '1px solid var(--color-grey-4, #E0E0E0)',
                                    background: disabled
                                        ? 'var(--surface-sunken, #F5F4F7)'
                                        : selected
                                            ? 'var(--surface-brand-subtle, #F0E5FE)'
                                            : 'var(--surface-raised, #FFF)',
                                    color: disabled
                                        ? 'var(--text-placeholder, #ACAAAE)'
                                        : selected
                                            ? 'var(--text-brand, #7011F6)'
                                            : 'var(--text-primary, #0D0C0D)',
                                    opacity: disabled ? 0.7 : 1,
                                    fontFamily: 'var(--font-family-body, Manrope)',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    lineHeight: '20px',
                                    letterSpacing: '-0.28px',
                                }}
                            >
                                {iconUrl ? (
                                    <img
                                        src={iconUrl}
                                        alt=""
                                        aria-hidden
                                        className="object-contain"
                                        style={{ width: 20, height: 20, flexShrink: 0, opacity: disabled ? 0.55 : 1 }}
                                    />
                                ) : null}
                                {o.label}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

interface TravelerCardProps {
    icon: string
    label: string
    ageHint: string
    count: number
    min: number
    incrementDisabled?: boolean
    decrementDisabled?: boolean
    onDecrement: () => void
    onIncrement: () => void
}

function TravelerCard({
    icon,
    label,
    ageHint,
    count,
    min,
    incrementDisabled,
    decrementDisabled,
    onDecrement,
    onIncrement,
}: TravelerCardProps) {
    return (
        <div
            className="flex items-center gap-4 rounded-2xl p-4"
            style={{
                border: '1px solid var(--color-grey-4, #E0E0E0)',
                background: 'var(--surface-raised, #FFF)',
            }}
        >
            {/* Illustration — 36×36 square per spec. */}
            <img
                src={icon}
                alt=""
                aria-hidden
                className="shrink-0 object-contain"
                style={{ width: 36, height: 36, aspectRatio: '1 / 1' }}
            />

            {/* Label + age hint */}
            <div className="flex min-w-0 flex-1 flex-col">
                <span
                    style={{
                        color: '#000',
                        fontFamily: 'var(--font-family-title, "Red Hat Display")',
                        fontSize: 'var(--font-size-m, 16px)',
                        fontWeight: 550,
                        lineHeight: 'var(--line-height-s, 20px)',
                        letterSpacing: '-0.32px',
                    }}
                >
                    {label}
                </span>
                <span
                    style={{
                        color: 'var(--Text-Tertiary, #4F4F50)',
                        fontFamily: 'var(--font-family-body, Manrope)',
                        fontSize: 'var(--font-size-s, 14px)',
                        fontWeight: 600,
                        lineHeight: 'var(--line-height-xs, 18px)',
                        letterSpacing: '-0.28px',
                        marginTop: '2px',
                    }}
                >
                    {ageHint}
                </span>
            </div>

            {/* − / count / + — shared Stepper, indigo-outlined per spec. */}
            <Stepper
                label={label}
                onDecrement={onDecrement}
                onIncrement={onIncrement}
                decrementDisabled={count <= min || decrementDisabled}
                incrementDisabled={incrementDisabled}
                iconSize={18}
            >
                <span
                    className="tabular-nums"
                    style={{
                        color: '#101010',
                        textAlign: 'center',
                        fontFamily: '"Red Hat Display"',
                        fontSize: '16px',
                        fontWeight: 645,
                        lineHeight: '18px',
                        letterSpacing: '-0.64px',
                        minWidth: '20px',
                    }}
                >
                    {count}
                </span>
            </Stepper>
        </div>
    )
}
