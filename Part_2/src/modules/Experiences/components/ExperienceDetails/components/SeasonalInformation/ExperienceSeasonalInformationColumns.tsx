import Divider from '@/components/shared/Divider/Divider'
import { cn } from '@/lib/utils'
import { CalendarCheck, CloudSun, Users, Flame, TrendingUp, LucideIcon } from 'lucide-react'
import { Fragment } from 'react'

export type SeasonalColumn = {
    title: string
    icon: string
    description?: string
    chip_title: string
    chip_color: string
}

const iconMap: Record<string, LucideIcon> = {
    calendar: CalendarCheck,
    weather: CloudSun,
    crowd: Users,
    peak: Flame,
    price: TrendingUp
}

const Pill = ({ text, color }: { text: string; color: string }) => (
    <div
        className={cn(
            'inline-flex items-center justify-center rounded-full px-3 py-[2px]',
            'text-white font-bold text-[12px] leading-[14px] tracking-[0.02em]',
            color
        )}>
        {text}
    </div>
)

const ExperienceSeasonalInformationColumns = ({ columns }: { columns: SeasonalColumn[] }) => {
    return (
        <div className="flex items-stretch w-full">
            {columns.map((col, index) => {
                const Icon = iconMap[col.icon] ?? CalendarCheck
                const chipText = col.chip_title || 'Data not available'
                const chipColor = col.chip_color || 'bg-grey-3'
                const isFirst = index === 0
                return (
                    <Fragment key={col.title}>
                        {/* Divider only between items, not before the first */}
                        {!isFirst && (
                            <Divider
                                variant="vertical"
                                className="mx-4 self-stretch shrink-0"
                            />
                        )}
                        <div className="flex-1 flex flex-col gap-1 rounded-md  h-full">
                            <Icon className="h-4 w-4 text-grey-0" />

                            <div className="flex flex-row items-start justify-between gap-2">
                                <p className="text-[14px] tracking-[0.01em] font-medium font-red-hat-display text-gray text-left inline-block">
                                    {col.title}
                                </p>
                                <Pill
                                    text={chipText}
                                    color={chipColor}
                                />
                            </div>
                        </div>
                    </Fragment>
                )
            })}
        </div>
    )
}

export default ExperienceSeasonalInformationColumns
