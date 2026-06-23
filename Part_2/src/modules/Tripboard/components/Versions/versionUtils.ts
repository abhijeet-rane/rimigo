import type { TripboardVersion } from '@/api/tripboardVersionsApi'

/** Format an ISO timestamp into a friendly relative + absolute label. */
export function formatVersionTimestamp(iso: string | null | undefined): {
    relative: string
    absolute: string
} {
    if (!iso) return { relative: '', absolute: '' }
    const d = new Date(iso)
    if (isNaN(d.getTime())) return { relative: '', absolute: '' }

    const now = Date.now()
    const diffMs = now - d.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHr = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHr / 24)

    let relative: string
    if (diffSec < 60) relative = 'just now'
    else if (diffMin < 60) relative = `${diffMin}m ago`
    else if (diffHr < 24) relative = `${diffHr}h ago`
    else if (diffDay < 7) relative = `${diffDay}d ago`
    else
        relative = d.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: now - d.getTime() > 1000 * 60 * 60 * 24 * 365 ? 'numeric' : undefined,
        })

    const absolute = d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })

    return { relative, absolute }
}

/**
 * Build the headline text for a version card.
 * - Manual versions → use the user's name as-is
 * - Auto-saves → friendly story like "Backup before restoring 'Day 3 v2'"
 */
export function buildVersionTitle(v: TripboardVersion): string {
    if (v.version_type === 'auto_pre_restore') {
        const target = v.triggered_by_version_name?.trim()
        if (target) return `Backup before restoring "${target}"`
        return 'Backup before restore'
    }
    if (v.version_type === 'auto_destructive') {
        return v.name?.trim() || 'Auto-saved version'
    }
    return v.name?.trim() || 'Untitled version'
}

/**
 * Subtitle: trip-shape summary like "May 12 → 18 · 3 cities · 4 stays".
 * Falls back to bare counts when dates are missing.
 */
export function buildVersionSubtitle(v: TripboardVersion): string {
    const parts: string[] = []

    // Date range first — most descriptive of the trip shape
    const dateRange = formatTripDateRange(v.summary?.start_date, v.summary?.end_date)
    if (dateRange) {
        parts.push(dateRange)
    } else if (v.summary?.day_count) {
        parts.push(`${v.summary.day_count}-day trip`)
    }

    // Cities — show first 2 by name, then "+N more"
    const cities = v.summary?.cities || []
    if (cities.length > 0) {
        if (cities.length <= 2) parts.push(cities.join(' · '))
        else parts.push(`${cities.slice(0, 2).join(' · ')} +${cities.length - 2} more`)
    }

    // Counts — only if we have something to show
    const countParts: string[] = []
    if (v.summary?.stay_count) {
        countParts.push(`${v.summary.stay_count} ${v.summary.stay_count === 1 ? 'stay' : 'stays'}`)
    }
    if (v.summary?.activity_count) {
        countParts.push(
            `${v.summary.activity_count} ${v.summary.activity_count === 1 ? 'activity' : 'activities'}`,
        )
    }
    if (countParts.length) parts.push(countParts.join(' · '))

    return parts.join(' · ')
}

/** "May 12 → 18" or "May 12 → Jun 3" or null if dates missing. */
function formatTripDateRange(startIso?: string | null, endIso?: string | null): string | null {
    if (!startIso || !endIso) return null
    const start = new Date(startIso)
    const end = new Date(endIso)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null

    const startStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    // If same month, only show the day for the end date (compact form)
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
    const endStr = sameMonth
        ? end.toLocaleDateString(undefined, { day: 'numeric' })
        : end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return `${startStr} → ${endStr}`
}

/**
 * Decide whether an auto-saved version's user-supplied "note" field is
 * actually a note worth showing the traveler. Internal metadata like
 * "Automatic backup created before restoring version <oid>" should be hidden.
 */
export function shouldShowNote(v: TripboardVersion): boolean {
    if (!v.note?.trim()) return false
    // Hide notes on auto-saves — by design these never carry user-meaningful content
    if (v.version_type !== 'manual') return false
    return true
}

/** Whether this version represents an auto-save vs a manual save. */
export function isAutoVersion(v: TripboardVersion): boolean {
    return v.version_type !== 'manual'
}

/**
 * Format a version's creation time for display in the timeline.
 * For today: "2:30 PM"
 * For older: "May 4, 2:30 PM"
 */
export function formatVersionTime(iso: string | null | undefined): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const now = new Date()
    const isToday =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()

    const time = d.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
    })

    if (isToday) return time
    const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return `${date}, ${time}`
}

/**
 * Friendly group label for a date, used as a section header in the timeline.
 * Mirrors Google Docs / Sheets conventions: Today / Yesterday / weekday name
 * (within the past week) / month + day for older entries.
 */
export function formatDayHeader(iso: string | null | undefined): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''

    const startOfDay = (date: Date) => {
        const c = new Date(date)
        c.setHours(0, 0, 0, 0)
        return c
    }
    const today = startOfDay(new Date())
    const target = startOfDay(d)
    const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000)

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) {
        return d.toLocaleDateString(undefined, { weekday: 'long' })
    }
    return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: target.getFullYear() === today.getFullYear() ? undefined : 'numeric',
    })
}

/**
 * Date range as `May 12 – 18` or `May 12 – Jun 3`. Returns null if missing.
 * Uses an en-dash for visual cleanliness vs the previous `→`.
 */
export function formatTripDates(startIso?: string | null, endIso?: string | null): string | null {
    if (!startIso || !endIso) return null
    const start = new Date(startIso)
    const end = new Date(endIso)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
    const startStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const endStr = sameMonth
        ? end.toLocaleDateString(undefined, { day: 'numeric' })
        : end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return `${startStr} – ${endStr}`
}

/**
 * Group versions by day for Google-Docs-style section headers in the timeline.
 * Order is preserved (versions arrive newest-first).
 */
export function groupVersionsByDay(versions: TripboardVersion[]): {
    label: string
    versions: TripboardVersion[]
}[] {
    const groups: { label: string; versions: TripboardVersion[] }[] = []
    let currentLabel: string | null = null

    for (const v of versions) {
        const label = formatDayHeader(v.created_at) || 'Earlier'
        if (label !== currentLabel) {
            groups.push({ label, versions: [v] })
            currentLabel = label
        } else {
            groups[groups.length - 1].versions.push(v)
        }
    }
    return groups
}
