import {
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NameField } from "../shared/NameField"
import { PhoneField } from "../shared/PhoneField"
import { SubmitButton } from "../shared/SubmitButton"
import { POTRAIT_IMAGES } from "../constants"

type Props = {
    isAuthenticated: boolean
    userName?: string
    name: string
    setName: (v: string) => void
    phone: string
    setPhone: (v: string) => void
    country: any
    setCountry: (c: any) => void
    error: string
    setError: (e: string) => void
    phoneErrorTimer: React.MutableRefObject<NodeJS.Timeout | null>
    onSubmit: () => void
    isSubmitting: boolean
    hideHeader?: boolean
    compact?: boolean
    onCancel?: () => void
    showStoredDetails?: boolean
    onEditDetails?: () => void
    /** Optional content rendered above name/phone (e.g. destination dropdown). */
    headerSlot?: React.ReactNode
}

export function FormState({
    isAuthenticated,
    userName,
    name,
    setName,
    phone,
    setPhone,
    country,
    setCountry,
    error,
    setError,
    phoneErrorTimer,
    onSubmit,
    isSubmitting,
    hideHeader = false,
    compact = false,
    onCancel,
    showStoredDetails = false,
    onEditDetails,
    headerSlot
}: Props) {
    const showCompactCallbackUI = compact
    const hasExistingDetails = showCompactCallbackUI && showStoredDetails

    return (
        <>
            {!hideHeader && (
                <CardHeader className="text-center max-w-sm">
                    <CardTitle className="text-[24px] font-red-hat-display font-[550]">
                        {isAuthenticated
                            ? `Ready to plan your perfect vacation, ${userName?.split(" ")[0]}?`
                            : "Ready to plan your perfect vacation?"}
                    </CardTitle>

                    <CardDescription className="font-manrope font-medium text-grey-1 text-[14px]">
                        {isAuthenticated
                            ? `We’ll contact you on ${phone}`
                            : "Contact us and we will get back to you"}
                    </CardDescription>
                </CardHeader>
            )}

            <CardContent className={showCompactCallbackUI ? "px-3 pb-2 pt-2" : undefined}>
                <form
                    className={showCompactCallbackUI ? "space-y-4" : "space-y-7"}
                    onSubmit={(e) => {
                        e.preventDefault()
                        onSubmit()
                    }}
                >
                    {showCompactCallbackUI && (
                        <div className="flex flex-col items-center text-center">
                            <div className="relative mb-3 flex items-center justify-center">
                                <img
                                    src={POTRAIT_IMAGES.PORTRAIT_2}
                                    alt="Travel expert 1"
                                    className="h-18 w-18 rounded-full object-cover shadow-sm"
                                />
                                <img
                                    src={POTRAIT_IMAGES.PORTRAIT_3}
                                    alt="Travel expert 2"
                                    className="-ml-2.5 h-18 w-18 z-[1] rounded-full object-cover shadow-sm"
                                />
                                <span className="-ml-2 flex z-0 items-center justify-center rounded-full">
                                    <img
                                        src="/icons/compass.png"
                                        alt="Compass"
                                        className="h-18 w-18 object-contain"
                                    />
                                </span>
                            </div>
                            {!hasExistingDetails && (
                                <h3 className="max-w-[280px] font-red-hat-display text-[16px] leading-[1.35] font-semibold text-grey-0">
                                    Please enter your details and we will call you shortly
                                </h3>
                            )}
                        </div>
                    )}

                    {headerSlot}

                    {(showCompactCallbackUI || !isAuthenticated) && (
                        <>
                            {showCompactCallbackUI ? (
                                <>
                                    {hasExistingDetails ? (
                                        <div className="flex flex-col items-center px-1 text-center">
                                            <p className="font-red-hat-display text-[15px] font-medium leading-5 text-grey-1">
                                                Our travel expert will contact you on
                                            </p>
                                            <div className="mt-2 flex items-center justify-center gap-2">
                                                <p className="font-red-hat-display text-[22px] font-bold leading-7 tracking-wide text-grey-0">
                                                    +{(country?.code || "91").replace(/^\+/, "")} {phone}
                                                </p>
                                                {onEditDetails && (
                                                    <button
                                                        type="button"
                                                        onClick={onEditDetails}
                                                        className="cursor-pointer text-[13px] font-semibold text-primary-default underline underline-offset-2 transition-colors hover:text-primary-dark"
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="font-red-hat-display text-[13px] font-semibold tracking-[0.04em] text-grey-1 uppercase">
                                                    Name
                                                </label>
                                                <Input
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    placeholder="Enter your name"
                                                    required
                                                    className="mt-2 h-11 rounded-xl border border-grey-4 bg-white px-3 text-[14px] font-manrope focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary-default/60"
                                                />
                                            </div>
                                            <PhoneField
                                                phone={phone}
                                                setPhone={setPhone}
                                                country={country}
                                                setCountry={setCountry}
                                                error={error}
                                                setError={setError}
                                                phoneErrorTimer={phoneErrorTimer}
                                            />
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    <NameField value={name} onChange={setName} />
                                    <PhoneField
                                        phone={phone}
                                        setPhone={setPhone}
                                        country={country}
                                        setCountry={setCountry}
                                        error={error}
                                        setError={setError}
                                        phoneErrorTimer={phoneErrorTimer}
                                    />
                                </>
                            )}
                        </>
                    )}

                    {showCompactCallbackUI ? (
                        <div className="flex items-center justify-between gap-3 pt-1">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="cursor-pointer px-2 text-[15px] font-semibold text-primary-default underline underline-offset-2 transition-colors hover:text-primary-dark"
                            >
                                Cancel
                            </button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="h-11 min-w-[170px] cursor-pointer rounded-xl bg-primary-default px-6 font-red-hat-display text-[16px] font-semibold text-white transition-colors hover:bg-primary-default/90 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? "Requesting..." : "Request Callback"}
                            </Button>
                        </div>
                    ) : (
                        <SubmitButton
                            isSubmitting={isSubmitting}
                        />
                    )}
                </form>
            </CardContent>
        </>
    )
}