import React, { useState, useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { WhenModal } from '@/components/common/SearchBar/modals/WhenModal'
import { GuestsModal, type GuestsData } from '@/components/common/SearchBar/modals/GuestsModal'
import { AdaptedExperienceDetailsType } from '../../../types'
import { triggerAssistantPrompt } from '@/pages/Stays/Components/assistantController'

interface ExperienceFindBestTicketSectionProps {
    timing_guide?: AdaptedExperienceDetailsType['timing_guide']
    platformLogos?: Array<{ url: string; alt: string }>
    sellingFast?: boolean
    onFindBestOption?: (date: string, guests: GuestsData) => void
    onBestTimeToVisit?: () => void
}

type DayInfo = {
    start_time: string | null
    end_time: string | null
    description?: string
    is_closed?: boolean
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const
const DAY_LABELS: Record<(typeof DAYS)[number], string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
}

const formatTime = (time: string | null): string => {
    if (!time) return ''
    // Convert 24h to 12h format if needed
    if (time.includes(':')) {
        const [hours, minutes] = time.split(':')
        const hour = parseInt(hours, 10)

        const hour12 = hour % 12 || 12
        return `${hour12}:${minutes}`
    }
    return time
}

const formatDayHours = (day: DayInfo | null | undefined): string => {
    if (!day || day.is_closed) return 'Closed'
    if (day.start_time && day.end_time) {
        const start = formatTime(day.start_time)
        const end = formatTime(day.end_time)
        return `${start} - ${end}`
    }
    return '-'
}

const ExperienceFindBestTicketSection: React.FC<ExperienceFindBestTicketSectionProps> = ({
    timing_guide,
    // platformLogos = [
    //     { url: 'https://logo.clearbit.com/getyourguide.com', alt: 'GetYourGuide' },
    //     { url: 'https://logo.clearbit.com/klook.com', alt: 'Klook' },
    //     { url: 'https://logo.clearbit.com/tripadvisor.in', alt: 'Tripadvisor' }
    // ],
    sellingFast = false,
    // onFindBestOption,
    onBestTimeToVisit
}) => {
    // Date state
    // const [selectedDate, setSelectedDate] = useState<string>('')
    const [selectedDates, setSelectedDates] = useState<{ checkIn?: Date; checkOut?: Date }>({})
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null)

    // Guests state
    const [guests, setGuests] = useState<GuestsData>({
        adults: 2,
        children: 0,
        infants: 0,
        children_age: []
    })

    // Modal state
    const [isWhenOpen, setIsWhenOpen] = useState(false)
    const [isGuestsOpen, setIsGuestsOpen] = useState(false)

    // Hours of operation collapse state
    // const [isHoursExpanded, setIsHoursExpanded] = useState(false)

    // const formatYmd = (d: Date) => d.toISOString().split('T')[0]
    // const formatDisplayDate = (dateStr: string) => {
    //     if (!dateStr) return ''
    //     const date = new Date(dateStr)
    //     const day = String(date.getDate()).padStart(2, '0')
    //     const month = String(date.getMonth() + 1).padStart(2, '0')
    //     const year = date.getFullYear()
    //     return `${day}/${month}/${year}`
    // }

    const onDateClick = (date: Date) => {
        setSelectedDates({ checkIn: date, checkOut: undefined })
        // const dateStr = formatYmd(date)
        // setSelectedDate(dateStr)
        setIsWhenOpen(false)
    }

    const onNavigateMonth = (direction: 'prev' | 'next') => {
        setSlideDirection(direction === 'prev' ? 'right' : 'left')
        setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + (direction === 'prev' ? -1 : 1), 1))
    }

    const isPrevDisabled = () => {
        const today = new Date()
        const firstOfCurrent = new Date(today.getFullYear(), today.getMonth(), 1)
        return currentMonth <= firstOfCurrent
    }

    const onApplyGuests = (data: GuestsData) => {
        setGuests(data)
        setIsGuestsOpen(false)
    }

    // const guestsSummary = useMemo(() => {
    //     const parts: string[] = []
    //     if (guests.adults > 0) {
    //         parts.push(`${guests.adults} adult${guests.adults === 1 ? '' : 's'}`)
    //     }
    //     if (guests.children > 0) {
    //         parts.push(`${guests.children} child${guests.children === 1 ? '' : 'ren'}`)
    //     }
    //     if (guests.infants > 0) {
    //         parts.push(`${guests.infants} infant${guests.infants === 1 ? '' : 's'}`)
    //     }
    //     return parts.join(', ') || 'Add guests'
    // }, [guests])

    // const handleFindBestOption = () => {
    //     if (onFindBestOption && selectedDate) {
    //         onFindBestOption(selectedDate, guests)
    //     }
    // }

    // Get hours for each day from timing_guide
    const dayHours = useMemo(() => {
        if (!timing_guide) return []
        return DAYS.map((day) => {
            const info = timing_guide[day] as DayInfo | undefined
            return {
                day: DAY_LABELS[day],
                hours: formatDayHours(info)
            }
        })
    }, [timing_guide])

    // Check if all days have the same hours (e.g., "open - open")
    const isAllDaysSame = useMemo(() => {
        if (dayHours.length === 0) return false
        const firstHours = dayHours[0].hours
        return dayHours.every((dayHour) => dayHour.hours === firstHours && dayHour.hours !== 'Closed' && dayHour.hours !== '-')
    }, [dayHours])

    // Get the common hours text if all days are the same
    const commonHoursText = useMemo(() => {
        if (!isAllDaysSame || dayHours.length === 0) return null
        const hours = dayHours[0].hours.toLowerCase()
        // Check if it's "open - open" or similar "open" pattern
        if (hours.includes('open') && hours.split('-').every((part) => part.trim().toLowerCase() === 'open')) {
            return 'Open all day'
        }
        // If all days have the same hours but not "open - open", return that hours value
        return dayHours[0].hours
    }, [isAllDaysSame, dayHours])

    return (
        <>
            <div
                className="w-full relative rounded-2xl bg-white flex flex-col items-start p-5 gap-4"
                style={{
                    boxShadow: '0px 2px 16px var(--color-grey-4, #e0e0e0)',
                    fontFamily: 'Red Hat Display'
                }}>
                {/* SELLING FAST badge */}
                {sellingFast && (
                    <div
                        className="absolute top-4 right-4 rounded-lg px-3 py-1 text-white uppercase font-bold text-xs tracking-wide"
                        style={{
                            background: 'linear-gradient(135deg, #e73434 0%, #e55a34 100%)',
                            fontFamily: 'Red Hat Display',
                            zIndex: 10
                        }}>
                        SELLING FAST
                    </div>
                )}

                {/* Header */}
                <div className="self-stretch flex flex-col items-start gap-1 mt-2">
                    <div
                        className="self-stretch relative font-semibold"
                        style={{
                            fontFamily: 'Red Hat Display',
                            fontSize: '16px',
                            lineHeight: '20px',
                            color: 'var(--color-grey-0, #101010)',
                            letterSpacing: '-0.01em'
                        }}>
                        {/* Find the best ticket for you */}
                        Hours of operation
                    </div>
                    {/* <div className="self-stretch flex items-center justify-between flex-wrap gap-x-5 gap-y-3">
                        <div
                            className="relative inline-block shrink-0"
                            style={{
                                fontFamily: 'Manrope',
                                fontSize: '12px',
                                color: 'var(--color-grey-2, #747474)',
                                lineHeight: '16px'
                            }}>
                            We've compared rates across platforms, so you don't have to!
                        </div>
                        <div className="flex items-center gap-1.5">
                            {platformLogos.map((logo, idx) => (
                                <img
                                    key={idx}
                                    src={logo.url}
                                    alt={logo.alt}
                                    className="h-5 w-5 object-cover rounded-sm"
                                />
                            ))}
                        </div>
                    </div> */}
                </div>

                {/* Date and Guests Input */}
                {/* <div className="self-stretch rounded-2xl bg-white border border-feature-card-border flex flex-col items-start overflow-hidden">
                    <div className="self-stretch border-b border-feature-card-border flex items-center">
                        <button
                            type="button"
                            onClick={() => setIsWhenOpen(true)}
                            className="flex-1 border-r border-feature-card-border flex flex-col items-start py-3 px-4 gap-2 text-left cursor-pointer hover:bg-grey-5 transition-colors">
                            <div
                                className="self-stretch relative uppercase tracking-wider"
                                style={{
                                    fontFamily: 'Red Hat Display',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: 'var(--color-grey-2, #747474)',
                                    lineHeight: '16px'
                                }}>
                                DATE
                            </div>
                            <div
                                className="self-stretch relative font-semibold"
                                style={{
                                    fontFamily: 'Manrope',
                                    fontSize: '16px',
                                    color: selectedDate ? 'var(--color-grey-0, #101010)' : 'var(--color-grey-3, #aeaeae)',
                                    letterSpacing: '-0.02em'
                                }}>
                                {selectedDate ? formatDisplayDate(selectedDate) : 'Add date'}
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsGuestsOpen(true)}
                            className="flex-1 flex flex-col items-start py-3 px-4 gap-2 text-left cursor-pointer hover:bg-grey-5 transition-colors">
                            <div
                                className="self-stretch relative uppercase tracking-wider"
                                style={{
                                    fontFamily: 'Red Hat Display',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: 'var(--color-grey-2, #747474)',
                                    lineHeight: '16px'
                                }}>
                                GUESTS
                            </div>
                            <div
                                className="self-stretch relative font-semibold"
                                style={{
                                    fontFamily: 'Manrope',
                                    fontSize: '16px',
                                    color: 'var(--color-grey-0, #101010)',
                                    letterSpacing: '-0.02em'
                                }}>
                                {guestsSummary}
                            </div>
                        </button>
                    </div>
                </div> */}

                {/* FIND BEST OPTION Button */}
                {/* <button
                    type="button"
                    onClick={handleFindBestOption}
                    disabled={!selectedDate}
                    className={`self-stretch rounded-xl flex items-center justify-center py-4 px-2.5 gap-2.5 text-white transition-opacity ${
                        !selectedDate ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'
                    }`}
                    style={{
                        background: 'linear-gradient(88.98deg, var(--color-primary-default, #7011F6) 0%, var(--color-primary-dark, #4D1D91) 100%)',
                        fontFamily: 'Red Hat Display',
                        fontSize: '14px',
                        fontWeight: 700,
                        letterSpacing: '-0.01em',
                        lineHeight: '16px'
                    }}>
                    <Sparkles className="h-4 w-4" />
                    <span>FIND BEST OPTION</span>
                </button> */}

                {/* Suggestion Box */}
                {/* <div
                    className="self-stretch rounded-xl flex items-center p-2 gap-2"
                    style={{
                        backgroundColor: 'var(--color-grey-5, #f8f8f8)',
                        border: '1px solid var(--color-secondary-blue, #1588cf)'
                    }}>
                    <Lightbulb
                        className="h-8 w-8 shrink-0"
                        style={{ color: 'var(--color-secondary-yellow, #cdae00)' }}
                    />
                    <div className="flex-1 flex flex-col items-start gap-1">
                        <div
                            className="self-stretch relative font-semibold"
                            style={{
                                fontFamily: 'Red Hat Display',
                                fontSize: '14px',
                                color: 'var(--color-grey-0, #101010)',
                                lineHeight: '18px'
                            }}>
                            Don't miss out!
                        </div>
                        <div
                            className="self-stretch relative font-medium"
                            style={{
                                fontFamily: 'Manrope',
                                fontSize: '14px',
                                color: 'var(--color-grey-2, #747474)',
                                lineHeight: '18px'
                            }}>
                            We suggest booking 3 months in advance
                        </div>
                    </div>
                </div> */}

                {/* Divider */}
                {/* <div className="self-stretch h-px bg-grey-4" /> */}

                {/* Hours of operation */}
                <div className="self-stretch flex flex-col gap-2">
                    <button
                        type="button"
                        disabled={true}
                        // onClick={() => setIsHoursExpanded(!isHoursExpanded)}
                        className="self-stretch flex items-center justify-between gap-5 cursor-pointer hover:opacity-70 transition-opacity">
                        {/* <div
                            className="relative font-semibold"
                            style={{
                                fontFamily: 'Red Hat Display',
                                fontSize: '16px',
                                color: 'var(--color-grey-0, #101010)',
                                lineHeight: '20px',
                                letterSpacing: '-0.01em'
                            }}>
                            Hours of operation
                        </div> */}
                        {/* {isHoursExpanded ? (
                            <ChevronUp
                                className="h-6 w-6"
                                style={{ color: 'var(--color-grey-2, #747474)' }}
                            />
                        ) : (
                            <ChevronDown
                                className="h-6 w-6"
                                style={{ color: 'var(--color-grey-2, #747474)' }}
                            />
                        )} */}
                    </button>
                    {/* Hours content */}
                    {/* {!isHoursExpanded ? ( */}
                    <div className="self-stretch flex flex-col gap-2">
                        {isAllDaysSame && commonHoursText ? (
                            <div
                                className="self-stretch flex items-start justify-between gap-5"
                                style={{
                                    fontFamily: 'Manrope',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: 'var(--color-grey-1, #363636)',
                                    letterSpacing: '-0.02em'
                                }}>
                                <div>All days</div>
                                <div>{commonHoursText}</div>
                            </div>
                        ) : (
                            dayHours.map((dayHour, idx) => (
                                <div
                                    key={idx}
                                    className="self-stretch flex items-start justify-between gap-5"
                                    style={{
                                        fontFamily: 'Manrope',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        color: 'var(--color-grey-1, #363636)',
                                        letterSpacing: '-0.02em'
                                    }}>
                                    <div>{dayHour.day}</div>
                                    <div>{dayHour.hours}</div>
                                </div>
                            ))
                        )}
                        <button
                            type="button"
                            onClick={async () => {
                                if (onBestTimeToVisit) {
                                    onBestTimeToVisit()
                                } else {
                                    // Trigger assistant prompt with best time to visit question
                                    await triggerAssistantPrompt('What is the best time to visit?')
                                }
                            }}
                            className="mt-2 self-stretch rounded-3xl bg-white flex items-center justify-start gap-3 py-[6px] px-3 cursor-pointer hover:opacity-90 transition-opacity border border-grey-4 w-fit">
                            <Sparkles
                                className="h-[14px] w-[14px] shrink-0"
                                style={{ color: 'var(--color-primary-default, #7011F6)' }}
                            />
                            <span className="text-grey-0 text-[14px] leading-[18px] font-[467]">When is the best time to visit?</span>
                        </button>
                    </div>
                    {/* ) : ( firstVisibleDay && ( */}
                    {/* <div
                        className="self-stretch flex items-start justify-between gap-5"
                        style={{
                            fontFamily: 'Manrope',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: 'var(--color-grey-1, #363636)',
                            letterSpacing: '-0.02em'
                        }}>
                        <div>{firstVisibleDay.day}</div>
                        <div>{firstVisibleDay.hours}</div>
                    </div> */}
                    {/* ))} */}
                </div>
            </div>

            {/* Modals */}
            <div className={`absolute ${isWhenOpen ? 'left-[60px] top-[230px]' : 'right-[210px] top-[300px]'}`}>
                <WhenModal
                    isOpen={isWhenOpen}
                    onClose={() => setIsWhenOpen(false)}
                    selectedDates={selectedDates}
                    currentMonth={currentMonth}
                    slideDirection={slideDirection}
                    onDateClick={onDateClick}
                    onNavigateMonth={onNavigateMonth}
                    isPrevDisabled={isPrevDisabled}
                    type="date_range"
                />
                <GuestsModal
                    isOpen={isGuestsOpen}
                    onClose={() => setIsGuestsOpen(false)}
                    initialData={guests}
                    onApply={onApplyGuests}
                />
            </div>
        </>
    )
}

export default ExperienceFindBestTicketSection
