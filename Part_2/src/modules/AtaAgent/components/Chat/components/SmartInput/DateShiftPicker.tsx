/**
 * Premium two-month date picker for trip date shifting.
 * Compact, card-based layout with proper visual rhythm.
 */
import React, { useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface DateShiftPickerProps {
    onConfirm: (date: Date) => void
    onCancel: () => void
}

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
]
const SHORT_MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const today = new Date()
today.setHours(0, 0, 0, 0)

const sameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()

interface Cell {
    day: number
    date: Date
    current: boolean
}

function buildGrid(year: number, month: number): Cell[] {
    const total = new Date(year, month + 1, 0).getDate()
    const first = new Date(year, month, 1).getDay()
    const prevTotal = new Date(year, month, 0).getDate()

    const cells: Cell[] = []
    for (let i = first - 1; i >= 0; i--) {
        cells.push({
            day: prevTotal - i,
            date: new Date(year, month - 1, prevTotal - i),
            current: false,
        })
    }
    for (let i = 1; i <= total; i++) {
        cells.push({ day: i, date: new Date(year, month, i), current: true })
    }
    while (cells.length < 42) {
        const offset = cells.length - first - total + 1
        cells.push({
            day: offset,
            date: new Date(year, month + 1, offset),
            current: false,
        })
    }
    return cells
}

interface MonthProps {
    year: number
    month: number
    selected?: Date
    onSelect: (d: Date) => void
}

const Month: React.FC<MonthProps> = ({ year, month, selected, onSelect }) => {
    const cells = buildGrid(year, month)
    return (
        <div className="flex-1 min-w-0">
            {/* Restrained month label — no shouting tracking/uppercase. */}
            <p className="mb-2 text-center font-red-hat-display text-[13px] font-semibold text-grey_0">
                {MONTHS[month]}{' '}
                <span className="font-medium text-grey_2">{year}</span>
            </p>

            {/* Weekday header */}
            <div className="grid grid-cols-7">
                {DAYS.map((d, i) => (
                    <div
                        key={i}
                        className="flex h-6 items-center justify-center font-manrope text-[10.5px] font-medium text-grey_3">
                        {d}
                    </div>
                ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7">
                {cells.map(({ day, date, current }, i) => {
                    const isPast = date < today && !sameDay(date, today)
                    const isToday = sameDay(date, today)
                    const isSelected = selected ? sameDay(date, selected) : false
                    const disabled = isPast || !current

                    return (
                        <div
                            key={i}
                            className="flex h-9 items-center justify-center">
                            <button
                                type="button"
                                disabled={disabled}
                                onClick={() => onSelect(date)}
                                aria-pressed={isSelected}
                                aria-label={date.toDateString()}
                                className={cn(
                                    'relative flex h-8 w-8 items-center justify-center rounded-full',
                                    'font-manrope text-[12.5px] transition-colors duration-150',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-default/40',
                                    disabled && 'text-grey_4 cursor-default',
                                    !disabled && !isSelected && 'cursor-pointer',
                                    // Selected — solid primary disc, no
                                    // scale change so the grid never jumps.
                                    isSelected &&
                                        'bg-primary-default text-white font-semibold shadow-[0_3px_10px_-2px_rgba(112,17,246,0.4)]',
                                    // Today — quiet outline + bold numeral
                                    !isSelected &&
                                        isToday &&
                                        'text-primary-default font-semibold ring-1 ring-primary-default/40 hover:bg-primary-default/[0.08]',
                                    // Available, not selected, not today
                                    !isSelected &&
                                        !isToday &&
                                        current &&
                                        !isPast &&
                                        'text-grey_0 font-medium hover:bg-primary-default/[0.06] hover:text-primary-default',
                                )}>
                                {day}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

const DateShiftPicker: React.FC<DateShiftPickerProps> = ({ onConfirm, onCancel }) => {
    const [baseMonth, setBaseMonth] = useState(today.getMonth())
    const [baseYear, setBaseYear] = useState(today.getFullYear())
    const [selected, setSelected] = useState<Date | undefined>()

    const nextMonth = baseMonth === 11 ? 0 : baseMonth + 1
    const nextYear = baseMonth === 11 ? baseYear + 1 : baseYear

    const goPrev = () => {
        if (baseMonth === 0) {
            setBaseMonth(11)
            setBaseYear((y) => y - 1)
        } else {
            setBaseMonth((m) => m - 1)
        }
    }
    const goNext = () => {
        if (baseMonth === 11) {
            setBaseMonth(0)
            setBaseYear((y) => y + 1)
        } else {
            setBaseMonth((m) => m + 1)
        }
    }
    const canPrev =
        baseYear > today.getFullYear() ||
        (baseYear === today.getFullYear() && baseMonth > today.getMonth())

    const daysFromNow = selected
        ? Math.round((selected.getTime() - today.getTime()) / 864e5)
        : 0

    const formattedSelected = selected
        ? `${
              ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][selected.getDay()]
          }, ${SHORT_MONTHS[selected.getMonth()]} ${selected.getDate()}`
        : null

    const counterLabel =
        daysFromNow === 0
            ? 'Today'
            : `${daysFromNow} day${daysFromNow === 1 ? '' : 's'} from now`

    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.99 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
                'mx-2 overflow-hidden rounded-2xl bg-white',
                'border border-grey_4/60',
                'shadow-[0_18px_44px_-18px_rgba(15,23,42,0.18),0_6px_18px_-10px_rgba(112,17,246,0.10)]',
            )}>
            {/* ── Header — solid purple banner with white copy ────── */}
            <div className="relative overflow-hidden">
                {/* Brand gradient backdrop */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-default via-primary-default to-primary-dark" />
                {/* Soft top-right glow for depth */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.14),transparent_55%)]" />

                <div className="relative flex items-start justify-between gap-3 px-4 pt-3.5 pb-3">
                    <div className="min-w-0">
                        <p className="font-red-hat-display text-[14px] font-semibold leading-tight text-white">
                            Shift your trip
                        </p>
                        <p className="mt-0.5 font-manrope text-[11.5px] text-white/70">
                            Pick a new start date — everything moves with it.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        aria-label="Cancel"
                        className="-mt-0.5 -mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/15 hover:text-white cursor-pointer">
                        <X size={14} strokeWidth={2.25} />
                    </button>
                </div>
            </div>

            {/* ── Calendar body ─────────────────────────────────────── */}
            <div className="px-4 pb-3">
                {/* Month-pager controls */}
                <div className="mb-1 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={goPrev}
                        disabled={!canPrev}
                        aria-label="Previous month"
                        className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                            canPrev
                                ? 'text-grey_1 hover:bg-grey_5 hover:text-grey_0 cursor-pointer'
                                : 'text-grey_4 cursor-not-allowed',
                        )}>
                        <ChevronLeft size={16} strokeWidth={2.25} />
                    </button>
                    <button
                        type="button"
                        onClick={goNext}
                        aria-label="Next month"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-grey_1 transition-colors hover:bg-grey_5 hover:text-grey_0 cursor-pointer">
                        <ChevronRight size={16} strokeWidth={2.25} />
                    </button>
                </div>

                {/* Mobile: one month. Desktop (md+): two months. */}
                <div className="flex items-stretch gap-5 md:gap-7">
                    <Month
                        year={baseYear}
                        month={baseMonth}
                        selected={selected}
                        onSelect={setSelected}
                    />
                    <div
                        aria-hidden
                        className="my-1 hidden w-px self-stretch bg-grey_4/50 md:block"
                    />
                    <div className="hidden min-w-0 flex-1 md:block">
                        <Month
                            year={nextYear}
                            month={nextMonth}
                            selected={selected}
                            onSelect={setSelected}
                        />
                    </div>
                </div>
            </div>

            {/* ── Footer ────────────────────────────────────────────── */}
            <div className="border-t border-grey_4/50 bg-grey_5/40 px-4 py-3">
                {selected ? (
                    <motion.div
                        key="sel"
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-0.5">
                            <p className="truncate font-red-hat-display text-[13px] font-semibold text-grey_0">
                                {formattedSelected}
                            </p>
                            <span className="inline-flex w-fit items-center rounded-full bg-primary-default/[0.08] px-1.5 py-[1px] font-manrope text-[10.5px] font-semibold text-primary-default">
                                {counterLabel}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => onConfirm(selected)}
                            className={cn(
                                'inline-flex shrink-0 items-center gap-1 rounded-full px-4 py-2',
                                'font-red-hat-display text-[12.5px] font-semibold text-white',
                                'bg-primary-default hover:bg-primary-dark',
                                'shadow-[0_5px_14px_-4px_rgba(112,17,246,0.35)]',
                                'transition-colors cursor-pointer',
                            )}>
                            Shift dates
                            <ChevronRight size={13} strokeWidth={2.5} />
                        </button>
                    </motion.div>
                ) : (
                    <div className="flex items-center justify-between gap-3">
                        <p className="font-manrope text-[12px] text-grey_2">
                            Pick a date to preview the shift.
                        </p>
                        <div className="inline-flex shrink-0 items-center rounded-full bg-grey_4/40 px-4 py-2 font-red-hat-display text-[12.5px] font-semibold text-grey_3">
                            Shift dates
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    )
}

export default DateShiftPicker
