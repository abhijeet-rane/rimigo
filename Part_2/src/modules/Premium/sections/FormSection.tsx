import { useEffect, useMemo, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { countryCodes } from "@/utils/country-code"
import { FormState } from "../components/FormState"
import { SuccessState } from "../components/SuccessState"
import { postPremiumFormData } from "../api/premiumPageAPI"
import { useTravelerDetails } from "@/modules/TravelerProfile/hooks/travelerProfile"
import { TokenStorage } from "@/lib/api/tokenStorage"
import { useAuth } from "@/lib/auth/providers/AuthProviders"
import { PremiumAlreadyMember } from "../components/PremiumAlreadyMember"
import { DestinationCountryField } from "../components/DestinationCountryField"
import { usePostHog } from "@/modules/amplitude/components/PostHogProvider"
import { cn } from "@/lib/utils"
import { validatePhone } from "@/lib/auth/authUtils"

interface FormSectionProps {
    compact?: boolean
    onViewStateChange?: (state: 'form' | 'success' | 'member') => void
    onCancel?: () => void
    subscriptionIntent?: string
    queryText?: string
}

export function FormSection({ compact = false, onViewStateChange, onCancel, subscriptionIntent = 'premium', queryText }: FormSectionProps) {
    const { isAuthenticated } = useAuth()

    const [travelerId, setTravelerId] = useState<string | undefined>()
    const { travelerDetails } = useTravelerDetails(travelerId)
    const { trackButtonClickCustom } = usePostHog()


    const [submitted, setSubmitted] = useState(false)
    const [phone, setPhone] = useState("")
    const [name, setName] = useState("")
    const [country, setCountry] = useState(
        countryCodes.find((c) => c.code === "+91")
    )
    const [error, setError] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [prefilledFromTraveler, setPrefilledFromTraveler] = useState(false)
    const [isEditingDetails, setIsEditingDetails] = useState(false)
    const phoneErrorTimer = useRef<NodeJS.Timeout | null>(null)

    // Destination-callback flow: the modal asks for a country instead of
    // relying on the upstream search input, so the user gets a single-step,
    // unambiguous pick. Selected country becomes `query_text` on submit.
    const isDestinationCallback = subscriptionIntent === 'destination_callback'
    const [destinationCountry, setDestinationCountry] = useState("")
    const destinationField = useMemo(() => {
        if (!isDestinationCallback) return null
        return (
            <DestinationCountryField
                value={destinationCountry}
                onChange={(v) => {
                    setDestinationCountry(v)
                    setError("")
                }}
                error={error}
            />
        )
    }, [isDestinationCallback, destinationCountry, error])

    const showStoredDetails = compact && prefilledFromTraveler && !isEditingDetails && name.trim().length > 0 && validatePhone(phone.trim(), country?.code || "+91")

    const analyticsButtonPage = subscriptionIntent === 'premium' ? 'premium_landing_v1' : subscriptionIntent
    const analyticsButtonName = 'request_callback_submit'

    const isPremiumUser = travelerDetails?.type === "premium"
    const userName = travelerDetails?.name || name

    useEffect(() => {
        if (!onViewStateChange) return
        if (isPremiumUser) {
            onViewStateChange('member')
            return
        }
        if (submitted) {
            onViewStateChange('success')
            return
        }
        onViewStateChange('form')
    }, [isPremiumUser, submitted, onViewStateChange])

    const handleSubmit = async () => {
        // Destination check runs first so the user sees the right error next
        // to the topmost field instead of having to fix name/phone first.
        if (isDestinationCallback && !destinationCountry) {
            setError("Please select a destination")
            return
        }
        const shouldValidateInputs = compact || !isAuthenticated
        if (shouldValidateInputs && (!name || !phone || !validatePhone(phone, country?.code || "+91"))) {
            setError("Please fill all fields correctly")
            return
        }
        // Destination callback: the dropdown owns query_text. Other intents
        // keep the upstream-provided queryText (e.g. premium landing search).
        const trimmedQueryText = (isDestinationCallback ? destinationCountry : queryText)?.trim() ?? ''

        trackButtonClickCustom({
            buttonPage: analyticsButtonPage,
            buttonName: analyticsButtonName,
            buttonAction: 'submit_clicked',
            extra: {
                name,
                phone,
                country_code: country?.code,
                is_authenticated: isAuthenticated,
                subscription_intent: subscriptionIntent,
                query_text: trimmedQueryText,
                // Explicit field on destination-callback events so PostHog
                // dashboards can filter / group by destination directly
                // without parsing query_text. Null for other intents.
                destination_country: isDestinationCallback ? destinationCountry : null
            }
        })

        setIsSubmitting(true)

        try {
            await postPremiumFormData({
                name,
                phone,
                country_code: country?.code ?? "+91",
                subscription_intent: subscriptionIntent,
                query_text: trimmedQueryText
            })
            setSubmitted(true)
        } catch {
            setError("Failed to submit. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    useEffect(() => {
        if (isAuthenticated) {
            TokenStorage.getUserInfo()
                .then((userInfo) => setTravelerId(userInfo?.traveler_id))
                .catch(() => setTravelerId(undefined))
        }
    }, [isAuthenticated])

    useEffect(() => {
        if (!travelerDetails) return

        const travelerName = travelerDetails.name ?? ""
        const travelerPhone = travelerDetails.phone ?? ""
        const code = travelerDetails.country_code ?? "+91"

        setName(travelerName)
        setPhone(travelerPhone)
        const matched = countryCodes.find((c) => c.code === code)
        if (matched) setCountry(matched)

        if (travelerName && travelerPhone) setPrefilledFromTraveler(true)
    }, [travelerDetails])

    useEffect(() => {
    const originalScrollTo = window.scrollTo
    window.scrollTo = () => {}
    return () => {
        window.scrollTo = originalScrollTo
    }
}, [])

    return (
        <Card
            className={cn(
                "border-none text-start w-full mx-auto transition-all duration-300",
                compact ? "my-0" : "my-20",
                submitted || isPremiumUser
                    ? "rounded-2xl shadow-none text-white"
                    : compact
                        ? "bg-transparent rounded-none shadow-none max-w-none text-black"
                        : "bg-white rounded-xl shadow-sm max-w-sm text-black"
            )}
        >
            {isPremiumUser ? (
                <PremiumAlreadyMember name={userName} compact={compact} />
            ) : submitted ? (
                <SuccessState name={userName} compact={compact} />
            ) : (
                <FormState
                    isAuthenticated={isAuthenticated}
                    userName={userName}
                    name={name}
                    setName={setName}
                    phone={phone}
                    setPhone={setPhone}
                    country={country!}
                    setCountry={setCountry}
                    error={error}
                    setError={setError}
                    phoneErrorTimer={phoneErrorTimer}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                    hideHeader={compact}
                    compact={compact}
                    onCancel={onCancel}
                    showStoredDetails={showStoredDetails}
                    onEditDetails={() => setIsEditingDetails(true)}
                    headerSlot={destinationField}
                />
            )}
        </Card>
    )
}
