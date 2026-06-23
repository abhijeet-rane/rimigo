import { useState, useRef, useCallback, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface InlineTimeEditProps {
    /** Current time string like "10:00am" or ISO datetime */
    startTime: string | Date | null
    endTime?: string | Date | null
    /** Display string when not editing (e.g. "10:00am – 12:30pm") */
    displayText: string
    onTimeChange: (startTime: string, endTime?: string) => void
    canEdit: boolean
    className?: string
    textClassName?: string
}

/**
 * Inline time editor — tap on time text to open a time picker popover.
 * Used on itinerary slot cards for direct time editing.
 */
export default function InlineTimeEdit({
    startTime,
    endTime,
    displayText,
    onTimeChange,
    canEdit,
    className = '',
    textClassName = '',
}: InlineTimeEditProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [startValue, setStartValue] = useState('')
    const [endValue, setEndValue] = useState('')
    const popoverRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLSpanElement>(null)

    // Parse Date/string to HH:MM format for input[type=time]
    const toTimeString = useCallback((val: string | Date | null): string => {
        if (!val) return ''
        const d = new Date(val)
        if (isNaN(d.getTime())) return ''
        const h = d.getUTCHours().toString().padStart(2, '0')
        const m = d.getUTCMinutes().toString().padStart(2, '0')
        return `${h}:${m}`
    }, [])

    // Initialize values when opening editor
    useEffect(() => {
        if (isEditing) {
            setStartValue(toTimeString(startTime))
            setEndValue(toTimeString(endTime ?? null))
        }
    }, [isEditing, startTime, endTime, toTimeString])

    // Close on outside click
    useEffect(() => {
        if (!isEditing) return
        const handleClick = (e: MouseEvent) => {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)
            ) {
                setIsEditing(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [isEditing])

    const handleSave = useCallback(() => {
        if (startValue) {
            onTimeChange(startValue, endValue || undefined)
        }
        setIsEditing(false)
    }, [startValue, endValue, onTimeChange])

    if (!displayText) return null

    if (!canEdit) {
        return <span className={`${textClassName} ${className}`}>{displayText}</span>
    }

    return (
        <span className={`relative inline-block ${className}`}>
            {/* Clickable time text */}
            <span
                ref={triggerRef}
                onClick={(e) => {
                    e.stopPropagation()
                    setIsEditing(true)
                }}
                className={`${textClassName} cursor-pointer hover:text-violet-600 hover:underline decoration-dotted underline-offset-2 transition-colors inline-flex items-center gap-0.5 group/time`}
            >
                {displayText}
                <Clock className="w-2.5 h-2.5 opacity-0 group-hover/time:opacity-60 transition-opacity" />
            </span>

            {/* Time picker popover */}
            {isEditing && (
                <div
                    ref={popoverRef}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full left-0 mt-1 z-50 bg-white border border-grey-4 rounded-xl shadow-lg p-3 min-w-[180px]"
                >
                    <div className="space-y-2">
                        <div>
                            <label className="text-[10px] font-semibold text-grey-2 uppercase tracking-wider">Start</label>
                            <input
                                type="time"
                                value={startValue}
                                onChange={(e) => setStartValue(e.target.value)}
                                className="w-full mt-0.5 px-2 py-1.5 border border-grey-4 rounded-lg text-sm font-medium text-grey-0 focus:outline-none focus:ring-1 focus:ring-violet-400"
                                autoFocus
                            />
                        </div>
                        {(endTime || endValue) && (
                            <div>
                                <label className="text-[10px] font-semibold text-grey-2 uppercase tracking-wider">End</label>
                                <input
                                    type="time"
                                    value={endValue}
                                    onChange={(e) => setEndValue(e.target.value)}
                                    className="w-full mt-0.5 px-2 py-1.5 border border-grey-4 rounded-lg text-sm font-medium text-grey-0 focus:outline-none focus:ring-1 focus:ring-violet-400"
                                />
                            </div>
                        )}
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="flex-1 px-2 py-1 text-xs font-medium text-grey-2 bg-grey-5 rounded-lg hover:bg-grey-4 transition-colors"
                                type="button"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 px-2 py-1 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
                                type="button"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </span>
    )
}
