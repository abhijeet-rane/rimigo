import { useEffect, useState, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { getBookingDetails, BookingDetails } from "../api/premiumPageAPI"
import { toast } from "sonner"
import { ERROR_MESSAGES } from "@/constants/toastMessages/errorMessageConstants"
import { CheckCircle2, Clock, XCircle, Loader2, RefreshCw, List, ChevronDown } from "lucide-react"
import { Button } from "@/components/shared/ButtonNew"
import RimigoFooter from "@/components/Footer/RimigoFooter"
import { load } from "@cashfreepayments/cashfree-js"
import { BOOKINGS_ROUTE, DEFAULT_LANDING_PAGE_ROUTE, RIMIGO_COLLECTION_ROUTE, TRIP_COLLECTION_ROUTE } from "@/routes/routes"
import { useQueryClient } from "@tanstack/react-query"

const BookingConfirmationPage = () => {
    const { bookingId } = useParams<{ bookingId: string }>()
    const navigate = useNavigate()
    const [booking, setBooking] = useState<BookingDetails | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isRetryingPayment, setIsRetryingPayment] = useState(false)
    const [isBookingItemsExpanded, setIsBookingItemsExpanded] = useState(false)
    const cashfreeRef = useRef<Awaited<ReturnType<typeof load>> | null>(null)
    const queryClient = useQueryClient()

    // Initialize Cashfree SDK
    useEffect(() => {
        const initializeCashfree = async () => {
            try {
                const mode = (import.meta.env.VITE_CASHFREE_MODE || "sandbox") as "sandbox" | "production"
                cashfreeRef.current = await load({ mode })
            } catch (error) {
                if (import.meta.env.DEV) {
                    // eslint-disable-next-line no-console
                    console.error("Failed to initialize Cashfree SDK:", error)
                }
            }
        }
        initializeCashfree()
    }, [])

    // Fetch booking function (used for both initial load and polling)
    const fetchBooking = useCallback(async (showLoading = true) => {
            if (!bookingId) {
                setError("Booking ID is required")
            if (showLoading) setLoading(false)
                return
            }

            try {
            if (showLoading) {
                setLoading(true)
                setError(null)
            }
                const bookingData = await getBookingDetails(bookingId)
                setBooking(bookingData)
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.SOMETHING_WENT_WRONG
                setError(errorMessage)
            if (showLoading) {
                toast.error(errorMessage)
            }
            } finally {
            if (showLoading) {
                setLoading(false)
            }
        }
    }, [bookingId])

    // Initial fetch
    useEffect(() => {
        fetchBooking(true)
    }, [fetchBooking])

    // Polling when status is in_progress
    useEffect(() => {
        if (!booking || !bookingId) return

        const status = booking.status.toLowerCase()
        const isInProgress = status === "in_progress" || status === "pending"
        const isFinalStatus = 
            status === "completed" || 
            status === "confirmed" || 
            status === "success" || 
            status === "failed" || 
            status === "dropped" || 
            status === "cancelled"

        // Only poll if status is in progress
        if (!isInProgress || isFinalStatus) {
            return
        }

        // Set up polling interval (2 seconds)
        const pollInterval = setInterval(() => {
            fetchBooking(false) // Don't show loading state during polling
        }, 2000)

        // Cleanup interval on unmount or when status changes
        return () => {
            clearInterval(pollInterval)
        }
    }, [booking?.status, bookingId, fetchBooking])

    /**
     * Get collection identifier from booking for collection-type redirects.
     * Reads from fulfillment.identifier (e.g. "japan-collection-3"), then fallbacks.
     */
    const getCollectionIdentifierFromBooking = useCallback((b: BookingDetails): string | null => {
        const collectionItem = b.booking_items?.find(
            (item) => item.category === "collection" || item.entity_type === "collection"
        )
        if (!collectionItem) return null
        const fulfillment = collectionItem.fulfillment as { identifier?: string } | undefined
        if (fulfillment?.identifier) return fulfillment.identifier
        const entity = collectionItem.entity as { identifier?: string; id?: string } | undefined
        if (entity?.identifier) return entity.identifier
        if (collectionItem.details?.identifier) return collectionItem.details.identifier as string
        if (entity?.id) return entity.id
        if (collectionItem.entity_id) return collectionItem.entity_id
        return null
    }, [])

    /**
     * Get country name from collection booking item for public URL (e.g. "Japan").
     * Reads from fulfillment.context.countries[0].name. Normalized to lowercase for URL segment.
     */
    const getCountryNameFromBooking = useCallback((b: BookingDetails): string | null => {
        const collectionItem = b.booking_items?.find(
            (item) => item.category === "collection" || item.entity_type === "collection"
        )
        const fulfillment = collectionItem?.fulfillment as {
            context?: { countries?: Array<{ id?: string; name?: string }> }
        } | undefined
        const countries = fulfillment?.context?.countries
        if (countries?.length && countries[0]?.name) return countries[0].name
        return null
    }, [])

    // Redirect logic: Check if booking is completed or failed, within 2 minutes, and redirect based on type
    useEffect(() => {
        if (!booking) return

        const status = booking.status.toLowerCase()
        const isCompleted = status === "completed" || status === "confirmed" || status === "success"
        const isFailed = status === "failed" || status === "dropped"
        
        if (!isCompleted && !isFailed) return

        // Calculate time difference between updated_at and current time
        const updatedAt = new Date(booking.updated_at)
        const now = new Date()
        const diffInMinutes = (now.getTime() - updatedAt.getTime()) / (1000 * 60)

        // Only redirect if within 2 minutes
        if (diffInMinutes >= 2) return
  
        // fetch travelerDetails 
        if (isCompleted) {
            queryClient.invalidateQueries({
                queryKey: ['travelerDetails']
            })
        }

        const paymentSessionId = encodeURIComponent(booking.payment_details.payment_session_id || "")

        if (booking.types && booking.types.length > 0) {
            const bookingType = booking.types[0]

            if (bookingType === "collection") {
                const identifier = getCollectionIdentifierFromBooking(booking)
                const countryNameRaw = getCountryNameFromBooking(booking)
                const countryName = countryNameRaw ? countryNameRaw.toLowerCase() : null
                const redirectPath = isCompleted
                    ? (identifier
                        ? `${TRIP_COLLECTION_ROUTE}/${identifier}?payment=success&feature=collection`
                        : `${TRIP_COLLECTION_ROUTE}?payment=success&feature=collection`)
                    : (identifier && countryName
                        ? `${RIMIGO_COLLECTION_ROUTE}/${countryName}/${identifier}?payment=failure&feature=collection&payment_session_id=${paymentSessionId}`
                        : `${RIMIGO_COLLECTION_ROUTE}?payment=failure&feature=collection&payment_session_id=${paymentSessionId}`)
                navigate(redirectPath, { replace: true })
                return
            }

            const typeRedirectMap: Record<string, { success: string; failure: string }> = {
                assistance_fees: {
                    success: `${DEFAULT_LANDING_PAGE_ROUTE}?payment=success&feature=premium`,
                    failure: `/premium?payment=failure&feature=premium&payment_session_id=${paymentSessionId}`
                }
            }
            const redirectConfig = typeRedirectMap[bookingType]
            if (redirectConfig) {
                const redirectPath = isCompleted ? redirectConfig.success : redirectConfig.failure
                navigate(redirectPath, { replace: true })
                return
            }
        }
    }, [booking, navigate, queryClient, getCollectionIdentifierFromBooking, getCountryNameFromBooking])

    /**
     * Get display title for booking based on types and booking items
     */
    const getBookingDisplayTitle = (booking: BookingDetails): string => {
        if (!booking.types || booking.types.length === 0) {
            return booking.rimigo_booking_id
        }

        const bookingType = booking.types[0] // Types array has only one type for now

        // Map for different booking types
        switch (bookingType) {
            case 'assistance_fees': {
                // For assistance_fees, try to get the fulfillment name (e.g., "Premium Plan Subscription")
                const assistanceFeesItem = booking.booking_items?.find(
                    item => item.type === 'internal' && item.category === 'assistance_fees'
                )
                if (assistanceFeesItem?.fulfillment?.name) {
                    return assistanceFeesItem.fulfillment.name
                }
                // Try to get plan name from fulfillment.plan (if available)
                if (assistanceFeesItem?.fulfillment) {
                    const plan = assistanceFeesItem.fulfillment.plan as { name?: string } | undefined
                    if (plan?.name) {
                        return `${plan.name} Subscription`
                    }
                }
                // Fallback to entity name if available
                if (assistanceFeesItem?.entity?.name) {
                    return `${assistanceFeesItem.entity.name} Subscription`
                }
                return 'Premium Subscription Plan'
            }
            
            case 'collection': {
                // For collections, extract collection name from booking items
                const collectionItem = booking.booking_items?.find(
                    item => item.category === 'collection' || item.entity_type === 'collection'
                )
                if (collectionItem?.entity?.name) {
                    return collectionItem.entity.name
                }
                // Try to get from details if entity is not available
                if (collectionItem?.details?.name) {
                    return collectionItem.details.name as string
                }
                return 'Collection Booking'
            }
            
            default:
                // For other types, format the type name nicely
                return bookingType
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status.toLowerCase()) {
            case "completed":
            case "confirmed":
                return <CheckCircle2 className="w-6 h-6 text-green-500" />
            case "pending":
            case "in_progress":
                return <Clock className="w-6 h-6 text-yellow-500" />
            case "failed":
            case "dropped":
            case "cancelled":
                return <XCircle className="w-6 h-6 text-red-500" />
            default:
                return <Clock className="w-6 h-6 text-gray-500" />
        }
    }

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case "completed":
            case "confirmed":
                return "text-green-600 bg-green-50"
            case "pending":
            case "in_progress":
                return "text-yellow-600 bg-yellow-50"
            case "failed":
            case "dropped":
            case "cancelled":
                return "text-red-600 bg-red-50"
            default:
                return "text-gray-600 bg-gray-50"
        }
    }

    const canRetryPayment = (booking: BookingDetails): boolean => {
        const status = booking.status.toLowerCase()
        const hasPaymentSessionId = !!booking.payment_details.payment_session_id
        return (status === "failed" || status === "dropped") && hasPaymentSessionId
    }

    const handleRetryPayment = async () => {
        if (!booking || !booking.payment_details.payment_session_id) {
            toast.error("Payment session ID not available. Please contact support.")
            return
        }

        if (isRetryingPayment) {
            return
        }

        setIsRetryingPayment(true)

        try {
            // Ensure Cashfree SDK is initialized
            if (!cashfreeRef.current) {
                const mode = (import.meta.env.VITE_CASHFREE_MODE || "sandbox") as "sandbox" | "production"
                cashfreeRef.current = await load({ mode })
            }

            // Trigger Cashfree checkout with existing payment session
            const checkoutOptions = {
                paymentSessionId: booking.payment_details.payment_session_id,
                redirectTarget: "_self" as const,
            }

            cashfreeRef.current.checkout(checkoutOptions)
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.SOMETHING_WENT_WRONG
            toast.error(errorMessage)
            setIsRetryingPayment(false)
        }
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "N/A"
        return new Date(dateString).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    }

    const formatCurrency = (amount: number, currency: string = "INR") => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: currency,
        }).format(amount)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary-default mx-auto mb-4" />
                    <p className="text-gray-600 font-manrope">Loading booking details...</p>
                </div>
            </div>
        )
    }

    if (error || !booking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full text-center">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 font-red-hat-display mb-2">
                        Booking Not Found
                    </h1>
                    <p className="text-gray-600 font-manrope mb-6">
                        {error || "Unable to load booking details. Please check your booking ID."}
                    </p>
                    <Button
                        title="Go to Home"
                        onClick={() => navigate(DEFAULT_LANDING_PAGE_ROUTE)}
                        className="bg-primary-default text-white px-6 py-3 rounded-lg"
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 mb-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4">
                            {getStatusIcon(booking.status)}
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 font-red-hat-display">
                                    {getBookingDisplayTitle(booking)}
                                </h1>
                                <p className="text-gray-600 font-manrope mt-1">
                                    {booking.rimigo_booking_id}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    const travelerId = booking.traveler?.id
                                    if (travelerId) {
                                        navigate(`${BOOKINGS_ROUTE}?traveler_id=${travelerId}`)
                                    } else {
                                        navigate(BOOKINGS_ROUTE)
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold font-manrope bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <List className="w-4 h-4" />
                                <span>View all Bookings</span>
                            </button>
                            {canRetryPayment(booking) && (
                                <button
                                    onClick={handleRetryPayment}
                                    disabled={isRetryingPayment}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold font-manrope bg-primary-default text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isRetryingPayment ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Retrying...</span>
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-4 h-4 " />
                                            <span className="text-white cursor-pointer">Retry Payment</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold font-manrope ${getStatusColor(booking.status)}`}>
                        {booking.status.toLowerCase() === "in_progress" && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        <span>{booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace("_", " ")}</span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-row gap-4 mb-6">
                    <button
                        onClick={() => navigate(DEFAULT_LANDING_PAGE_ROUTE)}
                        className="flex-1 bg-primary-default text-white hover:bg-primary-dark px-6 py-3 rounded-lg font-red-hat-display font-bold transition-colors"
                    >
                        Go to Dashboard
                    </button>
                    <button
                        onClick={() => setIsBookingItemsExpanded(!isBookingItemsExpanded)}
                        className="flex-1 bg-white text-black border border-grey_4 hover:bg-gray-50 px-6 py-3 rounded-lg font-red-hat-display font-bold transition-colors"
                    >
                        View Billing Details
                    </button>
                </div>

                {/* Booking Items */}
                {booking.booking_items && booking.booking_items.length > 0 && (
                    <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 ${isBookingItemsExpanded ? 'p-6 md:p-8' : 'p-4'}`}>
                        <button
                            onClick={() => setIsBookingItemsExpanded(!isBookingItemsExpanded)}
                            className={`w-full flex items-center justify-between hover:opacity-80 transition-opacity ${isBookingItemsExpanded ? 'mb-4' : ''}`}
                        >
                            <h2 className="text-xl font-semibold text-gray-900 font-red-hat-display">
                                Booking Items
                            </h2>
                            <ChevronDown 
                                className={`w-5 h-5 text-gray-600 transition-transform ${isBookingItemsExpanded ? 'rotate-180' : ''}`}
                            />
                        </button>
                        {isBookingItemsExpanded && (
                            <div className="space-y-6">
                            {booking.booking_items.map((item, index) => (
                                <div key={index} className="border-b border-gray-200 last:border-b-0 pb-6 last:pb-0">
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900 font-red-hat-display">
                                                {item.entity?.name || item.category || `Item ${index + 1}`}
                                            </h3>
                                            <span className="text-sm font-medium text-gray-600 font-manrope">
                                                {formatCurrency(item.total_amount, booking.payment_details.payment_currency)}
                                            </span>
                                        </div>
                                        {item.entity?.description && (
                                            <p className="text-sm text-gray-600 font-manrope">
                                                {item.entity.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Entity Details */}
                                    {item.type === 'internal' && item.entity && (
                                        <div className="mb-4 space-y-2">
                                            {item.entity.plan_id && (
                                                <div>
                                                    <p className="text-xs text-gray-500 font-manrope">Plan ID</p>
                                                    <p className="text-sm font-medium text-gray-900 font-manrope">
                                                        {item.entity.plan_id}
                                                    </p>
                                                </div>
                                            )}
                                            {item.entity.features && item.entity.features.length > 0 && (
                                                <div>
                                                    <p className="text-xs text-gray-500 font-manrope mb-1">Features</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {item.entity.features.map((feature, idx) => (
                                                            <span
                                                                key={idx}
                                                                className="inline-block px-2 py-1 text-xs font-medium bg-primary-50 text-primary-700 rounded font-manrope"
                                                            >
                                                                {feature.replace(/_/g, ' ')}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Fulfillment Details (for internal type) */}
                                    {item.type === 'internal' && item.fulfillment && (
                                        <div className="mb-4 space-y-2">
                                            {item.fulfillment.subscription_id && (
                                                <div>
                                                    <p className="text-xs text-gray-500 font-manrope">Subscription ID</p>
                                                    <p className="text-sm font-medium text-gray-900 font-manrope">
                                                        {item.fulfillment.subscription_id}
                                                    </p>
                                                </div>
                                            )}
                                            {item.fulfillment.name && (
                                                <div>
                                                    <p className="text-xs text-gray-500 font-manrope">Subscription</p>
                                                    <p className="text-sm font-medium text-gray-900 font-manrope">
                                                        {item.fulfillment.name}
                                                    </p>
                                                </div>
                                            )}
                                            {item.fulfillment.start_date && item.fulfillment.end_date && (
                                                <div>
                                                    <p className="text-xs text-gray-500 font-manrope">Validity</p>
                                                    <p className="text-sm font-medium text-gray-900 font-manrope">
                                                        {formatDate(item.fulfillment.start_date)} - {formatDate(item.fulfillment.end_date)}
                                                    </p>
                                                </div>
                                            )}
                                            {item.fulfillment.status && (
                                                <div>
                                                    <p className="text-xs text-gray-500 font-manrope">Status</p>
                                                    <p className="text-sm font-medium text-gray-900 font-manrope capitalize">
                                                        {item.fulfillment.status}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* External Type Details */}
                                    {item.type === 'external' && Object.keys(item.details).length > 0 && (
                                        <div className="mb-4 space-y-2">
                                            {Object.entries(item.details).map(([key, value]) => (
                                                <div key={key}>
                                                    <p className="text-xs text-gray-500 font-manrope capitalize">
                                                        {key.replace(/_/g, ' ')}
                                                    </p>
                                                    <p className="text-sm font-medium text-gray-900 font-manrope">
                                                        {String(value)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Booking Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Traveler Information */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-xl font-semibold text-gray-900 font-red-hat-display mb-4">
                            Traveler Information
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-500 font-manrope">Name</p>
                                <p className="text-base font-medium text-gray-900 font-manrope">{booking.traveler.name}</p>
                            </div>
                            {booking.traveler.email && (
                                <div>
                                    <p className="text-sm text-gray-500 font-manrope">Email</p>
                                    <p className="text-base font-medium text-gray-900 font-manrope">{booking.traveler.email}</p>
                                </div>
                            )}
                            {booking.traveler.phone && booking.traveler.country_code && (
                                <div>
                                    <p className="text-sm text-gray-500 font-manrope">Phone</p>
                                    <p className="text-base font-medium text-gray-900 font-manrope">
                                        {booking.traveler.country_code} {booking.traveler.phone}
                                    </p>
                                </div>
                            )}
                            {booking.traveler.type && (
                                <div>
                                    <p className="text-sm text-gray-500 font-manrope">Account Type</p>
                                    <p className="text-base font-medium text-gray-900 font-manrope capitalize">
                                        {booking.traveler.type}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Information */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-xl font-semibold text-gray-900 font-red-hat-display mb-4">
                            Payment Information
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-500 font-manrope">Amount</p>
                                <p className="text-2xl font-bold text-gray-900 font-red-hat-display">
                                    {formatCurrency(booking.payment_details.payment_amount, booking.payment_details.payment_currency)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-manrope">Payment Status</p>
                                <p className="text-base font-medium text-gray-900 font-manrope capitalize">
                                    {booking.payment_details.payment_status}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-manrope">Payment Method</p>
                                <p className="text-base font-medium text-gray-900 font-manrope">
                                    {booking.payment_details.payment_via_provider}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 font-manrope">Payment Date</p>
                                <p className="text-base font-medium text-gray-900 font-manrope">
                                    {formatDate(booking.payment_details.payment_date)}
                                </p>
                            </div>
                            {booking.payment_details.payment_provider_id && (
                                <div>
                                    <p className="text-sm text-gray-500 font-manrope">Transaction ID</p>
                                    <p className="text-base font-medium text-gray-900 font-manrope">
                                        {booking.payment_details.payment_provider_id}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Booking Details */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 font-red-hat-display mb-4">
                        Booking Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500 font-manrope">Booking Date</p>
                            <p className="text-base font-medium text-gray-900 font-manrope">
                                {formatDate(booking.booking_date)}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-manrope">Booking Type</p>
                            <p className="text-base font-medium text-gray-900 font-manrope capitalize">
                                {booking.booking_type.replace("-", " ")}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-manrope">Provider</p>
                            <p className="text-base font-medium text-gray-900 font-manrope capitalize">
                                {booking.provider}
                            </p>
                        </div>
                        {booking.order_id && (
                            <div>
                                <p className="text-sm text-gray-500 font-manrope">Order ID</p>
                                <p className="text-base font-medium text-gray-900 font-manrope">
                                    {booking.order_id}
                                </p>
                            </div>
                        )}
                        <div>
                            <p className="text-sm text-gray-500 font-manrope">Customer Reference</p>
                            <p className="text-base font-medium text-gray-900 font-manrope">
                                {booking.customer_payment_reference}
                            </p>
                        </div>
                    </div>
                </div>

            </div>

            <RimigoFooter />
        </div>
    )
}

export default BookingConfirmationPage

