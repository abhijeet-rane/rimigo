import type { Section } from '../types/contentCollection'
import { formatDateStringToYMD } from '@/utils/dateUtils'
import { addDaysToYMD } from './itineraryWindows'

/**
 * Sentinel for shortlist clusters whose date metadata is missing entirely.
 * Keeps the dedupe key total — every (hubId, dates) tuple maps to a stable
 * key without `undefined` collisions across distinct missing-date entries.
 */
const MISSING_DATE_SENTINEL = '__no_date__'

export interface ShortlistSectionLite {
    /** Section id in the collection — what `onDeleteSection` operates on. */
    sectionId: string
    /** Resolved zentrum_hub_id (preferred dedupe identity). Falls back to
     *  `entity_id` for kayak-only sections that don't carry a hub id. */
    zentrumHubId?: string
    entityId: string
    startDate?: string | null
    endDate?: string | null
}

export interface ShortlistDedupeCluster {
    /** Stable dedupe key. */
    key: string
    /** Identity used for the cluster (zentrum_hub_id or entity_id fallback). */
    hubId: string
    /** Normalized check-in (YMD) or undefined when source dates were missing. */
    checkIn: string | undefined
    /** Normalized check-out (YMD) — equal to `checkIn + 1d` when source
     *  checkIn === checkOut, undefined when source dates were missing. */
    checkOut: string | undefined
    /** All section ids that collapse into this dedupe cluster.
     *  Sorted lexicographically for deterministic ordering. */
    sectionIds: string[]
}

/**
 * Normalize a (checkIn, checkOut) pair for dedupe purposes.
 *
 * Rule: when source checkIn === checkOut, treat checkOut as `checkIn + 1 day`.
 * That collapses zero-night artefacts produced upstream (e.g. when only one
 * date got written) into a single canonical 1-night window so duplicates
 * still merge.
 *
 * Returns `{ checkIn: undefined, checkOut: undefined }` when either input
 * is missing/invalid — the dedupe key falls back to the missing-date
 * sentinel so distinct undated duplicates still collapse together.
 */
export function normalizeShortlistDates(
    rawCheckIn: string | null | undefined,
    rawCheckOut: string | null | undefined,
): { checkIn: string | undefined; checkOut: string | undefined } {
    const inYmd = rawCheckIn ? formatDateStringToYMD(rawCheckIn) : undefined
    const outYmd = rawCheckOut ? formatDateStringToYMD(rawCheckOut) : undefined

    if (!inYmd || !outYmd) {
        return { checkIn: inYmd || undefined, checkOut: outYmd || undefined }
    }
    if (inYmd === outYmd) {
        return { checkIn: inYmd, checkOut: addDaysToYMD(inYmd, 1) }
    }
    return { checkIn: inYmd, checkOut: outYmd }
}

/**
 * Build the stable dedupe key for one (hubId, checkIn, checkOut) tuple.
 * Inputs are already-normalized values from `normalizeShortlistDates`.
 */
export function buildShortlistDedupeKey(
    hubId: string,
    normalizedCheckIn: string | undefined,
    normalizedCheckOut: string | undefined,
): string {
    return `${hubId}|${normalizedCheckIn ?? MISSING_DATE_SENTINEL}|${normalizedCheckOut ?? MISSING_DATE_SENTINEL}`
}

/**
 * One-shot helper: normalize then build the key.
 */
export function getShortlistDedupeKey(
    hubId: string,
    rawCheckIn: string | null | undefined,
    rawCheckOut: string | null | undefined,
): string {
    const { checkIn, checkOut } = normalizeShortlistDates(rawCheckIn, rawCheckOut)
    return buildShortlistDedupeKey(hubId, checkIn, checkOut)
}

/**
 * Group shortlist sections into dedupe clusters keyed by
 * (zentrumHubId, normalizedCheckIn, normalizedCheckOut).
 *
 * Preserves input ordering across distinct clusters (insertion order of the
 * returned Map) so downstream sort/filter behavior is unaffected when there
 * are no duplicates.
 */
export function buildShortlistDedupeClusters(
    sections: ShortlistSectionLite[],
): Map<string, ShortlistDedupeCluster> {
    const clusters = new Map<string, ShortlistDedupeCluster>()

    for (const section of sections) {
        const hubId = section.zentrumHubId || section.entityId
        if (!hubId || !section.sectionId) continue
        const { checkIn, checkOut } = normalizeShortlistDates(section.startDate, section.endDate)
        const key = buildShortlistDedupeKey(hubId, checkIn, checkOut)
        const existing = clusters.get(key)
        if (existing) {
            if (!existing.sectionIds.includes(section.sectionId)) {
                existing.sectionIds.push(section.sectionId)
            }
        } else {
            clusters.set(key, {
                key,
                hubId,
                checkIn,
                checkOut,
                sectionIds: [section.sectionId],
            })
        }
    }

    // Sort sectionIds for deterministic delete order — useful for stable
    // optimistic updates / debug logs.
    for (const cluster of clusters.values()) {
        cluster.sectionIds.sort()
    }

    return clusters
}

/**
 * Convenience adapter: project raw collection `Section` objects (the shape
 * returned by `staysCollectionResponse.data.sections`) into the lite shape
 * the dedupe builder accepts. Filters out non-stay and zero-id sections.
 */
export function projectStaySectionsForDedupe(sections: Section[] | undefined): ShortlistSectionLite[] {
    if (!sections || sections.length === 0) return []
    const out: ShortlistSectionLite[] = []
    for (const section of sections) {
        if (section.section_type !== 'stays' || !section.id || !section.entity_id) continue
        const metadata = (section.metadata || {}) as {
            zentrum_hub_id?: unknown
            start_date?: string | null
            end_date?: string | null
        }
        const zentrumHubId = typeof metadata.zentrum_hub_id === 'string' ? metadata.zentrum_hub_id : undefined
        out.push({
            sectionId: section.id,
            entityId: section.entity_id,
            zentrumHubId,
            startDate: metadata.start_date ?? null,
            endDate: metadata.end_date ?? null,
        })
    }
    return out
}

/**
 * Build a lookup from a dedupe key (computed at the stay-card site with the
 * card's currently-displayed dates) to ALL underlying section ids. Used by
 * the StaysTab delete handler so removing one visible card removes every
 * shortlist record in its cluster.
 */
export function buildSectionIdsByDedupeKey(
    clusters: Map<string, ShortlistDedupeCluster>,
): Map<string, string[]> {
    const out = new Map<string, string[]>()
    for (const [key, cluster] of clusters) {
        out.set(key, cluster.sectionIds.slice())
    }
    return out
}

/**
 * Cluster shortlist sections using a resolver that returns the same
 * (checkIn, checkOut) the visible card displays. Required for tripboard mode
 * where `buildCorrectedDatesMap` overrides per-section metadata dates with
 * the itinerary window or itinerary-stay sub-range — so two sections with
 * different saved `start_date`s but the same hubId still render with one
 * date pair and must therefore live in one cluster.
 *
 * The resolver receives the section's hubId and may return undefined for
 * either side (e.g. missing dates); the dedupe-key fallback handles that.
 */
export function buildShortlistDedupeClustersWithResolver(
    sections: ShortlistSectionLite[],
    resolveDates: (hubId: string) => { checkIn: string | undefined; checkOut: string | undefined } | undefined,
): Map<string, ShortlistDedupeCluster> {
    const clusters = new Map<string, ShortlistDedupeCluster>()
    for (const section of sections) {
        const hubId = section.zentrumHubId || section.entityId
        if (!hubId || !section.sectionId) continue
        const resolved = resolveDates(hubId)
        // Resolver wins when it returns *any* value (even one-sided);
        // fall back to the section's own metadata only when the resolver
        // returns nothing (collection-only mode / no itinerary).
        const { checkIn, checkOut } = resolved
            ? normalizeShortlistDates(resolved.checkIn, resolved.checkOut)
            : normalizeShortlistDates(section.startDate, section.endDate)
        const key = buildShortlistDedupeKey(hubId, checkIn, checkOut)
        const existing = clusters.get(key)
        if (existing) {
            if (!existing.sectionIds.includes(section.sectionId)) {
                existing.sectionIds.push(section.sectionId)
            }
        } else {
            clusters.set(key, { key, hubId, checkIn, checkOut, sectionIds: [section.sectionId] })
        }
    }
    for (const cluster of clusters.values()) cluster.sectionIds.sort()
    return clusters
}
