import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'

export type WhenModalType = 'date_range' | 'datetime_range' | 'time_range' | 'year' | 'month_year'

interface DateSelection {
    checkIn?: Date
    checkOut?: Date
}

interface WhenModalProps {
    isOpen: boolean
    onClose: () => void
    selectedDates: DateSelection
    currentMonth: Date
    slideDirection: 'left' | 'right' | null
    onDateClick: (date: Date) => void
    onNavigateMonth: (direction: 'prev' | 'next') => void
    isPrevDisabled: () => boolean
    type?: WhenModalType
    checkInTimeLabel?: string
    checkOutTimeLabel?: string
    onMonthSelect?: (month: number, year: number) => void
    onYearSelect?: (year: number) => void
    selectedMonth?: number | null
    selectedMonthYear?: number | null
    selectedYear?: number | null
    anchorRef?: React.RefObject<HTMLElement | null>
    usePortal?: boolean
    positionOffset?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'bottom-center' | 'top-center'
    /** When true, the page behind the modal remains scrollable */
    allowScrollBehind?: boolean
}

const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
}

const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const getNextMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

const isDateSelected = (date: Date, selectedDates: DateSelection) => {
    return selectedDates.checkIn?.toDateString() === date.toDateString() || selectedDates.checkOut?.toDateString() === date.toDateString()
}

const isDateInRange = (date: Date, selectedDates: DateSelection) => {
    if (!selectedDates.checkIn || !selectedDates.checkOut) return false
    // Include dates between check-in and check-out (exclusive of endpoints)
    const checkIn = new Date(selectedDates.checkIn)
    checkIn.setHours(0, 0, 0, 0)
    const checkOut = new Date(selectedDates.checkOut)
    checkOut.setHours(0, 0, 0, 0)
    const dateToCheck = new Date(date)
    dateToCheck.setHours(0, 0, 0, 0)
    return dateToCheck > checkIn && dateToCheck < checkOut
}

export const WhenModal = ({
    isOpen,
    onClose,
    selectedDates,
    currentMonth,
    slideDirection,
    onDateClick,
    onNavigateMonth,
    isPrevDisabled,
    type = 'date_range',
    checkInTimeLabel = 'Check-in Time',
    checkOutTimeLabel = 'Check-out Time',
    onMonthSelect,
    onYearSelect,
    selectedMonth: selectedMonthProp = null,
    selectedMonthYear: selectedMonthYearProp = null,
    selectedYear: selectedYearProp = null,
    anchorRef,
    usePortal = false,
    positionOffset = 'bottom-center',
    allowScrollBehind = false
}: WhenModalProps) => {
    const [checkInTime, setCheckInTime] = useState({ hours: 12, minutes: 0 })
    const [checkOutTime, setCheckOutTime] = useState({ hours: 12, minutes: 0 })
    const [selectedMonth, setSelectedMonth] = useState<number | null>(selectedMonthProp)
    const [selectedYear, setSelectedYear] = useState<number | null>(selectedYearProp)
    const modalContentRef = useRef<HTMLDivElement>(null)

    // Click-outside detection when allowScrollBehind is true (overlay has pointer-events: none)
    useEffect(() => {
        if (!isOpen || !allowScrollBehind) return
        const handlePointerDown = (e: PointerEvent) => {
            if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        document.addEventListener('pointerdown', handlePointerDown)
        return () => document.removeEventListener('pointerdown', handlePointerDown)
    }, [isOpen, allowScrollBehind, onClose])
    const todayStart = useMemo(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return today
    }, [])

    // Sync with props when modal opens or props change
    useEffect(() => {
        setSelectedMonth(selectedMonthProp)
        setSelectedYear(selectedYearProp)
    }, [selectedMonthProp, selectedYearProp, isOpen])

    const MODAL_WIDTHS = {
        time_range: 'md:w-[400px]',
        year: 'md:w-[600px]',
        month_year: 'md:w-[720px]',
        datetime_range: 'md:w-[720px]',
        date_range: 'md:w-[720px]',
    }

    const modalWidth = MODAL_WIDTHS[type] ?? 'md:w-[720px]'
    const [modalPosition, setModalPosition] = useState<{ top: number; left: number } | null>(null)

    // Calculate modal position when using portal
    useEffect(() => {
        if (usePortal && isOpen && anchorRef?.current) {
            const updatePosition = () => {
                const rect = anchorRef.current!.getBoundingClientRect()
                const scrollY = window.scrollY
                const scrollX = window.scrollX
                const offset = 8 // mt-2 = 8px
                
                let top: number
                let left: number
                
                // Calculate position based on positionOffset
                switch (positionOffset) {
                    case 'bottom-left':
                        top = rect.bottom + scrollY + offset
                        left = rect.left + scrollX
                        break
                    case 'bottom-right':
                        top = rect.bottom + scrollY + offset
                        left = rect.right + scrollX
                        break
                    case 'top-left':
                        top = rect.top + scrollY - offset
                        left = rect.left + scrollX
                        break
                    case 'top-right':
                        top = rect.top + scrollY - offset
                        left = rect.right + scrollX
                        break
                    case 'top-center':
                        top = rect.top + scrollY - offset
                        left = rect.left + scrollX + rect.width / 2
                        break
                    case 'bottom-center':
                    default:
                        // Default: bottom-center (centered below the anchor)
                        top = rect.bottom + scrollY + offset
                        left = rect.left + scrollX + rect.width / 2
                        break
                }
                
                setModalPosition({ top, left })
            }
            updatePosition()
            window.addEventListener('scroll', updatePosition, true)
            window.addEventListener('resize', updatePosition)
            return () => {
                window.removeEventListener('scroll', updatePosition, true)
                window.removeEventListener('resize', updatePosition)
            }
        } else if (!usePortal) {
            setModalPosition(null)
        }
    }, [usePortal, isOpen, anchorRef, positionOffset])

    if (!isOpen) return null

    // Single time picker component (for time_range type)
    const renderTimePicker = () => (
        <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center">
                <label className="text-sm font-medium text-grey-grey_2 mb-2">Hours</label>
                <input
                    type="number"
                    min="0"
                    max="23"
                    value={checkInTime.hours}
                    onChange={(e) => setCheckInTime({ ...checkInTime, hours: parseInt(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 text-center border border-feature-card-border rounded-md text-lg font-semibold"
                />
            </div>
            <span className="text-2xl font-bold text-header-black mt-6">:</span>
            <div className="flex flex-col items-center">
                <label className="text-sm font-medium text-grey-grey_2 mb-2">Minutes</label>
                <input
                    type="number"
                    min="0"
                    max="59"
                    value={checkInTime.minutes}
                    onChange={(e) => setCheckInTime({ ...checkInTime, minutes: parseInt(e.target.value) || 0 })}
                    className="w-20 px-3 py-2 text-center border border-feature-card-border rounded-md text-lg font-semibold"
                />
            </div>
        </div>
    )

    // Check-in time picker (for datetime_range type)
    const renderCheckInTimePicker = () => (
        <div className="mt-4 pt-4 border-t border-feature-card-border">
            <h4 className="text-sm font-semibold text-header-black mb-3">{checkInTimeLabel}</h4>
            <div className="flex items-center justify-center gap-4">
                <div className="flex flex-col items-center">
                    <label className="text-sm font-medium text-grey-grey_2 mb-2">Hours</label>
                    <input
                        type="number"
                        min="0"
                        max="23"
                        value={checkInTime.hours}
                        onChange={(e) => setCheckInTime({ ...checkInTime, hours: parseInt(e.target.value) || 0 })}
                        className="w-20 px-3 py-2 text-center border border-feature-card-border rounded-md text-lg font-semibold cursor-pointer"
                    />
                </div>
                <span className="text-2xl font-bold text-header-black mt-6">:</span>
                <div className="flex flex-col items-center">
                    <label className="text-sm font-medium text-grey-grey_2 mb-2">Minutes</label>
                    <input
                        type="number"
                        min="0"
                        max="59"
                        value={checkInTime.minutes}
                        onChange={(e) => setCheckInTime({ ...checkInTime, minutes: parseInt(e.target.value) || 0 })}
                        className="w-20 px-3 py-2 text-center border border-feature-card-border rounded-md text-lg font-semibold cursor-pointer"
                    />
                </div>
            </div>
        </div>
    )

    // Check-out time picker (for datetime_range type)
    const renderCheckOutTimePicker = () => (
        <div className="mt-4 pt-4 border-t border-feature-card-border">
            <h4 className="text-sm font-semibold text-header-black mb-3">{checkOutTimeLabel}</h4>
            <div className="flex items-center justify-center gap-4">
                <div className="flex flex-col items-center">
                    <label className="text-sm font-medium text-grey-grey_2 mb-2">Hours</label>
                    <input
                        type="number"
                        min="0"
                        max="23"
                        value={checkOutTime.hours}
                        onChange={(e) => setCheckOutTime({ ...checkOutTime, hours: parseInt(e.target.value) || 0 })}
                        className="w-20 px-3 py-2 text-center border border-feature-card-border rounded-md text-lg font-semibold cursor-pointer"
                    />
                </div>
                <span className="text-2xl font-bold text-header-black mt-6">:</span>
                <div className="flex flex-col items-center">
                    <label className="text-sm font-medium text-grey-grey_2 mb-2">Minutes</label>
                    <input
                        type="number"
                        min="0"
                        max="59"
                        value={checkOutTime.minutes}
                        onChange={(e) => setCheckOutTime({ ...checkOutTime, minutes: parseInt(e.target.value) || 0 })}
                        className="w-20 px-3 py-2 text-center border border-feature-card-border rounded-md text-lg font-semibold cursor-pointer"
                    />
                </div>
            </div>
        </div>
    )

    // Year picker component - matching PreferanceHorizontalCard styling
    const renderYearPicker = () => {
        const currentYear = new Date().getFullYear()
        const years = Array.from({ length: 10 }, (_, i) => currentYear + i)
        return (
            <div className="grid grid-cols-5 gap-2 p-6">
                {years.map((year) => {
                    const isActive = selectedYear === year
                    const isDisabled = new Date(year, 0, 1) < todayStart
                    return (
                        <button
                            key={year}
                            className={`h-[64px] flex items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                                isDisabled
                                    ? 'cursor-not-allowed opacity-40'
                                    : isActive
                                      ? ''
                                      : 'hover:bg-[color-mix(in_srgb,var(--color-primary-default)_8%,transparent)]'
                            }`}
                            style={{
                                borderColor: isActive ? 'var(--color-primary-default)' : 'var(--color-grey-4)',
                                backgroundColor: isActive ? 'color-mix(in srgb, var(--color-primary-default) 8%, transparent)' : 'transparent'
                            }}
                            disabled={isDisabled}
                            onClick={() => {
                                setSelectedYear(year)
                                onYearSelect?.(year)
                            }}>
                            <span
                                className={`text-base font-bold ${
                                    isActive ? 'text-primary-default' : isDisabled ? 'text-grey-grey_3' : 'text-grey-grey_2'
                                }`}
                                style={{ fontFamily: 'Red Hat Display' }}>
                                {year}
                            </span>
                        </button>
                    )
                })}
            </div>
        )
    }

    // Month and year picker component - next 16 months in a single grid
    const renderMonthYearPicker = () => {
        const today = new Date()
        const currentMonthIndex = today.getMonth()
        const currentYear = today.getFullYear()

        // Generate next 16 months starting from current month
        const months = Array.from({ length: 16 }, (_, i) => {
            const monthDate = new Date(currentYear, currentMonthIndex + i, 1)
            return {
                name: monthDate.toLocaleString('default', { month: 'short' }),
                fullName: monthDate.toLocaleString('default', { month: 'long' }),
                year: monthDate.getFullYear(),
                value: monthDate.getMonth() + 1
            }
        })

        return (
            <div className="grid grid-cols-4 gap-2 p-6">
                {months.map((month) => {
                    const isActive = selectedMonth === month.value && selectedMonthYearProp === month.year
                    // const monthDate = new Date(month.year, month.value - 1, 1)
                    const isDisabled = false
                    return (
                        <button
                            key={`${month.name}-${month.year}`}
                            className={`h-[64px] flex flex-col items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                                isDisabled
                                    ? 'cursor-not-allowed opacity-40'
                                    : isActive
                                      ? ''
                                      : 'hover:bg-[color-mix(in_srgb,var(--color-primary-default)_8%,transparent)]'
                            }`}
                            style={{
                                borderColor: isActive ? 'var(--color-primary-default)' : 'var(--color-grey-4)',
                                backgroundColor: isActive ? 'color-mix(in srgb, var(--color-primary-default) 8%, transparent)' : 'transparent'
                            }}
                            disabled={isDisabled}
                            onClick={() => {
                                setSelectedMonth(month.value)
                                onMonthSelect?.(month.value, month.year)
                            }}>
                            <span
                                className={`text-sm font-bold ${
                                    isActive ? 'text-primary-default' : isDisabled ? 'text-grey-grey_3' : 'text-grey-grey_2'
                                }`}
                                style={{ fontFamily: 'Manrope' }}>
                                {month.name}
                            </span>
                            <span
                                className={`text-xs font-semibold ${
                                    isActive ? 'text-primary-default' : isDisabled ? 'text-grey-grey_4' : 'text-grey-grey_3'
                                }`}
                                style={{ fontFamily: 'Red Hat Display' }}>
                                {month.year}
                            </span>
                        </button>
                    )
                })}
            </div>
        )
    }

    const modalContent = (
        <>
            {/* Overlay — semi-transparent on mobile for bottom sheet effect */}
            <div
                className="fixed inset-0 w-screen h-screen max-md:bg-black/30 bg-transparent"
                onClick={onClose}
                style={{ zIndex: 10050, pointerEvents: allowScrollBehind ? 'none' : 'auto' }}
            />
            <div
                ref={modalContentRef}
                onClick={(e) => e.stopPropagation()}
                className={`
                    max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:w-full max-md:animate-[slideUp_0.3s_ease-out]
                    ${usePortal ? 'md:fixed' : 'md:absolute'} ${usePortal ? '' : 'md:top-full md:left-1/2 md:transform md:-translate-x-1/2'} md:mt-2 ${usePortal ? 'md:max-w-[90vw]' : 'md:w-[80%]'} ${modalWidth}
                `}
                style={{
                    zIndex: 10051,
                    ...(usePortal && modalPosition ? {
                        top: `${modalPosition.top}px`,
                        left: `${modalPosition.left}px`,
                        transform: positionOffset === 'bottom-right' || positionOffset === 'top-right'
                            ? 'translateX(-100%)'
                            : positionOffset === 'bottom-left' || positionOffset === 'top-left'
                            ? 'translateX(0)'
                            : 'translateX(-50%)' // Default: center for bottom-center, top-center
                    } : {})
                }}
            >
                <div className="bg-white border border-feature-card-border max-md:border-t max-md:border-x-0 max-md:border-b-0 rounded-lg max-md:rounded-t-2xl max-md:rounded-b-none shadow-lg max-md:max-h-[75vh] max-md:overflow-y-auto">
                    {/* Drag handle for mobile */}
                    <div className="md:hidden flex justify-center pt-3 pb-1 sticky top-0 bg-white z-10 rounded-t-2xl">
                        <div className="w-10 h-1 rounded-full bg-grey-grey_4" />
                    </div>
                    {/* Render different views based on type */}
                    {type === 'time_range' && <div className="p-6">{renderTimePicker()}</div>}
                    {type === 'year' && renderYearPicker()}
                    {type === 'month_year' && renderMonthYearPicker()}
                    {(type === 'date_range' || type === 'datetime_range') && (
                        <div className="p-6">
                            {/* Calendar Header */}
                            <div className="flex gap-8 mb-6">
                                {/* First Month Header */}
                                <div className="flex-1 relative">
                                    <button
                                        onClick={() => !isPrevDisabled() && onNavigateMonth('prev')}
                                        disabled={isPrevDisabled()}
                                        className={`absolute left-0 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-colors z-10 ${isPrevDisabled() ? 'cursor-not-allowed opacity-40' : 'hover:bg-grey-grey_5 cursor-pointer'
                                            }`}>
                                        <ChevronLeft className={`h-5 w-5 ${isPrevDisabled() ? 'text-grey-grey_2' : 'text-header-black'}`} />
                                    </button>
                                    <h3 className="text-lg font-semibold text-header-black text-center">{getMonthName(currentMonth)}</h3>
                                    <button
                                        onClick={() => onNavigateMonth('next')}
                                        className="absolute md:hidden right-0 top-1/2 transform -translate-y-1/2 p-2 hover:bg-grey-grey_5 rounded-full transition-colors cursor-pointer z-10">
                                        <ChevronRight className="h-5 w-5 text-header-black" />
                                    </button>
                                </div>

                                {/* Second Month Header */}
                                <div className="flex-1 relative max-md:hidden">
                                    <h3 className="text-lg font-semibold text-header-black text-center">
                                        {getMonthName(getNextMonth(currentMonth))}
                                    </h3>
                                    <button
                                        onClick={() => onNavigateMonth('next')}
                                        className="absolute right-0 top-1/2 transform -translate-y-1/2 p-2 hover:bg-grey-grey_5 rounded-full transition-colors cursor-pointer z-10">
                                        <ChevronRight className="h-5 w-5 text-header-black" />
                                    </button>
                                </div>
                            </div>

                            {/* Calendar Grid */}
                            <div className="flex flex-col  md:flex-row gap-4 md:gap-8 overflow-hidden">
                                <AnimatePresence mode="wait">
                                    {/* First Month */}
                                    <motion.div
                                        key={`month-${currentMonth.getMonth()}-${currentMonth.getFullYear()}`}
                                        initial={{ x: slideDirection === 'left' ? -100 : 100, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: slideDirection === 'left' ? 100 : -100, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="flex-1">
                                        <div className="grid grid-cols-7 gap-1 mb-2">
                                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                                                <div
                                                    key={index}
                                                    className="text-center text-sm font-medium text-grey-grey_2 py-2">
                                                    {day}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 gap-1 min-h-[280px]">
                                            {Array.from({ length: getFirstDayOfMonth(currentMonth) }, (_, i) => (
                                                <div
                                                    key={`empty-${i}`}
                                                    className="h-10"></div>
                                            ))}
                                            {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => {
                                                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1)
                                                const isSelected = isDateSelected(date, selectedDates)
                                                const inRange = isDateInRange(date, selectedDates)
                                                const isPast = date < todayStart

                                                return (
                                                    <button
                                                        key={i + 1}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onDateClick(date)
                                                        }}
                                                        disabled={isPast}
                                                        className={`h-10 w-10 flex items-center justify-center text-sm font-medium rounded-full transition-colors cursor-pointer relative ${
                                                            isPast
                                                                ? 'text-grey-grey_3 cursor-not-allowed opacity-60'
                                                                : isSelected
                                                                  ? 'bg-primary-default text-white z-10'
                                                                  : inRange
                                                                    ? 'bg-primary-default-10 text-primary-default border border-primary-default-20'
                                                                    : 'hover:bg-grey-grey_5 text-header-black'
                                                        }`}>
                                                        {i + 1}
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        {/* Check-in time picker below first calendar */}
                                        {type === 'datetime_range' && renderCheckInTimePicker()}
                                    </motion.div>
                                </AnimatePresence>

                                <AnimatePresence mode="wait">
                                    {/* Second Month */}
                                    <motion.div
                                        key={`month-${getNextMonth(currentMonth).getMonth()}-${getNextMonth(currentMonth).getFullYear()}`}
                                        initial={{ x: slideDirection === 'left' ? -100 : 100, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: slideDirection === 'left' ? 100 : -100, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        className="flex-1 hidden md:block">
                                        <div className="grid grid-cols-7 gap-1 mb-2">
                                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                                                <div
                                                    key={index}
                                                    className="text-center text-sm font-medium text-grey-grey_2 py-2">
                                                    {day}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 gap-1 min-h-[280px]">
                                            {Array.from({ length: getFirstDayOfMonth(getNextMonth(currentMonth)) }, (_, i) => (
                                                <div
                                                    key={`empty-${i}`}
                                                    className="h-10"></div>
                                            ))}
                                            {Array.from({ length: getDaysInMonth(getNextMonth(currentMonth)) }, (_, i) => {
                                                const date = new Date(
                                                    getNextMonth(currentMonth).getFullYear(),
                                                    getNextMonth(currentMonth).getMonth(),
                                                    i + 1
                                                )
                                                const isSelected = isDateSelected(date, selectedDates)
                                                const inRange = isDateInRange(date, selectedDates)
                                                const isPast = date < todayStart

                                                return (
                                                    <button
                                                        key={i + 1}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onDateClick(date)
                                                        }}
                                                        disabled={isPast}
                                                        className={`h-10 w-10 flex items-center justify-center text-sm font-medium rounded-full transition-colors cursor-pointer relative ${
                                                            isPast
                                                                ? 'text-grey-grey_3 cursor-not-allowed opacity-60'
                                                                : isSelected
                                                                  ? 'bg-primary-default text-white z-10'
                                                                  : inRange
                                                                    ? 'bg-primary-default-10 text-primary-default border border-primary-default-20'
                                                                    : 'hover:bg-grey-grey_5 text-header-black'
                                                        }`}>
                                                        {i + 1}
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        {/* Check-out time picker below second calendar */}
                                        {type === 'datetime_range' && renderCheckOutTimePicker()}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )

    if (usePortal) {
        const container = typeof document !== 'undefined' ? document.body : null
        if (!container) return null
        return createPortal(modalContent, container)
    }

    return modalContent
}
