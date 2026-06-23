import apiClient from '@/lib/api/apiClient'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'

export type PaymentLink = {
    id: string
    payment_link_id?: string
    payment_gateway: string
    payment_url: string
    amount: number
    currency: string
    is_active: boolean
    created_at: string
}

export const getTripPaymentLinks = async (
    tripId: string,
    activeOnly: boolean = true
): Promise<PaymentLink[]> => {
    try {
        const response = await apiClient.get(`/api/trips/${tripId}/payment-links/`, {
            params: { active_only: activeOnly }
        })
        return response.data
    } catch (error) {
        throw new Error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
    }
}
