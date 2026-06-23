import type { CollectionListItem } from '@/modules/ContentCollection/api/contentCollectionApi'
import type { Collection, Creator } from '@/components/Collection/types'

/** 2_400_000 → "2.4 million"; 12_000 → "12k". CreatorStrip's `formatFollowers`
 *  abbreviates (M/k) — different copy, can't reuse. */
const formatFollowersLong = (n: number | string | null | undefined): string => {
    if (n === null || n === undefined || n === '') return ''
    const value = typeof n === 'number' ? n : Number(n)
    if (!Number.isFinite(value)) return ''
    const round = (x: number) => x.toFixed(1).replace(/\.0$/, '')
    if (value >= 1_000_000_000) return `${round(value / 1_000_000_000)} billion`
    if (value >= 1_000_000) return `${round(value / 1_000_000)} million`
    if (value >= 1_000) return `${round(value / 1_000)}k`
    return value.toString()
}

/**
 * `CollectionListItem` (country-list response) → `Collection` for the shared
 * `<CollectionCard>`. Item categories are empty — country list doesn't
 * surface them; `CollectionItemCard` skips the badge in that case.
 */
/** Rimigo-branded creator shown when a collection has no external creator,
 *  so the card always renders with a header (instead of the bare title that
 *  looked broken). `/icons/compass.png` matches the Rimigo avatar used by the
 *  Collections landing cards. */
const RIMIGO_CREATOR: Creator = {
    id: 'rimigo',
    name: 'Rimigo',
    handle: '@rimigo.travel',
    profileImage: '/icons/compass.png',
    instagramFollowers: '',
    isRimigo: true,
    lastVisited: { location: '' },
}

export const adaptListItemToCollection = (item: CollectionListItem): Collection => {
    const sd = item.source_details
    const creator: Creator = sd
        ? {
              id: sd.username || sd.name,
              name: sd.name,
              handle: sd.username ? `@${sd.username}` : '',
              profileImage: sd.image,
              instagramFollowers: formatFollowersLong(sd.number_of_followers),
              lastVisited: { location: '' },
          }
        : RIMIGO_CREATOR

    // experience → stay → overview: keeps the 4-tile grid populated for
    // collections that lean on one section type.
    const tiles = [
        ...(item.trip_overview?.experience_image_links ?? []),
        ...(item.trip_overview?.stay_image_links ?? []),
        ...(item.overview_images ?? []),
    ]
        .filter(Boolean)
        .slice(0, 4)

    return {
        id: item.identifier,
        creator,
        title: item.name,
        items: tiles.map((url, idx) => ({
            id: `${item.identifier}-${idx}`,
            image: url,
            category: '',
        })),
    }
}
