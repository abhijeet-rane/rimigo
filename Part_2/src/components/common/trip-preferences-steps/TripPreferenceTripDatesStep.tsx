import { format } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import TripPreferenceStepLayout from './TripPreferenceStepLayout'

export interface TripPreferenceTripDatesResult {
    startDate: string
    endDate: string
}

interface TripPreferenceTripDatesStepProps {
    flowType: 'create' | 'edit'
    initialDates?: {
        startDate?: string | null
        endDate?: string | null
    }
    onNextStep?: (result: TripPreferenceTripDatesResult) => void
    onSave?: (result: TripPreferenceTripDatesResult) => void
    currentStep?: number
    totalSteps?: number
    onClose?: () => void
    isSaving?: boolean
}

interface DateSelection {
    checkIn?: Date
    checkOut?: Date
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
    return date > selectedDates.checkIn && date < selectedDates.checkOut
}

const isPastDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
}

const TripPreferenceTripDatesStep = ({
    flowType,
    initialDates,
    onNextStep,
    onSave,
    currentStep,
    totalSteps,
    onClose,
    isSaving
}: TripPreferenceTripDatesStepProps) => {
    const [selectedDates, setSelectedDates] = useState<DateSelection>({})
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null)

    // Initialize dates from props
    useEffect(() => {
        const checkIn = initialDates?.startDate ? new Date(initialDates.startDate) : undefined
        const checkOut = initialDates?.endDate ? new Date(initialDates.endDate) : undefined

        if (checkIn && !isNaN(checkIn.getTime())) {
            setSelectedDates((prev) => ({ ...prev, checkIn }))
            setCurrentMonth(checkIn)
        }
        if (checkOut && !isNaN(checkOut.getTime())) {
            setSelectedDates((prev) => ({ ...prev, checkOut }))
        }
    }, [initialDates])

    const handleDateClick = (date: Date) => {
        if (isPastDate(date)) return

        if (!selectedDates.checkIn || (selectedDates.checkIn && selectedDates.checkOut)) {
            // Start new selection
            setSelectedDates({ checkIn: date, checkOut: undefined })
        } else if (selectedDates.checkIn && !selectedDates.checkOut) {
            // Complete the selection
            if (date < selectedDates.checkIn) {
                // Swap if second selection is before first
                setSelectedDates({ checkIn: date, checkOut: selectedDates.checkIn })
            } else {
                setSelectedDates({ ...selectedDates, checkOut: date })
            }
        }
    }

    const handleNavigateMonth = (direction: 'prev' | 'next') => {
        setSlideDirection(direction === 'prev' ? 'right' : 'left')
        setCurrentMonth((prev) => {
            const newMonth = new Date(prev.getFullYear(), prev.getMonth() + (direction === 'prev' ? -1 : 1), 1)
            return newMonth
        })
    }

    const isPrevDisabled = () => {
        const today = new Date()
        const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
        return prevMonth < new Date(today.getFullYear(), today.getMonth(), 1)
    }

    const handleSubmit = () => {
        if (!selectedDates.checkIn || !selectedDates.checkOut) return

        const payload: TripPreferenceTripDatesResult = {
            startDate: format(selectedDates.checkIn, 'yyyy-MM-dd'),
            endDate: format(selectedDates.checkOut, 'yyyy-MM-dd')
        }

        if (flowType === 'create') {
            onNextStep?.(payload)
        } else {
            onSave?.(payload)
        }
    }

    return (
        <TripPreferenceStepLayout
            title="When are you traveling?"
            description="Select your check-in and check-out dates."
            flowType={flowType}
            onPrimary={handleSubmit}
            primaryDisabled={!selectedDates.checkIn || !selectedDates.checkOut}
            primaryLoading={isSaving}
            currentStep={currentStep}
            totalSteps={totalSteps}
            onClose={onClose}>
            <div className="flex flex-col gap-6">
                {/* Calendar */}
                <div className="bg-white border border-feature-card-border rounded-lg p-6">
                    {/* Calendar Header */}
                    <div className="flex gap-8 mb-6">
                        {/* First Month Header */}
                        <div className="flex-1 relative">
                            <button
                                type="button"
                                onClick={() => !isPrevDisabled() && handleNavigateMonth('prev')}
                                disabled={isPrevDisabled()}
                                className={`absolute left-0 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-colors z-10 ${
                                    isPrevDisabled() ? 'cursor-not-allowed opacity-40' : 'hover:bg-grey-grey_5 cursor-pointer'
                                }`}>
                                <ChevronLeft className={`h-5 w-5 ${isPrevDisabled() ? 'text-grey-grey_2' : 'text-header-black'}`} />
                            </button>
                            <h3 className="text-lg font-semibold text-header-black text-center">{getMonthName(currentMonth)}</h3>
                        </div>

                        {/* Second Month Header */}
                        <div className="flex-1 relative">
                            <h3 className="text-lg font-semibold text-header-black text-center">{getMonthName(getNextMonth(currentMonth))}</h3>
                            <button
                                type="button"
                                onClick={() => handleNavigateMonth('next')}
                                className="absolute right-0 top-1/2 transform -translate-y-1/2 p-2 hover:bg-grey-grey_5 rounded-full transition-colors z-10">
                                <ChevronRight className="h-5 w-5 text-header-black" />
                            </button>
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="flex gap-8 overflow-hidden">
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
                                <div className="grid grid-cols-7 gap-1">
                                    {Array.from({ length: getFirstDayOfMonth(currentMonth) }, (_, i) => (
                                        <div
                                            key={`empty-${i}`}
                                            className="h-10"></div>
                                    ))}
                                    {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => {
                                        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1)
                                        const isSelected = isDateSelected(date, selectedDates)
                                        const inRange = isDateInRange(date, selectedDates)
                                        const isPast = isPastDate(date)

                                        return (
                                            <button
                                                type="button"
                                                key={i + 1}
                                                onClick={() => handleDateClick(date)}
                                                disabled={isPast}
                                                className={`h-10 w-10 flex items-center justify-center text-sm font-medium rounded-full transition-colors ${
                                                    isPast
                                                        ? 'text-grey-grey_3 cursor-not-allowed'
                                                        : isSelected
                                                          ? 'bg-header-black text-white cursor-pointer'
                                                          : inRange
                                                            ? 'bg-grey-5 text-header-black cursor-pointer'
                                                            : 'hover:bg-grey-grey_5 text-header-black cursor-pointer'
                                                }`}>
                                                {i + 1}
                                            </button>
                                        )
                                    })}
                                </div>
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
                                <div className="grid grid-cols-7 gap-1">
                                    {Array.from({ length: getFirstDayOfMonth(getNextMonth(currentMonth)) }, (_, i) => (
                                        <div
                                            key={`empty-${i}`}
                                            className="h-10"></div>
                                    ))}
                                    {Array.from({ length: getDaysInMonth(getNextMonth(currentMonth)) }, (_, i) => {
                                        const date = new Date(getNextMonth(currentMonth).getFullYear(), getNextMonth(currentMonth).getMonth(), i + 1)
                                        const isSelected = isDateSelected(date, selectedDates)
                                        const inRange = isDateInRange(date, selectedDates)
                                        const isPast = isPastDate(date)

                                        return (
                                            <button
                                                type="button"
                                                key={i + 1}
                                                onClick={() => handleDateClick(date)}
                                                disabled={isPast}
                                                className={`h-10 w-10 flex items-center justify-center text-sm font-medium rounded-full transition-colors ${
                                                    isPast
                                                        ? 'text-grey-grey_3 cursor-not-allowed'
                                                        : isSelected
                                                          ? 'bg-header-black text-white cursor-pointer'
                                                          : inRange
                                                            ? 'bg-grey-5 text-header-black cursor-pointer'
                                                            : 'hover:bg-grey-grey_5 text-header-black cursor-pointer'
                                                }`}>
                                                {i + 1}
                                            </button>
                                        )
                                    })}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Summary */}
            </div>
        </TripPreferenceStepLayout>
    )
}

export default TripPreferenceTripDatesStep
