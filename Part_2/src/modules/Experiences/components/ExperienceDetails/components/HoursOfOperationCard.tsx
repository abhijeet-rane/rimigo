import { useMemo } from 'react'
import { AdaptedExperienceDetailsType } from '../../../types'

type DayInfo = {
    start_time: string
    end_time: string
    description: string
    is_closed: boolean
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

interface HoursOfOperationCardProps {
    timing_guide?: AdaptedExperienceDetailsType['timing_guide']
}

const formatDayHours = (info: DayInfo | undefined): string => {
    if (!info) return 'Closed'
    if (info.is_closed) return 'Closed'
    return `${info.start_time} - ${info.end_time}`
}

const HoursOfOperationCard = ({ timing_guide }: HoursOfOperationCardProps) => {
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

    return (
        <div
            className="w-full  relative rounded-2xl bg-white flex flex-col items-start p-5 gap-4"
            style={{
                boxShadow: '0px 2px 16px var(--color-grey-4, #e0e0e0)',
                fontFamily: 'Red Hat Display'
            }}>
            {/* Header */}
            <div className="self-stretch flex flex-col items-start gap-1">
                <div
                    className="self-stretch relative font-semibold"
                    style={{
                        fontFamily: 'Red Hat Display',
                        fontSize: '16px',
                        lineHeight: '20px',
                        color: 'var(--color-grey-0, #101010)',
                        letterSpacing: '-0.01em'
                    }}>
                    Hours of operation
                </div>
            </div>

            {/* Hours List */}
            <div className="self-stretch flex flex-col items-start gap-2">
                {dayHours.map((item, index) => (
                    <div
                        key={index}
                        className="self-stretch flex items-center justify-between">
                        <div
                            style={{
                                fontFamily: 'Manrope',
                                fontSize: '14px',
                                color: 'var(--color-grey-1, #3e3e3e)',
                                lineHeight: '20px'
                            }}>
                            {item.day}
                        </div>
                        <div
                            style={{
                                fontFamily: 'Manrope',
                                fontSize: '14px',
                                color: 'var(--color-grey-2, #747474)',
                                lineHeight: '20px'
                            }}>
                            {item.hours}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default HoursOfOperationCard
