import React from 'react'
import { Instagram } from 'lucide-react'
import Typography from '@/components/shared/Typography'
import { cn } from '@/lib/utils'
import type { Creator } from '@/components/Collection/types'

interface CollectionCreatorInfoProps {
    creator: Creator
    cityName?: string
    className?: string
}

const formatFollowers = (followers: string): string => {
    if (!followers) return ''

    // Remove any non-numeric characters except decimal point
    const numStr = followers.replace(/[^\d.]/g, '')
    const num = parseFloat(numStr)

    if (isNaN(num)) return followers

    if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)} million`
    } else if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
}

const CollectionCreatorInfo: React.FC<CollectionCreatorInfoProps> = ({ creator, cityName, className }) => {
    const formattedFollowers = creator.instagramFollowers ? formatFollowers(creator.instagramFollowers) : null
    const lastVisitedText =
        creator.lastVisited.month && creator.lastVisited.year
            ? `last visited ${cityName || ''} in ${creator.lastVisited.month} ${creator.lastVisited.year}`
            : creator.lastVisited.year
              ? `last visited ${cityName || ''} in ${creator.lastVisited.year}`
              : null

    return (
        <div className={cn('flex flex-col gap-1', className)}>
            {/* Profile Picture and Name */}
            <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-grey-4 overflow-hidden shrink-0">
                    {creator.profileImage ? (
                        <img
                            src={creator.profileImage}
                            alt={creator.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-grey-4" />
                    )}
                </div>
                <div className="flex flex-col gap-2 justify-center flex-1">
                    {/* First Row: Name • Instagram handle */}
                    <div className="flex flex-row gap-0.5 items-center flex-wrap">
                        <Typography
                            size="16"
                            weight="bold"
                            family="manrope"
                            color="grey-0"
                            className="leading-5">
                            {creator.name}
                        </Typography>
                        {/* <span className="text-grey-2">•</span> */}
                        <div className="flex items-center gap-1">
                            {/* <img
                                src={INSTAGRAM_ICON}
                                alt="Instagram"
                                className="w-4 h-4 text-primary-default"
                            /> */}
                            <Typography
                                size="14"
                                weight="medium"
                                family="manrope"
                                color="grey-2"
                                className="leading-4 tracking-[-2%]">
                                {creator.handle}
                            </Typography>
                        </div>
                    </div>

                    {/* Second Row: Instagram followers • last visited */}
                    {(formattedFollowers || lastVisitedText) && (
                        <div className="flex flex-row gap-0.5 items-center flex-wrap">
                            {formattedFollowers && (
                                <>
                                    <div className="flex items-center gap-1">
                                        <Instagram className="w-4 h-4 text-primary-default" />
                                        <Typography
                                            size="14"
                                            weight="semibold"
                                            family="manrope"
                                            color="grey-0"
                                            className="leading-4">
                                            {formattedFollowers} followers
                                        </Typography>
                                    </div>
                                    {lastVisitedText && <span className="text-grey-2">•</span>}
                                </>
                            )}
                            {lastVisitedText && (
                                <Typography
                                    size="14"
                                    weight="medium"
                                    family="manrope"
                                    color="grey-0"
                                    className="leading-4 tracking-[-4%]">
                                    {lastVisitedText}
                                </Typography>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default CollectionCreatorInfo
