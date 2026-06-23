// PDF mirror of src/modules/Itinerary/utils/deriveStayMap.ts —
// check_in_date is inclusive, check_out_date is exclusive (morning
// after the last night). Backend pre-truncates overlaps, so the
// earliest-check-in stay wins on any contested day.
import type { PdfDay, PdfStay } from '../types'

const ymd = (v: string | null | undefined): string => (v ? v.slice(0, 10) : '')

export function pickStayForDay(day: PdfDay, stays: PdfStay[]): PdfStay | null {
    const dayDate = ymd(day.date)
    if (!dayDate || !stays?.length) return null
    const sorted = stays
        .filter((s) => s.check_in_date && s.check_out_date)
        .slice()
        .sort((a, b) => ymd(a.check_in_date).localeCompare(ymd(b.check_in_date)))
    for (const stay of sorted) {
        const ci = ymd(stay.check_in_date)
        const co = ymd(stay.check_out_date)
        if (ci <= dayDate && dayDate < co) return stay
    }
    return null
}

export type StayDayRole = 'check-in' | 'staying' | 'check-out'

export function stayRoleForDay(day: PdfDay, stay: PdfStay): StayDayRole {
    const dayDate = ymd(day.date)
    if (ymd(stay.check_in_date) === dayDate) return 'check-in'
    // Treat the day before check-out as the last night (check_out is exclusive).
    return 'staying'
}
