import React from 'react'
import { CollectionCardProps } from './types'
import CreatorInfo from './CreatorInfo'
import CollectionItemCard from './CollectionItemCard'
import Typography from '@/components/shared/Typography'
import { ChevronRight } from 'lucide-react'

const CollectionCard: React.FC<CollectionCardProps> = ({ collection, onViewAll, onItemClick, titleLines = 2, compact = false }) => {
    const { creator, title, items } = collection

    const handleViewAll = () => {
        onViewAll?.(collection.id)
    }

    const handleItemClick = (itemId: string) => {
        onItemClick?.(collection.id, itemId)
    }

    // Ensure we have exactly 4 items for the 2x2 grid
    const displayItems = items.slice(0, 4)

    return (
        <div className="flex flex-col items-center ">
            {/* Main Card */}
            <div className="bg-natural-white max-md:mt-[20px] rounded-2xl border border-grey-4 hover:shadow-[0px_2px_8px_0px_rgba(224,224,224,1)] w-full flex flex-col gap-2 sm:gap-3 md:gap-4  pb-8">
                {/* Header Section */}
                <div className="flex flex-col gap-1 ">
                    {/* Creator Info - Only show if creator exists */}
                    {creator && <CreatorInfo creator={creator} />}

                    {/* Collection Title — clamped to a fixed line count with a
                        reserved min-height so shorter titles occupy the same
                        vertical space. Keeps every card in a row the same
                        height regardless of title length. Overflow truncates
                        with an ellipsis. */}
                    <p
                        className={`text-[16px] leading-[28px] px-4 font-[550] font-red-hat-display text-grey-0 ${titleLines === 1 ? 'line-clamp-1 min-h-[28px]' : 'line-clamp-2 min-h-[56px]'} ${!creator ? 'pt-4' : ''}`}>
                        {title}
                    </p>
                </div>

                {/* Items Grid (2x2) */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 px-4">
                    {displayItems.map((item, index) => (
                        <CollectionItemCard
                            key={item.id || index}
                            item={item}
                            onClick={() => handleItemClick(item.id)}
                            imageHeightClassName={
                                compact ? 'h-[88px] xs:h-[98px] sm:h-[104px] md:h-[96px] lg:h-[104px]' : undefined
                            }
                        />
                    ))}
                </div>
            </div>

            {/* View All Button */}
            <button
                onClick={handleViewAll}
                className="mt-[-14px] sm:mt-[-17px] bg-natural-white border border-grey-4 rounded-[21px] px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-1 hover:bg-grey-5 transition-colors cursor-pointer">
                <Typography
                    size="14"
                    weight="bold"
                    family="redhat"
                    color="primary-default"
                    className="text-[12px] leading-[18px] tracking-[-0.28px]">
                    VIEW
                </Typography>
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-primary-default" />
            </button>
        </div>
    )
}

export default CollectionCard
