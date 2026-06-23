import React, { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import Typography from '@/components/shared/Typography'
import CustomShimmer from '@/components/shared/Shimmer'

interface CustomDatePickerProps {
    value: Date
    onChange: (date: Date) => void
    disabled?: boolean
    variant?: 'default' | 'chip'
    inputClassName?: string
    iconClassName?: string
    textClassName?: string
    isLoading?: boolean
    /**
     * Force the calendar to open in a specific direction.
     * 'auto' (default) detects viewport space automatically.
     * 'up' forces the calendar above the input.
     * 'down' forces it below.
     */
    openDirection?: 'auto' | 'up' | 'down'
}

const CALENDAR_HEIGHT = 340 // approximate height of the calendar dropdown in px

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
    value,
    onChange,
    disabled = false,
    variant = 'default',
    inputClassName,
    iconClassName,
    textClassName,
    isLoading = false,
    openDirection = 'auto'
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [opensUpward, setOpensUpward] = useState(false)
    const [currentMonth, setCurrentMonth] = useState(value.getMonth())
    const [currentYear, setCurrentYear] = useState(value.getFullYear())
    const pickerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLDivElement>(null)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    // Close picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(event.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => {
                document.removeEventListener('mousedown', handleClickOutside)
            }
        }
    }, [isOpen])

    // Sync current month/year with selected date
    useEffect(() => {
        setCurrentMonth(value.getMonth())
        setCurrentYear(value.getFullYear())
    }, [value])

    const handleToggleOpen = () => {
        if (disabled) return
        if (!isOpen) {
            // Determine open direction before showing
            if (openDirection === 'up') {
                setOpensUpward(true)
            } else if (openDirection === 'down') {
                setOpensUpward(false)
            } else {
                // auto: check if enough space below
                if (inputRef.current) {
                    const rect = inputRef.current.getBoundingClientRect()
                    const spaceBelow = window.innerHeight - rect.bottom
                    setOpensUpward(spaceBelow < CALENDAR_HEIGHT)
                }
            }
        }
        setIsOpen((prev) => !prev)
    }

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate()

    // Build calendar grid
    const days: { day: number; date: Date; isCurrentMonth: boolean }[] = []

    // Previous month's trailing days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
        const day = prevMonthDays - i
        days.push({
            day,
            date: new Date(currentYear, currentMonth - 1, day),
            isCurrentMonth: false
        })
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
        days.push({
            day: i,
            date: new Date(currentYear, currentMonth, i),
            isCurrentMonth: true
        })
    }

    // Next month's leading days (fill to 35 cells)
    const remainingCells = 35 - days.length
    for (let i = 1; i <= remainingCells; i++) {
        days.push({
            day: i,
            date: new Date(currentYear, currentMonth + 1, i),
            isCurrentMonth: false
        })
    }

    const handleDayClick = (date: Date) => {
        onChange(date)
        setIsOpen(false)
    }

    const goPrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11)
            setCurrentYear((y) => y - 1)
        } else {
            setCurrentMonth((m) => m - 1)
        }
    }

    const goNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0)
            setCurrentYear((y) => y + 1)
        } else {
            setCurrentMonth((m) => m + 1)
        }
    }

    const formatDateDisplay = (date: Date) => {
        const day = date.getDate()
        const month = monthNames[date.getMonth()].substring(0, 3)
        const year = date.getFullYear()
        return `${day} ${month} ${year}`
    }

    const isSelected = (date: Date) => {
        return date.getDate() === value.getDate() && date.getMonth() === value.getMonth() && date.getFullYear() === value.getFullYear()
    }

    const isToday = (date: Date) => {
        return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
    }

    return (
        <div className={`relative ${variant === 'chip' ? `shrink-0 ${isLoading ? 'w-[120px] min-w-[120px]' : ''}` : ''}`}>
            {/* Input Field */}
            <div
                ref={inputRef}
                onClick={handleToggleOpen}
                className={inputClassName || (variant === 'chip'
                    ? `relative flex items-center gap-2 px-3 py-2 rounded-[24px] border shrink-0 transition-colors cursor-pointer bg-white border-primary-default text-primary-default hover:bg-grey-5 ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${isOpen && !disabled ? 'ring-2' : ''}`
                    : `relative flex items-center gap-2 p-[16px] border rounded-xl transition-all duration-200 ${disabled ? 'bg-grey-5 cursor-not-allowed opacity-60 border-grey-4' : 'bg-white cursor-pointer'} ${isOpen && !disabled ? 'ring-2 border-primary-default' : disabled ? 'border-grey-4' : 'border-grey-4 hover:border-grey-3'}`
                )}
                style={variant === 'chip' ? undefined : {
                    fontFamily: "'Manrope', sans-serif",
                    color: 'var(--color-grey-0)',
                    lineHeight: '100%',
                    letterSpacing: '-1%'
                }}>
                {isLoading && variant === 'chip' ? (
                    <CustomShimmer
                        height={20}
                        radius={24}
                        className="w-full"
                    />
                ) : (
                    <>
                        <CalendarIcon className={iconClassName || (variant === 'chip' ? 'w-3 h-3 text-primary-default shrink-0' : 'h-4 w-4 text-grey-2 shrink-0')} />
                        <div
                            className={textClassName || (variant === 'chip'
                                ? 'text-[12px] md:text-[14px] font-semibold leading-[18px] font-manrope whitespace-nowrap text-grey-0'
                                : 'flex-1 text-size-16 font-medium text-grey-0'
                            )}
                            style={variant === 'chip' ? undefined : {
                                fontFamily: "'Manrope', sans-serif",
                                color: 'var(--color-grey-0)',
                                lineHeight: '100%',
                                letterSpacing: '-1%'
                            }}>
                            {formatDateDisplay(value)}
                        </div>
                    </>
                )}
            </div>

            {/* Calendar Dropdown */}
            {isOpen && !disabled && (
                <div
                    ref={pickerRef}
                    className={`absolute ${opensUpward ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 bg-white border border-feature-card-border rounded-lg shadow-lg z-50 w-full min-w-[300px]`}
                    onClick={(e) => e.stopPropagation()}>
                    {/* Month Navigation */}
                    <div className="flex justify-between items-center p-4 border-b border-feature-card-border">
                        <button
                            onClick={goPrevMonth}
                            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-grey-5 transition-colors"
                            style={{ backgroundColor: 'var(--color-grey-4)' }}>
                            <ChevronLeft className="h-4 w-4 text-grey-0" />
                        </button>
                        <Typography
                            size="14"
                            weight="semibold"
                            family="redhat"
                            color="grey-0">
                            {monthNames[currentMonth]} {currentYear}
                        </Typography>
                        <button
                            onClick={goNextMonth}
                            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer hover:bg-grey-5 transition-colors"
                            style={{ backgroundColor: 'var(--color-grey-4)' }}>
                            <ChevronRight className="h-4 w-4 text-grey-0" />
                        </button>
                    </div>

                    {/* Weekday labels */}
                    <div className="grid grid-cols-7 gap-1 px-4 pt-4 pb-2">
                        {weekDays.map((day) => (
                            <div
                                key={day}
                                className="text-center text-[12px] font-semibold uppercase text-grey-2"
                                style={{ fontFamily: "'Manrope', sans-serif" }}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 p-4">
                        {days.map(({ day, date, isCurrentMonth }, index) => {
                            const selected = isSelected(date)
                            const todayDate = isToday(date)
                            const isPast = date < today && !todayDate

                            return (
                                <button
                                    key={index}
                                    onClick={() => !isPast && handleDayClick(date)}
                                    disabled={isPast}
                                    className={`
                                        h-9 w-9 rounded-lg flex items-center justify-center text-sm font-medium transition-all
                                        ${isPast ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                                        ${
                                            selected
                                                ? 'bg-primary-default text-white hover:bg-primary-default'
                                                : todayDate
                                                  ? 'border border-primary-default text-primary-default hover:bg-primary-default/10'
                                                  : isCurrentMonth
                                                    ? 'text-grey-0 hover:bg-grey-5'
                                                    : 'text-grey-2 hover:bg-grey-5'
                                        }
                                    `}
                                    style={{
                                        fontFamily: "'Manrope', sans-serif",
                                        fontWeight: selected || todayDate ? '600' : '500'
                                    }}>
                                    {day}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

export default CustomDatePicker
