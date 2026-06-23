import {
    ConfirmationResult,
    signOut as firebaseSignOut,
    User as FirebaseUser,
    onAuthStateChanged,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from 'firebase/auth'

import { auth } from '@/lib/auth/firebaseConfig'
import { AuthError, AuthProvider, User } from '@/types/authTypes/authTypes'
if (process.env.NODE_ENV === 'development') {
    auth.settings.appVerificationDisabledForTesting = true
}

interface IAuthService {
    signOut(): Promise<void>
    getCurrentUser(): User | null
    onAuthStateChanged(callback: (user: User | null) => void): () => void
}

export interface OtpVerificationResult {
    success: boolean
    responseCode: OtpResponseCode
    message: string
    data: User | null
}

export enum OtpResponseCode {
    SUCCESS = 'SUCCESS',
    INVALID_CODE = 'INVALID_CODE',
    CODE_EXPIRED = 'CODE_EXPIRED',
    SESSION_EXPIRED = 'SESSION_EXPIRED',
    INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}

export const OtpResponseMessages: Record<OtpResponseCode, string> = {
    [OtpResponseCode.SUCCESS]: 'OTP verified successfully',
    [OtpResponseCode.INVALID_CODE]: 'Invalid OTP code. Please check and try again.',
    [OtpResponseCode.CODE_EXPIRED]: 'OTP code has expired. Please request a new code.',
    [OtpResponseCode.SESSION_EXPIRED]: 'Verification session has expired. Please start again.',
    [OtpResponseCode.INTERNAL_SERVER_ERROR]: 'Oops! Something went wrong.'
}

class FirebaseAuthService implements IAuthService {
    private currentUser: User | null = null
    private confirmationResult?: ConfirmationResult

    private async convertFirebaseUser(firebaseUser: FirebaseUser): Promise<User> {
        return {
            id: firebaseUser.uid,
            email: firebaseUser.email || `${firebaseUser.phoneNumber}@placeholder.com`,
            phone: firebaseUser.phoneNumber,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            emailVerified: firebaseUser.emailVerified,
            provider: this.getProviderType(firebaseUser),
            createdAt: new Date(firebaseUser.metadata.creationTime || Date.now()),
            idToken: await firebaseUser.getIdToken(),
            expiresIn: '3600'
        }
    }

    private getProviderType(firebaseUser: FirebaseUser): AuthProvider {
        const providerId = firebaseUser.providerData[0]?.providerId
        switch (providerId) {
            case 'google.com':
                return 'google'
            case 'apple.com':
                return 'apple'
            default:
                return 'email'
        }
    }

    private createAuthError(error: any): AuthError {
        // eslint-disable-line @typescript-eslint/no-explicit-any
        const errorMap: Record<string, string> = {
            'auth/user-not-found': 'No account found with this email address.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/email-already-in-use': 'An account with this email already exists.',
            'auth/weak-password': 'Password should be at least 6 characters.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/network-request-failed': 'Network error. Please check your connection.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/popup-closed-by-user': 'Sign-in was cancelled.',
            'auth/popup-blocked': 'Pop-up was blocked. Please allow pop-ups for this site.',
            'auth/cancelled-popup-request': 'Sign-in was cancelled.',
            'auth/account-exists-with-different-credential': 'An account already exists with this email but different sign-in method.'
        }

        return {
            code: error.code || 'unknown-error',
            message: error.message || 'An unexpected error occurred.',
            userMessage: errorMap[error.code] || 'An unexpected error occurred. Please try again.'
        }
    }

    private recaptchaVerifier: RecaptchaVerifier | null = null
    private containerId: string = ''
    private recaptchaScriptLoaded: boolean = false

    /**
     * Pre-load the reCAPTCHA script so "GET OTP" feels instant.
     * Creates a throwaway verifier and renders it to force the script download,
     * then discards it. sendOtp() always creates a fresh verifier (required by
     * reCAPTCHA Enterprise), but the script is already cached so it's fast.
     */
    async initRecaptcha(): Promise<void> {
        if (this.recaptchaScriptLoaded) return

        const warmupId = `recaptcha-warmup-${Date.now()}`
        const container = document.getElementById('recaptcha-container')
        if (!container) return

        const warmupDiv = document.createElement('div')
        warmupDiv.id = warmupId
        container.appendChild(warmupDiv)

        try {
            const warmupVerifier = new RecaptchaVerifier(auth, warmupId, {
                size: 'invisible',
                callback: () => {}
            })
            // render() forces the reCAPTCHA script to download
            await warmupVerifier.render()
            this.recaptchaScriptLoaded = true
            warmupVerifier.clear()
        } catch {
            // Silently fail — sendOtp will load the script on demand
        } finally {
            warmupDiv.remove()
        }
    }

    async sendOtp(phoneNumber: string): Promise<void> {
        try {
            // Always create a fresh verifier (reCAPTCHA Enterprise requires it)
            if (this.recaptchaVerifier) {
                this.recaptchaVerifier.clear()
                this.recaptchaVerifier = null
            }

            this.containerId = `recaptcha-container-${Date.now()}`
            const existingContainer = document.getElementById('recaptcha-container')
            if (existingContainer) {
                existingContainer.innerHTML = ''
                const newDiv = document.createElement('div')
                newDiv.id = this.containerId
                existingContainer.appendChild(newDiv)
                await new Promise((res) => setTimeout(res, 0))
            }

            this.recaptchaVerifier = new RecaptchaVerifier(auth, this.containerId, {
                size: 'invisible',
                callback: () => {}
            })

            this.confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, this.recaptchaVerifier!)
        } catch (error) {
            // Clean up on error
            if (this.recaptchaVerifier) {
                this.recaptchaVerifier.clear()
                this.recaptchaVerifier = null
            }

            throw error
        }
    }

    async verifyOtp(code: string): Promise<OtpVerificationResult> {
        try {
            if (!this.confirmationResult) {
                throw new Error('No OTP session found. Please request a new OTP.')
            }

            const result = await this.confirmationResult.confirm(code)
            const user = await this.convertFirebaseUser(result.user) // your own user converter

            return {
                success: true,
                responseCode: OtpResponseCode.SUCCESS,
                message: OtpResponseMessages[OtpResponseCode.SUCCESS],
                data: user
            }
        } catch (error: any) {
            // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('OTP verification failed:', error)

            // Handle specific Firebase OTP errors
            let responseCode: OtpResponseCode

            switch (error.code) {
                case 'auth/invalid-verification-code':
                    responseCode = OtpResponseCode.INVALID_CODE
                    break
                case 'auth/code-expired':
                    responseCode = OtpResponseCode.CODE_EXPIRED
                    break
                case 'auth/session-expired':
                    responseCode = OtpResponseCode.SESSION_EXPIRED
                    break
                default:
                    // For other errors, still throw them
                    throw error
            }

            return {
                success: false,
                responseCode,
                message: OtpResponseMessages[responseCode],
                data: null
            }
        }
    }

    async signOut(): Promise<void> {
        try {
            await firebaseSignOut(auth)
            this.currentUser = null
        } catch (error: any) {
            // eslint-disable-line @typescript-eslint/no-explicit-any
            throw this.createAuthError(error)
        }
    }

    getCurrentUser(): User | null {
        return this.currentUser
    }

    onAuthStateChanged(callback: (user: User | null) => void): () => void {
        return onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const user = await this.convertFirebaseUser(firebaseUser)
                this.currentUser = user
                callback(user)
            } else {
                this.currentUser = null
                callback(null)
            }
        })
    }
}

export const authService = new FirebaseAuthService()
