import { ERROR_MESSAGES } from "@/constants/toastMessages/errorMessageConstants"
import apiClient from "@/lib/api/apiClient"
import { API_CONFIG } from "@/lib/api/apiConfig"
import { callbackLeadPayload } from "../types/callbackLead"
import { PREMIUM_PLAN_AMOUNT } from "../constants"

export interface PurchasePlanRequest {
    return_url: string
    traveler_id: string
    amount: number
    source: string
}

export interface PurchasePlanResponse {
    message: string
    response_code: string
    data: {
        cf_order_id: string
        order_id: string
        payment_session_id: string
        customer_payment_id: string
        customer_payment_reference: string
        assistance_booking_id: string
        rimigo_booking_id: string
        plan_id: string
    }
}

export interface Plan {
    id: string
    plan_id: string
    billing_interval: {
        unit: string
        interval: number
    }
    features: string[]
    name: string
    description: string
    status: string
    created_at: string
    updated_at: string
}

export interface PlansResponse {
    message: string
    response_code: string
    data: {
        results: Plan[]
        total: number
        page: number
        limit: number
        has_more: boolean
    }
}

export const postPremiumFormData = async ({
    status = "new",
    ...data
}: callbackLeadPayload) => {
    try {
        const response = await apiClient.post(
            `${API_CONFIG.BASE_URL}/api/callback-leads/`,
            {
                status,
                ...data,
            }
        )
        return response
    } catch (error) {
        throw new Error(
            (error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG
        )
    }
}

/**
 * Fetch all plans from the API
 */
export const fetchPlans = async (page: number = 1, limit: number = 10): Promise<PlansResponse> => {
    try {
        const response = await apiClient.get<PlansResponse>(
            `${API_CONFIG.BASE_URL}/api/plans/`,
            {
                params: {
                    page,
                    limit,
                }
            }
        )
        return response.data
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SOMETHING_WENT_WRONG
        throw new Error(errorMessage)
    }
}

/**
 * Get the Premium Plan by name
 * Searches for plans with name containing "Premium Plan" or "Premium Plan Subscription" (case-insensitive)
 */
export const getPremiumPlan = async (): Promise<Plan | null> => {
    try {
        const plansResponse = await fetchPlans(1, 100) // Fetch more plans to ensure we find it
        
        // Search for plan with name containing "Premium Plan" or "Premium Plan Subscription" (case-insensitive)
        const premiumPlan = plansResponse.data.results.find(
            (plan) => {
                const planNameLower = plan.name.toLowerCase()
                return planNameLower.includes("premium plan")
            }
        )
        
        return premiumPlan || null
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SOMETHING_WENT_WRONG
        throw new Error(`Failed to fetch premium plan: ${errorMessage}`)
    }
}

export interface PurchasePlanUtmParams {
    source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_term?: string
}

/**
 * Purchase a premium plan
 * @param utmParams - Optional UTM params from URL (utm_source as source, utm_medium, utm_campaign, utm_term); source defaults to "rimigo" when not provided
 */
export const purchasePremiumPlan = async (
    planId: string,
    travelerId: string,
    utmParams?: PurchasePlanUtmParams
): Promise<PurchasePlanResponse> => {
    try {
        const body: Record<string, string | number> = {
            traveler_id: travelerId,
            amount: PREMIUM_PLAN_AMOUNT,
            source: utmParams?.source ?? "rimigo",
        }
        if (utmParams?.utm_medium != null) body.utm_medium = utmParams.utm_medium
        if (utmParams?.utm_campaign != null) body.utm_campaign = utmParams.utm_campaign
        if (utmParams?.utm_term != null) body.utm_term = utmParams.utm_term

        const response = await apiClient.post<PurchasePlanResponse>(
            `${API_CONFIG.BASE_URL}/api/plans/${planId}/purchase/`,
            body
        )
        return response.data
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SOMETHING_WENT_WRONG
        throw new Error(errorMessage)
    }
}

export interface BookingItemEntity {
    id: string
    plan_id?: string
    billing_interval?: {
        unit: string
        interval: number
    }
    features?: string[]
    name?: string
    description?: string
    status?: string
    created_at?: string
    updated_at?: string
    [key: string]: unknown // Allow for future entity types
}

export interface BookingItemFulfillment {
    id: string
    subscription_id?: string
    name?: string
    description?: string | null
    price?: {
        amount: number
        currency: string
    }
    billing_details?: unknown | null
    status?: string
    start_date?: string
    end_date?: string
    created_at?: string
    updated_at?: string
    [key: string]: unknown // Allow for future fulfillment types
}

export interface BookingItem {
    type: 'internal' | 'external'
    provider: string
    category: string
    entity_type: string
    entity_id: string
    fulfillment_type?: string | null // Only for internal type
    fulfillment_id?: string | null // Only for internal type
    quantity: number
    price_per_unit: number
    total_amount: number
    details: Record<string, unknown> // For external type, details are expanded here
    entity?: BookingItemEntity | null // Only for internal type
    fulfillment?: BookingItemFulfillment | null // Only for internal type
}

export interface BookingDetails {
    id: string
    sequence_number: number
    rimigo_booking_id: string
    traveler: {
        id: string
        name: string
        email?: string
        phone?: string
        country_code?: string
        date_of_birth?: string | null
        nationality?: string | null
        passport_number?: string | null
        passport_expiry?: string | null
        dietary_preferences?: string[]
        medical_conditions?: string[]
        age?: number | null
        gender?: string | null
        type?: string
        source?: {
            id: string
            name: string
        }
        returning_source?: {
            id: string
            name: string
        }
        user_icon_url?: string | null
        created_at?: string
        updated_at?: string
    }
    trip: unknown | null
    provider: string
    types: string[] // Array of booking types
    confirmation_number: string | null
    status: string
    booking_items: BookingItem[]
    cancellation_policy: string | null
    booking_date: string
    start_date: string | null
    travel_date: string | null
    cost_to_traveler: number
    cost_to_rimigo: number | null
    revenue: number | null
    savings: number | null
    discount: number | null
    commission_base_amount: number | null
    affiliate_percentage: number | null
    booking_type: string
    payment_details: {
        payment_status: string
        payment_method: string
        payment_date: string
        payment_amount: number
        payment_currency: string
        payment_via_provider: string
        payment_provider_id: string
        payment_provider_payment_status: string | null
        payment_provider_payment_date: string | null
        payment_provider_charges: number | null
        payment_provider_charge_currency: string
        payment_transaction_id: string | null
        payment_transaction_status: string | null
        payment_notes: string | null
        payment_session_id: string | null
    }
    refund_details: unknown | null
    booking_reference: string | null
    order_id?: string
    customer_payment_reference: string
    customer_refund_reference: string | null
    created_at: string
    updated_at: string
}

/**
 * Fetch booking details by booking ID
 */
export const getBookingDetails = async (bookingId: string): Promise<BookingDetails> => {
    try {
        const response = await apiClient.get<BookingDetails>(
            `${API_CONFIG.BASE_URL}/api/rimigo-bookings/${bookingId}/`
        )
        return response.data
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SOMETHING_WENT_WRONG
        throw new Error(errorMessage)
    }
}

export interface BookingsListParams {
    traveler_id?: string
    page?: number
    limit?: number
    status?: string
}

export interface BookingsListResponse {
    total: number
    page: number
    limit: number
    has_more: boolean
    results: BookingDetails[]
}

export interface BookingsListAPIResponse {
    message: string
    response_code: string
    data: BookingsListResponse
}

/**
 * Fetch bookings list by traveler_id and optional filters
 */
export const getBookingsList = async (params: BookingsListParams): Promise<BookingsListResponse> => {
    try {
        const queryParams: Record<string, string> = {}
        if (params.traveler_id) queryParams.traveler_id = params.traveler_id
        if (params.page) queryParams.page = params.page.toString()
        if (params.limit) queryParams.limit = params.limit.toString()
        if (params.status) queryParams.status = params.status

        const response = await apiClient.get<BookingsListAPIResponse>(
            `${API_CONFIG.BASE_URL}/api/rimigo-bookings/`,
            { params: queryParams }
        )
        return response.data.data
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SOMETHING_WENT_WRONG
        throw new Error(errorMessage)
    }
}

/** Request body for check-entity-payment (e.g. rimigo-collection page) */
export interface CheckEntityPaymentRequest {
    entity_type: string
    entity_id: string
    traveler_id?: string
}

/** Fulfillment from check-entity-payment when user has purchased (e.g. traveler_collection) */
export interface CheckEntityPaymentFulfillment {
    fulfillment_type?: string
    fulfillment_id?: string
    rimigo_booking_id?: string
    quantity?: number
    price_per_unit?: number
    total_amount?: number
    traveler_collection?: {
        id: string
        identifier: string
        name?: string
        [key: string]: unknown
    }
    [key: string]: unknown
}

/** Response from check-entity-payment (when has_paid: true includes fulfillment with traveler_collection) */
export interface CheckEntityPaymentResponse {
    message?: string
    response_code?: string
    data?: {
        has_paid?: boolean
        is_paid?: boolean
        fulfillment?: CheckEntityPaymentFulfillment
        [key: string]: unknown
    }
}

/**
 * Check if the current user (or given traveler) has paid for an entity (e.g. collection).
 * Used on rimigo-collection and rimigo-collection/:countryName/:identifier.
 * traveler_id is optional when user is set by auth.
 */
export const checkEntityPayment = async (
    payload: CheckEntityPaymentRequest
): Promise<CheckEntityPaymentResponse['data']> => {
    try {
        const response = await apiClient.post<CheckEntityPaymentResponse>(
            `${API_CONFIG.BASE_URL}/api/rimigo-bookings/check-entity-payment/`,
            payload
        )
        return response.data?.data
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SOMETHING_WENT_WRONG
        throw new Error(errorMessage)
    }
}