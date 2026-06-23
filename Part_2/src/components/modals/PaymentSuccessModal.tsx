import { useEffect, useState, useRef } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { load } from '@cashfreepayments/cashfree-js'
import { Loader2 } from 'lucide-react'
import { DEFAULT_LANDING_PAGE_ROUTE } from '@/routes/routes'

interface PaymentModalConfig {
    title: string
    description: string
    buttonText: string
    redirectPath: string
    lottieUrl?: string
    errorIconUrl?: string
    showRetryButton?: boolean
}

const PAYMENT_SUCCESS_CONFIGS: Record<string, PaymentModalConfig> = {
    premium: {
        title: 'Welcome to Rimigo Premium!',
        description: "You've unlocked the best deals, unlimited AI access and have been assigned a travel expert.",
        buttonText: "LET'S GO",
        redirectPath: DEFAULT_LANDING_PAGE_ROUTE,
        lottieUrl: 'https://media.rimigo.com/1771327910853_Done.json'
    },
    collection: {
        title: 'Payment Successful!',
        description: 'Your collection has been unlocked. You can now view and customise it in your trips.',
        buttonText: 'VIEW COLLECTION',
        redirectPath: '/trip-collection',
        lottieUrl: 'https://media.rimigo.com/1771327910853_Done.json'
    },
    default: {
        title: 'Payment Successful!',
        description: 'Your payment has been processed successfully.',
        buttonText: 'CONTINUE',
        redirectPath: DEFAULT_LANDING_PAGE_ROUTE
    }
}

const PAYMENT_FAILURE_CONFIGS: Record<string, PaymentModalConfig> = {
    premium: {
        title: "Uh-oh! Transaction failed",
        description: "We faced an issue while processing your payment. You can try again or contact support for any query.",
        buttonText: "RETRY PAYMENT",
        redirectPath: DEFAULT_LANDING_PAGE_ROUTE,
        showRetryButton: true,
        errorIconUrl: 'https://media.rimigo.com/1770735124406_image-fM7TQCU6bF06x2SqC3cYBSlhaYgjL2.png'
    },
    default: {
        title: "Transaction Failed",
        description: "We faced an issue while processing your payment. You can try again or contact support for any query.",
        buttonText: "RETRY PAYMENT",
        redirectPath: DEFAULT_LANDING_PAGE_ROUTE,
        showRetryButton: true,
        errorIconUrl: 'https://media.rimigo.com/1770735124406_image-fM7TQCU6bF06x2SqC3cYBSlhaYgjL2.png'
    }
}

const TRIP_COLLECTION_ROUTE = '/trip-collection'

const PaymentSuccessModal = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    const { pathname } = useLocation()
    const [isVisible, setIsVisible] = useState(false)
    const [isRetrying, setIsRetrying] = useState(false)
    const cashfreeRef = useRef<Awaited<ReturnType<typeof load>> | null>(null)

    const payment = searchParams.get('payment')
    const feature = searchParams.get('feature')
    const paymentSessionId = searchParams.get('payment_session_id')

    // Determine if modal should be shown
    const shouldShow = payment === 'success' || payment === 'failure'

    // Initialize Cashfree SDK for retry payment
    useEffect(() => {
        if (payment === 'failure' && paymentSessionId) {
            const initializeCashfree = async () => {
                try {
                    const mode = (import.meta.env.VITE_CASHFREE_MODE || "sandbox") as "sandbox" | "production"
                    cashfreeRef.current = await load({ mode })
                } catch (error) {
                    if (import.meta.env.DEV) {
                        console.error("Failed to initialize Cashfree SDK:", error)
                    }
                }
            }
            initializeCashfree()
        }
    }, [payment, paymentSessionId])

    useEffect(() => {
        setIsVisible(shouldShow)
    }, [shouldShow])

    const handleClose = () => {
        // Remove query parameters
        const newSearchParams = new URLSearchParams(searchParams)
        newSearchParams.delete('payment')
        newSearchParams.delete('feature')
        newSearchParams.delete('payment_session_id')
        setSearchParams(newSearchParams, { replace: true })
        setIsVisible(false)
    }

    const handleRetryPayment = async () => {
        if (!paymentSessionId || isRetrying) return

        setIsRetrying(true)

        try {
            // Ensure Cashfree SDK is initialized
            if (!cashfreeRef.current) {
                const mode = (import.meta.env.VITE_CASHFREE_MODE || "sandbox") as "sandbox" | "production"
                cashfreeRef.current = await load({ mode })
            }

            // Trigger Cashfree checkout with existing payment session
            const checkoutOptions = {
                paymentSessionId: paymentSessionId,
                redirectTarget: "_self" as const,
            }

            cashfreeRef.current.checkout(checkoutOptions)
        } catch (error) {
            if (import.meta.env.DEV) {
                // eslint-disable-next-line no-console
                console.error("Failed to retry payment:", error)
            }
            setIsRetrying(false)
        }
    }

    const handleButtonClick = () => {
        if (payment === 'failure' && paymentSessionId) {
            // For failure, trigger retry payment
            handleRetryPayment()
            return
        }

        const config = PAYMENT_SUCCESS_CONFIGS[feature || 'default'] || PAYMENT_SUCCESS_CONFIGS.default
        handleClose()

        // For collection success: if we're already on a specific collection page (e.g. /trip-collection/japan-collection-3), stay there; otherwise go to list
        if (feature === 'collection' && pathname.startsWith(TRIP_COLLECTION_ROUTE + '/')) {
            return
        }
        navigate(config.redirectPath)
    }

    if (!isVisible) return null

    const isFailure = payment === 'failure'
    const config = isFailure 
        ? (PAYMENT_FAILURE_CONFIGS[feature || 'default'] || PAYMENT_FAILURE_CONFIGS.default)
        : (PAYMENT_SUCCESS_CONFIGS[feature || 'default'] || PAYMENT_SUCCESS_CONFIGS.default)
    
    const container = typeof document !== 'undefined' ? document.body : null
    if (!container) return null

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
                aria-hidden="true"
            />

            {/* Modal Content */}
            <div
                className="relative bg-white rounded-2xl shadow-2xl flex flex-col max-w-md w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}>
                
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-grey_5 flex items-center justify-center hover:bg-grey_4 transition-colors z-10"
                >
                    <span className="text-grey_2 text-xl">×</span>
                </button>
                
                {/* Icon/Animation Container */}
                {isFailure ? (
                    // Error Icon/Logo for failure
                    <div className="w-full pt-6 px-6 flex justify-center">
                        <div className="w-64 h-64 rounded-xl bg-white flex items-center justify-center overflow-hidden">
                            {config.errorIconUrl ? (
                                <img 
                                    src={config.errorIconUrl} 
                                    alt="Transaction Failed" 
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                // Fallback: Red error circle with X
                                <div className="w-32 h-32 rounded-full bg-red-500 flex items-center justify-center">
                                    <span className="text-white text-6xl font-bold">×</span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    // Lottie Animation for success
                    config.lottieUrl && (
                        <div className="w-full pt-6 px-6 flex justify-center">
                            <div className="w-64 h-64 rounded-xl bg-white flex items-center justify-center overflow-hidden">
                                <DotLottieReact
                                    src={config.lottieUrl}
                                    loop
                                    autoplay
                                    className="w-full h-full"
                                />
                            </div>
                        </div>
                    )
                )}

                {/* Content */}
                <div className="px-6 pb-6 flex flex-col items-center text-center space-y-4">
                    {/* Title */}
                    <h2 className="text-2xl font-bold text-grey_0 font-red-hat-display">
                        {config.title}
                    </h2>

                    {/* Description */}
                    <p className="text-base text-grey_2 font-manrope leading-relaxed">
                        {config.description}
                    </p>

                    {/* CTA Button */}
                    <button
                        onClick={handleButtonClick}
                        disabled={isRetrying}
                        className="w-full py-3 px-6 rounded-xl text-white font-bold uppercase tracking-wide transition-all cursor-pointer hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        style={{
                            background: isFailure 
                                ? 'linear-gradient(90deg, #7011F6 0%, #4D1D91 100%)'
                                : 'linear-gradient(90deg, #7011F6 0%, #4D1D91 100%)',
                            fontFamily: 'Red Hat Display, sans-serif',
                            fontSize: '16px',
                            fontWeight: 700,
                            letterSpacing: '0.5px'
                        }}>
                        {isRetrying ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Processing...</span>
                            </>
                        ) : (
                            config.buttonText
                        )}
                    </button>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, container)
}

export default PaymentSuccessModal
