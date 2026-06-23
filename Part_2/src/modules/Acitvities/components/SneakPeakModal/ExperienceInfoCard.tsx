import React from 'react'
import { LucideIcon } from 'lucide-react'

interface InfoCardData {
    value: string
    description: string
}

interface ExperienceInfoCardProps {
    icon: LucideIcon
    title: string
    data: InfoCardData | null
    badge?: {
        value: string
        color: 'green' | 'yellow' | 'orange' | 'red' | 'gray'
    }
    className?: string
}

const badgeColorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    gray: 'bg-gray-500'
}

const ExperienceInfoCard: React.FC<ExperienceInfoCardProps> = ({ icon: Icon, title, data, badge, className = '' }) => {
    if (!data) return null

    return (
        <div className={`flex items-start gap-3 p-3 h-full ${className}`}>
            <Icon className="w-4 h-4 text-grey-0 mt-0.5 shrink-0" />
            <div className="flex-1 flex flex-col gap-2 items-start justify-start h-full">
                <p className="text-[14px] font-medium font-red-hat-display leading-[18px] text-grey-0">{title}</p>
                {badge ? (
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white uppercase ${badgeColorClasses[badge.color]}`}>
                            {badge.value}
                        </span>
                    </div>
                ) : (
                    <p className="text-lg font-semibold text-grey-0">{data.value}</p>
                )}
                <div className="flex-1 flex flex-col">
                    <p className="text-[12px] font-medium font-manrope leading-[18px] text-grey-2">{data.description}</p>
                </div>
            </div>
        </div>
    )
}

export default ExperienceInfoCard
