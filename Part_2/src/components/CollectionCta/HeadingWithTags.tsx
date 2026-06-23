import React from 'react'
import type { HeadingWithTagsProps } from './types'
import { cn } from '@/lib/utils'

export const HeadingWithTags: React.FC<HeadingWithTagsProps> = ({
  title,
  tags,
  className,
  size = 'default'
}) => {
  const isLarge = size === 'large'
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <h2
        className={cn(
          'font-semibold font-red-hat-display text-grey-0 tracking-[-0.02em] leading-tight',
          isLarge ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
        )}
      >
        {title}
      </h2>
      {tags.length > 0 && (
        <div
          className={cn(
            'flex flex-wrap items-center gap-x-1.5 gap-y-1',
            isLarge ? 'text-base' : 'text-sm'
          )}
        >
          {tags.map((tag, index) => (
            <React.Fragment key={index}>
              {index > 0 && (
                <span className="text-grey-2 font-red-hat-display" aria-hidden>
                  •
                </span>
              )}
              {tag.pill ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-grey-4 bg-white px-2.5 py-0.5 font-manrope font-medium text-grey-0">
                  {tag.icon}
                  <span>{tag.text}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-manrope font-medium text-grey-2">
                  {tag.icon}
                  <span>{tag.text}</span>
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}

export default HeadingWithTags
