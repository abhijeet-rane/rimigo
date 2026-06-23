import React from 'react'
import { CollectionCardVerticalCTA } from './CollectionCardVerticalCTA'
import type { CollectionCtaCardProps } from './types'
import { cn } from '@/lib/utils'

export interface CollectionCardVerticalCTAListItem extends CollectionCtaCardProps {
  id?: string | number
}

export interface CollectionCardVerticalCTAListProps {
  items: CollectionCardVerticalCTAListItem[]
  className?: string
  cardClassName?: string
  getItemKey?: (item: CollectionCardVerticalCTAListItem, index: number) => React.Key
}

export const CollectionCardVerticalCTAList: React.FC<CollectionCardVerticalCTAListProps> = ({
  items,
  className,
  cardClassName,
  getItemKey
}) => {
  if (!items?.length) return null

  return (
    <div className={cn('grid grid-cols-1 auto-rows-fr gap-6 md:gap-10 lg:gap-x-20 place-items-center md:grid-cols-2 lg:grid-cols-3', className)}>
      {items.map((item, index) => {
        const { id, ...cardProps } = item
        const key = getItemKey?.(item, index) ?? id ?? `${item.title}-${index}`
        return (
          <div key={key} className="w-full flex justify-center">
            <CollectionCardVerticalCTA
              {...cardProps}
              className={cn('h-full w-full', item.className, cardClassName)}
              fillWidth={item.fillWidth ?? true}
            />
          </div>
        )
      })}
    </div>
  )
}

export default CollectionCardVerticalCTAList
