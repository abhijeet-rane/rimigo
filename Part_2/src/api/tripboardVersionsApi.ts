import apiClient from '@/lib/api/apiClient'

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface TripboardVersionAuthor {
    id: string | null
    name: string
    role: 'traveler' | 'internal' | 'system'
}

export interface TripboardCitySegment {
    name: string
    nights: number
}

export interface TripboardVersionSummary {
    cities: string[]
    /**
     * Consecutive-same-city days collapsed into segments — mirrors the
     * Itinerary tab's CityRouteBar shape so the version card can show
     * "Ubud · 4 nights → Seminyak · 3 nights".
     */
    city_segments?: TripboardCitySegment[]
    /** Single country name when the whole trip is in one country, else null. */
    country?: string | null
    day_count: number
    slot_count: number
    stay_count: number
    activity_count: number
    start_date: string | null
    end_date: string | null
}

export type TripboardVersionType = 'manual' | 'auto_pre_restore' | 'auto_destructive'

export interface TripboardVersion {
    id: string
    trip_id: string
    name: string
    note: string
    summary: TripboardVersionSummary
    author: TripboardVersionAuthor
    version_type: TripboardVersionType
    triggered_by_action: string
    /** For auto_pre_restore versions: the id of the version that was being restored. */
    triggered_by_version_id?: string | null
    /** For auto_pre_restore versions: the human-readable name of the version being restored. */
    triggered_by_version_name?: string | null
    /** Pinned versions are protected from retention sweeps and surface above siblings. */
    is_pinned?: boolean
    pinned_at?: string | null
    created_at: string
}

export interface TripboardVersionFull extends TripboardVersion {
    /** Full snapshot of the tripboard at version creation time. Shape matches backend's _build_snapshot. */
    snapshot: Record<string, unknown>
}

export interface ListVersionsResponse {
    versions: TripboardVersion[]
    count: number
}

export interface RestoreVersionResponse {
    success: boolean
    restored_version_id: string
    backup_version_id: string
}

// ─── API methods ────────────────────────────────────────────────────────────────

/**
 * List all versions for a trip, newest first.
 * Internal users can pass `includeDeleted` to see soft-deleted versions.
 */
export const listTripboardVersions = async (
    tripId: string,
    options?: { includeDeleted?: boolean },
): Promise<ListVersionsResponse> => {
    const params: Record<string, string> = {}
    if (options?.includeDeleted) params.include_deleted = 'true'
    const response = await apiClient.get<ListVersionsResponse>(
        `/api/trips/${tripId}/versions/`,
        { params },
    )
    return response.data
}

/**
 * Save a manual version of the current tripboard state.
 */
export const saveTripboardVersion = async (
    tripId: string,
    payload: { name: string; note?: string },
): Promise<{ version: TripboardVersion }> => {
    const response = await apiClient.post<{ version: TripboardVersion }>(
        `/api/trips/${tripId}/versions/`,
        payload,
    )
    return response.data
}

/**
 * Fetch a single version with its full snapshot — used for preview/restore.
 */
export const getTripboardVersion = async (
    tripId: string,
    versionId: string,
): Promise<{ version: TripboardVersionFull }> => {
    const response = await apiClient.get<{ version: TripboardVersionFull }>(
        `/api/trips/${tripId}/versions/${versionId}/`,
    )
    return response.data
}

/**
 * Restore a version. Backend auto-saves the current state as a backup first
 * and returns the IDs of both the restored version and the backup.
 */
export const restoreTripboardVersion = async (
    tripId: string,
    versionId: string,
): Promise<RestoreVersionResponse> => {
    const response = await apiClient.post<RestoreVersionResponse>(
        `/api/trips/${tripId}/versions/${versionId}/restore/`,
    )
    return response.data
}

/**
 * Soft-delete a version. Only Rimigo internal users can do this — non-internal
 * users will get a 403 from the backend.
 */
export const deleteTripboardVersion = async (
    tripId: string,
    versionId: string,
): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(
        `/api/trips/${tripId}/versions/${versionId}/`,
    )
    return response.data
}

/**
 * Pin or unpin a version. Pinned versions:
 * - float to the top of their day group in the timeline
 * - are protected from retention/cleanup sweeps
 * - cannot be deleted directly (must unpin first)
 */
export const pinTripboardVersion = async (
    tripId: string,
    versionId: string,
    pinned: boolean,
): Promise<{ version: TripboardVersion }> => {
    const response = await apiClient.post<{ version: TripboardVersion }>(
        `/api/trips/${tripId}/versions/${versionId}/pin/`,
        { pinned },
    )
    return response.data
}

// ─── Diff ───────────────────────────────────────────────────────────────

export interface TripboardSlotChange {
    field: string
    before: unknown
    after: unknown
}

export interface TripboardDiffSlot {
    slot_id: string
    title: string
    kind: string
    day_date: string | null
    /** Only present on `modified` entries. */
    changes?: TripboardSlotChange[]
}

export interface TripboardSummaryDelta {
    before: number
    after: number
    delta: number
}

export interface TripboardDiff {
    base: TripboardVersion
    head: TripboardVersion
    summary_delta: {
        day_count: TripboardSummaryDelta
        slot_count: TripboardSummaryDelta
        stay_count: TripboardSummaryDelta
        activity_count: TripboardSummaryDelta
    }
    added: TripboardDiffSlot[]
    removed: TripboardDiffSlot[]
    modified: TripboardDiffSlot[]
    total_changes: number
}

/**
 * Slot-level diff between two versions.
 * `head` is the newer version (path), `base` is the older one (query).
 */
export const diffTripboardVersions = async (
    tripId: string,
    headVersionId: string,
    baseVersionId: string,
): Promise<TripboardDiff> => {
    const response = await apiClient.get<TripboardDiff>(
        `/api/trips/${tripId}/versions/${headVersionId}/diff/`,
        { params: { base: baseVersionId } },
    )
    return response.data
}
