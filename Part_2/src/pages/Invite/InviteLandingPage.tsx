import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getInviteDetails, acceptInvite } from '@/api/tripInviteAPI/tripInviteAPI'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { toast } from 'sonner'
import { Check, X, Calendar, User, MapPin, LogIn } from 'lucide-react'
import { format } from 'date-fns'
import { DEFAULT_LANDING_PAGE_ROUTE } from '@/routes/routes'

const InviteLandingPage = () => {
    const { inviteToken } = useParams<{ inviteToken: string }>()
    const navigate = useNavigate()
    const [inviteDetails, setInviteDetails] = useState<{
        trip_name: string
        trip_sequence_id: string
        invited_by_name: string
        status: string
        expires_at: string | null
        requires_login: boolean
    } | null>(null)
    const [loading, setLoading] = useState(true)
    const [accepting, setAccepting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
    const [userInfo, setUserInfo] = useState<any | null>(null)
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const loggedIn = await TokenStorage.isLoggedIn()
                const userInfo = await TokenStorage.getUserInfo()
                setIsAuthenticated(loggedIn)
                setUserInfo(userInfo)
            } catch (err) {
                toast.error((err as Error).message || 'Failed to check authentication')
                setIsAuthenticated(false)
            }
        }
        checkAuth()
    }, [])

    useEffect(() => {
        if (inviteToken) {
            loadInviteDetails()
        }
    }, [inviteToken])

    // Handle redirect after login
    useEffect(() => {
        const pendingInvite = sessionStorage.getItem('pendingInvite')
        if (pendingInvite && isAuthenticated && inviteToken === pendingInvite) {
            handleAcceptInvite()
        }
    }, [isAuthenticated, inviteToken])

    const loadInviteDetails = async () => {
        if (!inviteToken) return

        try {
            setLoading(true)
            setError(null)
            const details = await getInviteDetails(inviteToken)
            setInviteDetails(details)
        } catch (err) {
            toast.error((err as Error).message || 'Invite not found')
            setError((err as Error).message || 'Invite not found')
        } finally {
            setLoading(false)
        }
    }

    const handleAcceptInvite = async () => {
        if (!inviteToken) return

        // Check if user is authenticated
        if (!isAuthenticated) {
            // Store invite token in sessionStorage for redirect back
            sessionStorage.setItem('pendingInvite', inviteToken)
            // Redirect to login with return path
            navigate(`/login?redirectTo=${encodeURIComponent(`/invite/${inviteToken}`)}`)
            return
        }

        // Ensure we have userInfo and traveler_id
        if (!userInfo?.traveler_id) {
            toast.error('Unable to get user information. Please try logging in again.')
            return
        }

        try {
            setAccepting(true)
            setError(null)
            await acceptInvite(inviteToken)

            // Clear pending invite
            sessionStorage.removeItem('pendingInvite')

            toast.success('Invitation accepted successfully!')

            // Redirect to trip details page
            navigate(DEFAULT_LANDING_PAGE_ROUTE)
        } catch (err) {
            setError((err as Error).message || 'Failed to accept invite')
            toast.error((err as Error).message || 'Failed to accept invite')
        } finally {
            setAccepting(false)
        }
    }

    const handleLogin = () => {
        if (!inviteToken) return
        sessionStorage.setItem('pendingInvite', inviteToken)
        navigate(`/login?redirectTo=${encodeURIComponent(`/invite/${inviteToken}`)}`)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-natural-white">
                <div className="mb-8">
                    <img
                        src="/icons/logo-transparent-indigo.png"
                        alt="Rimigo"
                        className="h-12 w-auto mx-auto"
                    />
                </div>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-default mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading invite details...</p>
                </div>
            </div>
        )
    }

    if (error && !inviteDetails) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-natural-white px-4">
                <div className="mb-8">
                    <img
                        src="/icons/logo-transparent-indigo.png"
                        alt="Rimigo"
                        className="h-12 w-auto mx-auto"
                    />
                </div>
                <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center border border-feature-card-border">
                    <div className="mb-4 flex justify-center">
                        <X className="h-16 w-16 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Invite Not Found</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2 bg-primary-default text-white rounded-lg font-semibold hover:bg-primary-default/90 transition-colors">
                        Go to Tripboard
                    </button>
                </div>
            </div>
        )
    }

    if (!inviteDetails) return null

    const isExpired = inviteDetails.status === 'expired'
    const isCancelled = inviteDetails.status === 'cancelled'
    const isAccepted = inviteDetails.status === 'accepted'
    const isPending = inviteDetails.status === 'pending'
    const isActive = inviteDetails.status === 'active'
    const canAccept = isPending || isActive

    return (
        <div className="min-h-screen bg-natural-white flex flex-col items-center justify-center px-4 py-12">
            {/* Rimigo Logo */}
            <div className="mb-8">
                <img
                    src="/icons/logo-transparent-indigo.png"
                    alt="Rimigo"
                    className="h-12 w-auto"
                />
            </div>

            {/* Trip Invitation Card */}
            <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-feature-card-border">
                {/* Header */}
                <div className="bg-primary-default px-8 py-6 text-white">
                    <h1 className="text-2xl font-bold mb-2">Trip Invitation</h1>
                    <p className="text-white/90">You've been invited to join a trip!</p>
                </div>

                {/* Content */}
                <div className="p-8">
                    {/* Trip Preview Card */}
                    <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-1">{inviteDetails.trip_name || 'Untitled Trip'}</h2>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <MapPin className="h-4 w-4" />
                                    <span>Trip ID: {inviteDetails.trip_sequence_id}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <User className="h-4 w-4" />
                                <span>Invited by: {inviteDetails.invited_by_name}</span>
                            </div>

                            {inviteDetails.expires_at && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar className="h-4 w-4" />
                                    <span>Expires: {format(new Date(inviteDetails.expires_at), 'MMMM d, yyyy')}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status Messages */}
                    {isExpired && (
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center gap-2 text-yellow-800">
                                <X className="h-5 w-5" />
                                <span className="font-semibold">This invite has expired</span>
                            </div>
                            <p className="text-sm text-yellow-700 mt-1">Please request a new invite from the trip owner.</p>
                        </div>
                    )}

                    {isCancelled && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2 text-red-800">
                                <X className="h-5 w-5" />
                                <span className="font-semibold">This invite has been cancelled</span>
                            </div>
                            <p className="text-sm text-red-700 mt-1">This invite was cancelled by the trip owner.</p>
                        </div>
                    )}

                    {isAccepted && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 text-green-800">
                                <Check className="h-5 w-5" />
                                <span className="font-semibold">You have already accepted this invite</span>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && canAccept && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {canAccept && (
                        <div className="space-y-3">
                            {!isAuthenticated ? (
                                <>
                                    <button
                                        onClick={handleLogin}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-default text-white rounded-lg font-semibold hover:bg-primary-default/90 transition-colors">
                                        <LogIn className="h-5 w-5" />
                                        <span>Log In to Accept</span>
                                    </button>
                                    <p className="text-sm text-center text-gray-600">You need to be logged in to accept this invitation</p>
                                </>
                            ) : (
                                <button
                                    onClick={handleAcceptInvite}
                                    disabled={accepting}
                                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-default text-white rounded-lg font-semibold hover:bg-primary-default/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                    {accepting ? (
                                        <>
                                            <svg
                                                className="animate-spin h-5 w-5 text-white"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24">
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                                />
                                            </svg>
                                            <span>Accepting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-5 w-5" />
                                            <span>Accept Invitation</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Back to Home Button */}
                    <button
                        onClick={() => navigate('/')}
                        className="w-full mt-4 px-6 py-2 border border-feature-card-border text-gray-700 rounded-lg font-semibold hover:bg-grey-5 transition-colors">
                        Back to Tripboard
                    </button>
                </div>
            </div>
        </div>
    )
}

export default InviteLandingPage
