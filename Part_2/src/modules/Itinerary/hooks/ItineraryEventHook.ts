import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addSlot, updateSlot, patchSlot, deleteSlot, SlotPayload } from '../api/ItineraryApi'
import { IItineraryCompletedResponse } from './ItineraryHook'
import { SLOT_TYPES, SlotType } from '../types/slotTypes'

const SLOT_QUERY_KEY = (tripId: string) => ['tripSlots', tripId]

// ---------- ADD SLOT HOOK ----------

export const useAddSlot = (tripId: string, itineraryId: string) => {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: (payload: SlotPayload) => addSlot(tripId, itineraryId, payload),

        onMutate: async (_) => {
            // Cancel outgoing refetches
            await qc.cancelQueries({ queryKey: ['itineraryCompleted', itineraryId] })

            // Snapshot previous value
            const previousData = qc.getQueryData<IItineraryCompletedResponse>(['itineraryCompleted', itineraryId])

            // Don't do optimistic update for add (too complex)
            // Just prevent the UI jump by canceling queries

            return { previousData }
        },

        onSuccess: (data: IItineraryCompletedResponse) => {
            qc.setQueryData(['itineraryCompleted', itineraryId], data)
            qc.invalidateQueries({ queryKey: ['tripBudget'] })
        },

        onError: (_, __, context) => {
            // Rollback on error
            if (context?.previousData) {
                qc.setQueryData(['itineraryCompleted', itineraryId], context.previousData)
            }
        }
    })
}

export const useUpdateSlot = (tripId: string, itineraryId: string) => {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: ({ slotId, payload }: { slotId: string; payload: SlotPayload }) => updateSlot(tripId, itineraryId, slotId, payload),

        onMutate: async ({ slotId, payload }) => {
            await qc.cancelQueries({ queryKey: ['itineraryCompleted', itineraryId] })

            const previousData = qc.getQueryData<IItineraryCompletedResponse>(['itineraryCompleted', itineraryId])

            // Optimistically update the cache
            qc.setQueryData<IItineraryCompletedResponse>(['itineraryCompleted', itineraryId], (old) => {
                if (!old?.days) return old

                return {
                    ...old,
                    days: old.days.map((day) => ({
                        ...day,
                        slots: day.slots?.map((slot) => (slot.slot_id === slotId ? { ...slot, ...payload } : slot))
                    }))
                }
            })

            return { previousData }
        },

        onSuccess: (data: IItineraryCompletedResponse) => {
            qc.setQueryData(['itineraryCompleted', itineraryId], data)
            qc.invalidateQueries({ queryKey: ['tripBudget'] })
        },

        onError: (_, __, context) => {
            if (context?.previousData) {
                qc.setQueryData(['itineraryCompleted', itineraryId], context.previousData)
            }
        }
    })
}

export const useDeleteSlot = (tripId: string, itineraryId: string) => {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: ({ slotId }: { slotId: string }) => deleteSlot(tripId, itineraryId, slotId),

        onMutate: async ({ slotId }) => {
            await qc.cancelQueries({ queryKey: ['itineraryCompleted', itineraryId] })

            const previousData = qc.getQueryData<IItineraryCompletedResponse>(['itineraryCompleted', itineraryId])

            // Optimistically remove from cache
            qc.setQueryData<IItineraryCompletedResponse>(['itineraryCompleted', itineraryId], (old) => {
                if (!old?.days) return old

                return {
                    ...old,
                    days: old.days.map((day) => ({
                        ...day,
                        slots: day.slots?.filter((slot) => slot.slot_id !== slotId)
                    }))
                }
            })

            return { previousData }
        },

        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['itineraryCompleted', itineraryId] })
            qc.invalidateQueries({ queryKey: ['tripBudget'] })
        },

        onError: (_, __, context) => {
            if (context?.previousData) {
                qc.setQueryData(['itineraryCompleted', itineraryId], context.previousData)
            }
        }
    })
}

// ---------- PATCH SLOT HOOK ----------
export const usePatchSlot = (tripId: string, itineraryId: string) => {
    const qc = useQueryClient()

    return useMutation({
        mutationFn: ({ slotId, payload }: { slotId: string; payload: Partial<SlotPayload> }) => patchSlot(tripId, itineraryId, slotId, payload),
        onSuccess: (data: IItineraryCompletedResponse) => {
            qc.setQueryData(['itineraryCompleted', itineraryId], data)
            qc.invalidateQueries({ queryKey: SLOT_QUERY_KEY(tripId) })
            qc.invalidateQueries({ queryKey: ['tripBudget'] })
        }
    })
}

// Backend slot kinds that should resolve to the unified ``transport``
// option in the Add Slot modal. Previously each of these had its own
// picker card; now they all open the single TransportModeDropdown and
// the specific kind is preserved on ``slot_data.mode`` + restored via
// ``findTransportMode`` when editing.
const TRANSPORT_FAMILY_KINDS = new Set([
    'transport', 'flight', 'train', 'bus', 'transfer', 'ferry', 'car',
    'scooter', 'tuk-tuk', 'private_transport', 'helicopter', 'private-jet',
    'charter-flight', 'seaplane', 'metro', 'subway', 'tram', 'monorail',
    'light-rail', 'taxi', 'ride-hail', 'shared-cab', 'minibus', 'coach',
    'rickshaw', 'auto-rickshaw', 'campervan', 'motorbike', 'bicycle',
    'e-bike', 'e-scooter', 'boat', 'speedboat', 'cruise', 'houseboat',
    'water-taxi', 'walk', 'hike', 'shuttle', 'park-and-ride', 'car-rental',
    'bike-rental',
])

export const resolveSlotType = (kind?: string): SlotType => {
    if (!kind) {
        return SLOT_TYPES[0] // Default to first slot type (experience/activity)
    }

    // Any transport-family kind funnels into the single ``transport``
    // picker. The specific kind survives on ``slot_data.mode`` and is
    // rehydrated by TransportModeDropdown's ``initialLabel``.
    if (TRANSPORT_FAMILY_KINDS.has(kind)) {
        return SLOT_TYPES.find((type) => type.value === 'transport') || SLOT_TYPES[0]
    }

    const slotType = SLOT_TYPES.find((type) => type.value === kind)

    if (slotType) {
        return slotType
    }

    // If kind doesn't match any known type, default to custom
    return SLOT_TYPES.find((type) => type.value === 'custom') || SLOT_TYPES[0]
}
