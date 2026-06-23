import React from 'react'
import { CreatorStrip } from './CreatorStrip'
import { HeadingWithTags } from './HeadingWithTags'
import { TripOverviewSection } from './TripOverviewSection'
import type { CollectionCtaCardProps } from './types'
import { cn } from '@/lib/utils'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_EVENTS } from '@/modules/amplitude/components/posthogEventDetails'

const DEFAULT_CTA_LABEL = 'View tripboard'

export const CollectionCardVerticalCTA: React.FC<CollectionCtaCardProps> = ({
  creatorImageUrl,
  creatorName,
  creatorTag,
  instagramHandle,
  instagramProfileUrl,
  followerCount,
  title,
  tags,
  overviewItems,
  overviewColumns = 2,
  overviewLabel,
  portraitImageUrls,
  ctaLabel = DEFAULT_CTA_LABEL,
  onCtaClick,
  className,
  fillWidth,
  imageFullOpacity = false,
  pricingBadge,
  analyticsContext
}) => {
  const { trackEvent } = usePostHog()
  const handleButtonClick = React.useCallback(() => {
    if (analyticsContext && !analyticsContext.disabled) {
      const payload: Record<string, unknown> = {
        card_variant: analyticsContext.cardVariant ?? 'vertical',
        collection_title: analyticsContext.collectionTitle ?? title
      }

      if (analyticsContext.section) {
        payload.section = analyticsContext.section
      }
      if (analyticsContext.collectionId) {
        payload.collection_id = analyticsContext.collectionId
      }
      // Per-card creator override — wins over page-level CreatorAttributionProvider in the
      // trackEvent wrapper because props with non-null values are preserved.
      if (analyticsContext.creator_handle) {
        payload.creator_handle = analyticsContext.creator_handle
      }
      if (analyticsContext.creator_id) {
        payload.creator_id = analyticsContext.creator_id
      }
      if (analyticsContext.extraProperties) {
        Object.assign(payload, analyticsContext.extraProperties)
      }

      trackEvent(POSTHOG_EVENTS.COLLECTION_CTA_CLICK, payload)
    }

    onCtaClick?.()
  }, [analyticsContext, onCtaClick, title, trackEvent])

  const imgs = portraitImageUrls?.slice(0, 5) ?? []
  const hasImages = imgs.length >= 5

  const cardContent = (
    <div className="relative flex-1 w-full bg-white rounded-2xl border border-grey-4 overflow-hidden">
          {pricingBadge && (
            <span
              className={cn(
                'absolute top-0 right-0 z-10 inline-flex items-center rounded-tr-2xl rounded-bl-lg px-3 py-1.5 text-sm font-semibold uppercase tracking-wide text-white front-red-hat-display',
                pricingBadge === 'free'
                  ? 'bg-secondary-green'
                  : 'bg-primary-default'
              )}
            >
              {pricingBadge}
            </span>
          )}
          {/* COLLAGE */}
          {hasImages && (
            <div className="relative h-[188px] bg-white overflow-hidden">

              {/* Unequal columns: left slightly narrower, right wider */}
              <div
                className={cn(
                  'absolute inset-0 grid grid-cols-[0.85fr_1.15fr] gap-2',
                  !imageFullOpacity && 'opacity-25'
                )}
              >

                {/* LEFT COLUMN (one tall clipped image) */}
                <div className="h-full overflow-hidden rounded-r-xl">
                  <img
                    src={imgs[0]}
                    alt=""
                    className="w-full h-full object-cover object-top"
                  />
                </div>

                {/* CENTER + RIGHT columns separated */}
                <div className="grid grid-cols-2 gap-2 h-full min-w-0">
                  <div className="flex flex-col gap-2 min-w-0">
                    <img src={imgs[1]} alt="" className="flex-1 min-h-0 w-full object-cover rounded-xl" />
                    <img src={imgs[3]} alt="" className="flex-1 min-h-0 w-full object-cover rounded-xl" />
                  </div>
                  <div className="flex flex-col gap-2 min-w-0">
                    <img src={imgs[2]} alt="" className="min-h-0 w-full flex-[0.5] object-cover rounded-xl" />
                    <img src={imgs[4]} alt="" className="min-h-0 w-full flex-1 object-cover rounded-xl object-center" />
                  </div>
                </div>
              </div>

              {/* Bottom fade */}
              <div
                className="absolute inset-x-0 bottom-0 h-14 pointer-events-none bg-linear-to-t from-white to-transparent"
                aria-hidden
              />

              {/* Creator chip */}
              <div className="absolute left-4 top-4 z-10">
                <CreatorStrip
                  imageUrl={creatorImageUrl}
                  name={creatorName}
                  tag={creatorTag}
                  instagramHandle={instagramHandle}
                  instagramProfileUrl={instagramProfileUrl}
                  followerCount={followerCount}
                />
              </div>
            </div>
          )}

          {/* CONTENT */}
          <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
            <HeadingWithTags title={title} tags={tags} />

            <TripOverviewSection items={overviewItems} columns={overviewColumns} label={overviewLabel} compact />

            <button
              type="button"
              onClick={handleButtonClick}
              className="w-full rounded-xl bg-[#1A1A1A] py-3 px-6 font-red-hat-display text-[15px] font-semibold text-white tracking-[-0.02em] hover:opacity-90 transition-opacity cursor-pointer"
            >
              <span className="text-center">{ctaLabel}</span>
            </button>
          </div>

    </div>
  )

  const cardWrapperClass = cn(
    'relative z-10 w-full rounded-2xl overflow-hidden shadow-sm',
    !fillWidth && 'max-w-sm'
  )

  return (
    <div className={cn('relative w-full', className)}>
      <div className={cardWrapperClass}>
        {cardContent}
      </div>
    </div>
  )
}

export default CollectionCardVerticalCTA
