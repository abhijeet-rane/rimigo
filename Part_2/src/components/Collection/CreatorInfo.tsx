import React from 'react'
import { Creator } from './types'
import Typography from '@/components/shared/Typography'
import { cn } from '@/lib/utils'
import CreatorAvatar from './CreatorAvatar'

interface CreatorInfoProps {
    creator: Creator
    className?: string
    cityName?: string
}

const CreatorInfo: React.FC<CreatorInfoProps> = ({ creator, className, cityName }) => {
    return (
        <div className={cn('flex flex-col gap-1 px-4 py-3 rounded-t-[16px] bg-grey-5', className)}>
            {/* Profile Picture and Name */}
            <div className="flex items-center gap-3">
                <CreatorAvatar
                    name={creator.name}
                    imageUrl={creator.profileImage}
                    isRimigo={creator.isRimigo}
                    size={48}
                />
                <div className="flex flex-col gap-2 justify-center">
                    {/* Mobile: name on row 1, the "• [IG] @handle" row drops
                        to row 2 so a long creator name doesn't fight the
                        Instagram strip for width. Desktop keeps the
                        single-line layout. */}
                    <div className="flex flex-col md:flex-row md:gap-0.5 md:items-center">
                        <Typography
                            size="16"
                            weight="bold"
                            family="manrope"
                            color="grey-0"
                            className="leading-5">
                            {creator.name}
                        </Typography>
                        <p className="text-grey-2 text-[14px] leading-4 tracking-[-2%] font-manrope font-[645] flex items-center gap-1 font-red-hat-display">
                            {creator.handle}
                        </p>
                    </div>
                    {(creator.lastVisited.month || creator.lastVisited.year) && (
                        <p className="text-grey-0 text-[14px] leading-4 tracking-[-4%] font-manrope font-[600] ">
                            {' '}
                            {creator.lastVisited.month && creator.lastVisited.year
                                ? `last visited ${cityName || ''} in ${creator.lastVisited.month} ${creator.lastVisited.year}`
                                : creator.lastVisited.year
                                  ? `last visited ${cityName || ''} in ${creator.lastVisited.year}`
                                  : ''}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default CreatorInfo
