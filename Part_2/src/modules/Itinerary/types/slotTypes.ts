/**
 * Slot type picker options shown in the Add Slot modal.
 *
 * Transport was previously split into six fixed sub-kinds
 * (flight/train/bus/ferry/car/private_transport); now it's a single
 * ``transport`` entry that opens a searchable dropdown backed by
 * ``transportModes.ts`` (~150 iconic modes). The backend ``slot.kind``
 * lands as whichever kind the selected mode maps to (e.g. Shinkansen
 * → ``train``, Metro → ``metro``), so downstream route-summary
 * classification keeps working.
 */
export interface SlotType {
    value: 'experience' | 'transport' | 'restaurant' | 'meal' | 'place' | 'custom'
    label: string
}
/**
 * One nested stop inside a Day Tour slot. A Day Tour is a single
 * itinerary slot whose experience is a group activity; the backend
 * carries its child stops as ``slot_data.linked_activities`` (already
 * sorted by ``order``). Per product decision there are no per-activity
 * times — only the whole-tour window derived from the slot's own
 * ``start_time`` / ``end_time``.
 */
export interface LinkedActivitySnapshot {
    experience_id: string
    name: string
    identifier?: string
    landscape_image?: string | null
    base_city_id?: string | null
    base_city_name?: string | null
    order?: number
    time_slot?: string | null
    duration?: number | null
    notes?: string | null
}

/**
 * Day-tour fields layered onto an experience slot's ``slot_data``. When
 * ``is_group_experience`` is true and ``linked_activities`` is non-empty,
 * the kanban renders the Day Tour hero card instead of the standard
 * experience hero.
 */
export interface DayTourSlotData {
    is_group_experience?: boolean
    linked_activities?: LinkedActivitySnapshot[]
}

export const SLOT_TYPES: SlotType[] = [
    {
        value: 'experience',
        label: 'Activity'
    },
    {
        value: 'transport',
        label: 'Transport'
    },
    {
        value: 'meal',
        label: 'Meal'
    },
    {
        value: 'place',
        label: 'Place'
    },
    {
        value: 'custom',
        label: 'Other'
    }
]
