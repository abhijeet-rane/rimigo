import { CSSProperties, useEffect, useRef, useState } from 'react'
import { PhoneInput } from './PhoneInput'
import OTPInput from './OTPInput'
import Typography from '@/components/shared/Typography'
import { Button } from '@/components/shared/ButtonNew'
import { countryCodes } from '@/utils/country-code'
import { useNavigate, useLocation } from 'react-router-dom'
import { handleVerifyOtp, validatePhoneNumber, validatePhone } from '@/lib/auth/authUtils'
import { useAuth } from '@/lib/auth/providers/AuthProviders'
import { DEFAULT_LANDING_PAGE_ROUTE, DEFAULT_TRIP_ONBOARDING_ROUTE, LOGIN_ROUTE } from '@/routes/routes'
import { getTravelerProfileStatus, TravelerProfileStatus } from '../api/onboardingAPI'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { ERROR_MESSAGES } from '@/constants/toastMessages/errorMessageConstants'
import { toast } from 'sonner'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { useLoginModal } from '../context/LoginModalContext'

type PhoneLoginCardVariant = 'page' | 'embedded'

interface PhoneLoginCardProps {
    variant?: PhoneLoginCardVariant
    className?: string
    style?: CSSProperties
}

const PhoneLoginCard = ({ variant = 'page', className = '', style }: PhoneLoginCardProps) => {
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
    const location = useLocation()
    const { trackButtonClickCustom } = usePostHog()
    const { openProfileUpdateModal } = useLoginModal()
    const { sendOtp: sendOtpAuth, signInWithPhone, initRecaptcha } = useAuth()
    const phoneErrorTimer = useRef<NodeJS.Timeout | null>(null)

    const params = new URLSearchParams(location.search)
    const defaultRedirectForVariant = variant === 'embedded' ? DEFAULT_TRIP_ONBOARDING_ROUTE : DEFAULT_LANDING_PAGE_ROUTE
    let redirectTo = params.get('redirectTo') || defaultRedirectForVariant

    if (redirectTo === LOGIN_ROUTE) {
        redirectTo = DEFAULT_LANDING_PAGE_ROUTE
    }

    const queryString = redirectTo.split('?')[1]
    const utmSource = queryString ? new URLSearchParams(queryString).get('utm_source') ?? '' : ''

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
        if (loading) return

        if (!validatePhoneNumber(phone, country?.code || '+91', setError)) {
            return
        }

        setLoading(true)
        setError('')

        try {
            const fullPhoneNumber = `${country?.code || '+91'}${phone}`
            trackButtonClickCustom({
                buttonPage: 'lead_gen_v1',
                buttonName: 'get_otp',
                buttonAction: 'sign_up_page_phone_submit',
                extra: { phone_number: fullPhoneNumber }
            })
            const { success } = await sendOtpAuth(fullPhoneNumber)
            if (success) {
                setOtpSent(true)
                setEditingPhone(false)
                setResendTimer(60)
                setOtpValue('')
                setOtpError('')
                setOtpAutoVerified(false)
            }
        } catch {
            const fullPhoneNumber = `${country?.code || '+91'}${phone}`
            trackButtonClickCustom({
                buttonPage: 'lead_gen_v1',
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
                try {
                    const userInfo = await TokenStorage.getUserInfo()
                    if (!userInfo?.traveler_id) {
                        toast.error('Traveler ID not found')
                        navigate(redirectTo as string, { replace: true })
                        return
                    }

                    const travelerProfileStatus: TravelerProfileStatus = await getTravelerProfileStatus(userInfo.traveler_id)
                    const resolvedRedirect = redirectTo as string

                    // If name is missing, collect it in the global modal (stay on current page; no /profile/update).
                    if (!travelerProfileStatus?.traveler_name) {
                        setTimeout(() => {
                            openProfileUpdateModal({
                                redirectTo: resolvedRedirect,
                                onSuccess: () => {
                                    navigate(resolvedRedirect, { replace: true })
                                }
                            })
                        }, 300)
                        return
                    }

                    // Otherwise continue to the intended destination (trip creation, etc.)
                    navigate(resolvedRedirect, { replace: true })
                } catch (error) {
                    toast.error((error as Error).message || ERROR_MESSAGES.SOMETHING_WENT_WRONG)
                    navigate(redirectTo as string, { replace: true })
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
            buttonPage: 'lead_gen_v1',
            buttonName: 'Verify_OTP',
            buttonAction: 'sign_up_page_otp_submit',
            extra: {
                ...(utmSource ? { source: utmSource } : {})
            }
        })
        handleVerifyOtp(otp, setOtpError, setIsOtpVerifying, handleOtpLogin)
        isVerifyingRef.current = false
    }

    // Pre-initialize reCAPTCHA so "GET OTP" click is instant
    useEffect(() => {
        initRecaptcha()
    }, [initRecaptcha])

    useEffect(() => {
        if (resendTimer <= 0) return
        const interval = setInterval(() => {
            setResendTimer((prev) => (prev > 0 ? prev - 1 : 0))
        }, 1000)
        return () => clearInterval(interval)
    }, [resendTimer])

    const inOtpScreen = otpSent && !editingPhone
    const isEmbedded = variant === 'embedded'

    const headingContent = inOtpScreen ? (
        'Verify with OTP'
    ) : isEmbedded ? (
        <>
            Plan your trip in <span className="text-primary-default italic">minutes</span>
        </>
    ) : (
        'Sign In'
    )

    const subHeadingContent = !inOtpScreen
        ? isEmbedded
            ? 'Sign up or Log in'
            : 'Enter Phone Number'
        : null

    const containerClasses = [
        'flex flex-col w-full',
        isEmbedded
            ? 'px-[32px] pt-8 pb-10 gap-6 bg-grey-5 flex-1 min-h-0 md:flex-initial md:min-h-0'
            : 'pt-[80px] gap-6',
        className
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <div
            className={containerClasses}
            style={style}>
            <div className="flex flex-col">
                <Typography
                    family="redhat"
                    weight="semibold"
                    size={isEmbedded ? '24' : '28'}
                    color="grey-0">
                    {headingContent}
                </Typography>

                {subHeadingContent && (
                    <p
                    className="font-[600] font-manrope leading-[18px] tracking-[-2%] text-grey-2 text-[14px] md:font-[300]">
                        {subHeadingContent}
                    </p>
                )}

                {inOtpScreen && (
                    <div className="flex items-center flex-wrap gap-1">
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
            </div>

            {!otpSent || editingPhone ? (
                <div className="flex flex-col gap-4 flex-1 min-h-0 md:flex-initial">
                    <PhoneInput
                        value={phone}
                        country={country!}
                        onChangePhone={(text) => {
                            setPhone(text)

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
                    <Button
                        buttonColor={{
                            enabled: `${isEmbedded ? 'bg-grey-0' : 'bg-grey-0'} text-natural-white`,
                            disabled: `${isEmbedded ? 'bg-grey-4' : 'bg-grey-4'} text-natural-white`
                        }}
                        className="text-[16px]! font-[645] font-red-hat-display leading-[14px] text-white"
                        title={loading ? 'SENDING OTP..' : 'GET OTP'}
                        onClick={() => sendOtp()}
                        disabled={!validatePhone(phone, country?.code || '+91') || !!error || loading}
                    />
                    {!isEmbedded && privacyText}
                </div>
            ) : (
                <div className="flex flex-col gap-6 flex-1 min-h-0 md:flex-initial">
                    <div className="flex flex-col gap-2">
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
                                color="secondary-red">
                                {otpError}
                            </Typography>
                        )}
                    </div>

                    <Button
                        buttonColor={{
                            enabled: `${isEmbedded ? 'bg-grey-0' : 'bg-grey-0'} text-natural-white`,
                            disabled: `${isEmbedded ? 'bg-grey-4' : 'bg-grey-4'} text-natural-white`
                        }}
                        title={isOtpVerifying ? 'VERIFYING OTP...' : 'VERIFY OTP'}
                        className="text-[16px]! font-[645] font-red-hat-display leading-[14px] text-white"
                        onClick={() => verifyOtp(otpValue)}
                        disabled={isOtpVerifying || otpValue.length !== 6}
                    />

                    <div className="text-center">
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
                                className="underline font-redhat font-bold text-[14px] text-grey-0 disabled:opacity-50"
                                disabled={loading || isOtpVerifying}>
                                Resend OTP
                            </button>
                        )}
                    </div>

                    {!isEmbedded && privacyText}
                </div>
            )}

            {/* On embedded (mobile), terms stick to bottom of screen */}
            {isEmbedded && (
                <div className="mt-auto pt-4 shrink-0">
                    {privacyText}
                </div>
            )}

            <div id="recaptcha-container" />
        </div>
    )
}

export default PhoneLoginCard

