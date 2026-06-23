// Slot image lives in different paths depending on kind (display_props
// for experiences/places, photo_url for Google Places meals, stay row
// for stays). Walks a known list of paths so each call site doesn't
// need to know the shape.
import type { PdfSlot, PdfStay } from '../types'

const KNOWN_PATHS = [
    ['display_props', 'landscape_image'],
    ['display_props', 'image_url'],
    ['display_props', 'photo_url'],
    ['photo_url'],
    ['image_url'],
    ['hero_image_url'],
    ['thumbnail_url'],
] as const

export function extractSlotImage(slot: PdfSlot, stay?: PdfStay | null): string | null {
    // Server-resolved stay photo is the most reliable when available.
    if (isUsableUrl(stay?.hotel_image_url)) return stay!.hotel_image_url!

    const data = slot.slot_data || {}
    for (const path of KNOWN_PATHS) {
        const v = walk(data, path as unknown as string[])
        if (typeof v === 'string' && isUsableUrl(v)) return v
    }
    return null
}

// react-pdf hard-throws on a failed image fetch and aborts the whole
// document render — only let absolute http(s) URLs through.
export function isUsableUrl(v: string | null | undefined): v is string {
    if (typeof v !== 'string') return false
    const s = v.trim()
    return s.startsWith('http://') || s.startsWith('https://')
}

// Hero for the cover. Slot photos take priority over stay photos —
// slot photos come from reliable CDNs (Unsplash, Pexels), while
// stay photos are server-resolved and frequently null or expired,
// which would render as a broken grey block in react-pdf.
export function pickHeroImage(
    stays: PdfStay[],
    daysWithSlots: Array<{ slots?: PdfSlot[] }>,
): string | null {
    for (const day of daysWithSlots) {
        const url = pickDayHero(day)
        if (url) return url
    }
    for (const stay of stays) {
        if (isUsableUrl(stay.hotel_image_url)) return stay.hotel_image_url
    }
    return null
}

// Hero for a single day. Activity/experience photos beat meals beat
// stays — meals are usually small/generic and stays repeat across
// nights, so the day's experience photo is the visual that actually
// reads "this is what you'll do today". Returns null when no slot
// in this day carries an image; callers fall back to a text header
// rather than rendering a broken Image element.
const KIND_PRIORITY = [
    'experience',
    'place',
    'activity',
    'meal',
    'restaurant',
    'stay',
    'flight',
    'transport',
    'train',
    'bus',
    'transfer',
    'car',
]

export function pickDayHero(day: { slots?: PdfSlot[] }): string | null {
    const slots = day.slots ?? []
    for (const kind of KIND_PRIORITY) {
        for (const slot of slots) {
            if ((slot.kind || '').toLowerCase() !== kind) continue
            const url = extractSlotImage(slot)
            if (url) return url
        }
    }
    return null
}

function walk(obj: unknown, path: string[]): unknown {
    let cur: unknown = obj
    for (const segment of path) {
        if (cur == null || typeof cur !== 'object') return undefined
        cur = (cur as Record<string, unknown>)[segment]
    }
    return cur
}
