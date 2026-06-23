import React from 'react'
import ImageStack from '@/pages/Stays/HotelDetail/components/ImageStack'
import type { TripOverviewSectionProps, TripOverviewItem } from './types'
import { cn } from '@/lib/utils'


const DEFAULT_LABEL = 'Their trip overview'

export const TripOverviewSection: React.FC<TripOverviewSectionProps> = ({
  items,
  columns,
  label = DEFAULT_LABEL,
  className,
  compact
}) => {
  const gridColumnsClass = columns === 4
    ? 'grid-cols-2 md:grid-cols-4'
    : 'grid-cols-2'
  const labelClassNames = compact
    ? 'rounded-b-xl rounded-t-none px-2.5 py-1 font-red-hat-display text-xs font-semibold shadow-sm bg-primary-light-80 text-primary-dark mb-2'
    : 'rounded-b-2xl rounded-t-none px-3 py-1.5 font-red-hat-display text-sm font-semibold shadow-sm bg-primary-light-80 text-primary-dark mb-3'
  const bodyClassNames = compact
    ? 'grid gap-2 px-3 pb-3 pt-3'
    : 'grid gap-3 md:gap-4 px-3 pt-4 pb-4'
  const containerClassNames = compact
    ? 'relative flex flex-col rounded-2xl border border-primary-light-80 bg-white overflow-hidden'
    : 'relative flex flex-col rounded-2xl border border-primary-light-80 bg-white overflow-hidden shadow-[0px_6px_20px_rgba(124,58,237,0.08)]'

  return (
    <div
      className={cn(containerClassNames, className)}
    >
      <div className="flex justify-center">

        <span className={labelClassNames}>{label}</span>
      </div>
      <div className={cn(bodyClassNames, gridColumnsClass)}>
        {items.map((item, index) => (
          <TripOverviewCell key={item.id ?? index} item={item} />
        ))}
      </div>
    </div>
  )
}

function TripOverviewCell({ item }: { item: TripOverviewItem }) {
  const isAccent = item.accentCell === true
  const accentWithImage = isAccent && item.imageUrl

  return (
    <div
      className={cn(
        'flex w-full min-w-0 items-center gap-2 rounded-2xl border border-transparent px-1 py-0.5 bg-grey-5',
      )}
    >
      {accentWithImage ? (
        <img
          src={item.imageUrl}
          alt=""
          className="h-10 w-10 shrink-0 object-contain"
        />
      ) : (
        <>
          {item.imageUrls && item.imageUrls.length > 0 ? (
            <div
              className="relative w-10 h-10 shrink-0 flex items-center justify-center"
              aria-label="Trip overview images"
            >
              <div
                className="absolute flex items-center justify-center origin-center"
                style={{
                  width: 80,
                  height: 80,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%) scale(0.5)'
                }}
              >
                <div className="[&_img]:aspect-square [&_img]:object-center">
                  <ImageStack
                    images={item.imageUrls.slice(0, 3).map((link) => ({ link }))}
                  />
                </div>
              </div>
            </div>
          ) : item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt=""
              className="h-10 w-10 shrink-0 object-cover rounded-lg"
            />
          ) : item.icon ? (
            <span
              className="flex shrink-0 items-center justify-center [&>svg]:w-5 [&>svg]:h-5"
            >
              {item.icon}
            </span>
          ) : (
            <div className="h-10 w-10 shrink-0 rounded-lg bg-grey-4" />
          )}
        </>
      )}
      <div className="min-w-0 flex-1">
        {item.count != null ? (
          <div className="flex items-center justify-start gap-1.5 font-manrope text-sm font-semibold text-grey-1 leading-tight whitespace-nowrap pl-0.5">
            <span className="text-base font-bold leading-tight">{item.count}</span>
            <span className="leading-tight">{formatCountLabel(item.label, item.count)}</span>
          </div>
        ) : (
          <div className="flex items-center justify-start font-manrope text-sm font-semibold text-grey-1 leading-tight whitespace-nowrap">
            {renderStandaloneLabel(item.label)}
          </div>
        )}
      </div>
    </div>
  )
}

function formatCountLabel(label: string, count: number) {
  if (count === 1) {
    const lower = label.toLowerCase()
    let singular: string | undefined
    if (lower.endsWith('ies')) {
      singular = `${label.slice(0, -3)}y`
    } else if (lower.endsWith('s')) {
      singular = label.slice(0, -1)
    }
    if (singular) {
      const firstChar = label.charAt(0)
      const isAlphabetic = /[a-zA-Z]/.test(firstChar)
      const isCapitalized = isAlphabetic && firstChar === firstChar.toUpperCase()
      if (isCapitalized) {
        return singular.charAt(0).toUpperCase() + singular.slice(1)
      }
      return singular
    }
  }
  return label
}

function renderStandaloneLabel(label: string): React.ReactNode {
  return <span className="leading-tight">{label}</span>
}

export default TripOverviewSection
