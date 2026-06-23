import { useEffect, useRef, useState } from 'react'
import { Heart } from 'lucide-react'

export interface WishlistButtonConfig {
    enabled: boolean
    onClick?: () => void
    shortlistCount?: number | null
}

interface WishlistButtonProps {
    config: WishlistButtonConfig
}

const WishlistButton = ({ config }: WishlistButtonProps) => {
    const { enabled, onClick, shortlistCount } = config
    const [confettiIteration, setConfettiIteration] = useState(0)
    const prevShortlistCountRef = useRef<number | null | undefined>(undefined)
    const hasShortlist = (shortlistCount ?? 0) > 0

    // Trigger confetti when shortlist count increases
    useEffect(() => {
        if (!enabled) return

        const currentCount = shortlistCount ?? 0
        const previousCount = prevShortlistCountRef.current ?? 0

        if (currentCount > previousCount && currentCount > 0) {
            setConfettiIteration((iteration) => iteration + 1)
        }

        prevShortlistCountRef.current = currentCount
    }, [shortlistCount, enabled])

    if (!enabled) return null

    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation()
                onClick?.()
            }}
            className="ml-auto w-fit md:hidden border border-grey-4 rounded-[8px] flex items-center gap-[6px] py-0.5 px-[10px] hover:bg-grey-5 transition-all cursor-pointer relative">
            <div className="relative flex items-center justify-center w-5 h-5 md:w-5.5 md:h-5.5 sm:w-5 sm:h-5">
                <div
                    key={confettiIteration}
                    className={`pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,105,180,0.6)_0%,rgba(255,255,255,0)_70%)] ${
                        confettiIteration > 0 ? 'animate-searchbar-confetti' : ''
                    }`}
                    style={{ transform: 'scale(1.5)', opacity: 0 }}
                />
                <Heart
                    className={`w-full h-full transition-colors duration-300 ${hasShortlist ? 'text-secondary-red' : 'text-header-black'}`}
                    stroke="currentColor"
                    fill={hasShortlist ? 'currentColor' : 'none'}
                />
            </div>
            {hasShortlist && <span className="text-[19px] font-red-hat-display font-semibold transition-colors duration-300">{shortlistCount}</span>}
        </button>
    )
}

export default WishlistButton
