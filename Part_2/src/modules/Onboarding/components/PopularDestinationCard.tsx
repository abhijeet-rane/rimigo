import Typography from '@/components/shared/Typography'
import React from 'react'

interface PopularDestinationCardProps {
    title: string
    subtitle?: string
    imageUrl: string
}

export const PopularDestinationCard: React.FC<PopularDestinationCardProps> = ({ title, subtitle, imageUrl }) => {
    return (
        <div className="flex items-start p-3 bg-natural-white border border-grey-4 gap-3 rounded-[var(--radius-lg)]">
            {/* Image */}
            <img
                src={imageUrl}
                alt={title}
                className="w-16 h-16 rounded-lg object-cover"
            />

            {/* Text Column */}
            <div className="flex flex-col flex-1 gap-1">
                <Typography
                    family="redhat"
                    weight="semibold"
                    size="16"
                    color="grey-0"
                    textAlign="left">
                    {title}
                </Typography>
                <Typography
                    family="manrope"
                    weight="medium"
                    size="14"
                    color="grey-2"
                    textAlign="left">
                    {subtitle}
                </Typography>
            </div>
        </div>
    )
}
