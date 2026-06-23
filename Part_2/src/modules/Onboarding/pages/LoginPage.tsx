import { useState, useEffect, useRef } from 'react'
import { PhoneInput } from '../components/PhoneInput'
import { countryCodes } from '@/utils/country-code'

import Typography from '@/components/shared/Typography'
import { Button } from '@/components/shared/ButtonNew'
import OTPInput from '../components/OTPInput'
import { useNavigate, useLocation } from 'react-router-dom'
import { handleVerifyOtp, validatePhone, validatePhoneNumber } from '@/lib/auth/authUtils'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { DEFAULT_LANDING_PAGE_ROUTE, LOGIN_ROUTE } from '@/routes/routes'
import { MAX_WIDTH } from '../constants/width'
import { getTravelerProfileStatus, TravelerProfileStatus } from '../api/onboardingAPI'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { toast } from 'sonner'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics'
import { GA_EVENTS, GA_EVENT_CATEGORIES } from '@/constants/googleAnalytics'
import { cn } from '@/lib/utils'
import { useLoginModal } from '../context/LoginModalContext'
import { LEADGEN_V2_BUTTON_PAGE } from '@/constants/posthogEvents'

const LoginPage = ({
    redirectToFromModal,
    onLoginSuccess,
    onProfileIncomplete,
    redirectAfterLogin = true,
    className = 'min-h-screen py-[48px] pb-[80px] ',
    showLoginHeading = true,
    subheading = 'Enter your phone number to access your TripBoard',
    childContainerClassName = '',
    buttonPage: buttonPageOverride,
    compactLayout = false

}: {
    redirectToFromModal?: string
    onLoginSuccess?: () => void
    /** When provided, called instead of opening profile update modal if profile is incomplete */
    onProfileIncomplete?: () => void
    redirectAfterLogin?: boolean
        className?: string,
        showLoginHeading?: boolean
        subheading?: string
        childContainerClassName?:string
        buttonPage?: string
        compactLayout?: boolean
}) => {
    const [phone, setPhone] = useState('')
    const [country, setCountry] = useState(countryCodes.find((c) => c.code === '+91'))
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [otpSent, setOtpSent] = useState(false)
    const [otpError, setOtpError] = useState('')
    const [editingPhone, setEditingPhone] = useState(false)
    const [otpValue, setOtpValue] = useState('')
    const [otpAutoVerified, setOtpAutoVerified] = useState(false)
    const [resendTimer, setResendTimer] = useState(0)
    const [isOtpVerifying, setIsOtpVerifying] = useState(false)
    const isVerifyingRef = useRef(false)
    const navigate = useNavigate()
    const { trackButtonClickCustom } = usePostHog()
    const { trackGoogleEvent } = useGoogleAnalytics()
    const resolvedButtonPage = buttonPageOverride || (!redirectAfterLogin ? LEADGEN_V2_BUTTON_PAGE : 'lead_gen_v1')
    const { openProfileUpdateModal } = useLoginModal()
    // Authentication hooks and state
    const { sendOtp: sendOtpAuth, signInWithPhone, initRecaptcha } = useAuth()
    const location = useLocation()
    const params = new URLSearchParams(location.search)
    let redirectTo = redirectToFromModal || params.get('redirect') || params.get('redirectTo') || DEFAULT_LANDING_PAGE_ROUTE
    const phoneErrorTimer = useRef<NodeJS.Timeout | null>(null)

    // check if redirectTo is not a login route
    if (redirectTo === LOGIN_ROUTE) {
        redirectTo = DEFAULT_LANDING_PAGE_ROUTE
    }
    const queryString = redirectTo.split('?')[1]
    let utmSource = queryString ? (new URLSearchParams(queryString).get('utm_source') ?? '') : ''

    if (!utmSource) {
        // track from params in the url
        utmSource = params.get('utm_source') ?? ''
    }


    const privacyText = (
        <p className="font-redhat font-medium text-grey-2" style={{ fontFamily: 'var(--font-red-hat-display)', fontSize: 'var(--font-size-md)' }}>
            By continuing, you agree to our{' '}
            <a
                href="/terms-and-conditions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-grey-0 no-underline border-b border-current hover:opacity-80 transition-all duration-200 cursor-pointer">
                Terms of Service
            </a>
            {' '}and{' '}
            <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-grey-0 no-underline border-b border-current hover:opacity-80 transition-all duration-200 cursor-pointer">
                Privacy Policy
            </a>
        </p>
    )

    const sendOtp = async () => {
        if (loading) return // Prevent multiple calls

        if (!validatePhoneNumber(phone, country?.code || '+91', setError)) {
            return
        }

        setLoading(true)
        setError('')

        try {
            const fullPhoneNumber = `${country?.code || '+91'}${phone}`
            trackButtonClickCustom({
                buttonPage: resolvedButtonPage,
                buttonName: 'get_otp',
                buttonAction: 'sign_up_page_phone_submit',
                extra: { phone_number: fullPhoneNumber }
            })
            const { success } = await sendOtpAuth(fullPhoneNumber)
            if (success) {
                setOtpSent(true)
                setEditingPhone(false)
                setResendTimer(60) // Start 1-minute timer
                setOtpValue('')
                setOtpError('')
                setOtpAutoVerified(false)
            }
        } catch {
            const fullPhoneNumber = `${country?.code || '+91'}${phone}`
            trackButtonClickCustom({
                buttonPage: resolvedButtonPage,
                buttonName: 'get_otp',
                buttonAction: 'otp_request_failed',
                extra: { phone_number: fullPhoneNumber }
            })
            setOtpSent(false)
            setError('Failed to send OTP. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleOtpLogin = async (otp: string) => {
        try {
            const result = await signInWithPhone(otp, utmSource || undefined)
            if (result.success) {
                // Get traveler ID from token storage after successful login
                try {
                    const userInfo = await TokenStorage.getUserInfo()
                    if (!userInfo?.traveler_id) {
                        toast.error('Traveler ID not found')
                        // Call onLoginSuccess callback to close modal
                        onLoginSuccess?.()
                        // Only navigate if redirectAfterLogin is true
                        if (redirectAfterLogin) {
                            navigate(redirectTo as string, { replace: true })
                        }
                        return
                    }

                    // Check traveler profile status
                    const travelerProfileStatus: TravelerProfileStatus = await getTravelerProfileStatus(userInfo.traveler_id)
                    const isProfileCompleted = travelerProfileStatus?.status === true && !!travelerProfileStatus?.traveler_name

                    // Track successful login in Google Analytics
                    const fullPhoneNumber = `${country?.code || '+91'}${phone}`
                    trackGoogleEvent(GA_EVENTS.LOGIN_SUCCESS, {
                        event_category: GA_EVENT_CATEGORIES.AUTHENTICATION,
                        event_label: userInfo.traveler_id || null,
                        traveler_id: userInfo.traveler_id || null,
                        phone_number: fullPhoneNumber,
                        redirect_to: redirectTo as string,
                        ...(utmSource ? { utm_source: utmSource } : {})
                    })

                    // Handle profile completion
                    if (isProfileCompleted) {
                        // Profile is completed, close login modal and proceed with normal flow
                        onLoginSuccess?.()
                        if (redirectAfterLogin) {
                            navigate(redirectTo as string, { replace: true })
                        }
                    } else {
                        // Profile is not completed — always use name modal (same UX as Tripboard login);
                        // avoid /profile/update so users cannot use the sidebar without a name.
                        if (onProfileIncomplete) {
                            onProfileIncomplete()
                            return
                        }

                        setTimeout(() => {
                            openProfileUpdateModal({
                                redirectTo: redirectTo as string,
                                onSuccess: () => {
                                    onLoginSuccess?.()
                                    if (redirectAfterLogin) {
                                        navigate(redirectTo as string, { replace: true })
                                    }
                                }
                            })
                        }, 300)
                    }
                } catch (error) {
                    toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
                    // Call onLoginSuccess callback even on error to close modal
                    onLoginSuccess?.()
                    // On error, only redirect if redirectAfterLogin is true
                    if (redirectAfterLogin) {
                        navigate(redirectTo as string, { replace: true })
                    }
                }
            } else {
                setOtpError(result.message || 'Failed to verify OTP')
            }
        } catch {
            setOtpError('Failed to login with OTP')
        }
    }

    const verifyOtp = (otp: string) => {
        if (isVerifyingRef.current) return
        if (otp.length !== 6) {
            setOtpError('Please enter a valid 6-digit OTP')
            return
        }

        isVerifyingRef.current = true
        setOtpError('')
        trackButtonClickCustom({
            buttonPage: resolvedButtonPage,
            buttonName: 'Verify_OTP',
            buttonAction: 'sign_up_page_otp_submit',
            extra: {
                ...(utmSource ? { source: utmSource } : {})
            }
        })
        // Use the handleVerifyOtp utility function
        handleVerifyOtp(otp, setOtpError, setIsOtpVerifying, handleOtpLogin)
        isVerifyingRef.current = false
    }

    // Pre-initialize reCAPTCHA so "GET OTP" click is instant
    useEffect(() => {
        initRecaptcha()
    }, [initRecaptcha])

    // resend timer
    useEffect(() => {
        if (resendTimer <= 0) return
        const interval = setInterval(() => {
            setResendTimer((prev) => (prev > 0 ? prev - 1 : 0))
        }, 1000)
        return () => clearInterval(interval)
    }, [resendTimer])

    const inOtpScreen = otpSent && !editingPhone

    return (
        <div
            className={cn(
                'relative flex w-full flex-col bg-natural-white',
                compactLayout ? 'h-auto' : 'h-full lg:min-h-0 lg:flex-1 lg:items-center',
                className
            )}>
            {/* {showBackButton && (
                <div className="w-full  flex justify-start">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-grey-4 flex items-center justify-center cursor-pointer">
                        <ArrowLeft
                            size={22}
                            className="text-grey-0"
                        />
                    </button>
                </div>
            )} */}

            {/* On desktop (lg) this centers the form; terms go in a separate block at bottom */}
            <div
                className={cn('mx-auto flex w-full min-h-0 flex-col px-4', !compactLayout && 'flex-1')}
                style={{ maxWidth: `${MAX_WIDTH}px` }}>
                {/* Header + form — centered on desktop; terms use mt-auto unless compactLayout (modal). */}
                <div
                    className={cn(
                        'flex min-h-0 flex-col',
                        !compactLayout && 'flex-1 lg:justify-center',
                        childContainerClassName
                    )}>
                {/* Header */}
                {showLoginHeading && (
                <div className="mb-2">
                    <Typography
                        family="redhat"
                        weight="semibold"
                        size="24"
                        color="grey-0"
                        className="font-medium md:font-semibold w-full">
                        {inOtpScreen ? 'Verify with OTP' : 'Login / Signup'}
                    </Typography>
                        </div>
                        )}

                {!inOtpScreen ? (
                    <Typography
                        family="manrope"
                        weight="medium"
                        size="14"
                        color="grey-2"
                        className={compactLayout ? 'mb-4' : 'mb-8'}>
                        {subheading ? subheading : 'Share your details to access your trip'}
                    </Typography>
                ) : (
                    <div className={cn('flex flex-wrap items-center gap-1', compactLayout ? 'mb-4' : 'mb-6')}>
                        <Typography
                            family="redhat"
                            weight="bold"
                            size="14"
                            color="grey-0">
                            Sent to:
                        </Typography>
                        <Typography
                            family="redhat"
                            weight="bold"
                            size="14"
                            color="grey-0">
                            {country?.code} {phone}
                        </Typography>
                        <button
                            onClick={() => {
                                setEditingPhone(true)
                                setOtpSent(false)
                                setOtpValue('')
                                setOtpError('')
                                setOtpAutoVerified(false)
                            }}
                            className="ml-2 underline text-primary-default font-redhat font-bold text-[14px]">
                            edit
                        </button>
                    </div>
                )}

                {/* Phone / OTP section */}
                {!otpSent || editingPhone ? (
                    <form
                        className={compactLayout ? 'mt-2' : 'mt-4'}
                        onSubmit={(e) => {
                            e.preventDefault()
                            sendOtp()
                        }}>
                        <PhoneInput
                            value={phone}
                            country={country!}
                            onChangePhone={(text) => {
                                setPhone(text)

                                // Clear previous timers
                                if (phoneErrorTimer.current) {
                                    clearTimeout(phoneErrorTimer.current)
                                }

                                if (validatePhone(text, country?.code || '+91')) {
                                    setError('')
                                    return
                                }

                                phoneErrorTimer.current = setTimeout(() => {
                                    setError('Please enter a valid phone number.')
                                }, 800)
                            }}
                            onChangeCountry={(c) => setCountry(c)}
                            error={error}
                        />
                        <div className="mt-4">
                            <Button
                                buttonColor={{
                                    enabled: 'bg-grey-0  text-natural-white',
                                    disabled: 'bg-grey-4 text-natural-white'
                                }}
                                title={loading ? 'SENDING OTP...' : 'GET OTP'}
                                onClick={() => sendOtp()}
                                disabled={!validatePhone(phone, country?.code || '+91') || !!error || loading}
                            />
                        </div>
                    </form>
                ) : (
                    <>
                        <div
                            className={cn(
                                'flex flex-col gap-2',
                                !showLoginHeading && (compactLayout ? '-mt-1' : '-mt-5')
                            )}>
                            <OTPInput
                                length={6}
                                value={otpValue}
                                onChange={(otp) => {
                                    setOtpValue(otp)
                                    setOtpError('')
                                    if (otp.length === 6 && !otpAutoVerified) {
                                        setOtpAutoVerified(true)
                                        verifyOtp(otp)
                                    }
                                }}
                                error={otpError}
                            />

                            {otpError && (
                                <Typography
                                    family="redhat"
                                    weight="medium"
                                    size="12"
                                    color="secondary-red"
                                    className=" ">
                                    {otpError}
                                </Typography>
                            )}
                        </div>
                        <div className="mt-4">
                            <Button
                                buttonColor={{
                                    enabled: 'bg-grey-0  text-natural-white',
                                    disabled: 'bg-grey-4 text-natural-white'
                                }}
                                title={isOtpVerifying ? 'VERIFYING OTP...' : 'VERIFY OTP'}
                                onClick={() => verifyOtp(otpValue)}
                                disabled={isOtpVerifying || otpValue.length !== 6}
                            />
                        </div>

                        {/* Resend OTP */}
                        <div className={cn('text-center', compactLayout ? 'mt-3' : 'mt-6')}>
                            {resendTimer > 0 ? (
                                <Typography
                                    family="redhat"
                                    weight="bold"
                                    size="14"
                                    color="grey-2">
                                    Resend OTP in 0:{resendTimer.toString().padStart(2, '0')}
                                </Typography>
                            ) : (
                                <button
                                    onClick={() => !loading && sendOtp()}
                                    className="underline font-redhat font-bold text-[14px] text-grey-0"
                                    disabled={loading || isOtpVerifying}>
                                    Resend OTP
                                </button>
                            )}
                        </div>
                    </>
                )}
                </div>
                {/* Terms stick to bottom on full page; modal uses natural flow (no mt-auto gap) */}
                <div
                    className={cn(
                        'shrink-0',
                        compactLayout
                            ? 'mt-4 pb-3 pt-0'
                            : showLoginHeading
                              ? 'mt-auto pt-6 pb-6'
                              : 'mt-auto pt-3 pb-4'
                    )}>
                    {privacyText}
                </div>
            </div>
            <div id="recaptcha-container" />
        </div>
    )
}

export default LoginPage
