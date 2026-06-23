import React from 'react'
import { CollectionItem } from './types'
import { cn } from '@/lib/utils'

interface CollectionItemCardProps {
    item: CollectionItem
    onClick?: () => void
    className?: string
    /** Override the responsive image-tile height (e.g. compact carousels). */
    imageHeightClassName?: string
}

const CollectionItemCard: React.FC<CollectionItemCardProps> = ({
    item,
    onClick,
    className,
    imageHeightClassName = 'h-[120px] xs:h-[140px] sm:h-[160px] md:h-[180px]'
}) => {
    return (
        <div
            className={cn('relative group cursor-pointer', className)}
            onClick={onClick}>
            {/* Image Container */}
            <div className={cn('relative w-full rounded-xl overflow-hidden bg-grey-4', imageHeightClassName)}>
                {item.image ? (
                    <img
                        src={item.image}
                        alt={item.category}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full bg-grey-4" />
                )}

                {/* Category Badge — graceful skip when neither the label
                    nor the icon is available (the country-scoped
                    `getCollectionList` doesn't surface per-image
                    categories, so callers may pass empty strings; in
                    that case render the bare tile rather than an empty
                    white pill). */}
                {(item.category || item.categoryIcon) && (
                    <div className="absolute top-4 left-4 bg-natural-white rounded-[18px] px-2 py-1 flex items-center gap-1">
                        {item.categoryIcon && (
                            <div className="w-4 h-4 relative shrink-0">
                                <img
                                    src={item.categoryIcon}
                                    alt=""
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        )}
                        {item.category && (
                            <span
                                className="text-[12px] font-[600] text-grey-0 leading-4 tracking-[-0.24px]"
                                style={{ fontFamily: 'var(--font-manrope)' }}>
                                {item.category}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export default CollectionItemCard
