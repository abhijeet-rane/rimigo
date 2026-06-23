import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { curatedBookingsApi, type CuratedBookingItemPayload } from '../api/curatedBookingsApi'

/** Curated Transport/Ancillary items for the Bookings tab. Fetch is gated on
 *  the tab being active (mirrors useTripBudget). Mutations are
 *  rimigo_internal-only on the backend. */
export const useCuratedBookings = (identifier: string | undefined, isActive: boolean = true) => {
    const queryClient = useQueryClient()
    const queryKey = ['curatedBookings', identifier]

    const query = useQuery({
        queryKey,
        queryFn: () => curatedBookingsApi.list(identifier!),
        enabled: !!identifier && isActive,
        staleTime: 60_000
    })

    const invalidate = () => queryClient.invalidateQueries({ queryKey })

    const createMutation = useMutation({
        mutationFn: (payload: CuratedBookingItemPayload) => curatedBookingsApi.create(identifier!, payload),
        onSuccess: invalidate
    })

    const updateMutation = useMutation({
        mutationFn: ({ itemId, payload }: { itemId: string; payload: Partial<CuratedBookingItemPayload> }) =>
            curatedBookingsApi.update(identifier!, itemId, payload),
        onSuccess: invalidate
    })

    const deleteMutation = useMutation({
        mutationFn: (itemId: string) => curatedBookingsApi.remove(identifier!, itemId),
        onSuccess: invalidate
    })

    return {
        items: query.data ?? [],
        isLoading: query.isLoading,
        createItem: createMutation.mutateAsync,
        updateItem: updateMutation.mutateAsync,
        deleteItem: deleteMutation.mutateAsync,
        isMutating: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
    }
}
