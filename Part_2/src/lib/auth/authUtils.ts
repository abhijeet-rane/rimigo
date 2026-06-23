import PhoneNumber, { CountryCode } from 'libphonenumber-js'
import { isDevMode } from '../config/config'

const PHONE_NUMBER_ERROR = 'Invalid phone number'
const PHONE_NUMBER_REQUIRED_ERROR = 'Phone number is required'
const OTP_REQUIRED_ERROR = 'OTP is required'

export const validatePhone = (phoneNumber: string, countryCode: string) => {
    try {
        const parsedPhoneNumber = `${countryCode}${phoneNumber}`
        const number = PhoneNumber(parsedPhoneNumber, countryCode as CountryCode)
        if (number && number.isValid()) {
            return true // Phone number is valid.
        } else {
            return false // Phone number is not valid.
        }
    } catch (error: any) {
        // Handle parsing err
        // or logging the error and return false
        if (isDevMode) {
            console.error(error)
        }
        return false
    }
}

export const validatePhoneNumber = (phoneNumber: string, countryCode: string, setPhoneError: (error: string) => void): boolean => {
    if (!phoneNumber.trim()) {
        setPhoneError(PHONE_NUMBER_REQUIRED_ERROR)
        return false
    }

    if (!validatePhone(phoneNumber, countryCode)) {
        setPhoneError(PHONE_NUMBER_ERROR)
        return false
    }

    setPhoneError('')
    return true
}

export const validateOtp = (otp: string, setOtpError: (error: string) => void): boolean => {
    if (!otp.trim()) {
        setOtpError(OTP_REQUIRED_ERROR)
        return false
    }

    setOtpError('')
    return true
}

// verify otp

export const handleVerifyOtp = async (
    otp: string,
    setOtpError: (error: string) => void,
    setIsOtpVerifying: (isOtpVerifying: boolean) => void,
    handleOtpLogin: (otp: string) => Promise<void>
): Promise<void> => {
    if (!validateOtp(otp, setOtpError)) {
        try {
            // trackError("form_validation_error", "Invalid OTP format", {
            //   field: "otp",
            // });
        } catch {}
        return
    }

    setIsOtpVerifying(true)
    try {
        // trackButtonClick("verify_otp_click");
        // trackEvent("otp_verify_attempt", { otp_length: otp.length });
        await handleOtpLogin(otp)
        try {
            // trackEvent("otp_verified");
        } catch {}
    } catch (error) {
        console.error('Failed to verify OTP:', error)
        setOtpError('Invalid OTP. Please try again.')
        try {
            // trackError("otp_verify_failed", (error as Error)?.message || "verify_otp_error");
        } catch {}
    } finally {
        setIsOtpVerifying(false)
    }
}
