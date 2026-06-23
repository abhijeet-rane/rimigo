import type { ReactNode } from 'react'

/** Props for the creator strip (avatar, name, tag, Instagram, followers) */
export interface CreatorStripProps {
  imageUrl?: string
  name: string
  tag?: string
  instagramHandle?: string
  instagramProfileUrl?: string
  followerCount?: string | number
  className?: string
  /** When 'large', avatar and text are bigger (e.g. landing CTA). */
  size?: 'default' | 'large'
}

/** Single tag in the heading (e.g. country, days, "For couples") */
export interface HeadingTag {
  icon: ReactNode
  text: string
  pill?: boolean
}

/** Props for the heading with meta tags */
export interface HeadingWithTagsProps {
  title: string
  tags: HeadingTag[]
  className?: string
  /** When 'large', title and tags use bigger typography (e.g. Variant A). */
  size?: 'default' | 'large'
}

/** Single item in the trip overview grid (e.g. "3 hotels", "12 activities") */
export interface TripOverviewItem {
  id?: string
  icon?: ReactNode
  imageUrl?: string
  /** When set, use stacked images (e.g. ImageStack) for hotels/activities. Takes precedence over imageUrl for display. */
  imageUrls?: string[]
  label: string
  count?: number
  /** When true, use pale yellow accent styling (e.g. "& more" / travel tips) */
  accentCell?: boolean
}

/** Props for the trip overview section */
export interface TripOverviewSectionProps {
  items: TripOverviewItem[]
  columns: 2 | 4
  label?: string
  className?: string
  compact?: boolean
}

/** Optional metadata for CTA analytics tracking. */
export interface CollectionCtaAnalyticsContext {
  section?: string
  collectionId?: string
  collectionTitle?: string
  cardVariant?: string
  /** Override page-level creator attribution for this specific card (e.g. a creator's
  *  card on another creator's storefront). When set, the card's click event tags
  * *  this creator instead of inheriting the page's. */
  creator_handle?: string
  creator_id?: string
  extraProperties?: Record<string, unknown>
  disabled?: boolean
}

/** Combined props for any Collection CTA card variant */
export interface CollectionCtaCardProps {
  /** Violet header: avatars and "X+ bought this" */
  avatarUrls: string[]
  boughtCount: number
  boughtLabel?: string
  /** Creator strip */
  creatorImageUrl?: string
  creatorName: string
  creatorTag?: string
  instagramHandle?: string
  instagramProfileUrl?: string
  followerCount?: string | number
  /** Heading */
  title: string
  tags: HeadingTag[]
  /** Trip overview */
  overviewItems: TripOverviewItem[]
  overviewColumns: 2 | 4
  overviewLabel?: string
  /** Optional background images (faded, behind/around card) */
  backgroundImageUrls?: string[]
  /** Optional portrait images for left/right columns (Variant A). Use at least 6: first 3 left, next 3 right. */
  portraitImageUrls?: string[]
  /** CTA button */
  ctaLabel?: string
  onCtaClick: () => void
  /** Optional class for the root card wrapper */
  className?: string
  /** When true, card fills container width (no internal max-width). Use on landing to match Premium CTA width. */
  fillWidth?: boolean
  /** Optional tone override for the violet header */
  headerTone?: 'violet' | 'plain'
  /** Optional override for Variant C max-width constraint */
  maxWidthClassName?: string
  /** When true, collage images show at full opacity (no dim). e.g. Collections page list. Default false. */
  imageFullOpacity?: boolean
  /** Badge above heading: free when amount is 0, paid otherwise. Omit to hide. */
  pricingBadge?: 'free' | 'paid'
  /** Optional analytics tracking context for PostHog events. */
  analyticsContext?: CollectionCtaAnalyticsContext
}
