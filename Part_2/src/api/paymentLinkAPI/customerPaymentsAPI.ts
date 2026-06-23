import apiClient from '@/lib/api/apiClient'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'

export type CustomerPaymentStatus = 'Pending' | 'Success' | 'Failed' | 'Dropped'

export type CustomerPaymentMethod =
    | 'Credit Card'
    | 'Debit Card'
    | 'Net Banking'
    | 'Wallet'
    | 'UPI'
    | 'Cash Deposit'
    | 'Bank Transfer'
    | 'Cheque'
    | 'Other'

export type CustomerPaymentProvider =
    | 'Razorpay'
    | 'Stripe'
    | 'Bank Transfer'
    | 'Cashfree'
    | 'PayU'
    | 'Rimigo Bank'
    | 'Rimigo Wallet'
    | 'Other'

export type CustomerPayment = {
    id: string
    payment_id: string
    trip?: {
        id: string
        trip_sequence_id?: string
        name?: string
    } | null
    traveler?: {
        id: string
        name?: string
        email?: string
        full_name?: string
    } | null
    payment_amount: number
    payment_currency?: string
    payment_method: CustomerPaymentMethod
    payment_via_provider: CustomerPaymentProvider
    payment_status: CustomerPaymentStatus
    payment_date?: string | null
    payment_provider_id?: string | null
    created_at: string
    updated_at?: string
}

export type CustomerPaymentsPage = {
    count: number
    next: string | null
    previous: string | null
    results: CustomerPayment[]
}

export const getTripCustomerPayments = async (
    tripId: string,
    page: number = 1,
    pageSize: number = 50
): Promise<CustomerPaymentsPage> => {
    try {
        const response = await apiClient.get(`/api/customer-payments/`, {
            params: { trip_id: tripId, page, page_size: pageSize }
        })
        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}
