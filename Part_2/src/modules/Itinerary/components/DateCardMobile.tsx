import Typography from '@/components/shared/Typography'
import clsx from 'clsx'
import { getDateCardParts } from '../utils/ItineraryUtils'

interface DateCardMobileProps {
    date: Date
    isToday?: boolean
    dayNumber: number
    isSelected?: boolean
    onClick?: () => void
    hideExactDates?: boolean
}

export const DateCardMobile: React.FC<DateCardMobileProps> = ({ date, dayNumber, isToday = false, isSelected = false, onClick, hideExactDates = false }) => {
    const { dayName, monthName, day } = getDateCardParts(date)

    // Compact pill layout when exact dates are hidden
    if (hideExactDates) {
        return (
            <div className="px-1.5 py-2">
                <div
                    onClick={onClick}
                    className={clsx(
                        'flex items-center justify-center px-3 py-2 rounded-full cursor-pointer transition-all',
                        isSelected
                            ? 'bg-grey-0 shadow-sm'
                            : 'bg-grey-5 hover:bg-grey-4'
                    )}>
                    <Typography
                        size="11"
                        weight="bold"
                        family="redhat"
                        color={isSelected ? 'white' : 'grey-1'}
                        className="tracking-wide whitespace-nowrap">
                        Day {dayNumber}
                    </Typography>
                </div>
            </div>
        )
    }

    return (
        <div className="px-4 py-2">
            <div
                onClick={onClick}
                className={clsx(
                    'flex flex-col w-full text-center items-center transition-all cursor-pointer',
                    'rounded-[12px] shadow-sm overflow-hidden',
                    isToday && 'bg-white border-2 border-primary-default',
                    isSelected && !isToday && 'bg-grey-0 border-2 border-[#6D4AFF]',
                    !isToday && !isSelected && 'bg-white border-2 border-grey-4 hover:border-grey-300'
                )}>
                {/* Day Label */}
                <div className={clsx('w-full py-0.5 px-[10px] leading-none', isToday ? 'bg-white' : isSelected ? 'bg-grey-1' : 'bg-grey-4')}>
                    <Typography
                        size="10"
                        weight="extrabold"
                        family="redhat"
                        color={isToday || isSelected ? 'white' : 'grey-600'}
                        className="tracking-wider">
                        DAY {dayNumber}
                    </Typography>
                </div>

                {/* Date Content */}
                <div className="flex flex-col items-center py-2 pt-1 gap-0.5">
                    {/* Date Number */}
                    <Typography
                        size="28"
                        weight="bold"
                        family="redhat"
                        color={isSelected && !isToday ? 'white' : 'grey-0'}>
                        {day}
                    </Typography>

                    {/* Month */}
                    <Typography
                        size="11"
                        weight="bold"
                        family="redhat"
                        color={isSelected && !isToday ? 'white' : 'grey-0'}>
                        {monthName}
                    </Typography>

                    {/* Day of Week */}
                    <Typography
                        size="12"
                        weight="bold"
                        family="redhat"
                        color={isSelected && !isToday ? 'grey-3' : 'grey-2'}
                        className="tracking-wide">
                        {dayName}
                    </Typography>
                </div>
            </div>
        </div>
    )
}
