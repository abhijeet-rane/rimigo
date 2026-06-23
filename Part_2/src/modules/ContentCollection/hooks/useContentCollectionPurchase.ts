import { useEffect, useRef, useState } from 'react'
import { load } from '@cashfreepayments/cashfree-js'
import { toast } from 'sonner'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { useNavigate } from 'react-router-dom'

type TrackButtonClickCustom = (params: { buttonPage: string; buttonName: string; buttonAction: string; extra?: Record<string, unknown> }) => void

export type ContentCollectionPurchaseTrigger = 'header_cta' | 'locked_overlay' | 'overview_unlock_card'

type PurchaseTrackingContext = {
    trigger?: ContentCollectionPurchaseTrigger | string
    tab?: string
}

export function useContentCollectionPurchase(collectionId: string | undefined, trackButtonClickCustom?: TrackButtonClickCustom) {
    const cashfreeRef = useRef<Awaited<ReturnType<typeof load>> | null>(null)
    const [isProcessingPayment, setIsProcessingPayment] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        const initializeCashfree = async () => {
            try {
                const mode = (import.meta.env.VITE_CASHFREE_MODE || 'sandbox') as 'sandbox' | 'production'
                cashfreeRef.current = await load({ mode })
            } catch (error) {
                if (import.meta.env.DEV) {
                    toast.error('Failed to initialize Cashfree SDK: ' + (error as Error).message)
                }
            }
        }
        initializeCashfree()
    }, [])

    // Reset processing state when user returns from external checkout (e.g. back from Cashfree / bfcache restore)
    useEffect(() => {
        const onPageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                setIsProcessingPayment(false)
            }
        }
        window.addEventListener('pageshow', onPageShow)
        return () => window.removeEventListener('pageshow', onPageShow)
    }, [])

    const handlePurchase = async (context: PurchaseTrackingContext = {}) => {
        const trackingContext = {
            trigger: context.trigger,
            tab: context.tab
        }

        const isAuthenticated = await TokenStorage.isLoggedIn()
        const travelerId = (await TokenStorage.getUserInfo())?.traveler_id

        if (!isAuthenticated) {
            trackButtonClickCustom?.({
                buttonPage: 'view_content_collection',
                buttonName: 'content_collection_buy_clicked',
                buttonAction: 'login_redirect',
                extra: {
                    collection_id: collectionId,
                    traveler_id: travelerId,
                    is_authenticated: false,
                    ...trackingContext
                }
            })

            const redirectTo = location.pathname + location.search
            navigate(`/login?redirectTo=${encodeURIComponent(redirectTo)}`)
            return
        }

        if (isProcessingPayment) return
        if (!collectionId) {
            toast.error('Collection not found. Please refresh and try again.')
            return
        }
        if (!travelerId) {
            toast.error('Unable to get user information. Please try logging in again.')
            return
        }

        setIsProcessingPayment(true)

        try {
            trackButtonClickCustom?.({
                buttonPage: 'view_content_collection',
                buttonName: 'content_collection_buy_clicked',
                buttonAction: 'purchase_initiated',
                extra: {
                    collection_id: collectionId,
                    traveler_id: travelerId,
                    is_authenticated: true,
                    ...trackingContext
                }
            })

            const search = typeof window !== 'undefined' ? window.location.search : ''
            const params = new URLSearchParams(search)
            const utmParams = {
                source: params.get('utm_source') ?? undefined,
                utm_medium: params.get('utm_medium') ?? undefined,
                utm_campaign: params.get('utm_campaign') ?? undefined,
                utm_term: params.get('utm_term') ?? undefined
            }
            const purchaseResponse = await contentCollectionApi.purchaseContentCollection(
                collectionId,
                travelerId,
                utmParams
            )
            const data = purchaseResponse.data ?? (purchaseResponse as { payment_session_id?: string; order_id?: string; cf_order_id?: string })
            if (!data?.payment_session_id) {
                throw new Error('Payment session ID not received from server')
            }

            if (!cashfreeRef.current) {
                const mode = (import.meta.env.VITE_CASHFREE_MODE || 'sandbox') as 'sandbox' | 'production'
                cashfreeRef.current = await load({ mode })
            }

            trackButtonClickCustom?.({
                buttonPage: 'view_content_collection',
                buttonName: 'purchase_api_success',
                buttonAction: 'cashfree_checkout_triggered',
                extra: {
                    collection_id: collectionId,
                    order_id: data.order_id,
                    cf_order_id: data.cf_order_id,
                    ...trackingContext
                }
            })

            cashfreeRef.current.checkout({
                paymentSessionId: data.payment_session_id,
                redirectTarget: '_self' as const
            })
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SOMETHING_WENT_WRONG
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.error('Content collection purchase error:', error)
            }
            toast.error(errorMessage)
            trackButtonClickCustom?.({
                buttonPage: 'view_content_collection',
                buttonName: 'purchase_error',
                buttonAction: 'purchase_failed',
                extra: { collection_id: collectionId, error: errorMessage, ...trackingContext }
            })
            setIsProcessingPayment(false)
        }
    }

    return { handlePurchase, isProcessingPayment }
}