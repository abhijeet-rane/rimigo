import { useQuery } from '@tanstack/react-query'
import {
    getTripCustomerPayments,
    type CustomerPaymentsPage
} from '@/api/paymentLinkAPI/customerPaymentsAPI'

const STALE_TIME_MS = 30 * 1000
const GC_TIME_MS = 5 * 60 * 1000

export const TRIP_CUSTOMER_PAYMENTS_QUERY_KEY = (
    tripId: string,
    page: number,
    pageSize: number
) => ['trip-customer-payments', tripId, page, pageSize] as const

export function useTripCustomerPayments(
    tripId: string | undefined,
    enabled: boolean = true,
    page: number = 1,
    pageSize: number = 50
): {
    data: CustomerPaymentsPage | undefined
    isLoading: boolean
    isError: boolean
    refetch: () => void
} {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: TRIP_CUSTOMER_PAYMENTS_QUERY_KEY(tripId || '', page, pageSize),
        queryFn: () => getTripCustomerPayments(tripId as string, page, pageSize),
        enabled: enabled && !!tripId,
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS
    })

    return { data, isLoading, isError, refetch }
}
