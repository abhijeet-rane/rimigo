import { motion } from 'framer-motion'
import React from 'react'

interface CalendarMonthProps {
    monthDate: Date
    slideDirection: 'left' | 'right'
    getFirstDayOfMonth: (date: Date) => number
    getDaysInMonth: (date: Date) => number
    isPastDate: (date: Date) => boolean
    isDateSelected: (date: Date) => boolean
    isDateInRange: (date: Date) => boolean
    onDateClick: (date: Date) => void
}

const CalendarMonth: React.FC<CalendarMonthProps> = ({
    monthDate,
    slideDirection,
    getFirstDayOfMonth,
    getDaysInMonth,
    isPastDate,
    isDateSelected,
    isDateInRange,
    onDateClick
}) => {
    return (
        <motion.div
            key={`month-${monthDate.getMonth()}-${monthDate.getFullYear()}`}
            initial={{ x: slideDirection === 'left' ? -100 : 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: slideDirection === 'left' ? 100 : -100, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex-1">
            {/* Week days */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div
                        key={i}
                        className="text-center text-sm font-medium text-grey-grey_2 py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: getFirstDayOfMonth(monthDate) }, (_, i) => (
                    <div
                        key={`empty-${i}`}
                        className="h-10"
                    />
                ))}

                {Array.from({ length: getDaysInMonth(monthDate) }, (_, i) => {
                    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), i + 1)

                    const selected = isDateSelected(date)
                    const inRange = isDateInRange(date)
                    const isPast = isPastDate(date)

                    return (
                        <button
                            type="button"
                            key={i + 1}
                            onClick={() => onDateClick(date)}
                            disabled={isPast}
                            className={`h-10 w-10 flex items-center justify-center text-sm rounded-full transition-colors ${
                                isPast
                                    ? 'text-grey-3/50 font-normal cursor-not-allowed line-through decoration-grey-3/40'
                                    : selected
                                      ? 'bg-primary-default text-white font-medium cursor-pointer'
                                      : inRange
                                        ? 'bg-purple-100 text-header-black font-medium cursor-pointer'
                                        : 'hover:bg-grey-5 text-header-black font-medium cursor-pointer'
                            }`}>
                            {i + 1}
                        </button>
                    )
                })}
            </div>
        </motion.div>
    )
}

export default CalendarMonth
