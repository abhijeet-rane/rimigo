import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'
import CalendarMonth from '@/modules/Itinerary/components/DateStep'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { TRIPBOARD_V1_BUTTON_PAGE } from '@/constants/posthogEvents'

export interface PastDatesTakeoverProps {
    /** Original trip ISO dates — reserved for future "current dates" preview, not rendered today. */
    originalStartDate?: string | null
    originalEndDate?: string | null
    /** Trip id — included on PostHog events so we can filter per trip. */
    tripId?: string | null
    /** Viewer role — included on PostHog events so we can split owner vs invitee adoption. */
    userRole?: 'owner' | 'invited'
    /** New start date the user picked. Page wires this to cloneItinerary + preferred_travel_time PATCH. */
    onUpdate: (newStartDate: Date) => Promise<void> | void
    /** Close button. Page hides the modal locally and writes the stays_exp_* rates fallback. */
    onDismiss: () => void
}

const startOfDay = (d: Date): Date => {
    const out = new Date(d)
    out.setHours(0, 0, 0, 0)
    return out
}

const getFirstDayOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1).getDay()
const getDaysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
const formatMonthLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

/**
 * Modal that pops over the tripboard when the trip's first day is before
 * today. Reuses the wizard's CalendarMonth so the picker matches the
 * "Find the best deals" look. Single-date selection — the page derives
 * end date from the existing trip length.
 */
const PastDatesTakeover: React.FC<PastDatesTakeoverProps> = ({ tripId, userRole, onUpdate, onDismiss }) => {
    const { trackButtonClickCustom } = usePostHog()

    const [submitting, setSubmitting] = useState(false)
    const [pickedDate, setPickedDate] = useState<Date | null>(null)
    // Calendar opens on the current month; past months aren't navigable.
    const [currentMonth, setCurrentMonth] = useState<Date>(() => {
        const now = new Date()
        return new Date(now.getFullYear(), now.getMonth(), 1)
    })
    const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')

    const today = startOfDay(new Date())
    const isPrevDisabled =
        currentMonth.getFullYear() === today.getFullYear() && currentMonth.getMonth() === today.getMonth()

    const isPastDate = (d: Date) => startOfDay(d) < today
    const isDateSelected = (d: Date) =>
        !!pickedDate && d.toDateString() === pickedDate.toDateString()
    const isDateInRange = () => false // single-date picker

    // Fire-once: modal viewed.
    useEffect(() => {
        trackButtonClickCustom({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: 'past_dates_modal_open',
            buttonAction: 'view',
            extra: { trip_id: tripId ?? null, user_role: userRole ?? null },
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleNavigateMonth = (direction: 'prev' | 'next') => {
        if (direction === 'prev' && isPrevDisabled) return
        setSlideDirection(direction === 'prev' ? 'left' : 'right')
        setCurrentMonth((m) =>
            direction === 'prev'
                ? new Date(m.getFullYear(), m.getMonth() - 1, 1)
                : new Date(m.getFullYear(), m.getMonth() + 1, 1),
        )
        trackButtonClickCustom({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: direction === 'prev' ? 'past_dates_calendar_prev' : 'past_dates_calendar_next',
            buttonAction: 'click',
            extra: { trip_id: tripId ?? null, user_role: userRole ?? null },
        })
    }

    const handleDateClick = (date: Date) => {
        if (isPastDate(date)) return
        setPickedDate(date)
        trackButtonClickCustom({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: 'past_dates_date_pick',
            buttonAction: 'date_select',
            extra: { trip_id: tripId ?? null, user_role: userRole ?? null, date: date.toISOString().split('T')[0] },
        })
    }

    const handleSubmit = async () => {
        if (submitting || !pickedDate) return
        trackButtonClickCustom({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: 'past_dates_modal_update',
            buttonAction: 'click',
            extra: { trip_id: tripId ?? null, user_role: userRole ?? null, date: pickedDate.toISOString().split('T')[0] },
        })
        setSubmitting(true)
        try {
            await onUpdate(pickedDate)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDismiss = () => {
        trackButtonClickCustom({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: 'past_dates_modal_dismiss',
            buttonAction: 'click',
            extra: { trip_id: tripId ?? null, user_role: userRole ?? null, date_picked: !!pickedDate },
        })
        onDismiss()
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-3 sm:px-4">
            {/* Backdrop — non-dismissable; user must commit via Update or ✕. */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                aria-hidden
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="past-dates-modal-title"
                className="relative w-full max-w-[420px] sm:max-w-[440px] max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.25)]">
                <button
                    type="button"
                    aria-label="Keep current dates"
                    onClick={handleDismiss}
                    disabled={submitting}
                    className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full flex items-center justify-center text-grey-1 hover:bg-grey-5 transition-colors disabled:opacity-50">
                    <X className="h-4 w-4" />
                </button>

                <div className="px-4 sm:px-5 pt-5 pb-3 pr-12">
                    <h2
                        id="past-dates-modal-title"
                        className="font-red-hat-display text-[16px] sm:text-[17px] font-bold text-grey-0 mb-1">
                        Your trip dates have passed
                    </h2>
                    <p className="font-manrope text-[12px] sm:text-[12.5px] text-grey-2 font-medium leading-snug">
                        Pick a new start date <br /> we&apos;ll shift your itinerary forward and refresh rates.
                    </p>
                </div>

                {/* Calendar — same CalendarMonth used by the wizard. */}
                <div className="px-4 sm:px-5 pb-2">
                    <div className="flex items-center justify-between mb-2">
                        <button
                            type="button"
                            onClick={() => handleNavigateMonth('prev')}
                            disabled={isPrevDisabled || submitting}
                            aria-label="Previous month"
                            className="h-8 w-8 rounded-full flex items-center justify-center text-grey-1 hover:bg-grey-5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="font-red-hat-display text-[14px] font-semibold text-grey-0">
                            {formatMonthLabel(currentMonth)}
                        </span>
                        <button
                            type="button"
                            onClick={() => handleNavigateMonth('next')}
                            disabled={submitting}
                            aria-label="Next month"
                            className="h-8 w-8 rounded-full flex items-center justify-center text-grey-1 hover:bg-grey-5 transition-colors disabled:opacity-50">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="overflow-hidden">
                        <AnimatePresence
                            mode="wait"
                            initial={false}>
                            <CalendarMonth
                                key={`${currentMonth.getFullYear()}-${currentMonth.getMonth()}`}
                                monthDate={currentMonth}
                                slideDirection={slideDirection}
                                getFirstDayOfMonth={getFirstDayOfMonth}
                                getDaysInMonth={getDaysInMonth}
                                isPastDate={isPastDate}
                                isDateSelected={isDateSelected}
                                isDateInRange={isDateInRange}
                                onDateClick={handleDateClick}
                            />
                        </AnimatePresence>
                    </div>
                </div>

                <div className="px-4 sm:px-5 pt-3 pb-4">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting || !pickedDate}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary-default text-white font-semibold font-manrope h-11 text-[14px] hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {submitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Updating dates…
                            </>
                        ) : (
                            'Update dates'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default PastDatesTakeover
