/**
 * In-theme inline datetime picker.
 *
 * Replaces the native ``<input type="datetime-local">`` + browser
 * calendar popover — those are three taps deep and don't honour the
 * Rimigo theme. This one mounts inline inside ``ComposerTimeStrip``:
 * month grid on the left, hour/minute/AM-PM steppers on the right,
 * one click changes either. Colors, radii, typography track
 * ``colors_and_type.css``.
 *
 * All internal math uses the UTC components of the passed ``Date`` so
 * the widget displays what the user typed regardless of the browser's
 * local timezone — matching the rest of the itinerary stack which
 * stores + renders UTC.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

interface Props {
    /** Current value (UTC-normalised datetime). */
    value: Date
    /** Earliest datetime the user is allowed to pick. */
    minValue?: Date
    onChange: (next: Date) => void
    /** Heading shown above the picker (e.g. "Start date & time"). */
    title?: string
    /** Called when the user clicks Done (or explicitly closes). */
    onDone?: () => void
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MIN_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

const DateTimePickerPopover = ({ value, minValue, onChange, title, onDone }: Props) => {
    const [viewMonth, setViewMonth] = useState(() =>
        new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1)),
    )

    // ─── Derived bits for the time steppers ────────────────────────
    const hours24 = value.getUTCHours()
    const minutes = value.getUTCMinutes()
    const period: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM'
    const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24

    // ─── Calendar math ─────────────────────────────────────────────
    const calendar = useMemo(() => {
        const year = viewMonth.getUTCFullYear()
        const month = viewMonth.getUTCMonth()
        const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay()
        const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
        const minDayStart = minValue
            ? Date.UTC(
                  minValue.getUTCFullYear(),
                  minValue.getUTCMonth(),
                  minValue.getUTCDate(),
              )
            : null
        const cells: (number | null)[] = Array.from({ length: firstWeekday }, () => null)
        for (let d = 1; d <= daysInMonth; d += 1) cells.push(d)
        // Pad to a fixed 42 cells (6 weeks) so the widget height is
        // identical whether the month spans 4, 5, or 6 rows — stops the
        // enclosing popover from "jumping" when the user flips months.
        while (cells.length < 42) cells.push(null)
        return { year, month, daysInMonth, cells, minDayStart }
    }, [viewMonth, minValue])

    const monthLabel = useMemo(
        () =>
            new Date(viewMonth.getTime()).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
                timeZone: 'UTC',
            }),
        [viewMonth],
    )

    // ─── Mutators ──────────────────────────────────────────────────
    const updateTo = (next: Date) => {
        if (minValue && next.getTime() < minValue.getTime()) {
            onChange(new Date(minValue.getTime()))
            return
        }
        onChange(next)
    }

    const shiftMonth = (delta: number) => {
        setViewMonth(
            new Date(Date.UTC(viewMonth.getUTCFullYear(), viewMonth.getUTCMonth() + delta, 1)),
        )
    }

    const handleDatePick = (day: number) => {
        const next = new Date(value.getTime())
        next.setUTCFullYear(calendar.year)
        next.setUTCMonth(calendar.month)
        next.setUTCDate(day)
        updateTo(next)
    }

    const isPastDay = (day: number) => {
        if (!calendar.minDayStart) return false
        const dayStart = Date.UTC(calendar.year, calendar.month, day)
        return dayStart < calendar.minDayStart
    }

    const isSelected = (day: number) =>
        value.getUTCFullYear() === calendar.year &&
        value.getUTCMonth() === calendar.month &&
        value.getUTCDate() === day

    const setHour12 = (h: number) => {
        let next24 = h
        if (period === 'PM' && h !== 12) next24 = h + 12
        else if (period === 'AM' && h === 12) next24 = 0
        const next = new Date(value.getTime())
        next.setUTCHours(next24, minutes, 0, 0)
        updateTo(next)
    }

    const setMinutes = (m: number) => {
        const next = new Date(value.getTime())
        next.setUTCHours(hours24, m, 0, 0)
        updateTo(next)
    }

    const setPeriod = (p: 'AM' | 'PM') => {
        if (p === period) return
        let next24 = hours24
        if (p === 'PM' && hours24 < 12) next24 = hours24 + 12
        if (p === 'AM' && hours24 >= 12) next24 = hours24 - 12
        const next = new Date(value.getTime())
        next.setUTCHours(next24, minutes, 0, 0)
        updateTo(next)
    }

    // Round the minutes value to the nearest entry in MIN_OPTIONS for the
    // dropdown display so we never show an orphan value not in the list.
    const minutesDisplay = MIN_OPTIONS.includes(minutes)
        ? minutes
        : MIN_OPTIONS.reduce((best, cand) =>
              Math.abs(cand - minutes) < Math.abs(best - minutes) ? cand : best,
          )

    return (
        <div
            className="bg-white border border-grey-4 rounded-[14px] p-4 md:p-5 flex flex-col gap-4 max-w-[calc(100vw-2rem)] md:max-w-none"
            style={{ boxShadow: '0 12px 22px 0 rgba(36, 48, 127, 0.08)' }}>
            {/* Mobile stacks the calendar on top of the time steppers —
                the desktop 252+168px two-column layout (~484px) overflows
                a 375px viewport. */}
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            {/* ── Calendar ──────────────────────────────────────── */}
            <div className="w-full md:w-[252px]">
                <div className="flex items-center justify-between mb-3">
                    {title && (
                        <div
                            className="text-[10px] uppercase text-grey-2"
                            style={{
                                fontFamily: "'Red Hat Display', sans-serif",
                                fontWeight: 600,
                                letterSpacing: '0.12em',
                            }}>
                            {title}
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between mb-3">
                    <button
                        type="button"
                        onClick={() => shiftMonth(-1)}
                        aria-label="Previous month"
                        className="w-7 h-7 grid place-items-center rounded-[8px] text-grey-1 hover:bg-grey-5 transition-colors cursor-pointer">
                        <ChevronLeft size={16} />
                    </button>
                    <span
                        className="text-[14px] text-grey-0"
                        style={{
                            fontFamily: "'Red Hat Display', sans-serif",
                            fontWeight: 600,
                        }}>
                        {monthLabel}
                    </span>
                    <button
                        type="button"
                        onClick={() => shiftMonth(1)}
                        aria-label="Next month"
                        className="w-7 h-7 grid place-items-center rounded-[8px] text-grey-1 hover:bg-grey-5 transition-colors cursor-pointer">
                        <ChevronRight size={16} />
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {WEEKDAYS.map((w) => (
                        <div
                            key={w}
                            className="text-center text-[10px] text-grey-2 py-1"
                            style={{
                                fontFamily: "'Manrope', sans-serif",
                                fontWeight: 600,
                                letterSpacing: '0.06em',
                            }}>
                            {w}
                        </div>
                    ))}
                    {calendar.cells.map((day, i) =>
                        day === null ? (
                            <div key={`blank-${i}`} />
                        ) : (
                            (() => {
                                const selected = isSelected(day)
                                const past = isPastDay(day)
                                return (
                                    <button
                                        type="button"
                                        key={day}
                                        disabled={past}
                                        onClick={() => handleDatePick(day)}
                                        className="aspect-square flex items-center justify-center text-[13px] rounded-[8px] transition-colors cursor-pointer"
                                        style={{
                                            background: selected
                                                ? '#7011F6'
                                                : 'transparent',
                                            color: selected
                                                ? '#ffffff'
                                                : past
                                                  ? '#AEAEAE'
                                                  : '#363636',
                                            fontFamily: "'Manrope', sans-serif",
                                            fontWeight: selected ? 700 : 500,
                                            opacity: past ? 0.45 : 1,
                                            cursor: past ? 'not-allowed' : 'pointer',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!selected && !past)
                                                e.currentTarget.style.background = '#F5EDFF'
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!selected && !past)
                                                e.currentTarget.style.background = 'transparent'
                                        }}>
                                        {day}
                                    </button>
                                )
                            })()
                        ),
                    )}
                </div>
            </div>

            {/* ── Time steppers ─────────────────────────────────── */}
            <div className="flex flex-col gap-3 w-full md:w-[168px]">
                <div
                    className="text-[10px] uppercase text-grey-2"
                    style={{
                        fontFamily: "'Red Hat Display', sans-serif",
                        fontWeight: 600,
                        letterSpacing: '0.12em',
                    }}>
                    Time
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={hours12}
                        onChange={(e) => setHour12(parseInt(e.target.value, 10))}
                        className="flex-1 px-3 py-2 rounded-[8px] border border-grey-4 bg-white text-grey-0 text-[15px] outline-none focus:border-primary-default transition-colors cursor-pointer"
                        style={{
                            fontFamily: "'Red Hat Display', sans-serif",
                            fontWeight: 700,
                        }}>
                        {HOURS.map((h) => (
                            <option key={h} value={h}>
                                {h.toString().padStart(2, '0')}
                            </option>
                        ))}
                    </select>
                    <span
                        className="text-grey-3 text-[18px]"
                        style={{
                            fontFamily: "'Red Hat Display', sans-serif",
                            fontWeight: 700,
                        }}>
                        :
                    </span>
                    <select
                        value={minutesDisplay}
                        onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
                        className="flex-1 px-3 py-2 rounded-[8px] border border-grey-4 bg-white text-grey-0 text-[15px] outline-none focus:border-primary-default transition-colors cursor-pointer"
                        style={{
                            fontFamily: "'Red Hat Display', sans-serif",
                            fontWeight: 700,
                        }}>
                        {MIN_OPTIONS.map((m) => (
                            <option key={m} value={m}>
                                {m.toString().padStart(2, '0')}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    {(['AM', 'PM'] as const).map((p) => {
                        const active = period === p
                        return (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPeriod(p)}
                                className="py-2 rounded-[8px] text-[12px] transition-colors cursor-pointer"
                                style={{
                                    background: active ? '#7011F6' : '#F8F8F8',
                                    color: active ? '#ffffff' : '#363636',
                                    border: `1px solid ${active ? '#7011F6' : '#E0E0E0'}`,
                                    fontFamily: "'Red Hat Display', sans-serif",
                                    fontWeight: 700,
                                    letterSpacing: '0.04em',
                                }}>
                                {p}
                            </button>
                        )
                    })}
                </div>
            </div>
            </div>

            {onDone && (
                <div className="flex justify-end pt-3 border-t border-grey-4">
                    <button
                        type="button"
                        onClick={onDone}
                        className="px-5 py-2 text-[13px] text-white rounded-[12px] transition-all active:scale-[0.98] cursor-pointer"
                        style={{
                            background: 'linear-gradient(90deg, #7011F6 0%, #4D1D91 100%)',
                            fontFamily: "'Red Hat Display', sans-serif",
                            fontWeight: 700,
                            letterSpacing: '-0.01em',
                            boxShadow: '0 2px 8px 0 rgba(112, 17, 246, 0.24)',
                        }}>
                        Done
                    </button>
                </div>
            )}
        </div>
    )
}

export default DateTimePickerPopover
