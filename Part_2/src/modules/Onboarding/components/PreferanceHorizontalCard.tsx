import React, { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import Typography from '@/components/shared/Typography'

// ---------------------- Day Picker ----------------------
interface DayPickerProps {
    imageSrc: string
    title: string
    description: string
    selectedDate: Date | null
    onDateChange: (date: Date) => void
    onClose: () => void
    defaultMonth?: Date | null
}

export const DayPicker: React.FC<DayPickerProps> = ({ imageSrc, title, description, selectedDate, onDateChange, onClose, defaultMonth }) => {
    const today = new Date()
    const initialDate = selectedDate ?? defaultMonth ?? today
    const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth())
    const [currentYear, setCurrentYear] = useState(initialDate.getFullYear())

    useEffect(() => {
        const base = selectedDate ?? defaultMonth
        if (base) {
            setCurrentMonth(base.getMonth())
            setCurrentYear(base.getFullYear())
        }
    }, [selectedDate, defaultMonth])

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate()

    // Build full 5x7 grid (35 days)
    const totalCells = 35
    const days: { day: number; date: Date; isCurrentMonth: boolean }[] = []

    // Fill in previous month's trailing days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
        const day = prevMonthDays - i
        days.push({
            day,
            date: new Date(currentYear, currentMonth - 1, day),
            isCurrentMonth: false
        })
    }

    // Fill current month’s days
    for (let i = 1; i <= daysInMonth; i++) {
        days.push({
            day: i,
            date: new Date(currentYear, currentMonth, i),
            isCurrentMonth: true
        })
    }

    // Fill remaining slots from next month (up to 35 total)
    const remainingCells = totalCells - days.length
    for (let i = 1; i <= remainingCells; i++) {
        days.push({
            day: i,
            date: new Date(currentYear, currentMonth + 1, i),
            isCurrentMonth: false
        })
    }

    const handleDayClick = (date: Date) => {
        if (date >= today) {
            onDateChange(date)
            onClose()
        }
    }

    const goPrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11)
            setCurrentYear((y) => y - 1)
        } else setCurrentMonth((m) => m - 1)
    }

    const goNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0)
            setCurrentYear((y) => y + 1)
        } else setCurrentMonth((m) => m + 1)
    }

    return (
        <div className="bg-white rounded-lg border border-grey-0 overflow-hidden w-full scrollbar-hide">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 p-3 border-b border-grey-4">
                <img
                    src={imageSrc}
                    className="w-8 h-8 object-contain"
                />
                <div className="flex flex-1 flex-col gap-[2px]">
                    <Typography
                        size="12"
                        weight="semibold"
                        family="redhat"
                        color="grey-0">
                        {title}
                    </Typography>
                    <Typography
                        weight="medium"
                        family="manrope"
                        color="grey-0"
                        size="16">
                        {description}
                    </Typography>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-grey-2 transition-colors hover:bg-grey-4">
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Month Navigation */}
            <div className="flex justify-between items-center p-3">
                <button
                    onClick={goPrevMonth}
                    className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                    style={{ backgroundColor: 'var(--color-grey-4)' }}>
                    <ChevronLeft size={16} />
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
                    className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                    style={{ backgroundColor: 'var(--color-grey-4)' }}>
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Weekday labels */}
            <div className="grid grid-cols-7 text-center text-[12px] font-semibold uppercase text-grey-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d}>{d}</div>
                ))}
            </div>

            {/* 5 Rows of Dates */}
            <div className="grid grid-cols-7 gap-2 p-3">
                {days.map(({ day, date }, i) => {
                    const isToday = date.toDateString() === today.toDateString()
                    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString()
                    const isPast = date < today && !isToday

                    let bgColor = 'transparent'
                    let textColor = 'var(--color-grey-0)'

                    if (isPast && !isSelected) textColor = 'var(--color-grey-3)'
                    if (isToday) {
                        bgColor = 'var(--color-grey-4)'
                        textColor = 'var(--color-grey-1)'
                    }
                    if (isSelected) {
                        bgColor = 'var(--color-primary-default)'
                        textColor = 'var(--color-natural-white)'
                    }

                    return (
                        <button
                            key={i}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-base font-medium transition-all"
                            style={{
                                backgroundColor: bgColor,
                                color: textColor
                            }}
                            onClick={() => handleDayClick(date)}>
                            {day}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ---------------------- Month Picker ----------------------
interface MonthPickerProps {
    imageSrc: string
    title: string
    description: string
    selectedDate: Date | null
    onDateChange: (date: Date) => void
    onClose: () => void
    defaultMonth?: Date | null
    monthListAnchor?: 'selected' | 'today'
}

const MonthPicker: React.FC<MonthPickerProps> = ({
    imageSrc,
    title,
    description,
    selectedDate,
    onDateChange,
    onClose,
    defaultMonth,
    monthListAnchor = 'selected'
}) => {
    const today = new Date()
    const baseDate = selectedDate ?? defaultMonth ?? today
    const anchorDate = monthListAnchor === 'today' ? today : baseDate
    const [selectedMonth, setSelectedMonth] = useState(baseDate.getMonth())
    const [selectedYear, setSelectedYear] = useState(baseDate.getFullYear())

    const months = useMemo(() => {
        return Array.from({ length: 12 }, (_, idx) => {
            const monthDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + idx, 1)
            return {
                name: monthDate.toLocaleString('default', { month: 'short' }),
                year: monthDate.getFullYear(),
                value: monthDate.getMonth()
            }
        })
    }, [anchorDate])

    useEffect(() => {
        if (selectedDate) {
            setSelectedMonth(selectedDate.getMonth())
            setSelectedYear(selectedDate.getFullYear())
        } else if (defaultMonth) {
            setSelectedMonth(defaultMonth.getMonth())
            setSelectedYear(defaultMonth.getFullYear())
        } else {
            setSelectedMonth(today.getMonth())
            setSelectedYear(today.getFullYear())
        }
    }, [selectedDate, defaultMonth, today])

    const handleSelectMonth = (monthValue: number, year: number) => {
        const selected = new Date(year, monthValue, 1)
        if (selected < new Date(today.getFullYear(), today.getMonth(), 1)) return

        setSelectedMonth(monthValue)
        setSelectedYear(year)
        onDateChange(selected)
        onClose()
    }

    return (
        <div className="bg-white rounded-lg border border-grey-0 overflow-hidden w-full scrollbar-hide">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 p-3 border-b border-grey-4">
                <img
                    src={imageSrc}
                    className="w-8 h-8 object-contain"
                />
                <div className="flex flex-1 flex-col gap-[2px]">
                    <Typography
                        size="12"
                        weight="semibold"
                        family="redhat"
                        color="grey-0">
                        {title}
                    </Typography>
                    <Typography
                        weight="medium"
                        family="manrope"
                        color="grey-0"
                        size="16">
                        {description}
                    </Typography>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-grey-2 transition-colors hover:bg-grey-4">
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-3 gap-2 p-3">
                {months.map((month) => {
                    const isActive = selectedMonth === month.value && selectedYear === month.year
                    const isPast = month.year < today.getFullYear() || (month.year === today.getFullYear() && month.value < today.getMonth())

                    return (
                        <button
                            key={`${month.name}-${month.year}`}
                            disabled={isPast} // ⛔ disable past months
                            className={`h-[64px] flex flex-col items-center justify-center rounded-[8px] border cursor-pointer
                ${isPast ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[color-mix(in_srgb,var(--color-primary-default)_8%,transparent)]'}`}
                            style={{
                                borderColor: isActive ? 'var(--color-primary-default)' : 'var(--color-grey-4)',
                                backgroundColor: isActive
                                    ? 'color-mix(in srgb, var(--color-primary-default) 8%, transparent)'
                                    : 'var(--color-natural-white)'
                            }}
                            onClick={() => !isPast && handleSelectMonth(month.value, month.year)} // ✅ extra safety
                        >
                            <Typography
                                size="14"
                                weight="bold"
                                family="manrope"
                                color={isActive ? 'primary-default' : isPast ? 'grey-3' : 'grey-2'}>
                                {month.name}
                            </Typography>
                            <Typography
                                size="16"
                                weight="medium"
                                family="manrope"
                                color={isPast ? 'grey-3' : 'grey-0'}
                                className="mt-1">
                                {month.year}
                            </Typography>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ---------------------- Main Horizontal Card ----------------------
interface PreferanceHorizontalCardProps {
    imageSrc: string
    title: string
    description: string
    expanded: boolean
    isDuration?: boolean
    pickerDescription?: string
    type?: 'day' | 'month'
    selectedDate?: Date | null
    onDateChange?: (date: Date) => void
    selected?: boolean
    onPress?: () => void
    defaultMonth?: Date | null
    onClose?: () => void
    monthListAnchor?: 'selected' | 'today'
}

export const PreferanceHorizontalCard: React.FC<PreferanceHorizontalCardProps> = ({
    imageSrc,
    title,
    description,
    type,
    selectedDate,
    onDateChange,
    isDuration = false,
    onPress,
    selected,
    pickerDescription,
    expanded,
    defaultMonth,
    onClose,
    monthListAnchor = 'selected'
}) => {
    const isSelected = selected !== undefined ? selected : selectedDate !== null

    if (isDuration && expanded) {
        return (
            <div className="w-full ">
                {type === 'day' && onDateChange && (
                    <DayPicker
                        imageSrc={imageSrc}
                        title={title}
                        description={pickerDescription ?? description}
                        selectedDate={selectedDate || null}
                        onDateChange={onDateChange}
                        onClose={onClose ?? (() => {})}
                        defaultMonth={defaultMonth}
                    />
                )}
                {type === 'month' && onDateChange && (
                    <MonthPicker
                        imageSrc={imageSrc}
                        title={title}
                        description={pickerDescription ?? description}
                        selectedDate={selectedDate || null}
                        onDateChange={onDateChange}
                        onClose={onClose ?? (() => {})}
                        defaultMonth={defaultMonth}
                        monthListAnchor={monthListAnchor}
                    />
                )}
            </div>
        )
    }

    return (
        <button
            onClick={onPress}
            className="w-full cursor-pointer flex items-center p-3 rounded-lg border shadow "
            style={{
                backgroundColor: isSelected ? 'var(--color-primary-default-80)' : 'var(--color-natural-white)',
                borderColor: isSelected ? 'var(--color-primary-default)' : 'var(--color-grey-4)'
            }}>
            <img
                src={imageSrc}
                className="w-12 h-12 object-contain mr-3"
            />
            <div className="flex flex-col">
                <Typography
                    size="14"
                    weight="medium"
                    family="redhat"
                    color={isSelected ? 'primary-default' : 'grey-0'}>
                    {title}
                </Typography>
                <Typography
                    size="12"
                    weight="medium"
                    family="manrope"
                    color="grey-2"
                    className="mt-[2px]">
                    {description}
                </Typography>
            </div>
        </button>
    )
}
