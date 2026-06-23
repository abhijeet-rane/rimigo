// Locale fixed to en-IN — PDFs are render-locale-agnostic; can't trust
// the browser/Node default to land on the screen UI's date format.
const SAFE_LOCALE = 'en-IN'

// Slot times are naive wall-clock at the destination airport. `new
// Date(iso)` would interpret a trailing Z as UTC and shift by the
// renderer's offset (made the PDF show 9:55 am for a 4:25 am BLR
// flight). Parse HH:MM directly — mirrors FlightTransportCard.formatTime.
export function formatTime(iso?: string | null): string {
    if (!iso) return ''
    const timePart = iso.split('T')[1]
    if (!timePart) return ''
    const [hh, mm] = timePart.split(':').map(Number)
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return ''
    const period = hh >= 12 ? 'pm' : 'am'
    const hour12 = hh % 12 || 12
    return `${hour12}:${mm.toString().padStart(2, '0')} ${period}`
}

export function formatShortDate(iso?: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString(SAFE_LOCALE, {
        day: '2-digit',
        month: 'short',
    })
}

export function formatLongDate(iso?: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString(SAFE_LOCALE, {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
}

export function formatWeekdayShort(iso?: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString(SAFE_LOCALE, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
    })
}

export function durationDays(start?: string | null, end?: string | null): number | null {
    if (!start || !end) return null
    const s = new Date(start)
    const e = new Date(end)
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null
    const ms = e.getTime() - s.getTime()
    if (ms < 0) return null
    return Math.round(ms / (1000 * 60 * 60 * 24)) + 1 // inclusive of both ends
}
