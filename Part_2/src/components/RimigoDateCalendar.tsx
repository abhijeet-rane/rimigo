import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Typography from './shared/Typography'
import clsx from 'clsx'

export interface RimigoDateCalendarProps {
    startDate: Date | null
    endDate: Date | null
    onChange: (start: Date | null, end: Date | null) => void
    minDate?: Date
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
const isBetween = (date: Date, start: Date, end: Date) => date > start && date < end

const RimigoDateCalendar: React.FC<RimigoDateCalendarProps> = ({ startDate, endDate, onChange, minDate }) => {
    const today = new Date()
    const baseDate = startDate ?? today

    const [month, setMonth] = useState(baseDate.getMonth())
    const [year, setYear] = useState(baseDate.getFullYear())

    // Sync calendar view to startDate when it changes (e.g. modal opened with new dates)
    useEffect(() => {
        if (startDate) {
            setMonth(startDate.getMonth())
            setYear(startDate.getFullYear())
        }
    }, [startDate?.getTime()])

    const firstDay = new Date(year, month, 1)
    const startDay = firstDay.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days: (Date | null)[] = []
    for (let i = 0; i < startDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
        days.push(new Date(year, month, d))
    }

    const goPrevMonth = () => {
        if (month === 0) {
            setMonth(11)
            setYear((y) => y - 1)
        } else {
            setMonth(month - 1)
        }
    }

    const goNextMonth = () => {
        if (month === 11) {
            setMonth(0)
            setYear((y) => y + 1)
        } else {
            setMonth(month + 1)
        }
    }

    const handleClick = (date: Date) => {
        if (minDate && date < minDate) return

        if (!startDate || endDate) {
            onChange(date, null)
        } else if (date < startDate) {
            onChange(date, startDate)
        } else {
            onChange(startDate, date)
        }
    }

    return (
        <div className="bg-white rounded-[12px] border border-grey-4 w-full">
            {/* Header */}
            <div className="flex justify-between items-center p-3">
                <button
                    onClick={goPrevMonth}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-grey-4">
                    <ChevronLeft
                        size={16}
                        className="text-grey-1"
                    />
                </button>

                <Typography
                    size="14"
                    weight="semibold">
                    {MONTH_NAMES[month]} {year}
                </Typography>

                <button
                    onClick={goNextMonth}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-grey-4">
                    <ChevronRight
                        size={16}
                        className="text-grey-1"
                    />
                </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-grey-2 px-3">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d}>{d.toUpperCase()}</div>
                ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-2 p-3">
                {days.map((date, i) => {
                    if (!date) return <div key={i} />

                    const isStart = startDate && isSameDay(date, startDate)
                    const isEnd = endDate && isSameDay(date, endDate)
                    const inRange = startDate && endDate && isBetween(date, startDate, endDate)

                    return (
                        <button
                            key={i}
                            onClick={() => handleClick(date)}
                            className={clsx(
                                'h-9 w-9 flex items-center justify-center text-[16px] font-medium font-manrope',
                                isStart || isEnd
                                    ? 'bg-primary-default text-natural-white'
                                    : inRange
                                      ? 'bg-primary-default/16 text-primary-default'
                                      : 'text-grey-0'
                            )}>
                            {date.getDate()}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

export default RimigoDateCalendar
