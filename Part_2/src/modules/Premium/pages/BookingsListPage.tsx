import { useEffect, useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { getBookingsList, BookingDetails } from "../api/premiumPageAPI"
import { toast } from "sonner"
import { ERROR_MESSAGES } from "@/constants/toastMessages/errorMessageConstants"
import { Loader2, Eye } from "lucide-react"
import { Button } from "@/components/shared/ButtonNew"
import RimigoFooter from "@/components/Footer/RimigoFooter"
import { useUserInfo } from "@/hooks/useUserInfo"
import { BOOKINGS_ROUTE, DEFAULT_LANDING_PAGE_ROUTE } from "@/routes/routes"

const BookingsListPage = ({ embedded = false }: { embedded?: boolean }) => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { user } = useUserInfo()
    const [bookings, setBookings] = useState<BookingDetails[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [pagination, setPagination] = useState({
        page: 1,
        total: 0,
        limit: 20,
        has_more: false
    })

    const travelerIdFromParams = searchParams.get('traveler_id')
    const travelerId = travelerIdFromParams ?? user?.id ?? null

    // Set error when not using params and user has loaded but has no id
    useEffect(() => {
        if (!travelerIdFromParams && user !== null && !user?.id) {
            setError("Traveler ID is required")
            setLoading(false)
        }
    }, [travelerIdFromParams, user])

    // Reset pagination and bookings when traveler changes
    useEffect(() => {
        if (travelerId) {
            setPagination(prev => ({ ...prev, page: 1 }))
            setBookings([])
        }
    }, [travelerId])

    useEffect(() => {
        const fetchBookings = async () => {
            if (!travelerId) {
                if (!travelerIdFromParams && user === null) return
                if (!travelerIdFromParams) {
                    setError("Traveler ID is required")
                    setLoading(false)
                }
                return
            }

            try {
                setLoading(true)
                setError(null)
                const response = await getBookingsList({
                    traveler_id: travelerId,
                    page: pagination.page,
                    limit: pagination.limit
                })
                
                // For "Load More" pagination, append new results to existing ones
                // Reset bookings if it's the first page or if traveler changed
                if (pagination.page === 1) {
                    setBookings(response.results)
                } else {
                    setBookings(prev => [...prev, ...response.results])
                }
                
                setPagination(prev => ({
                    ...prev,
                    total: response.total,
                    has_more: response.has_more
                }))
            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.SOMETHING_WENT_WRONG
                setError(errorMessage)
                toast.error(errorMessage)
            } finally {
                setLoading(false)
            }
        }

        fetchBookings()
    }, [travelerId, travelerIdFromParams, user, pagination.page, pagination.limit])

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "N/A"
        return new Date(dateString).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "short",
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
                return "text-gray-600 bg-white"
        }
    }

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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary-default mx-auto mb-4" />
                    <p className="text-gray-600 font-manrope">Loading bookings...</p>
                </div>
            </div>
        )
    }

    if (error || !travelerId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white px-4">
                <div className="max-w-md w-full text-center">
                    <h1 className="text-2xl font-bold text-gray-900 font-red-hat-display mb-2">
                        {error || "Traveler ID Required"}
                    </h1>
                    <p className="text-gray-600 font-manrope mb-6">
                        {error || "Please provide a traveler_id in the query parameters."}
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
        <div className="min-h-screen bg-white">
            <div className="max-w-[1320px] mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 font-red-hat-display mb-2">
                        Bookings
                    </h1>
                    <p className="text-gray-600 font-manrope">
                        {bookings.length > 0 ? `${pagination.total} booking${pagination.total !== 1 ? 's' : ''} found` : 'No bookings found'}
                    </p>
                </div>

                {/* Bookings List */}
                {bookings.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                        <p className="text-gray-600 font-manrope text-lg">
                            No bookings found for this traveler.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {bookings.map((booking) => (
                            <div
                                key={booking.id}
                                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-xl font-semibold text-gray-900 font-red-hat-display">
                                                {getBookingDisplayTitle(booking)}
                                            </h2>
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold font-manrope ${getStatusColor(booking.status)}`}>
                                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace("_", " ")}
                                            </span>
                                        </div>
                                        {/* Show booking ID as secondary info */}
                                        <p className="text-sm text-gray-500 font-manrope mb-2">
                                            {booking.rimigo_booking_id}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-500 font-manrope">Booking Date</p>
                                                <p className="text-gray-900 font-medium font-manrope">
                                                    {formatDate(booking.booking_date)}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 font-manrope">Amount</p>
                                                <p className="text-gray-900 font-medium font-manrope">
                                                    {formatCurrency(
                                                        booking.cost_to_traveler,
                                                        booking.payment_details?.payment_currency || "INR"
                                                    )}
                                                </p>
                                            </div>
                                            {booking.order_id && (
                                                <div>
                                                    <p className="text-gray-500 font-manrope">Order ID</p>
                                                    <p className="text-gray-900 font-medium font-manrope">
                                                        {booking.order_id}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-3 ml-4">
                                        <Button
                                            title="View"
                                            onClick={() => navigate(`${BOOKINGS_ROUTE}/${booking.id}`)}
                                            className="bg-primary-default text-white hover:bg-primary-dark px-4 py-2 rounded-lg font-manrope text-sm flex items-center gap-2"
                                            icon={<Eye className="w-4 h-4" />}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {pagination.has_more && (
                    <div className="mt-6 flex justify-center">
                        <Button
                            title="Load More"
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            className="bg-gray-100 text-gray-900 hover:bg-gray-200 px-6 py-3 rounded-lg font-manrope"
                        />
                    </div>
                )}
            </div>

            {!embedded && <RimigoFooter />}
        </div>
    )
}

export default BookingsListPage

