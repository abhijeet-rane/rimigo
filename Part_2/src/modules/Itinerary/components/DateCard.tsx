import Typography from '@/components/shared/Typography'
import clsx from 'clsx'
import { Map as MapIcon } from 'lucide-react'

interface DateCardProps {
    date: Date
    isToday: boolean
    dayNumber: number
    isSelected?: boolean
    onClick?: () => void
    cityName?: string | null
    onMapClick?: () => void
    hideExactDates?: boolean
}

export const DateCard: React.FC<DateCardProps> = ({ date, dayNumber, isSelected = false, onClick, cityName, onMapClick, hideExactDates = false }) => {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
    const day = date.getDate()
    const month = date.toLocaleDateString('en-US', { month: 'short' })

    const getOrdinal = (n: number) => {
        if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`
        switch (n % 10) {
            case 1:
                return `${n}st`
            case 2:
                return `${n}nd`
            case 3:
                return `${n}rd`
            default:
                return `${n}th`
        }
    }

    return (
        <div
            onClick={onClick}
            className={clsx(
                'group/header flex flex-col hover:bg-primary-default-08 w-full py-2 pb-3 overflow-hidden transition-all',
                'cursor-pointer',
                isSelected ? 'bg-cream-1 border-l-4 border-primary-default px-3' : 'bg-white px-3'
            )}>
            {/* Line 1: Day N • Weekday, Ordinal Month */}
            <div className="flex items-center gap-1.5">
                <Typography
                    size="13"
                    weight="bold"
                    family="redhat"
                    color={isSelected ? 'primary' : 'grey-0'}>
                    Day {dayNumber}
                </Typography>
                {!hideExactDates && (
                    <>
                        <span className="text-grey-2 text-[13px] font-redhat">•</span>
                        <Typography
                            size="13"
                            weight="medium"
                            family="redhat"
                            color={isSelected ? 'primary' : 'grey-1'}>
                            {dayName}, {getOrdinal(day)} {month}
                        </Typography>
                    </>
                )}
            </div>

            {/* Line 2: City name + map icon beside city */}
            <div className="flex items-center gap-1.5 mt-0.5">
                {cityName && (
                    <Typography
                        size="12"
                        weight="medium"
                        family="manrope"
                        color="grey-2">
                        {cityName}
                    </Typography>
                )}

                {onMapClick && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onMapClick()
                        }}
                        className="w-5 h-5 rounded-md bg-primary-default/10 hover:bg-primary-default/20 flex items-center justify-center transition-all cursor-pointer shrink-0"
                        title="View on map">
                        <MapIcon size={11} className="text-primary-default" />
                    </button>
                )}
            </div>
        </div>
    )
}
