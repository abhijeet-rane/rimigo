import { ArrowLeft } from 'lucide-react'

/**
 * Inline step-back arrow shown at the START of a step heading on MOBILE only
 * (on desktop the footer carries the Back button). It lives inside the
 * heading's flex row (`items-start`) so it aligns with the heading's first
 * line instead of floating out of place. The fixed `h-8` + internal centering
 * keeps the icon roughly on the first line across the various heading sizes.
 *
 * Renders nothing when `onBack` is absent (e.g. the first step).
 */
export function WizardBackButton({ onBack }: { onBack?: () => void }) {
    if (!onBack) return null
    return (
        <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="-ml-1 flex h-8 w-7 shrink-0 items-center justify-center text-[var(--text-primary)] md:hidden">
            <ArrowLeft
                size={22}
                strokeWidth={1.75}
            />
        </button>
    )
}
