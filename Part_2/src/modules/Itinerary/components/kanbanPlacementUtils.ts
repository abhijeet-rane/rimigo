
/** Lifted to parent so "Custom" time can finish placement after Edit Slot saves */
export type KanbanPendingPlacement = {
    event: any
    sourceDayIndex: number
    targetDayIndex: number
    insertIndex: number
    anchorUtcMs: number
    durationMs: number
}

export type KanbanPlacementCommitPayload = {
    event: any
    sourceDayIndex: number
    targetDayIndex: number
    insertIndex: number
    newStartIso: string
    newEndIso: string
}

export type KanbanCustomTimeOpenArgs = {
    event: any
    sourceDayIndex: number
    targetDayIndex: number
    insertIndex: number
    provisionalStart: Date
    provisionalEnd: Date
    baseCity?: { id: string; name: string; country: string }
}

export const KANBAN_TIME_GAP_MS = 15 * 60 * 1000

export const formatKanbanTimeLabel = (dateStr: string | Date | null) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    const hours = d.getUTCHours()
    const minutes = d.getUTCMinutes()
    const period = hours >= 12 ? 'pm' : 'am'
    const hour12 = hours % 12 || 12
    return `${hour12}:${minutes.toString().padStart(2, '0')}${period}`
}

export const isKanbanEventVisible = (event: any) => {
    const isCustom = event.type === 'custom' || event.kind === 'custom'
    const hasNoTime = !event.start && !event.end
    return !(isCustom && hasNoTime)
}

export const getEventDurationMs = (ev: any): number => {
    const s = ev.start || ev.start_time
    const e = ev.end || ev.end_time
    if (s && e) {
        const ms = new Date(e).getTime() - new Date(s).getTime()
        if (ms > 0) return ms
    }
    if (ev.duration_minutes) return ev.duration_minutes * 60 * 1000
    return 60 * 60 * 1000
}

export const sortKanbanEventsByTime = (list: any[]) =>
    [...list].sort((a, b) => {
        const aStart = a.start ? new Date(a.start).getTime() : new Date(a.start_time || 0).getTime()
        const bStart = b.start ? new Date(b.start).getTime() : new Date(b.start_time || 0).getTime()
        if (aStart !== bStart) return aStart - bStart
        const ao = a.order ?? a.slotIndex ?? 0
        const bo = b.order ?? b.slotIndex ?? 0
        return ao - bo
    })

/** Target-day list without the moving slot, sorted by time — insertIndex refers to this list */
export const sortedVisibleForDay = (events: any[], dayIndex: number) =>
    sortKanbanEventsByTime(events.filter((e) => e.dayIndex === dayIndex && isKanbanEventVisible(e)))

/**
 * True when a drop keeps the slot on the same day at the same visual index (no reorder).
 * In that case we skip the “choose start time” strip.
 */
export const kanbanDropIsNoOpSamePosition = (
    ev: any,
    targetDayIndex: number,
    sortedForHit: any[],
    events: any[],
    insertionTarget: { dayIndex: number; insertIndex: number } | null
): boolean => {
    if (!ev?.slot_id || ev.dayIndex !== targetDayIndex) return false
    const cur = sortedForHit.findIndex((x) => x.slot_id === ev.slot_id)
    if (cur === -1) return false
    let insertIndex =
        insertionTarget?.dayIndex === targetDayIndex ? insertionTarget.insertIndex : sortedForHit.length
    if (cur < insertIndex) insertIndex -= 1
    const listWithout = sortedVisibleForDay(events, targetDayIndex).filter((x) => x.slot_id !== ev.slot_id)
    insertIndex = Math.max(0, Math.min(insertIndex, listWithout.length))
    return insertIndex === cur
}

/** Provisional anchor (UTC ms) for the dropped slot from neighbours on the target day */
export const computePlacementAnchorUtcMs = (
    targetDayDate: Date,
    insertIndex: number,
    listWithoutMoved: any[],
    movedDurationMs: number
): number => {
    const prev = insertIndex > 0 ? listWithoutMoved[insertIndex - 1] : null
    const next = insertIndex < listWithoutMoved.length ? listWithoutMoved[insertIndex] : null

    const dayY = targetDayDate.getUTCFullYear()
    const dayM = targetDayDate.getUTCMonth()
    const dayD = targetDayDate.getUTCDate()

    const atUtc = (h: number, m: number) => Date.UTC(dayY, dayM, dayD, h, m, 0, 0)

    if (prev && next) {
        const prevEnd = new Date(prev.end || prev.end_time).getTime()
        const nextStart = new Date(next.start || next.start_time).getTime()
        const gap = nextStart - prevEnd - movedDurationMs
        if (gap >= KANBAN_TIME_GAP_MS) return prevEnd + KANBAN_TIME_GAP_MS
        const mid = Math.floor(prevEnd + (nextStart - prevEnd - movedDurationMs) / 2)
        return Math.max(prevEnd + KANBAN_TIME_GAP_MS, Math.min(mid, nextStart - movedDurationMs - KANBAN_TIME_GAP_MS))
    }
    if (prev) {
        return new Date(prev.end || prev.end_time).getTime() + KANBAN_TIME_GAP_MS
    }
    if (next) {

        const nextStartMs = new Date(next.start || next.start_time).getTime()
        if (Number.isFinite(nextStartMs)) return nextStartMs
    }
    return atUtc(10, 0)
}

export const mergePendingIntoSortedList = (dayIndex: number, events: any[], pending: KanbanPendingPlacement | null): any[] => {
    if (!pending) return sortedVisibleForDay(events, dayIndex)
    const { event, sourceDayIndex, targetDayIndex, anchorUtcMs, durationMs, insertIndex } = pending
    const sid = event.slot_id
    if (!sid) return sortedVisibleForDay(events, dayIndex)

    const movedShell = {
        ...event,
        dayIndex: targetDayIndex,
        start: new Date(anchorUtcMs).toISOString(),
        end: new Date(anchorUtcMs + durationMs).toISOString(),
        start_time: new Date(anchorUtcMs).toISOString(),
        end_time: new Date(anchorUtcMs + durationMs).toISOString()
    }

    /** While choosing time, keep the dropped visual order (insertIndex); do not re-sort by provisional times. */
    const insertShellAtPendingIndex = (listWithoutMoved: any[]) => {
        const clamped = Math.max(0, Math.min(insertIndex, listWithoutMoved.length))
        const out = [...listWithoutMoved]
        out.splice(clamped, 0, movedShell)
        return out
    }

    if (sourceDayIndex !== targetDayIndex) {
        if (dayIndex === sourceDayIndex) {
            return sortKanbanEventsByTime(
                events.filter((e) => e.dayIndex === dayIndex && isKanbanEventVisible(e) && e.slot_id !== sid)
            )
        }
        if (dayIndex === targetDayIndex) {
            const listWithout = sortedVisibleForDay(events, dayIndex)
            return insertShellAtPendingIndex(listWithout)
        }
        return sortedVisibleForDay(events, dayIndex)
    }

    if (dayIndex !== targetDayIndex) return sortedVisibleForDay(events, dayIndex)
    const listWithout = sortedVisibleForDay(events, dayIndex).filter((e) => e.slot_id !== sid)
    return insertShellAtPendingIndex(listWithout)
}

/** Marks the row that shows “choose start time”; used with {@link scrollKanbanPendingPlacementIntoView}. */
export const KANBAN_PENDING_PLACEMENT_ATTR = 'data-kanban-pending-slot'

const PLACEMENT_SCROLL_PAD_PX = 20

/**
 * Scrolls the nearest vertical overflow ancestor so the pending placement row (card + time UI) is in view.
 * @param root Optional subtree root (e.g. desktop kanban horizontal scroller) for querySelector scope.
 */
export const scrollKanbanPendingPlacementIntoView = (root?: HTMLElement | null): void => {
    const scope: Document | HTMLElement = root ?? document
    const el = scope.querySelector<HTMLElement>(`[${KANBAN_PENDING_PLACEMENT_ATTR}]`)
    if (!el) return

    let p: HTMLElement | null = el.parentElement
    while (p) {
        if (root && !root.contains(p)) break
        const { overflowY } = getComputedStyle(p)
        if (
            (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
            p.scrollHeight > p.clientHeight + 2
        ) {
            const er = el.getBoundingClientRect()
            const pr = p.getBoundingClientRect()
            let delta = 0
            if (er.top < pr.top + PLACEMENT_SCROLL_PAD_PX) {
                delta = er.top - pr.top - PLACEMENT_SCROLL_PAD_PX
            } else if (er.bottom > pr.bottom - PLACEMENT_SCROLL_PAD_PX) {
                delta = er.bottom - pr.bottom + PLACEMENT_SCROLL_PAD_PX
            }
            if (delta !== 0) {
                p.scrollBy({ top: delta, behavior: 'smooth' })
            }
            return
        }
        p = p.parentElement
    }
}

/** Sorted slot ids for a day — stable while that bundle of slots stays on one logical column. */
export function kanbanDaySlotSignatureKey(dayData: any): string | null {
    const ids = (dayData?.slots || [])
        .map((s: { slot_id?: string }) => s?.slot_id)
        .filter(Boolean) as string[]
    if (ids.length === 0) return null
    ids.sort()
    return `kcol:slots:${ids.join('|')}`
}

/**
 * React list key for a kanban day column (must stay stable when calendar `date` is remapped after reorder).
 */
export function getKanbanDayColumnKey(dayData: any): string {
    if (dayData?._kanbanColumnKey && typeof dayData._kanbanColumnKey === 'string') {
        return dayData._kanbanColumnKey
    }
    const slotKey = kanbanDaySlotSignatureKey(dayData)
    if (slotKey) return slotKey
    try {
        const d = dayData?.date ? new Date(dayData.date) : new Date(0)
        return `kcol:date:${d.toISOString()}`
    } catch {
        return 'kcol:date:invalid'
    }
}

/**
 * Assign a persistent `_kanbanColumnKey` when cloning days for reorder (empty columns get a UUID once).
 */
export function assignKanbanColumnKeyForReorder(dayData: any): string {
    if (dayData?._kanbanColumnKey && typeof dayData._kanbanColumnKey === 'string') {
        return dayData._kanbanColumnKey
    }
    const slotKey = kanbanDaySlotSignatureKey(dayData)
    if (slotKey) return slotKey
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `kcol:${crypto.randomUUID()}`
    }
    return `kcol:t:${Date.now()}:${Math.random().toString(36).slice(2, 11)}`
}
