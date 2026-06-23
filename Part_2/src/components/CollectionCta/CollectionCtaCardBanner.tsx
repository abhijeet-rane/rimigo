import React from 'react'
import { CreatorStrip } from './CreatorStrip'
import { HeadingWithTags } from './HeadingWithTags'
import { TripOverviewSection } from './TripOverviewSection'
import type { CollectionCtaCardProps } from './types'
import { cn } from '@/lib/utils'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_EVENTS } from '@/modules/amplitude/components/posthogEventDetails'

const DEFAULT_CTA_LABEL = 'View tripboard'
const FALLBACK_COLLAGE_IMAGES = [
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&h=900&fit=crop',
  'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=900&h=600&fit=crop',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=900&h=900&fit=crop',
  'https://images.unsplash.com/photo-1526676037777-09c21d8633b0?w=750&h=1000&fit=crop',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=900&h=700&fit=crop'
]

/** Horizontal layout: card on the left */
export const CollectionCTACardBanner: React.FC<CollectionCtaCardProps> = ({
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
  maxWidthClassName,
  pricingBadge,
  analyticsContext
}) => {
  const { trackEvent } = usePostHog()
  const handleButtonClick = React.useCallback(() => {
    if (analyticsContext && !analyticsContext.disabled) {
      const payload: Record<string, unknown> = {
        card_variant: analyticsContext.cardVariant ?? 'banner',
        collection_title: analyticsContext.collectionTitle ?? title
      }

      if (analyticsContext.section) {
        payload.section = analyticsContext.section
      }
      if (analyticsContext.collectionId) {
        payload.collection_id = analyticsContext.collectionId
      }
      if (analyticsContext.extraProperties) {
        Object.assign(payload, analyticsContext.extraProperties)
      }

      trackEvent(POSTHOG_EVENTS.COLLECTION_CTA_CLICK, payload)
    }

    onCtaClick?.()
  }, [analyticsContext, onCtaClick, title, trackEvent])

  const rawImages = (portraitImageUrls ?? []).filter(Boolean)
  const collageSources = (rawImages.length >= 5 ? rawImages : [...rawImages, ...FALLBACK_COLLAGE_IMAGES]).slice(0, 5)
  const hasCollage = collageSources.length >= 5
  const [imageA, imageB, imageC] = collageSources

  const cardContent = (
    <div className="relative flex-1 w-full bg-white rounded-2xl border border-grey-4 flex flex-col md:flex-row gap-4 md:gap-8">
          {pricingBadge && (
            <span
              className={cn(
                'absolute top-0 right-0 z-10 inline-flex items-center rounded-tr-2xl rounded-bl-lg px-2.5 py-0.5 text-[12px] letter-spacing-normal font-bold tracking-[-0.02px] text-white font-red-hat-display uppercase',
                pricingBadge === 'free'
                  ? 'bg-secondary-green'
                  : 'bg-primary-light'
              )}
            >
              {pricingBadge}
            </span>
          )}
          {/* Left half: heading, trip overview, CTA */}
          <div className="w-full md:flex-1 md:min-w-0 flex flex-col gap-4 md:gap-10 items-start min-w-0 md:p-6 pb-4 md:pb-6">
            <HeadingWithTags title={title} tags={tags} />
            <div className="w-full flex flex-col gap-4">
              <TripOverviewSection
                items={overviewItems}
                columns={overviewColumns}
                label={overviewLabel}
                compact
              />
              <button
                type="button"
                onClick={handleButtonClick}
                className="w-fit uppercase rounded-xl bg-[#1A1A1A] py-3 px-10 font-red-hat-display text-[15px] font-semibold text-white tracking-[-0.02em] hover:opacity-90 transition-opacity cursor-pointer"
              >
                {ctaLabel}
              </button>
            </div>
          </div>
          {/* Right half: image collage with creator strip pinned to bottom */}
          <div className="relative w-full md:w-[42%] md:shrink-0 min-h-[260px] md:min-h-[320px] overflow-hidden rounded-b-2xl md:rounded-r-2xl md:rounded-bl-none">
              {hasCollage && (
                  <div className="absolute inset-0 flex gap-1.5 p-2">
                      {/* Column 1 — tall single image */}
                      <div className="flex flex-col gap-1.5 w-[48%]">
                          <img src={imageA} alt="" className="w-full h-full object-cover rounded-xl" loading="lazy" />
                      </div>
                      {/* Column 2 — two stacked images */}
                      <div className="flex flex-col gap-1.5 w-[52%]">
                          <img src={imageB} alt="" className="w-full h-[55%] object-cover rounded-xl" loading="lazy" />
                          <img src={imageC} alt="" className="w-full h-[45%] object-cover rounded-xl" loading="lazy" />
                      </div>
                  </div>
              )}

              {/* White fade overlay — softens images so card feels cohesive */}
              <div className="absolute inset-0 bg-white/40 pointer-events-none" />

              {/* Stronger white fade at bottom for CreatorStrip contrast */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white/80 to-transparent pointer-events-none" />

              {/* CreatorStrip pinned to bottom */}
              <CreatorStrip
                  imageUrl={creatorImageUrl}
                  name={creatorName}
                  tag={creatorTag}
                  instagramHandle={instagramHandle}
                  instagramProfileUrl={instagramProfileUrl}
                  followerCount={followerCount}
                  className="absolute top-3 left-3 z-10"
              />
          </div>
    </div>
  )

  const cardWrapperClass = cn(
    'relative z-10 w-full shrink-0 rounded-2xl overflow-hidden shadow-sm',
    maxWidthClassName ?? 'md:max-w-xl'
  )

  return (
    <div
      className={cn(
        'relative flex w-full flex-col md:flex-row gap-4 md:gap-6',
        className
      )}
    >
      <div className={cardWrapperClass}>
        {cardContent}
      </div>
    </div>
  )
}

export default CollectionCTACardBanner
