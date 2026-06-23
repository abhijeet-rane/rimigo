import React from 'react'
import { Instagram } from 'lucide-react'
import Typography from '@/components/shared/Typography'
import type { CreatorStripProps } from './types'
import { cn } from '@/lib/utils'

function formatFollowers(num?: string | number): string {
  if (num === undefined || num === null || num === '') return ''
  const value = typeof num === 'number' ? num : Number(num)
  if (isNaN(value)) return ''
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B'
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (value >= 1_000) return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'k'
  return value.toString()
}

export const CreatorStrip: React.FC<CreatorStripProps> = ({
  imageUrl,
  name,
  tag,
  instagramHandle,
  instagramProfileUrl,
  followerCount,
  className,
  size = 'default'
}) => {
  const showInstagram = (instagramHandle ?? instagramProfileUrl) != null || followerCount != null
  const formattedFollowers = followerCount != null ? formatFollowers(followerCount) : ''
  const isLarge = size === 'large'

  return (
    <div
      className={cn(
        'flex items-center rounded-full border border-grey-4 bg-grey-5 w-fit',
        isLarge ? 'gap-3 px-2 pr-3 py-0.5' : 'gap-2 px-1 pr-2',
        className
      )}
    >
      <div
        className={cn(
          'rounded-full overflow-hidden shrink-0 border border-grey-4 bg-grey-5',
          isLarge ? 'w-7 h-7' : 'w-5.5 h-5.5'
        )}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Typography size={isLarge ? '18' : '14'} weight="semibold" color="grey-2">
              {name.charAt(0).toUpperCase()}
            </Typography>
          </div>
        )}
      </div>
      <div className="flex flex-col min-w-0">
        <Typography size={isLarge ? '12' : '10'} weight="semibold" family="manrope" color="grey-0">
          {name}
        </Typography>
        {tag != null && tag !== '' && (
          <Typography size={isLarge ? '10' : '9'} weight="medium" family="manrope" color="grey-2">
            {tag}
          </Typography>
        )}
      </div>
      {showInstagram && (formattedFollowers !== '' || instagramHandle != null || instagramProfileUrl != null) && (
        <>
          <div className={cn('w-px bg-grey-4 shrink-0', isLarge ? 'h-6' : 'h-5')} aria-hidden />
          <div className="flex items-center gap-1 shrink-0">
            {instagramProfileUrl ? (
              <a
                href={instagramProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-grey-1 hover:text-primary-default transition-colors"
                aria-label="Instagram profile"
              >
                <Instagram className={isLarge ? 'w-4 h-4' : 'w-3 h-3'} />
              </a>
            ) : (
              <Instagram className={cn('text-grey-1', isLarge ? 'w-4 h-4' : 'w-3 h-3')} aria-hidden />
            )}
            {formattedFollowers !== '' && (
              <Typography size={isLarge ? '12' : '10'} weight="semibold" family="manrope" color="grey-1">
                {formattedFollowers}
              </Typography>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default CreatorStrip
