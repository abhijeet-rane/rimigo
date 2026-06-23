// Image resolution for ``meal`` / ``restaurant`` / ``place`` slots.
//
// Priority chain (same one the kanban and calendar restaurant cards
// use), pulled out of DesktopKanbanView.tsx so the slot detail modal
// (``SlotDetailDesktopModal`` + ``SlotDetailBottomSheet``) can render
// the same photo at the top of its hero without duplicating the
// lookup logic:
//
//   0. ``slot_data.place_id`` — resolved on demand through the backend
//      photo proxy (``/curation/places/<place_id>/photo/``). This is the
//      preferred source: the proxy returns a fresh Google CDN URL per
//      request and caches it across tripboards, so the slot only ever
//      stores the stable place_id and photos never expire. Applies to
//      both meal and place slots.
//   1. ``slot_data.photo_url`` — LEGACY pre-resolved Google Places CDN
//      URL produced by the old concierge enricher path. Short-lived and
//      expires within days; kept only as a fallback for slots created
//      before the proxy that have no place_id.
//   1b. ``slot_data.image_url`` — legacy alias emitted by an older
//       meal/place writer that hasn't been unified with the concierge
//       enricher shape. Same semantics as ``photo_url`` (Google Places
//       Photos URL); read as a drop-in fallback so hero renders on
//       both slot shapes.
//   2. ``slot_data.display_props.landscape_image`` — V2 generator
//      image (meal slots only; place slots never have display_props).
//   3. Meal-type themed placeholder (MEAL / RESTAURANT only) — a
//      generic food stock keyed by breakfast / lunch / dinner.
//   4. Generic meal fallback (MEAL / RESTAURANT only) — last-resort
//      food image so the card never renders blank.
//
// Place slots deliberately bypass tiers 3 + 4 because food imagery
// on a temple / market / attraction card would be misleading. That's
// why ``resolveMealPlaceImage`` returns an empty ``image`` for places
// without a Google photo, letting callers degrade to a non-image
// layout (e.g. the kanban falls back to ``ThumbnailCard``).

import { API_CONFIG } from '@/lib/api/apiConfig'

/**
 * Build the backend photo-proxy URL for a Google place_id. The proxy
 * (`GET /curation/places/<place_id>/photo/`) resolves a live Google CDN
 * URL on demand and 302-redirects to it, so this URL is stable from the
 * app's perspective and never expires.
 */
export function placePhotoProxyUrl(placeId: string, maxWidth = 800): string {
    const base = (API_CONFIG.BASE_URL || '').replace(/\/$/, '')
    return `${base}/curation/places/${encodeURIComponent(placeId)}/photo/?max_width=${maxWidth}`
}

export const MEAL_IMAGE_MAP: Record<string, string[]> = {
    breakfast: ['https://media.rimigo.com/1765760238217_image-ct6TpZ91pix5oetpcsAiRNdWwloxva.png'],
    lunch: ['https://media.rimigo.com/1765760260371_image-g5x4D885dtv5R6gsLOR4xfwmaN8Vne.png'],
    dinner: [
        'https://media.rimigo.com/1765795179203_image-7QufcMTGFHaF0gEiQwJ2Ki8ZVJekLL.png',
        'https://media.rimigo.com/1765795179901_image-HbCnYirZv0o05ffcBstUMZcPgOwlWQ.png',
        'https://media.rimigo.com/1765795180519_image-NLrIRa8dkKTGFrmmVD65dRmyISi2De.png'
    ]
}

export const FALLBACK_MEAL_IMAGES = [
    'https://media.rimigo.com/1765760280370_image-lajTvnCG0rsoksTEwSYSZaFk9DdR4b.png',
    'https://media.rimigo.com/1765760260371_image-g5x4D885dtv5R6gsLOR4xfwmaN8Vne.png'
]

export function getMealTypeFromTime(start?: Date | string | null): string {
    if (!start) return 'dinner'
    const d = typeof start === 'string' ? new Date(start) : start
    const hour = d.getUTCHours()
    if (hour >= 5 && hour < 11) return 'breakfast'
    if (hour >= 11 && hour < 15) return 'lunch'
    return 'dinner'
}

export function getRandomFrom(arr: string[], seed = 0): string {
    return arr.length ? arr[seed % arr.length] : ''
}

export interface ResolvedMealPlaceImage {
    /** Final URL the card / modal should render. Empty string means no
     *  image is available — callers should use a text-only fallback. */
    image: string
    /** True when the image came from tier 1 (Places CDN URL) or tier 2
     *  (V2 display image) — an actual venue photo, not a placeholder.
     *  Drives the "hero layout vs compact row" decision on the card
     *  and the "show hero banner in modal" decision on the detail
     *  modal: we only want to render a full-width photo when it's a
     *  real photo of the place, not a generic food stock. */
    hasRealPhoto: boolean
}

export function resolveMealPlaceImage(
    event: any,
    dayIndex: number = 0
): ResolvedMealPlaceImage {
    if (!event) return { image: '', hasRealPhoto: false }
    const type = event.type || event.kind || ''
    const isPlace = event.kind === 'place'
    const isMealLike = !isPlace && (type === 'restaurant' || event.kind === 'meal')
    if (!isMealLike && !isPlace) return { image: '', hasRealPhoto: false }

    const slotData = event.slotData || event.slot_data || {}
    // Tier 0: prefer the on-demand proxy keyed on the stable place_id. This
    // covers every slot that has a place_id (effectively all of them) and
    // never serves an expired URL.
    const placeId: string | undefined = slotData.place_id
    const proxyPhotoUrl: string | undefined = placeId ? placePhotoProxyUrl(placeId) : undefined
    // Tiers 1/1b: legacy stored URLs, only used for pre-proxy slots with no
    // place_id (these may be expired — the <img> onError degrades to a
    // placeholder).
    const legacyPhotoUrl: string | undefined = slotData.photo_url || slotData.image_url
    const displayImage: string | undefined = slotData.display_props?.landscape_image
    const realPhoto = proxyPhotoUrl || legacyPhotoUrl || displayImage

    let themedPlaceholder = ''
    if (isMealLike) {
        const mealType = slotData.meal_type || getMealTypeFromTime(event.start)
        if (mealType && MEAL_IMAGE_MAP[mealType]) {
            themedPlaceholder = getRandomFrom(MEAL_IMAGE_MAP[mealType], dayIndex)
        }
    }
    const lastResort = isMealLike ? getRandomFrom(FALLBACK_MEAL_IMAGES, dayIndex) : ''
    const image = realPhoto || themedPlaceholder || lastResort
    return { image, hasRealPhoto: !!realPhoto }
}
