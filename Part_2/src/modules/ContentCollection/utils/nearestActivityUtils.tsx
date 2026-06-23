import React from 'react'
import { Link } from 'react-router-dom'

/** Lat/lng pair for an activity — used to compute distance-to-nearest-activity. */
export interface ActivityPoint {
    id: string
    lat: number
    lng: number
    /** Display name (fallback). */
    name?: string
    /**
     * Canonical experience identifier (slug-like, e.g. "clarke-quay"). When
     * present, title-cased for display.
     */
    identifier?: string
    /** Experience entity id — used to build the `/experiences/<id>` link. */
    experienceId?: string
}

export interface NearestActivityResult {
    km: number
    activity: ActivityPoint
}

/** Haversine distance (km) between two coordinate pairs. */
export function haversineKm(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number }
): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const R = 6371
    const dLat = toRad(b.lat - a.lat)
    const dLng = toRad(b.lng - a.lng)
    const lat1 = toRad(a.lat)
    const lat2 = toRad(b.lat)
    const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Find the nearest activity to a given point. Null when no valid activities. */
export function findNearestActivity(
    point: { lat: number; lng: number } | null,
    activities: ActivityPoint[] | undefined
): NearestActivityResult | null {
    if (!point || !activities || activities.length === 0) return null
    if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return null
    let best: NearestActivityResult | null = null
    for (const act of activities) {
        if (!Number.isFinite(act.lat) || !Number.isFinite(act.lng)) continue
        const km = haversineKm(point, { lat: act.lat, lng: act.lng })
        if (best == null || km < best.km) best = { km, activity: act }
    }
    return best
}

/**
 * Format a kebab/snake-cased identifier as title case, e.g.
 * "clarke-quay" → "Clarke Quay". Returns null when input is empty.
 */
export function titleCaseIdentifier(raw: string | null | undefined): string | null {
    if (!raw) return null
    const cleaned = raw.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
    if (!cleaned) return null
    return cleaned.replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Build the locationTag ReactNode shown on stay cards when a nearest
 * activity is available. Returns null when either the distance or the
 * activity label can't be resolved — caller should gate shimmer/fallback
 * on that.
 */
export function buildDistanceLocationTag(nearest: NearestActivityResult | null): React.ReactNode | null {
    if (!nearest || !nearest.activity) return null
    const rawLabel = nearest.activity.identifier || nearest.activity.name
    const activityLabel = titleCaseIdentifier(rawLabel)
    if (!activityLabel) return null
    const distancePart =
        nearest.km < 1
            ? `${Math.round(nearest.km * 1000)}m from `
            : `${nearest.km.toFixed(1)}km from `
    const experienceId = nearest.activity.experienceId
    return (
        <>
            {distancePart}
            {experienceId ? (
                <Link
                    to={`/experiences/${experienceId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="underline hover:text-primary-default transition-colors">
                    {activityLabel}
                </Link>
            ) : (
                activityLabel
            )}
        </>
    )
}
