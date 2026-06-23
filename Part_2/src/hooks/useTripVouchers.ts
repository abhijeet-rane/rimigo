import { useQuery } from '@tanstack/react-query'
import { listTripVouchers, type Voucher } from '@/api/voucherAPI/voucherAPI'

const STALE_TIME_MS = 30 * 1000
const GC_TIME_MS = 5 * 60 * 1000

export const TRIP_VOUCHERS_QUERY_KEY = (tripId: string) =>
    ['trip-vouchers', tripId] as const

/**
 * Fetch all vouchers for a trip. SSE handles in-flight transitions; this
 * hook drives the initial fetch and refetch-after-upload. Disable via
 * `enabled` when there's no `tripId` so we don't fire on routes without one.
 */
export function useTripVouchers(
    tripId: string | undefined,
    enabled: boolean = true
): {
    vouchers: Voucher[]
    isLoading: boolean
    isError: boolean
    refetch: () => void
} {
    const { data = [], isLoading, isError, refetch } = useQuery({
        queryKey: TRIP_VOUCHERS_QUERY_KEY(tripId || ''),
        queryFn: () => listTripVouchers(tripId as string),
        enabled: enabled && !!tripId,
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS,
    })

    return { vouchers: data, isLoading, isError, refetch }
}
