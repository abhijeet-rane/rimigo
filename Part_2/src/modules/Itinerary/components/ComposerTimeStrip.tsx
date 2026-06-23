/**
 * Pinned bottom time strip of the Add to Itinerary composer.
 *
 * Replaces the collapsible ``TimePickerSection`` accordion with a
 * mini-timeline: ``Start · dashed line · duration pill · dashed line ·
 * End``, plus a date chip. Click Start or End to edit — we inline a
 * compact popover with the same date + time steppers the old
 * ``CompactDateTimePicker`` used. The visual comes straight from the
 * redesign spec (``add-slot-redesign.jsx::TimeStrip``).
 */
import { useState, useRef, useEffect } from 'react'
import { Clock, Calendar, ChevronDown } from 'lucide-react'
import DateTimePickerPopover from './DateTimePickerPopover'

interface Props {
    start: Date
    end: Date
    onChange: (range: { start: Date; end: Date }) => void
}

const ComposerTimeStrip = ({ start, end, onChange }: Props) => {
    const [editing, setEditing] = useState<'start' | 'end' | null>(null)
    const popoverRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!editing) return
        const onDocClick = (ev: MouseEvent) => {
            if (!popoverRef.current?.contains(ev.target as Node)) {
                setEditing(null)
            }
        }
        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [editing])

    const formatTime = (d: Date) =>
        new Date(d.getTime()).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC',
        })

    const formatDate = (d: Date) =>
        new Date(d.getTime()).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
        })


    const duration = (() => {
        const diffMs = end.getTime() - start.getTime()
        if (diffMs <= 0) return 'Pick duration'
        const mins = Math.round(diffMs / 60000)
        const h = Math.floor(mins / 60)
        const m = mins % 60
        if (h > 0 && m > 0) return `${h} h ${m} m`
        if (h > 0) return `${h} h`
        return `${m} m`
    })()

    const startTime = formatTime(start)
    const endTime = formatTime(end)
    const startDate = formatDate(start)
    const endDate = formatDate(end)
    const dateLabel = formatDate(start)
    const crossesDay = start.getUTCFullYear() !== end.getUTCFullYear()
        || start.getUTCMonth() !== end.getUTCMonth()
        || start.getUTCDate() !== end.getUTCDate()

    const handleStartPick = (next: Date) => {
        // Start shift — if end would land before the new start, push it
        // forward so the slot stays valid; otherwise leave end pinned so
        // pulling start backward doesn't silently extend the duration.
        const nextEnd = end.getTime() <= next.getTime()
            ? new Date(next.getTime() + 60 * 60 * 1000)
            : end
        onChange({ start: next, end: nextEnd })
    }

    const handleEndPick = (next: Date) => {
        // End must land after start — clamp forward to a 15-min minimum
        // if the user picks something earlier.
        const safeEnd = next > start ? next : new Date(start.getTime() + 15 * 60 * 1000)
        onChange({ start, end: safeEnd })
    }

    const handleDateEdit = (iso: string) => {
        if (!iso) return
        const [y, mo, d] = iso.split('-').map((v) => Number.parseInt(v, 10))
        if ([y, mo, d].some(Number.isNaN)) return
        const newStart = new Date(Date.UTC(y, mo - 1, d, start.getUTCHours(), start.getUTCMinutes()))
        const diff = end.getTime() - start.getTime()
        const newEnd = new Date(newStart.getTime() + diff)
        onChange({ start: newStart, end: newEnd })
    }

    return (
        <div
            className="py-3 md:py-[14px] px-4 md:px-6 border-t border-grey-4 flex items-center gap-3 md:gap-[18px] bg-white relative"
            style={{ flexShrink: 0 }}>
            {/* Clock leading-glyph is a desktop-only affordance — mobile drops it to reclaim horizontal space for the two pickers. */}
            <Clock size={16} className="hidden md:block text-grey-2 shrink-0" />

            {/* Desktop: [Start] — dashed — (duration) — dashed — [End].
                Mobile: [Start] [End] side-by-side; duration moves to a small chip next to the date label (below or inline) because the dashed connectors don't fit. */}
            <div className="flex items-center gap-2 md:gap-[10px] flex-1 min-w-0">
                <button
                    type="button"
                    onClick={() => setEditing(editing === 'start' ? null : 'start')}
                    className="flex-1 md:flex-none md:min-w-[128px] px-3 md:px-[14px] py-2 rounded-[12px] text-left cursor-pointer transition-colors"
                    style={{
                        border: `1.5px solid ${editing === 'start' ? '#7011F6' : '#E0E0E0'}`,
                        background: editing === 'start' ? '#F5EDFF' : '#ffffff',
                    }}>
                    <div
                        className="text-[9px] text-grey-2 uppercase truncate"
                        style={{
                            fontFamily: "'Red Hat Display', sans-serif",
                            fontWeight: 600,
                            letterSpacing: '0.12em',
                        }}>
                        Start · {startDate}
                    </div>
                    <div
                        className="text-[16px] md:text-[17px] mt-[1px]"
                        style={{
                            fontFamily: "'Red Hat Display', sans-serif",
                            fontWeight: 700,
                            letterSpacing: '-0.01em',
                            color: editing === 'start' ? '#4D1D91' : '#101010',
                        }}>
                        {startTime}
                    </div>
                </button>

                {/* Dashed connectors and centered duration pill — desktop only. */}
                <div
                    className="hidden md:block h-px flex-1"
                    style={{
                        background:
                            'repeating-linear-gradient(90deg, #AEAEAE 0 4px, transparent 4px 8px)',
                    }} />

                <div
                    className="hidden md:block px-[10px] py-[3px] rounded-full text-[11px]"
                    style={{
                        background: '#F5EDFF',
                        color: '#7011F6',
                        fontFamily: "'Red Hat Display', sans-serif",
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                    }}>
                    {duration}
                </div>

                <div
                    className="hidden md:block h-px flex-1"
                    style={{
                        background:
                            'repeating-linear-gradient(90deg, #AEAEAE 0 4px, transparent 4px 8px)',
                    }} />

                <button
                    type="button"
                    onClick={() => setEditing(editing === 'end' ? null : 'end')}
                    className="flex-1 md:flex-none md:min-w-[128px] px-3 md:px-[14px] py-2 rounded-[12px] text-left cursor-pointer transition-colors"
                    style={{
                        border: `1.5px solid ${editing === 'end' ? '#7011F6' : '#E0E0E0'}`,
                        background: editing === 'end' ? '#F5EDFF' : '#ffffff',
                    }}>
                    <div
                        className="text-[9px] text-grey-2 uppercase truncate"
                        style={{
                            fontFamily: "'Red Hat Display', sans-serif",
                            fontWeight: 600,
                            letterSpacing: '0.12em',
                        }}>
                        End · {endDate}
                    </div>
                    <div
                        className="text-[16px] md:text-[17px] mt-[1px]"
                        style={{
                            fontFamily: "'Red Hat Display', sans-serif",
                            fontWeight: 700,
                            letterSpacing: '-0.01em',
                            color: editing === 'end' ? '#4D1D91' : '#101010',
                        }}>
                        {endTime}
                    </div>
                </button>
            </div>

            {/* Mobile surfaces the duration as a compact chip beside the pickers
                since the desktop dashed-centered layout doesn't fit. */}
            <div
                className="md:hidden shrink-0 px-2 py-[3px] rounded-full text-[10px]"
                style={{
                    background: '#F5EDFF',
                    color: '#7011F6',
                    fontFamily: "'Red Hat Display', sans-serif",
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                }}>
                {duration}
            </div>

            {/* Only show the day chip when both ends fall on the same day —
                otherwise the per-button dates already communicate the span
                and this chip would be redundant / misleading. Hidden on
                mobile because the per-button Start/End dates already show
                it and the chip pushes the pickers too narrow. */}
            {!crossesDay && (
                <label
                    className="hidden md:flex px-3 py-[6px] rounded-full border border-grey-4 text-[12px] text-grey-1 items-center gap-[6px] cursor-pointer hover:bg-grey-5 transition-colors"
                    style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600 }}>
                    <Calendar size={13} className="text-grey-2" />
                    {dateLabel}
                    <ChevronDown size={12} className="text-grey-2" />
                    <input
                        type="date"
                        className="sr-only"
                        value={start.toISOString().slice(0, 10)}
                        onChange={(e) => handleDateEdit(e.target.value)}
                    />
                </label>
            )}

            {editing && (
                <div
                    ref={popoverRef}
                    // Desktop: anchored left of the strip, hovering above it.
                    // Mobile: span full width with edge gutters so the popover
                    // has room for the two-column date+time stepper.
                    className="absolute left-4 right-4 md:left-6 md:right-auto bottom-[68px] z-50 flex justify-center md:block">
                    <DateTimePickerPopover
                        title={editing === 'start' ? 'Start date & time' : 'End date & time'}
                        value={editing === 'start' ? start : end}
                        minValue={editing === 'end' ? start : undefined}
                        onChange={editing === 'start' ? handleStartPick : handleEndPick}
                        onDone={() => setEditing(null)}
                    />
                </div>
            )}
        </div>
    )
}

export default ComposerTimeStrip
