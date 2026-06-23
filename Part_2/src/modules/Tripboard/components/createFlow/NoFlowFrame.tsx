/**
 * "No" branch of the When step. Asks the user for a rough duration and a
 * preferred month rather than exact check-in / check-out dates.
 *
 *   "No worries! Let's pick a timeframe"
 *   "How long do you plan to go?"   [7 days] [7-14 days] [14+ days]
 *   "Which month suits you best?"   3×4 grid of Mon YYYY tiles
 *
 * The 12-month grid is rendered from the current month forwards. Peak-season
 * tiles get a lavender chip overlay in the top-left corner.
 */
import { useMemo } from 'react'

const DURATIONS = [
    { id: '7', label: '7 days' },
    { id: '7-14', label: '7-14 days' },
    { id: '14+', label: '14+ days' },
] as const

export type DurationId = (typeof DURATIONS)[number]['id']

export interface MonthSelection {
    /** 0-11 (Jan=0). */
    month: number
    year: number
}

export interface NoFlowFrameProps {
    selectedDuration: DurationId | null
    selectedMonth: MonthSelection | null
    /** Months (0-11) that should show the "Peak Season" overlay. */
    peakSeasonMonths?: Set<number>
    onSelectDuration: (id: DurationId) => void
    onSelectMonth: (m: MonthSelection) => void
}

const MONTH_NAMES = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
] as const

export function NoFlowFrame({
    selectedDuration,
    selectedMonth,
    peakSeasonMonths = new Set(),
    onSelectDuration,
    onSelectMonth,
}: NoFlowFrameProps) {
    // 12 months from the current month forward.
    const months = useMemo<MonthSelection[]>(() => {
        const now = new Date()
        const out: MonthSelection[] = []
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
            out.push({ month: d.getMonth(), year: d.getFullYear() })
        }
        return out
    }, [])

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
                No worries! Let&rsquo;s pick a timeframe
            </h2>

            {/* Section 1: Duration */}
            <div className="mb-8">
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
                    How long do you plan to go?
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    {DURATIONS.map((d) => {
                        const selected = selectedDuration === d.id
                        return (
                            <DurationTile
                                key={d.id}
                                label={d.label}
                                selected={selected}
                                onClick={() => onSelectDuration(d.id)}
                            />
                        )
                    })}
                </div>
            </div>

            {/* Divider between the duration and month sections. */}
            <hr
                className="mb-8"
                style={{
                    border: 'none',
                    borderTop: '1px solid var(--color-grey-4, #E0E0E0)',
                }}
            />

            {/* Section 2: Month picker */}
            <div className="mb-8">
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
                    Which month suits you best?
                </h3>
                <div className="grid grid-cols-3 gap-3">
                    {months.map(({ month, year }) => {
                        const selected =
                            selectedMonth?.month === month &&
                            selectedMonth.year === year
                        const isPeak = peakSeasonMonths.has(month)
                        return (
                            <MonthTile
                                key={`${year}-${month}`}
                                month={MONTH_NAMES[month]}
                                year={year}
                                selected={selected}
                                isPeak={isPeak}
                                onClick={() => onSelectMonth({ month, year })}
                            />
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

interface DurationTileProps {
    label: string
    selected: boolean
    onClick: () => void
}

function DurationTile({ label, selected, onClick }: DurationTileProps) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className="rounded-2xl px-4 py-5 text-center transition-colors"
            style={{
                border: selected
                    ? '1.5px solid var(--border-focus, #7011F6)'
                    : '1px solid var(--color-grey-4, #E0E0E0)',
                background: selected
                    ? 'var(--surface-brand-subtle, #F0E5FE)'
                    : 'var(--surface-raised, #FFF)',
                color: selected
                    ? 'var(--text-brand, #7011F6)'
                    : 'var(--text-primary, #0D0C0D)',
                fontFamily: 'var(--font-family-body, Manrope)',
                fontSize: '16px',
                fontWeight: 600,
                lineHeight: '20px',
                letterSpacing: '-0.32px',
            }}
        >
            {label}
        </button>
    )
}

interface MonthTileProps {
    month: string
    year: number
    selected: boolean
    isPeak: boolean
    onClick: () => void
}

function MonthTile({ month, year, selected, isPeak, onClick }: MonthTileProps) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onClick}
            className="relative rounded-2xl px-4 py-4 text-center transition-colors"
            style={{
                border: selected
                    ? '1.5px solid var(--border-focus, #7011F6)'
                    : '1px solid var(--color-grey-4, #E0E0E0)',
                background: selected
                    ? 'var(--surface-brand-subtle, #F0E5FE)'
                    : 'var(--surface-raised, #FFF)',
                color: selected
                    ? 'var(--text-brand, #7011F6)'
                    : 'var(--text-primary, #0D0C0D)',
            }}
        >
            {isPeak && (
                <span
                    className="absolute -top-2 left-2 rounded-md px-1.5 py-0.5"
                    style={{
                        background: 'var(--surface-brand-subtle, #F0E5FE)',
                        color: 'var(--text-brand, #7011F6)',
                        fontFamily: 'var(--font-family-body, Manrope)',
                        fontSize: '12px',
                        fontWeight: 600,
                        lineHeight: '16px',
                        letterSpacing: '-0.24px',
                    }}
                >
                    Peak Season
                </span>
            )}
            <div
                style={{
                    color: selected
                        ? 'var(--text-brand, #7011F6)'
                        : 'var(--color-grey-2, #747474)',
                    textAlign: 'center',
                    fontFamily: 'var(--font-family-body, Manrope)',
                    fontSize: '14px',
                    fontWeight: 700,
                    lineHeight: 'normal',
                    letterSpacing: '-0.28px',
                }}
            >
                {month}
            </div>
            <div
                style={{
                    color: selected
                        ? 'var(--text-brand, #7011F6)'
                        : 'var(--color-grey-0, #101010)',
                    textAlign: 'center',
                    fontFamily: 'var(--font-family-body, Manrope)',
                    fontSize: '16px',
                    fontWeight: 500,
                    lineHeight: 'normal',
                    letterSpacing: '-0.32px',
                }}
            >
                {year}
            </div>
        </button>
    )
}
