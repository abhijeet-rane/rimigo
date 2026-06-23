export interface RoomOccupancy {
    numOfAdults: number // min 1
    childAges: number[] // each 0-17, length = children count
}

export type OccupanciesConfig = RoomOccupancy[]

export const DEFAULT_OCCUPANCIES: OccupanciesConfig = [{ numOfAdults: 2, childAges: [] }]
export const MAX_ROOMS = 8
// Matches the Kayak per-room adult cap on the backend; rooms exceeding this are
// auto-split (e.g. 6 → 4 + 2) so /accommodations and Kayak return prices.
export const MAX_ADULTS_PER_ROOM = 4
export const MAX_CHILDREN_PER_ROOM = 4
export const DEFAULT_CHILD_AGE = 5

/**
 * Flatten occupancies into flat values for compare API / legacy code.
 * adults = total across all rooms, children = total child count, noOfRooms = array length.
 */
export function flattenOccupancies(occupancies: OccupanciesConfig): {
    adults: number
    children: number
    childAges: number[]
    noOfRooms: number
} {
    let adults = 0
    let children = 0
    const childAges: number[] = []
    for (const room of occupancies) {
        adults += room.numOfAdults
        children += room.childAges.length
        childAges.push(...room.childAges)
    }
    return { adults, children, childAges, noOfRooms: occupancies.length }
}

/**
 * Convert legacy GuestsData + rooms into occupancies.
 * Puts all guests into room 1, remaining rooms get default 2 adults.
 * Result is normalized so no room exceeds MAX_ADULTS_PER_ROOM.
 */
export function guestsDataToOccupancies(
    guests: { adults: number; children: number; children_age: number[] },
    rooms: number
): OccupanciesConfig {
    const occupancies: OccupanciesConfig = []
    // Room 1 gets the actual guest config
    occupancies.push({
        numOfAdults: Math.max(1, guests.adults),
        childAges: (guests.children_age || []).slice(0, guests.children)
    })
    // Additional rooms get default config
    for (let i = 1; i < rooms; i++) {
        occupancies.push({ numOfAdults: 2, childAges: [] })
    }
    return normalizeOccupancies(occupancies)
}

/**
 * Split rooms whose adult count exceeds MAX_ADULTS_PER_ROOM into multiple rooms
 * (e.g. 6 → 4 + 2). Children stay with the first chunk so we don't separate
 * parents from kids. Total room count is capped at MAX_ROOMS as a safety net.
 */
export function normalizeOccupancies(occupancies: OccupanciesConfig): OccupanciesConfig {
    const out: OccupanciesConfig = []
    for (const room of occupancies) {
        if (room.numOfAdults <= MAX_ADULTS_PER_ROOM) {
            out.push(room)
            continue
        }
        let remaining = room.numOfAdults
        let first = true
        while (remaining > 0) {
            const take = Math.min(MAX_ADULTS_PER_ROOM, remaining)
            out.push({ numOfAdults: take, childAges: first ? room.childAges : [] })
            remaining -= take
            first = false
        }
    }
    return out.slice(0, MAX_ROOMS)
}

/**
 * Encode occupancies for URL param.
 * Format: "2|2-5,7" → Room 1: 2 adults | Room 2: 2 adults, children ages 5 and 7
 */
export function encodeOccupancies(occupancies: OccupanciesConfig): string {
    return occupancies
        .map((room) => {
            if (room.childAges.length === 0) return String(room.numOfAdults)
            return `${room.numOfAdults}-${room.childAges.join(',')}`
        })
        .join('|')
}

/**
 * Decode occupancies from URL param.
 * "2|2-5,7" → [{ numOfAdults: 2, childAges: [] }, { numOfAdults: 2, childAges: [5, 7] }]
 */
export function decodeOccupancies(param: string): OccupanciesConfig {
    if (!param) return DEFAULT_OCCUPANCIES
    return param.split('|').map((segment) => {
        const [adultsStr, agesStr] = segment.split('-')
        const numOfAdults = Math.max(1, parseInt(adultsStr, 10) || 2)
        const childAges = agesStr
            ? agesStr
                  .split(',')
                  .map((a) => parseInt(a, 10))
                  .filter((a) => !isNaN(a) && a >= 0 && a <= 17)
            : []
        return { numOfAdults, childAges }
    })
}
