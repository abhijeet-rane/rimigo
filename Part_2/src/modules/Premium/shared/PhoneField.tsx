import { PhoneInput } from "@/modules/Onboarding/components/PhoneInput"
import { validatePhone } from "@/lib/auth/authUtils"

type Props = {
    phone: string
    setPhone: (v: string) => void
    country: any
    setCountry: (c: any) => void
    error: string
    setError: (e: string) => void
    phoneErrorTimer: React.MutableRefObject<NodeJS.Timeout | null>
}

export function PhoneField({
    phone,
    setPhone,
    country,
    setCountry,
    error,
    setError,
    phoneErrorTimer,
}: Props) {
    return (
        <div>
            <label className="font-red-hat-display text-[13px] font-semibold tracking-[0.04em] text-grey-1 uppercase">
                Mobile Number
            </label>

            <div
                className="
          mt-2
          [&_div.flex>button:first-child]:w-22
          [&_div.flex>button:first-child]:px-2
          [&_div.flex>button:first-child]:justify-center
          [&_input::placeholder]:text-[14px]
          sm:[&_input::placeholder]:text-[15px]
        "
            >
                <PhoneInput
                    value={phone}
                    country={country}
                    onChangePhone={(text) => {
                        setPhone(text)

                        if (phoneErrorTimer.current) {
                            clearTimeout(phoneErrorTimer.current)
                        }

                        if (validatePhone(text, country?.code || "+91")) {
                            setError("")
                            return
                        }

                        phoneErrorTimer.current = setTimeout(() => {
                            setError("Please enter a valid phone number.")
                        }, 800)
                    }}
                    onChangeCountry={(c) => setCountry(c)}
                    error={error}
                />
            </div>
        </div>
    )
}
