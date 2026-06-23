import { useQuery } from '@tanstack/react-query'
import { getTripPaymentLinks, type PaymentLink } from '@/api/paymentLinkAPI/paymentLinkAPI'

const STALE_TIME_MS = 60 * 1000
const GC_TIME_MS = 5 * 60 * 1000

export const TRIP_PAYMENT_LINKS_QUERY_KEY = (tripId: string) =>
    ['trip-payment-links', tripId] as const

export function useTripPaymentLinks(
    tripId: string | undefined,
    enabled: boolean = true
): {
    paymentLinks: PaymentLink[]
    latestActiveLink: PaymentLink | null
    isLoading: boolean
    isError: boolean
} {
    const { data = [], isLoading, isError } = useQuery({
        queryKey: TRIP_PAYMENT_LINKS_QUERY_KEY(tripId || ''),
        queryFn: () => getTripPaymentLinks(tripId as string, true),
        enabled: enabled && !!tripId,
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS
    })

    const latestActiveLink =
        data.length === 0
            ? null
            : [...data]
                  .filter((l) => l.is_active)
                  .sort(
                      (a, b) =>
                          new Date(b.created_at).getTime() -
                          new Date(a.created_at).getTime()
                  )[0] ?? null

    return {
        paymentLinks: data,
        latestActiveLink,
        isLoading,
        isError
    }
}
