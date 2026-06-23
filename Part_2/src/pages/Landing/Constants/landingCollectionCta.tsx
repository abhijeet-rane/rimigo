import { Clock } from 'lucide-react'
import type { HeadingTag, TripOverviewItem } from '@/components/CollectionCta'

/** Shared data for Collection CTA on landing (Variant A desktop, Variant B mobile) */
export const LANDING_COLLECTION_CTA_AVATAR_URLS = [
  'https://media.rimigo.com/1771063449775_human-image-2.jpg',
  'https://media.rimigo.com/1771063448865_human-image-1.jpg',
  'https://media.rimigo.com/1771063450614_human-image-3.jpg'
]

export const LANDING_COLLECTION_CTA_BACKGROUND_IMAGES = [
  'https://images.unsplash.com/photo-1528127269322-539801943592?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop'
]

/** Portrait images for Variant A left/right columns. First 3 = left, next 3 = right. */
export const LANDING_COLLECTION_CTA_PORTRAIT_IMAGES = [
  'https://media.rimigo.com/1770879285768_12.webp',
  'https://media.rimigo.com/1770879286529_11.webp',
  'https://media.rimigo.com/1770879286960_13.webp',
  'https://media.rimigo.com/1770879287391_14.webp',
  'https://media.rimigo.com/1770879287924_15.webp',
  'https://media.rimigo.com/1770879288391_16.webp'
]

export const LANDING_COLLECTION_CTA_TAGS: HeadingTag[] = [
  { icon: <span className="text-base" aria-hidden>🇻🇳</span>, text: 'Vietnam' },
  { icon: <Clock className="w-4 h-4 text-grey-2" />, text: '10 days' }
]

/** 4 in a row – for Variant A (desktop) */
export const LANDING_COLLECTION_CTA_OVERVIEW_4: TripOverviewItem[] = [
  {
    label: 'Planned route',
    imageUrl: 'https://media.rimigo.com/1771758259797_image-o8WAUq6lEL8nJ9oEiC2lBXRi01vekx.png'
  },
  {
    label: 'hotels',
    count: 3,
    imageUrls: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=80&h=80&fit=crop',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=80&h=80&fit=crop',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=80&h=80&fit=crop'
    ]
  },
  {
    label: 'activities',
    count: 12,
    imageUrls: [
      'https://images.unsplash.com/photo-1551632811-561732d1e306?w=80&h=80&fit=crop',
      'https://images.unsplash.com/photo-1551632811-561732d1e306?w=80&h=80&fit=crop',
      'https://images.unsplash.com/photo-1551632811-561732d1e306?w=80&h=80&fit=crop'
    ]
  },
  {
    label: '& more',
    accentCell: true,
    imageUrl: 'https://media.rimigo.com/1771758724248_Group%20509%20(2).png'
  }
]

/** 2×2 with "& more" coupon – for Variant B (mobile) */
export const LANDING_COLLECTION_CTA_OVERVIEW_2X2: TripOverviewItem[] = [
  {
    label: 'Planned route',
    imageUrl: 'https://media.rimigo.com/1771758259797_image-o8WAUq6lEL8nJ9oEiC2lBXRi01vekx.png'
  },
  {
    label: 'hotels',
    count: 3,
    imageUrls: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=80&h=80&fit=crop',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=80&h=80&fit=crop',
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=80&h=80&fit=crop'
    ]
  },
  {
    label: 'activities',
    count: 12,
    imageUrls: [
      'https://images.unsplash.com/photo-1551632811-561732d1e306?w=80&h=80&fit=crop',
      'https://images.unsplash.com/photo-1551632811-561732d1e306?w=80&h=80&fit=crop',
      'https://images.unsplash.com/photo-1551632811-561732d1e306?w=80&h=80&fit=crop'
    ]
  },
  {
    label: '& more',
    accentCell: true,
    imageUrl: 'https://media.rimigo.com/1771758724248_Group%20509%20(2).png'
  }
]
