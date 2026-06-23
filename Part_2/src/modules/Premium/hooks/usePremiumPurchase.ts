import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { load } from '@cashfreepayments/cashfree-js'
import { toast } from 'sonner'
import { purchasePremiumPlan, getPremiumPlan } from '../api/premiumPageAPI'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { TokenStorage } from '@/lib/api/tokenStorage'

type TrackButtonClickCustom = (params: {
    buttonPage: string
    buttonName: string
    buttonAction: string
    extra?: Record<string, unknown>
}) => void

const PREMIUM_BENEFITS_REDIRECT = '/premium#premium-benefits'

export function usePremiumPurchase(
    trackButtonClickCustom: TrackButtonClickCustom
) {
    const navigate = useNavigate()

    const cashfreeRef = useRef<Awaited<ReturnType<typeof load>> | null>(null)
    const [isProcessingPayment, setIsProcessingPayment] = useState(false)

    useEffect(() => {
        const initializeCashfree = async () => {
            try {
                const mode = (import.meta.env.VITE_CASHFREE_MODE || 'sandbox') as 'sandbox' | 'production'
                cashfreeRef.current = await load({ mode })
            } catch (error) {
                if (import.meta.env.DEV) {
                    // eslint-disable-next-line no-console
                    console.error('Failed to initialize Cashfree SDK:', error)
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

    const handleBuyNowWithAuth = async () => {

        const isAuthenticated = await TokenStorage.isLoggedIn()
        const travelerId = (await TokenStorage.getUserInfo())?.traveler_id

        if (!isAuthenticated) {
            trackButtonClickCustom({
                buttonPage: 'premium_landing_v1',
                buttonName: 'buy_now_clicked',
                buttonAction: 'login_redirect',
                extra: { section: 'premium_benefits', is_authenticated: false }
            })
            navigate(`/login?redirectTo=${encodeURIComponent(PREMIUM_BENEFITS_REDIRECT)}`)
            return
        }

        if (isProcessingPayment) return
        if (!travelerId) {
            toast.error('Unable to get user information. Please try logging in again.')
            return
        }

        setIsProcessingPayment(true)

        try {
            trackButtonClickCustom({
                buttonPage: 'premium_landing_v1',
                buttonName: 'buy_now_clicked',
                buttonAction: 'purchase_initiated',
                extra: { section: 'premium_benefits', traveler_id: travelerId }
            })

            const premiumPlan = await getPremiumPlan()
            if (!premiumPlan) {
                throw new Error('Premium Plan not found. Please contact support.')
            }

            const search = typeof window !== 'undefined' ? window.location.search : ''
            const params = new URLSearchParams(search)
            const utmParams = {
                source: params.get('utm_source') ?? undefined,
                utm_medium: params.get('utm_medium') ?? undefined,
                utm_campaign: params.get('utm_campaign') ?? undefined,
                utm_term: params.get('utm_term') ?? undefined
            }
            const purchaseResponse = await purchasePremiumPlan(premiumPlan.id, travelerId, utmParams)
            if (!purchaseResponse.data?.payment_session_id) {
                throw new Error('Payment session ID not received from server')
            }

            if (!cashfreeRef.current) {
                const mode = (import.meta.env.VITE_CASHFREE_MODE || 'sandbox') as 'sandbox' | 'production'
                cashfreeRef.current = await load({ mode })
            }

            trackButtonClickCustom({
                buttonPage: 'premium_landing_v1',
                buttonName: 'purchase_api_success',
                buttonAction: 'cashfree_checkout_triggered',
                extra: {
                    section: 'premium_benefits',
                    order_id: purchaseResponse.data.order_id,
                    cf_order_id: purchaseResponse.data.cf_order_id
                }
            })

            cashfreeRef.current.checkout({
                paymentSessionId: purchaseResponse.data.payment_session_id,
                redirectTarget: '_self' as const
            })
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : ERROR_MESSAGES.SOMETHING_WENT_WRONG
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.error('Purchase error:', error)
            }
            toast.error(errorMessage)
            trackButtonClickCustom({
                buttonPage: 'premium_landing_v1',
                buttonName: 'purchase_error',
                buttonAction: 'purchase_failed',
                extra: { section: 'premium_benefits', error: errorMessage }
            })
            setIsProcessingPayment(false)
        }
    }

    return { handleBuyNowWithAuth, isProcessingPayment }
}