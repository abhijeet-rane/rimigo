import { Clock } from 'lucide-react'
import type { CollectionListItem } from '@/modules/ContentCollection/api/contentCollectionApi'
import type {
  CollectionCtaAnalyticsContext,
  CollectionCtaCardProps,
  HeadingTag,
  TripOverviewItem
} from '@/components/CollectionCta'
import { LANDING_COLLECTION_CTA_AVATAR_URLS } from '@/pages/Landing/Constants/landingCollectionCta'
import { RIMIGO_COLLECTION_ROUTE } from '@/routes/routes'

/** Build path for collection detail: /rimigo-collection/{country_name}/{identifier} */
export function getCollectionDetailPath(item: CollectionListItem): string {
  const firstCountry = item.countries?.[0]?.name?.trim()
  const countrySlug = firstCountry
    ? firstCountry.toLowerCase().replace(/\s+/g, '-')
    : 'multidestination'
  const identifier = item.identifier ?? ''
  return `${RIMIGO_COLLECTION_ROUTE}/${countrySlug}/${identifier}`
}

const PLANNED_ROUTE_IMAGE = 'https://media.rimigo.com/1771758259797_image-o8WAUq6lEL8nJ9oEiC2lBXRi01vekx.png'
const AND_MORE_IMAGE = 'https://media.rimigo.com/1771948399354_Group%20509%20(3).png'
const RIMIGO_LOGO_URL = '/icons/compass.png'

function isRimigoSource(item: CollectionListItem): boolean {
  const sd = item.source_details
  if (!sd) return true
  const name = sd.name?.toLowerCase().trim()
  const username = sd.username?.toLowerCase().trim()
  if (name === 'rimigo' || username === 'rimigo') return true
  if (!name && !username) return true
  return false
}
/** Fallback stay images (same as HeroContentContainer / HERO_CARD_COPY stays card) */
const FALLBACK_STAY_IMAGES = [
  'https://i.travelapi.com/lodging/2000000/1320000/1312500/1312493/d28c8420_z.jpg',
  'https://i.travelapi.com/lodging/1000000/570000/562200/562175/a69f1506_z.jpg',
  'https://i.travelapi.com/lodging/2000000/1560000/1558900/1558877/c0baeb0c_z.jpg'
]

/** Seeded shuffle so each collection gets a stable but varied order (no shared RNG/cache) */
function shuffleArrayWithSeed<T>(arr: T[], seed: string): T[] {
  const out = [...arr]
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) >>> 0
  const next = () => {
    h = (Math.imul(1664525, h) + 1013904223) >>> 0
    return h / 2 ** 32
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
const FALLBACK_PORTRAIT_IMAGES = [
  'https://media.rimigo.com/1770879285768_12.webp',
  'https://media.rimigo.com/1770879286529_11.webp',
  'https://media.rimigo.com/1770879286960_13.webp',
  'https://media.rimigo.com/1770879287391_14.webp',
  'https://media.rimigo.com/1770879287924_15.webp',
  'https://media.rimigo.com/1770879288391_16.webp'
]

export function mapCollectionToOverviewItems(item: CollectionListItem): TripOverviewItem[] {
  const to = item.trip_overview
  const stayUrls = shuffleArrayWithSeed(
    to.stay_image_links?.length ? to.stay_image_links.slice(0, 3) : [...FALLBACK_STAY_IMAGES],
    item.identifier ?? ''
  )
  const activityUrls = to.experience_image_links?.length
    ? to.experience_image_links.slice(0, 3)
    : [
        'https://images.unsplash.com/photo-1551632811-561732d1e306?w=80&h=80&fit=crop',
        'https://images.unsplash.com/photo-1551632811-561732d1e306?w=80&h=80&fit=crop',
        'https://images.unsplash.com/photo-1551632811-561732d1e306?w=80&h=80&fit=crop'
      ]

  const fourthItem =
    to.number_of_tips != null && to.number_of_tips > 0
      ? { label: 'travel tips' as const, count: to.number_of_tips, accentCell: true as const, imageUrl: AND_MORE_IMAGE }
      : { label: '& more' as const, accentCell: true as const, imageUrl: AND_MORE_IMAGE }

  return [
    { label: 'cities', count: to.number_of_cities_visited ?? 0, imageUrl: PLANNED_ROUTE_IMAGE },
    { label: 'hotels', count: to.number_of_stays ?? 0, imageUrls: stayUrls },
    { label: 'activities', count: to.number_of_activities ?? 0, imageUrls: activityUrls },
    fourthItem
  ]
}

export function CountryFlagsStack({ countries }: { countries: CollectionListItem['countries'] }) {
  const flags = countries
    .map((c) => c.flag_icon_url ?? c.country_flag)
    .filter((url): url is string => Boolean(url))

  if (flags.length === 0) {
    return <span className="text-base" aria-hidden>📍</span>
  }

  return (
    <span className="inline-flex items-center justify-center -space-x-1.5 shrink-0" aria-hidden>
      {flags.map((url, i) => (
        <img
          key={i}
          src={url}
          alt=""
          className="h-4 w-4 rounded-full object-cover border-[2px] border-white"
          style={{ zIndex: flags.length - i }}
        />
      ))}
    </span>
  )
}

export function mapCollectionToTags(item: CollectionListItem): HeadingTag[] {
  const tags: HeadingTag[] = []
  const countries = item.countries ?? []

  if (countries.length > 0) {
    const names = countries.map((c) => c.name).filter(Boolean)
    const text =
      names.length === 1
        ? names[0] ?? ''
        : names.length === 2
          ? names.join(', ')
          : `${names[0]}, ${names[1]} +${names.length - 2}`
    if (text) {
      tags.push({
        icon: <CountryFlagsStack countries={countries} />,
        text
      })
    }
  }

  if (item.number_of_days != null && item.number_of_days > 0) {
    tags.push({ icon: <Clock className="w-4 h-4 text-grey-2" />, text: `${item.number_of_days} days` })
  }

  return tags
}

export type CollectionCardListItem = CollectionCtaCardProps & { id?: string | number }

export function mapCollectionToCardItem(
  item: CollectionListItem,
  onCtaClick: (item: CollectionListItem) => void,
  options?: {
    overviewColumns?: 2 | 4
    fillWidth?: boolean
    imageFullOpacity?: boolean
    analyticsContext?: CollectionCtaAnalyticsContext
  }
): CollectionCardListItem {
  const tags = mapCollectionToTags(item)
  const rawBought = item.number_of_people_who_bought
  const boughtCount = typeof rawBought === 'string' ? (parseInt(rawBought, 10) || 0) : (rawBought ?? 0)
  // The collage layout needs 5 slots; if the API returns 0–4 images, top up with the
  // fallback set so the collage + creator strip still render. Empty → full fallback.
  const apiPortraitImages = item.overview_images ?? []
  const portraitImageUrls =
    apiPortraitImages.length >= 5
      ? apiPortraitImages.slice(0, 6)
      : apiPortraitImages.length === 0
        ? FALLBACK_PORTRAIT_IMAGES
        : [...apiPortraitImages, ...FALLBACK_PORTRAIT_IMAGES].slice(0, 6)

  const pricingBadge =
    item.pricing == null || item.pricing.amount === 0 ? 'free' : 'paid'

  const isRimigo = isRimigoSource(item)

  // Per-card creator override: when the collection has a non-Rimigo source, tag the
  // card's CTA click with that source's handle so storefront pages featuring another
  // creator's tripboard attribute the click to the card's creator (not the page's).
  const cardCreatorHandle = !isRimigo ? item.source_details?.username : undefined

  const analyticsContext = options?.analyticsContext
    ? {
        ...options.analyticsContext,
        collectionId: options.analyticsContext.collectionId ?? item.identifier,
        collectionTitle: options.analyticsContext.collectionTitle ?? item.name,
        creator_handle: options.analyticsContext.creator_handle ?? cardCreatorHandle
      }
    : cardCreatorHandle
      ? { creator_handle: cardCreatorHandle, collectionId: item.identifier, collectionTitle: item.name }
      : undefined

  return {
    id: item.identifier,
    avatarUrls: LANDING_COLLECTION_CTA_AVATAR_URLS,
    boughtCount,
    boughtLabel: 'bought this',
    creatorImageUrl: isRimigo ? RIMIGO_LOGO_URL : item.source_details?.image,
    creatorName: isRimigo ? 'Rimigo' : (item.source_details?.name ?? item.source_details?.username ?? item.name),
    creatorTag: isRimigo ? 'Travel Expert' : 'Travel Influencer',
    instagramHandle: isRimigo ? undefined : (item.source_details?.username ? `@${item.source_details.username}` : undefined),
    followerCount: isRimigo ? undefined : item.source_details?.number_of_followers,
    title: item.name,
    tags: tags.length
      ? tags
      : [{
        icon: <span className="text-base" aria-hidden>📍</span>,
        text: 'Trip'
      }],
    overviewItems: mapCollectionToOverviewItems(item),
    overviewColumns: options?.overviewColumns ?? 2,
    overviewLabel: 'Their trip overview',
    portraitImageUrls,
    ctaLabel: 'View tripboard',
    onCtaClick: () => onCtaClick(item),
    fillWidth: options?.fillWidth ?? true,
    imageFullOpacity: options?.imageFullOpacity,
    pricingBadge,
    analyticsContext
  }
}
