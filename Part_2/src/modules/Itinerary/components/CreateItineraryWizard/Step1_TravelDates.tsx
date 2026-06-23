import { useState, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ArrowLeft, Calendar, Clock } from 'lucide-react'
import CalendarMonth from '../DateStep'
import FlexibleDatesPicker from './components/FlexibleDatesPicker'
import { StepProps } from './types'
import { useIsMobile } from '../../hooks/ItineraryHook'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { TRIPBOARD_V1_BUTTON_PAGE } from '@/constants/posthogEvents'
import FormSectionCard from '@/components/shared/FormSectionCard'
import { WIZARD_CONTENT_MAX_WIDTH } from '@/modules/Tripboard/components/createFlow/wizardConstants'

const Step1TravelDates = ({ state, onChange, onNext, onBack, showBackButton, preValidate, isFormIncomplete }: StepProps & { showBackButton?: boolean; preValidate?: () => boolean; isFormIncomplete?: boolean }) => {
    const isMobile = useIsMobile()
    const { trackButtonClickCustom } = usePostHog()
    const [dateError, setDateError] = useState<string | null>(null)
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date()
        const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        // Jump to start date's month only if it's not in the past
        if (state.startDate) {
            const startMonth = new Date(state.startDate.getFullYear(), state.startDate.getMonth(), 1)
            return startMonth >= firstOfCurrentMonth ? startMonth : firstOfCurrentMonth
        }
        return firstOfCurrentMonth
    })
    const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')

    // Date utilities
    const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
    const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()
    const getNextMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 1)

    const isPastDate = (date: Date) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        return date < today
    }

    const isPrevDisabled = () => {
        const today = new Date()
        return currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear()
    }

    const isDateSelected = (date: Date) => {
        if (!state.startDate) return false
        const d = date.toDateString()
        if (state.startDate && !state.endDate) return d === state.startDate.toDateString()
        if (state.startDate && state.endDate) {
            return d === state.startDate.toDateString() || d === state.endDate.toDateString()
        }
        return false
    }

    const isDateInRange = (date: Date) => {
        if (!state.startDate || !state.endDate) return false
        return date > state.startDate && date < state.endDate
    }

    const handleDateClick = (date: Date) => {
        if (isPastDate(date)) return
        setDateError(null)
        const dateString = date.toISOString().split('T')[0]
        if (!state.startDate || (state.startDate && state.endDate)) {
            onChange({ startDate: date, endDate: null })
            trackButtonClickCustom({
                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                buttonName: 'start_date_pick',
                buttonAction: 'date_select',
                extra: { date: dateString }
            })
        } else if (state.startDate && !state.endDate) {
            if (date < state.startDate) {
                onChange({ startDate: date, endDate: state.startDate })
                trackButtonClickCustom({
                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                    buttonName: 'start_date_pick',
                    buttonAction: 'date_select',
                    extra: { date: dateString }
                })
                trackButtonClickCustom({
                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                    buttonName: 'end_date_pick',
                    buttonAction: 'date_select',
                    extra: { date: state.startDate.toISOString().split('T')[0] }
                })
            } else {
                onChange({ endDate: date })
                trackButtonClickCustom({
                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                    buttonName: 'end_date_pick',
                    buttonAction: 'date_select',
                    extra: { date: dateString }
                })
            }
        }
    }

    const handleNavigateMonth = (direction: 'prev' | 'next') => {
        setSlideDirection(direction === 'next' ? 'right' : 'left')
        setCurrentMonth((prev) => {
            const newMonth = new Date(prev)
            newMonth.setMonth(newMonth.getMonth() + (direction === 'next' ? 1 : -1))
            return newMonth
        })
    }

    const months = useMemo(() => [currentMonth, getNextMonth(currentMonth)], [currentMonth])
    const getMonthName = (date: Date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    // Compute stay length for display (check-in → check-out = nights, aligned with Step2_CitiesRoute)
    const tripDuration = useMemo(() => {
        if (state.dateMode === 'exact' && state.startDate && state.endDate) {
            const diffMs = state.endDate.getTime() - state.startDate.getTime()
            const nights = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)))
            return `${nights} night${nights !== 1 ? 's' : ''}`
        }
        if (state.dateMode === 'flexible' && state.flexibleDuration) {
            return `${state.flexibleDuration} days`
        }
        return null
    }, [state.dateMode, state.startDate, state.endDate, state.flexibleDuration])

    const handleNext = () => {
        // Run parent pre-validation first (e.g., travelers + occasion for step 0)
        if (preValidate && !preValidate()) {
            return
        }

        const exactInvalid =
            state.dateMode === 'exact' && (state.startDate === null || state.endDate === null)
        const flexibleInvalid =
            state.dateMode === 'flexible' &&
            (state.flexibleDuration === null || state.flexibleMonths.length === 0)

        if (exactInvalid || flexibleInvalid) {
            setDateError(
                state.dateMode === 'exact'
                    ? 'Please select start and end dates before proceeding'
                    : 'Please select duration and months before proceeding'
            )
            return
        }
        setDateError(null)
        onNext()
    }

    return (
        <div className="">
            <FormSectionCard error={dateError} className={`${WIZARD_CONTENT_MAX_WIDTH} mx-auto`}>
                {/* Heading */}
                <h3 className="text-[18px] font-red-hat-display font-medium text-grey-0 mb-4">
                    When do you want to travel?
                </h3>

                {/* Mode toggle */}
                <div className="flex items-center justify-start mb-5">
                    <div className="inline-flex rounded-lg bg-grey-5 p-1">
                        <button
                            onClick={() => {
                                onChange({ dateMode: 'exact' })
                                setDateError(null)
                                trackButtonClickCustom({
                                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                    buttonName: 'date_mode_toggle',
                                    buttonAction: 'click',
                                    extra: { mode: 'exact' }
                                })
                            }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold font-manrope transition-all duration-200 cursor-pointer ${
                                state.dateMode === 'exact'
                                    ? 'bg-white text-grey-0 shadow-sm'
                                    : 'text-grey-2 hover:text-grey-1'
                            }`}>
                            <Calendar size={16} />
                            Exact Dates
                        </button>
                        <button
                            onClick={() => {
                                onChange({ dateMode: 'flexible' })
                                setDateError(null)
                                trackButtonClickCustom({
                                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                    buttonName: 'date_mode_toggle',
                                    buttonAction: 'click',
                                    extra: { mode: 'flexible' }
                                })
                            }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold font-manrope transition-all duration-200 cursor-pointer ${
                                state.dateMode === 'flexible'
                                    ? 'bg-white text-grey-0 shadow-sm'
                                    : 'text-grey-2 hover:text-grey-1'
                            }`}>
                            <Clock size={16} />
                            I'm Flexible
                        </button>
                    </div>
                </div>

            {state.dateMode === 'exact' ? (
                /* ── Exact Dates Calendar ── */
                <div className="">
                    {/* Month navigation */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => handleNavigateMonth('prev')}
                            disabled={isPrevDisabled()}
                            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-grey-5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div className={`flex ${isMobile ? 'flex-col items-center' : 'gap-16'}`}>
                            {(isMobile ? [months[0]] : months).map((m, i) => (
                                <h3 key={i} className="text-base font-semibold font-manrope text-grey-0">
                                    {getMonthName(m)}
                                </h3>
                            ))}
                        </div>

                        <button
                            onClick={() => handleNavigateMonth('next')}
                            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-grey-5 cursor-pointer transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Calendars */}
                    <div className={`flex ${isMobile ? 'flex-col' : 'gap-6'}`}>
                        <AnimatePresence mode="wait" initial={false}>
                            {(isMobile ? [months[0]] : months).map((m) => (
                                <CalendarMonth
                                    key={`month-${m.getMonth()}-${m.getFullYear()}`}
                                    monthDate={m}
                                    slideDirection={slideDirection}
                                    getFirstDayOfMonth={getFirstDayOfMonth}
                                    getDaysInMonth={getDaysInMonth}
                                    isPastDate={isPastDate}
                                    isDateSelected={isDateSelected}
                                    isDateInRange={isDateInRange}
                                    onDateClick={handleDateClick}
                                />
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Date error */}
                    {/* dateError is shown by FormSectionCard */}

                    {/* Selected dates summary */}
                    {state.startDate && (
                        <div className="mt-4 pt-4 border-t border-grey-4/50 flex flex-col items-center justify-center gap-2 text-sm font-manrope">
                            <div className='flex items-center gap-1'>
                                <span className="text-grey-1 font-medium">
                                    {state.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                {state.endDate && (
                                    <>
                                        <span className="text-grey-3 font-medium">→</span>
                                        <span className="text-grey-1 font-medium">
                                            {state.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </>
                                )}
                            </div>
                            {tripDuration && (
                                <span className="ml-2 px-2.5 py-0.5  bg-primary-default/10 text-primary-default rounded-full text-xs font-semibold">
                                    {tripDuration}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* ── Flexible Dates ── */
                <>
                    <FlexibleDatesPicker
                        duration={state.flexibleDuration}
                        selectedMonths={state.flexibleMonths}
                        onDurationChange={(d) => {
                            onChange({ flexibleDuration: d })
                            setDateError(null)
                            trackButtonClickCustom({
                                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                buttonName: 'flexible_duration_select',
                                buttonAction: 'click',
                                extra: { duration: d }
                            })
                        }}
                        onMonthsChange={(m) => {
                            onChange({ flexibleMonths: m })
                            setDateError(null)
                            trackButtonClickCustom({
                                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                                buttonName: 'flexible_month_select',
                                buttonAction: 'click',
                                extra: { months: m }
                            })
                        }}
                    />
                    {/* dateError is shown by FormSectionCard */}
                </>
            )}
            </FormSectionCard>

            {/* Navigation buttons — sticky on both mobile and desktop */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-grey-4/50 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] z-30">
                <div className={`${WIZARD_CONTENT_MAX_WIDTH} mx-auto flex items-center gap-4 ${showBackButton ? 'justify-between' : 'justify-end'}`}>
                    {showBackButton && (
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-grey-4 text-grey-1 font-medium font-manrope hover:bg-grey-5 cursor-pointer transition-all">
                            <ArrowLeft size={18} />
                            <span>Back</span>
                        </button>
                    )}
                    <button
                        onClick={handleNext}
                        className={`flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-medium font-manrope cursor-pointer transition-all duration-300 ${
                            !showBackButton ? 'w-full sm:w-auto' : ''
                        } ${
                            isFormIncomplete
                                ? 'bg-primary-default/40 text-white/70'
                                : 'bg-primary-default text-white hover:shadow-lg sm:hover:scale-105 active:scale-95'
                        }`}>
                        <span>Next</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Step1TravelDates
