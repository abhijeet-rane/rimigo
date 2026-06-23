import React from 'react'
import { CreatorStrip } from './CreatorStrip'
import { HeadingWithTags } from './HeadingWithTags'
import { TripOverviewSection } from './TripOverviewSection'
import type { CollectionCtaCardProps } from './types'
import { cn } from '@/lib/utils'

const DEFAULT_CTA_LABEL = 'View tripboard'

export const CollectionCtaLandingCTA: React.FC<CollectionCtaCardProps> = ({
  creatorImageUrl,
  creatorName,
  creatorTag,
  instagramHandle,
  instagramProfileUrl,
  followerCount,
  title,
  tags,
  overviewItems,
  overviewColumns = 4,
  overviewLabel,
  portraitImageUrls,
  ctaLabel = DEFAULT_CTA_LABEL,
  onCtaClick,
  className,
  fillWidth,
  pricingBadge
}) => {
  const leftImages = portraitImageUrls?.slice(0, 3) ?? []
  const rightImages = portraitImageUrls?.slice(3, 6) ?? []
  const hasPortraitColumns = leftImages.length === 3 && rightImages.length === 3

  const cardWrapperClass = cn(
    'relative z-10 w-full rounded-2xl overflow-hidden shadow-sm',
    !fillWidth && 'max-w-3xl'
  )

  const contentInner = (
    <>
      <div className="flex justify-center">
        <CreatorStrip
          imageUrl={creatorImageUrl}
          name={creatorName}
          tag={creatorTag}
          instagramHandle={instagramHandle}
          instagramProfileUrl={instagramProfileUrl}
          followerCount={followerCount}
          size="large"
        />
      </div>

      <div className="flex flex-col gap-6">
        <HeadingWithTags title={title} tags={tags} size="large" className="items-center text-center" />

        <div className="mx-auto w-full max-w-3xl">
          <TripOverviewSection
            items={overviewItems}
            columns={overviewColumns}
            label={overviewLabel}
          />
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={onCtaClick}
            className="w-fit rounded-xl bg-[#1A1A1A] py-2.5 px-10 font-red-hat-display text-md font-semibold text-white tracking-[-0.02em] hover:opacity-90 transition-opacity cursor-pointer"
          >
            <span className="text-center">{ctaLabel}</span>
          </button>
        </div>
      </div>
    </>
  )

  const innerCard = (
    <div
      className={cn(
        'relative flex-1 w-full bg-white rounded-2xl border border-grey-4 flex overflow-hidden',
        hasPortraitColumns ? 'flex-row min-h-[420px]' : 'flex-col gap-10 p-4'
      )}
    >
          {pricingBadge && (
            <span
              className={cn(
                'absolute top-0 right-0 z-10 inline-flex items-center rounded-tr-2xl rounded-bl-lg px-3 py-1.5 text-base font-semibold uppercase tracking-wide text-white front-red-hat-display',
                pricingBadge === 'free'
                  ? 'bg-secondary-green'
                  : 'bg-primary-light'
              )}
            >
              {pricingBadge}
            </span>
          )}
          {hasPortraitColumns ? (
            <>
              {/* LEFT COLUMN */}
              <div className="relative shrink-0 w-36 self-stretch">
                <div className="absolute inset-y-0 right-0 flex flex-col justify-center gap-10 pr-2">

                  {/* TOP image — right aligned */}
                  <div className="overflow-visible flex justify-end">
                    <img
                      src={leftImages[0]}
                      alt=""
                      className="w-30 h-30 object-cover rounded-xl opacity-20 -translate-y-10"
                    />
                  </div>

                  {/* MIDDLE image — landscape */}
                  <img
                    src={leftImages[1]}
                    alt=""
                    className="w-28 h-25 object-cover rounded-xl opacity-20 -translate-x-8"
                  />

                  {/* BOTTOM image — right aligned */}
                  <div className="overflow-visible flex justify-end">
                    <img
                      src={leftImages[2]}
                      alt=""
                      className="w-24 h-24 object-cover rounded-xl opacity-20 translate-y-8"
                    />
                  </div>

                </div>
              </div>

              {/* CENTER CONTENT */}
              <div className="flex-1 min-w-0 flex flex-col gap-12 justify-center py-10 px-4">
                {contentInner}
              </div>

              {/* RIGHT COLUMN */}
              <div className="relative shrink-0 w-36 self-stretch">
                <div className="absolute inset-y-0 left-0 flex flex-col justify-center gap-10 pl-2">

                  {/* TOP image — left aligned */}
                  <div className="overflow-visible flex justify-start">
                    <img
                      src={rightImages[0]}
                      alt=""
                      className="w-30 h-30 object-cover rounded-xl opacity-20 -translate-y-10"
                    />
                  </div>

                  {/* MIDDLE image — landscape */}
                  <img
                    src={rightImages[1]}
                    alt=""
                    className="w-30 h-25 object-cover rounded-xl opacity-20 translate-x-10"
                  />

                  {/* BOTTOM image — left aligned */}
                  <div className="overflow-visible flex justify-start">
                    <img
                      src={rightImages[2]}
                      alt=""
                      className="w-24 h-24 object-cover rounded-xl opacity-20 translate-y-10"
                    />
                  </div>

                </div>
              </div>
            </>
          ) : (
            <>{contentInner}</>
          )}
    </div>
  )

  return (
    <div className={cn('relative w-full', className)}>
      <div className={cardWrapperClass}>
        {innerCard}
      </div>
    </div>
  )
}

export default CollectionCtaLandingCTA
