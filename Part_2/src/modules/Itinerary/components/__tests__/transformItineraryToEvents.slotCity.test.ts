import { describe, it, expect } from 'vitest'
import { transformItineraryToEvents } from '../RenderCalenderContent'

/**
 * Regression: the edit composer seeds its city picker from the slot's own
 * city. The calendar view-model occupies the ``city`` key with the day's
 * base-city *name string*, so the canonical ``{_id, name}`` slot city must
 * be threaded through under a distinct ``slotCity`` key — otherwise editing
 * a slot whose city differs from the day resets it to the day city.
 */
describe('transformItineraryToEvents — slotCity threading', () => {
    const days = [
        {
            date: '2026-04-10T00:00:00.000Z',
            type: 'normal',
            base_city: { id: 'kl-id', name: 'Kuala Lumpur' },
            slots: [
                {
                    slot_id: 's1',
                    order: 0,
                    kind: 'experience',
                    title: 'Street Art Hunt',
                    start_time: '2026-04-10T09:00:00.000Z',
                    end_time: '2026-04-10T11:00:00.000Z',
                    // Slot physically sits in Penang, not the day's KL base.
                    city: { _id: 'penang-id', name: 'Penang' }
                }
            ]
        }
    ]

    it('carries the slot {_id,name} city as slotCity, leaving city as the day name string', () => {
        const [event] = transformItineraryToEvents(days)

        expect(event.slotCity).toEqual({ _id: 'penang-id', name: 'Penang' })
        // The day-derived string stays on `city` (unchanged behaviour).
        expect(event.city).toBe('Kuala Lumpur')
    })

    it('sets slotCity to null when the slot has no own city', () => {
        const noCity = [{ ...days[0], slots: [{ ...days[0].slots[0], city: undefined }] }]
        const [event] = transformItineraryToEvents(noCity)

        expect(event.slotCity).toBeNull()
    })
})
