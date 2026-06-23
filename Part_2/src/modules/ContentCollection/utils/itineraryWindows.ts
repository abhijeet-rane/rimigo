// Compute per-city stay windows from itinerary days.
//
// Rule:
// Group consecutive calendar days by `base_city.id` into runs. For each run:
//   checkIn  = run[0].date
//   checkOut = nextRun         ? nextRun[0].date
//            : run.last.hasFlight ? run.last.date  (departure flight that day)
//            : run.last.date                       (literal last day of itinerary, no +1)
//
// The final run's checkOut is the last day of the trip — no final night is
// added even when there's no flight signal, because that day IS the last day
// of the itinerary. hasFlight is preserved as the only trustworthy
// "leaving today" signal; `type` (including `departure`) is not consulted —
// real data had it mid-run followed by another stay.
//
// Cities can appear multiple times in the output (return trips A → B → A
// produce two A-windows). Output is sorted by checkIn ascending.
//
// destination_city, is_checkin_day, is_checkout_day, and `type` are all
// unreliable in observed data and are not consulted. overnight_transit days
// are dropped from window computation.

export type ItineraryDayInput = {
    date: string | Date
    base_city?: { id: string; name: string } | null
    destination_city?: { id: string; name: string } | null
    type?: string
    overnight_transit?: boolean
    slots?: Array<{ kind?: string }>
}

export type ItineraryCityWindow = {
    id: string
    name: string
    checkIn: string
    checkOut: string
}

const toYMD = (date: ItineraryDayInput['date']): string | null => {
    if (typeof date === 'string') return date.split('T')[0] || null
    if (date instanceof Date) {
        const ymd = date.toISOString().split('T')[0]
        return ymd || null
    }
    return null
}

// Add N days to a YYYY-MM-DD string, returning YYYY-MM-DD. Uses UTC to avoid
// timezone shifts (input has no time-of-day meaning).
export function addDaysToYMD(ymd: string, days: number): string {
    const [y, m, d] = ymd.split('-').map((v) => parseInt(v, 10))
    if (!y || !m || !d) return ymd
    const dt = new Date(Date.UTC(y, m - 1, d))
    dt.setUTCDate(dt.getUTCDate() + days)
    return dt.toISOString().split('T')[0] || ymd
}

type NormalizedDay = { date: string; cityId: string; cityName: string; type?: string; hasFlight: boolean }

function normalize(days: ItineraryDayInput[]): NormalizedDay[] {
    const byDate = new Map<string, NormalizedDay>()
    for (const day of days) {
        if (day.overnight_transit === true) continue
        const ymd = toYMD(day.date)
        if (!ymd) continue
        const city = day.base_city
        if (!city?.id || !city?.name) continue
        const hasFlight = Array.isArray(day.slots) && day.slots.some((s) => s?.kind === 'flight')
        // Last-write-wins on duplicate dates (defensive against bad data).
        byDate.set(ymd, { date: ymd, cityId: city.id, cityName: city.name, type: day.type, hasFlight })
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export function computeItineraryWindows(days: ItineraryDayInput[]): ItineraryCityWindow[] {
    const sorted = normalize(days)
    if (sorted.length === 0) return []

    const runs: NormalizedDay[][] = []
    let current: NormalizedDay[] = [sorted[0]!]
    for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1]!
        const day = sorted[i]!
        const isConsecutive = addDaysToYMD(prev.date, 1) === day.date
        if (day.cityId === prev.cityId && isConsecutive) {
            current.push(day)
        } else {
            runs.push(current)
            current = [day]
        }
    }
    runs.push(current)

    const windows: ItineraryCityWindow[] = []
    for (let i = 0; i < runs.length; i++) {
        const run = runs[i]!
        const first = run[0]!
        const last = run[run.length - 1]!
        const nextRun = runs[i + 1]
        let checkOut: string
        if (nextRun) {
            checkOut = nextRun[0]!.date
        } else if (last.type === 'departure' || last.hasFlight) {
            // Trip-end day with an outbound flight (or backend-tagged
            // departure) → user leaves that day, no final night.
            checkOut = last.date
        } else {
            // Literally the last day of the itinerary → no +1, no final night.
            checkOut = last.date
        }
        windows.push({ id: first.cityId, name: first.cityName, checkIn: first.date, checkOut })
    }

    return windows.sort((a, b) => a.checkIn.localeCompare(b.checkIn))
}
