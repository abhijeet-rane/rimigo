import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Calendar, Clock, ChevronDown, ChevronUp, AlertCircle, ArrowLeftRight } from 'lucide-react'
import DropdownSection from './DropDownSection'
import Typography from '@/components/shared/Typography'
import { cn } from '@/lib/utils'

interface TimePickerSectionProps {
    defaultOpen?: boolean
    defaultStart?: Date
    defaultEnd?: Date
    onOpenChange?: (open: boolean) => void
    onChange: (range: { start: Date; end: Date }) => void
}

const formatDate = (d: Date) =>
    new Date(d.getTime()).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC'
    })

const formatTime12 = (d: Date) =>
    new Date(d.getTime()).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC'
    })

/** Accepts: "8", "8:05", "8:05 AM", "8:05pm", "08:05", "20:30".
 *  Ambiguous bare numbers 1–12 use `fallbackPeriod` (preserves current AM/PM).
 *  Bare 13–23 are treated as 24h. */
function parseTimeInput(raw: string, fallbackPeriod: 'AM' | 'PM'): { h24: number; min: number } | null {
    const m = raw
        .trim()
        .toLowerCase()
        .replace(/\./g, '')
        .match(/^(\d{1,2})(?::(\d{1,2}))?\s*(am|pm|a|p)?$/)
    if (!m) return null
    let h = parseInt(m[1], 10)
    const min = m[2] ? parseInt(m[2], 10) : 0
    if (Number.isNaN(h) || Number.isNaN(min)) return null
    if (min < 0 || min > 59) return null
    if (h < 0 || h > 23) return null

    const period = m[3]?.startsWith('a') ? 'AM' : m[3]?.startsWith('p') ? 'PM' : null

    if (period) {
        if (h < 1 || h > 12) return null
        if (period === 'AM' && h === 12) h = 0
        else if (period === 'PM' && h !== 12) h += 12
    } else if (h <= 12) {
        if (fallbackPeriod === 'AM' && h === 12) h = 0
        else if (fallbackPeriod === 'PM' && h !== 12) h += 12
    }
    return { h24: h, min }
}

interface DurationInfo {
    label: string
    invalid: boolean
}

const calculateDuration = (start: Date, end: Date): DurationInfo => {
    const diff = end.getTime() - start.getTime()
    if (diff < 0) return { label: 'Ends before start', invalid: true }
    const h = Math.floor(diff / 3_600_000)
    const m = Math.floor((diff % 3_600_000) / 60_000)
    if (h === 0 && m === 0) return { label: 'No duration', invalid: false }
    if (h === 0) return { label: `${m}m`, invalid: false }
    if (m === 0) return { label: `${h}h`, invalid: false }
    return { label: `${h}h ${m}m`, invalid: false }
}

const formatRangeSummary = (start: Date, end: Date) => {
    const sameDay =
        start.getUTCFullYear() === end.getUTCFullYear() &&
        start.getUTCMonth() === end.getUTCMonth() &&
        start.getUTCDate() === end.getUTCDate()
    if (sameDay) return `${formatDate(start)} · ${formatTime12(start)} – ${formatTime12(end)}`
    return `${formatDate(start)}, ${formatTime12(start)} → ${formatDate(end)}, ${formatTime12(end)}`
}

const TimePickerSection: React.FC<TimePickerSectionProps> = ({
    defaultOpen = false,
    defaultStart,
    defaultEnd,
    onChange,
    onOpenChange
}) => {
    const [start, setStart] = useState(defaultStart || new Date())
    const [end, setEnd] = useState(defaultEnd || new Date())
    const [isOpen, setIsOpen] = useState(defaultOpen)
    const [popoverOpen, setPopoverOpen] = useState(false)

    useEffect(() => setIsOpen(defaultOpen), [defaultOpen])
    useEffect(() => {
        if (defaultStart) setStart(defaultStart)
        if (defaultEnd) setEnd(defaultEnd)
    }, [defaultStart, defaultEnd])

    /** Start change preserves duration by shifting end. */
    const handleStartChange = (next: Date) => {
        const delta = next.getTime() - start.getTime()
        const nextEnd = new Date(end.getTime() + delta)
        setStart(next)
        setEnd(nextEnd)
        onChange({ start: next, end: nextEnd })
    }

    const handleEndChange = (next: Date) => {
        setEnd(next)
        onChange({ start, end: next })
    }

    const swapIfInverted = () => {
        if (end.getTime() < start.getTime()) {
            setStart(end)
            setEnd(start)
            onChange({ start: end, end: start })
        }
    }

    const duration = calculateDuration(start, end)

    return (
        <DropdownSection
            onOpenChange={(open) => {
                setIsOpen(open)
                onOpenChange?.(open)
            }}
            selectedContent={
                <div className="flex items-center gap-2 min-w-0">
                    <Clock className="w-4 h-4 text-primary-default shrink-0" />
                    <Typography
                        size="12"
                        family="manrope"
                        weight="medium"
                        color="grey-1"
                        className="truncate">
                        {formatRangeSummary(start, end)}
                    </Typography>
                    {!duration.invalid && (
                        <span className="shrink-0 rounded-full bg-primary-default/8 px-2 py-0.5 text-[11px] font-semibold font-manrope text-primary-default">
                            {duration.label}
                        </span>
                    )}
                </div>
            }
            title="Date & Time"
            defaultOpen={isOpen}>
            <div className={cn('flex flex-col gap-2 relative', popoverOpen && 'pb-72')}>
                <DateTimeRow
                    label="Start"
                    value={start}
                    onChange={handleStartChange}
                    onPopoverChange={setPopoverOpen}
                />

                <DurationChip
                    info={duration}
                    onSwap={swapIfInverted}
                />

                <DateTimeRow
                    label="End"
                    value={end}
                    onChange={handleEndChange}
                    onPopoverChange={setPopoverOpen}
                />
            </div>
        </DropdownSection>
    )
}

interface DurationChipProps {
    info: DurationInfo
    onSwap: () => void
}

const DurationChip: React.FC<DurationChipProps> = ({ info, onSwap }) => {
    if (info.invalid) {
        return (
            <div className="relative flex items-center justify-center py-1">
                <div className="absolute left-5 top-0 bottom-0 w-px bg-amber-200" aria-hidden="true" />
                <div className="relative inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1">
                    <AlertCircle size={12} className="text-amber-600" />
                    <span className="text-[11px] font-semibold font-manrope text-amber-700">
                        {info.label}
                    </span>
                    <button
                        type="button"
                        onClick={onSwap}
                        className="ml-1 inline-flex items-center gap-1 rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-amber-700 transition-colors cursor-pointer">
                        <ArrowLeftRight size={10} />
                        Swap
                    </button>
                </div>
            </div>
        )
    }
    return (
        <div className="relative flex items-center justify-center py-1">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-grey-4" aria-hidden="true" />
            <div className="relative inline-flex items-center gap-1.5 rounded-full border border-grey-4 bg-white px-3 py-1">
                <Clock size={11} className="text-primary-default" />
                <span className="text-[11px] font-semibold font-manrope text-grey-0">
                    {info.label}
                </span>
            </div>
        </div>
    )
}

interface DateTimeRowProps {
    label: string
    value: Date
    onChange: (d: Date) => void
    onPopoverChange: (open: boolean) => void
}

const DateTimeRow: React.FC<DateTimeRowProps> = ({ label, value, onChange, onPopoverChange }) => {
    const [calOpen, setCalOpen] = useState(false)
    const [timeOpen, setTimeOpen] = useState(false)
    const [currentMonth, setCurrentMonth] = useState(
        new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1))
    )

    useEffect(() => {
        onPopoverChange(calOpen || timeOpen)
    }, [calOpen, timeOpen, onPopoverChange])

    const rowRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!calOpen && !timeOpen) return
        const onClickOutside = (e: MouseEvent) => {
            if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
                setCalOpen(false)
                setTimeOpen(false)
            }
        }
        document.addEventListener('mousedown', onClickOutside)
        return () => document.removeEventListener('mousedown', onClickOutside)
    }, [calOpen, timeOpen])

    return (
        <div ref={rowRef} className="flex flex-col gap-1.5">
            <Typography
                size="12"
                family="manrope"
                weight="semibold"
                color="grey-1"
                className="uppercase tracking-wide">
                {label}
            </Typography>
            <div className="flex items-stretch gap-2">
                <button
                    type="button"
                    onClick={() => {
                        setCalOpen((v) => !v)
                        setTimeOpen(false)
                    }}
                    className={cn(
                        'group flex flex-1 items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors cursor-pointer',
                        calOpen
                            ? 'border-primary-default bg-primary-default/5'
                            : 'border-grey-4 bg-white hover:border-grey-3'
                    )}>
                    <Calendar size={15} className="text-primary-default shrink-0" />
                    <span className="text-sm font-semibold font-manrope text-grey-0 flex-1 truncate">
                        {formatDate(value)}
                    </span>
                    <ChevronDown
                        size={14}
                        className={cn(
                            'text-grey-2 transition-transform',
                            calOpen && 'rotate-180'
                        )}
                    />
                </button>

                <TimeField
                    value={value}
                    onChange={onChange}
                    popoverOpen={timeOpen}
                    onTogglePopover={() => {
                        setTimeOpen((v) => !v)
                        setCalOpen(false)
                    }}
                />
            </div>

            {(calOpen || timeOpen) && (
                <div className="relative">
                    {calOpen && (
                        <div className="absolute left-0 top-1 z-50 w-[300px] rounded-xl border border-grey-4 bg-white p-3 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)]">
                            <MiniCalendar
                                value={value}
                                currentMonth={currentMonth}
                                onMonthChange={setCurrentMonth}
                                onChange={(d) => {
                                    onChange(d)
                                    setCalOpen(false)
                                }}
                            />
                        </div>
                    )}
                    {timeOpen && (
                        <div className="absolute right-0 top-1 z-50 w-[260px] rounded-xl border border-grey-4 bg-white p-3 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.18)]">
                            <TimePopover
                                value={value}
                                onChange={onChange}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

interface TimeFieldProps {
    value: Date
    onChange: (d: Date) => void
    popoverOpen: boolean
    onTogglePopover: () => void
}

/** Free-text time input — type "8:05 PM", "20:30", "8", "815pm" etc.
 *  Commits on blur / Enter. Reverts on Escape. Shake-animates on parse error. */
const TimeField: React.FC<TimeFieldProps> = ({ value, onChange, popoverOpen, onTogglePopover }) => {
    const [draft, setDraft] = useState(formatTime12(value))
    const [error, setError] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setDraft(formatTime12(value))
        setError(false)
    }, [value])

    const commit = useCallback(() => {
        if (draft.trim() === formatTime12(value).trim()) return
        const period = value.getUTCHours() >= 12 ? 'PM' : 'AM'
        const parsed = parseTimeInput(draft, period)
        if (!parsed) {
            setError(true)
            setDraft(formatTime12(value))
            window.setTimeout(() => setError(false), 900)
            return
        }
        const next = new Date(value)
        next.setUTCHours(parsed.h24, parsed.min, 0, 0)
        onChange(next)
    }, [draft, value, onChange])

    return (
        <div
            className={cn(
                'group flex min-w-[148px] items-center gap-2 rounded-lg border px-3 py-2.5 transition-colors',
                error
                    ? 'border-red-400 bg-red-50 animate-[shake_0.35s_ease-in-out]'
                    : popoverOpen
                      ? 'border-primary-default bg-primary-default/5'
                      : 'border-grey-4 bg-white hover:border-grey-3 focus-within:border-primary-default focus-within:bg-primary-default/5'
            )}>
            <Clock
                size={15}
                className={cn('shrink-0', error ? 'text-red-500' : 'text-primary-default')}
            />
            <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault()
                        e.currentTarget.blur()
                    } else if (e.key === 'Escape') {
                        setDraft(formatTime12(value))
                        e.currentTarget.blur()
                    }
                }}
                onFocus={(e) => e.currentTarget.select()}
                placeholder="8:05 AM"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                className="w-full min-w-0 bg-transparent text-sm font-semibold font-manrope text-grey-0 placeholder:text-grey-3 focus:outline-none"
            />
            <button
                type="button"
                onClick={onTogglePopover}
                aria-label="Open time picker"
                className="shrink-0 cursor-pointer">
                <ChevronDown
                    size={14}
                    className={cn(
                        'text-grey-2 transition-transform',
                        popoverOpen && 'rotate-180'
                    )}
                />
            </button>
        </div>
    )
}

interface TimePopoverProps {
    value: Date
    onChange: (d: Date) => void
}

const TimePopover: React.FC<TimePopoverProps> = ({ value, onChange }) => {
    const hours = value.getUTCHours()
    const minutes = value.getUTCMinutes()
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    const period: 'AM' | 'PM' = hours >= 12 ? 'PM' : 'AM'

    const setTime = (newHour12: number, newMinutes: number, newPeriod: 'AM' | 'PM') => {
        const next = new Date(value)
        let h24 = newHour12
        if (newPeriod === 'PM' && newHour12 !== 12) h24 = newHour12 + 12
        else if (newPeriod === 'AM' && newHour12 === 12) h24 = 0
        next.setUTCHours(h24, newMinutes, 0, 0)
        onChange(next)
    }

    const adjustMinutes = (delta: number) => {
        const total = hours * 60 + minutes + delta
        const wrapped = ((total % 1440) + 1440) % 1440
        const next = new Date(value)
        next.setUTCHours(Math.floor(wrapped / 60), wrapped % 60, 0, 0)
        onChange(next)
    }

    const quickPicks: { label: string; h: number; m: number; p: 'AM' | 'PM' }[] = [
        { label: '9:00 AM', h: 9, m: 0, p: 'AM' },
        { label: '12:00 PM', h: 12, m: 0, p: 'PM' },
        { label: '3:00 PM', h: 3, m: 0, p: 'PM' },
        { label: '6:00 PM', h: 6, m: 0, p: 'PM' }
    ]

    const stepHour = (delta: number) => {
        const next12 = (((hour12 - 1 + delta) % 12) + 12) % 12 + 1
        setTime(next12, minutes, period)
    }

    const stepMinute = (delta: number) => {
        const total = hours * 60 + minutes + delta
        const wrapped = ((total % 1440) + 1440) % 1440
        const next = new Date(value)
        next.setUTCHours(Math.floor(wrapped / 60), wrapped % 60, 0, 0)
        onChange(next)
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2">
                <Spinner
                    ariaLabel="Hour"
                    value={hour12}
                    displayValue={hour12.toString().padStart(2, '0')}
                    min={1}
                    max={12}
                    onStep={stepHour}
                    onCommit={(n) => setTime(n, minutes, period)}
                    format={(n) => n.toString().padStart(2, '0')}
                />
                <span className="pt-3 text-xl font-bold font-manrope text-grey-3 select-none">:</span>
                <Spinner
                    ariaLabel="Minute"
                    value={minutes}
                    displayValue={minutes.toString().padStart(2, '0')}
                    min={0}
                    max={59}
                    onStep={(d) => stepMinute(d)}
                    onCommit={(n) => setTime(hour12, n, period)}
                    format={(n) => n.toString().padStart(2, '0')}
                />
                <div className="mt-0.5 flex flex-col overflow-hidden rounded-md border border-grey-4">
                    <button
                        type="button"
                        onClick={() => setTime(hour12, minutes, 'AM')}
                        className={cn(
                            'px-2.5 py-1 text-xs font-semibold font-manrope transition-colors cursor-pointer',
                            period === 'AM'
                                ? 'bg-primary-default text-white'
                                : 'bg-white text-grey-1 hover:bg-grey-5'
                        )}>
                        AM
                    </button>
                    <div className="h-px bg-grey-4" />
                    <button
                        type="button"
                        onClick={() => setTime(hour12, minutes, 'PM')}
                        className={cn(
                            'px-2.5 py-1 text-xs font-semibold font-manrope transition-colors cursor-pointer',
                            period === 'PM'
                                ? 'bg-primary-default text-white'
                                : 'bg-white text-grey-1 hover:bg-grey-5'
                        )}>
                        PM
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-center gap-1">
                {[
                    { delta: -60, label: '-1hr' },
                    { delta: -30, label: '-30m' },
                    { delta: 30, label: '+30m' },
                    { delta: 60, label: '+1hr' }
                ].map(({ delta, label }) => (
                    <button
                        key={label}
                        type="button"
                        onClick={() => adjustMinutes(delta)}
                        className="rounded-md border border-grey-4 bg-white px-2 py-1 text-[11px] font-semibold font-manrope text-grey-1 hover:border-primary-default hover:text-primary-default transition-colors cursor-pointer">
                        {label}
                    </button>
                ))}
            </div>

            <div className="h-px bg-grey-4" />

            <div className="grid grid-cols-2 gap-1.5">
                {quickPicks.map((q) => (
                    <button
                        key={q.label}
                        type="button"
                        onClick={() => setTime(q.h, q.m, q.p)}
                        className="rounded-md bg-primary-default/8 px-2 py-1.5 text-xs font-semibold font-manrope text-primary-default hover:bg-primary-default/15 transition-colors cursor-pointer">
                        {q.label}
                    </button>
                ))}
            </div>
        </div>
    )
}

interface MiniCalendarProps {
    value: Date
    currentMonth: Date
    onMonthChange: (d: Date) => void
    onChange: (d: Date) => void
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({ value, currentMonth, onMonthChange, onChange }) => {
    const daysInMonth = new Date(
        Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() + 1, 0)
    ).getUTCDate()
    const firstDay = new Date(
        Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth(), 1)
    ).getUTCDay()

    const monthName = new Date(currentMonth.getTime()).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
    })

    const isPastDay = (day: number) => {
        const d = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth(), day))
        const now = new Date()
        now.setUTCHours(0, 0, 0, 0)
        return d < now
    }

    const isToday = (day: number) => {
        const d = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth(), day))
        const now = new Date()
        return (
            d.getUTCDate() === now.getUTCDate() &&
            d.getUTCMonth() === now.getUTCMonth() &&
            d.getUTCFullYear() === now.getUTCFullYear()
        )
    }

    const prevMonth = () =>
        onMonthChange(new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() - 1, 1)))
    const nextMonth = () =>
        onMonthChange(new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() + 1, 1)))

    const handleDateClick = (day: number) => {
        const next = new Date(value)
        next.setUTCFullYear(currentMonth.getUTCFullYear())
        next.setUTCMonth(currentMonth.getUTCMonth())
        next.setUTCDate(day)
        onChange(next)
    }

    const isSelected = (day: number) =>
        value.getUTCDate() === day &&
        value.getUTCMonth() === currentMonth.getUTCMonth() &&
        value.getUTCFullYear() === currentMonth.getUTCFullYear()

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-3">
                <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1.5 rounded-md hover:bg-grey-5 transition-colors cursor-pointer"
                    aria-label="Previous month">
                    <ChevronDown className="w-4 h-4 rotate-90 text-grey-1" />
                </button>
                <span className="text-sm font-semibold font-manrope text-grey-0">{monthName}</span>
                <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1.5 rounded-md hover:bg-grey-5 transition-colors cursor-pointer"
                    aria-label="Next month">
                    <ChevronDown className="w-4 h-4 -rotate-90 text-grey-1" />
                </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                    <div
                        key={d}
                        className="text-center text-[11px] font-semibold font-manrope text-grey-2 py-1">
                        {d}
                    </div>
                ))}

                {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1
                    const selected = isSelected(day)
                    const past = isPastDay(day)
                    const today = isToday(day)
                    return (
                        <button
                            disabled={past}
                            key={day}
                            type="button"
                            onClick={() => handleDateClick(day)}
                            className={cn(
                                'aspect-square flex items-center justify-center text-sm font-manrope rounded-md transition-colors cursor-pointer',
                                selected
                                    ? 'bg-primary-default text-white font-bold shadow-sm'
                                    : today
                                      ? 'ring-1 ring-inset ring-primary-default text-primary-default font-semibold hover:bg-primary-default/8'
                                      : 'text-grey-0 font-medium hover:bg-grey-5',
                                past && 'opacity-35 cursor-not-allowed hover:bg-transparent'
                            )}>
                            {day}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

interface SpinnerProps {
    ariaLabel: string
    value: number
    displayValue: string
    min: number
    max: number
    onStep: (delta: number) => void
    onCommit: (n: number) => void
    format: (n: number) => string
}

/** Compact number picker: ▲ top, editable value, ▼ bottom.
 *  Supports click, arrow keys when focused, and scroll wheel on hover.
 *  Wraps on overflow so hours go 12 → 1 and minutes 59 → 00. */
const Spinner: React.FC<SpinnerProps> = ({
    ariaLabel,
    value,
    displayValue,
    min,
    max,
    onStep,
    onCommit,
    format
}) => {
    const [draft, setDraft] = useState(displayValue)
    const [focused, setFocused] = useState(false)

    useEffect(() => {
        setDraft(displayValue)
    }, [displayValue])

    const commit = () => {
        const n = parseInt(draft, 10)
        if (Number.isNaN(n) || n < min || n > max) {
            setDraft(displayValue)
            return
        }
        if (n === value) {
            setDraft(format(n))
            return
        }
        onCommit(n)
    }

    return (
        <div
            onWheel={(e) => {
                e.preventDefault()
                onStep(e.deltaY < 0 ? 1 : -1)
            }}
            className={cn(
                'flex flex-col items-stretch rounded-md border transition-colors',
                focused ? 'border-primary-default bg-primary-default/5' : 'border-grey-4 bg-white hover:border-grey-3'
            )}>
            <button
                type="button"
                tabIndex={-1}
                onClick={() => onStep(1)}
                aria-label={`Increase ${ariaLabel.toLowerCase()}`}
                className="flex items-center justify-center py-0.5 text-grey-2 hover:text-primary-default transition-colors cursor-pointer">
                <ChevronUp size={14} />
            </button>
            <input
                type="text"
                inputMode="numeric"
                aria-label={ariaLabel}
                value={draft}
                onChange={(e) => setDraft(e.target.value.replace(/\D/g, '').slice(0, 2))}
                onFocus={(e) => {
                    setFocused(true)
                    e.currentTarget.select()
                }}
                onBlur={() => {
                    setFocused(false)
                    commit()
                }}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                        e.preventDefault()
                        onStep(1)
                    } else if (e.key === 'ArrowDown') {
                        e.preventDefault()
                        onStep(-1)
                    } else if (e.key === 'Enter') {
                        e.preventDefault()
                        e.currentTarget.blur()
                    } else if (e.key === 'Escape') {
                        setDraft(displayValue)
                        e.currentTarget.blur()
                    }
                }}
                className="w-12 bg-transparent text-center text-lg font-bold font-manrope text-grey-0 focus:outline-none tabular-nums"
            />
            <button
                type="button"
                tabIndex={-1}
                onClick={() => onStep(-1)}
                aria-label={`Decrease ${ariaLabel.toLowerCase()}`}
                className="flex items-center justify-center py-0.5 text-grey-2 hover:text-primary-default transition-colors cursor-pointer">
                <ChevronDown size={14} />
            </button>
        </div>
    )
}

export default TimePickerSection
