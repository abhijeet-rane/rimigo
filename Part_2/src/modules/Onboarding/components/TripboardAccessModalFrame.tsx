import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DUMMY_USER_IMAGES } from '@/modules/Premium/constants'
import { STATS_PHOTOS } from '@/constants/icons/svgUrls'

/** Profile: fixed compact card. Login: height follows content (no flex dead space); capped for tall screens. */
const FRAME_VARIANT_HEIGHT = {
    login: 'h-auto max-h-[92vh] md:max-h-[90vh]',
    profile: 'h-[min(92vh,332px)] md:h-[min(72vh,364px)]'
} as const

/** Same hero strip as name modal so login/OTP match that reference. */
const FRAME_HERO_HEIGHT = {
    login: 'h-[104px] lg:h-[142px]',
    profile: 'h-[104px] lg:h-[142px]'
} as const

export type TripboardAccessModalFrameVariant = keyof typeof FRAME_VARIANT_HEIGHT

const MODAL_IMAGE_CARDS = [
    {
        src: STATS_PHOTOS.vacation,
        title: 'Disney Land',
        className: 'left-[-20px] top-[-50px] z-10 rotate-[-6deg]'
    },
    {
        src: STATS_PHOTOS.total_saving,
        title: 'Brunch at Britomart',
        className: 'left-[-12px] top-[50px] z-10 rotate-[-6deg]'
    },
    {
        src: STATS_PHOTOS.travller_Rating,
        title: 'Mt. Fuji',
        className: 'left-[52%] top-[-38px] z-30 -translate-x-1/2 rotate-[-6deg]'
    },
    {
        src: STATS_PHOTOS.destination,
        title: 'Senso-ji Temple',
        className: 'right-[-50px] top-[-2px] z-10 rotate-[-8deg]'
    }
]

const MODAL_IMAGE_CARDS_DESKTOP = [
    {
        src: STATS_PHOTOS.vacation,
        title: 'Senso-ji Temple',
        className: 'right-[-100px] top-[-2px] z-10 rotate-[-3deg]'
    },
    {
        src: STATS_PHOTOS.travller_Rating,
        title: 'Mt. Fuji',
        className: 'left-[60%] top-[-58px] z-30 -translate-x-1/2 rotate-[-3deg]'
    },
    {
        src: STATS_PHOTOS.total_saving,
        title: 'Brunch at Britomart',
        className: 'left-[-20px] top-[-5px] z-10 rotate-[-3deg]'
    }
]

const MODAL_ACTIVITY_CHIPS = [
    { text: 'Dinner at Sukiya', image: DUMMY_USER_IMAGES.POTRAIT_1, className: 'left-[36%] top-[55px] rotate-[-6deg]' },
    { text: 'Visit Akihabara District', image: DUMMY_USER_IMAGES.POTRAIT_2, className: 'left-[57%] top-[90px] -translate-x-1/2 rotate-[-6deg]' }
] as const

const MODAL_ACTIVITY_CHIPS_DESKTOP = [
    { text: 'Dinner at Sukiya', image: DUMMY_USER_IMAGES.POTRAIT_1, className: 'left-[40%] top-[50px] rotate-[-3deg]' },
    { text: 'Visit Akihabara District', image: DUMMY_USER_IMAGES.POTRAIT_2, className: 'left-[40%] top-[83px] rotate-[-3deg]' }
] as const

export interface TripboardAccessModalFrameProps {
    onClose: () => void
    title: ReactNode
    children: ReactNode
    /** e.g. close button z-index above embedded content */
    closeButtonClassName?: string
    /** Controls overall card height — login fits phone + OTP; profile is shorter for name-only. */
    variant?: TripboardAccessModalFrameVariant
    /** When false, the top-right dismiss control is hidden (e.g. name collection must use Continue). */
    showCloseButton?: boolean
}

/**
 * Shared shell for post-auth modals (login, name collection) so Tripboard onboarding feels like one experience.
 */
export function TripboardAccessModalFrame({
    onClose,
    title,
    children,
    closeButtonClassName = 'z-40',
    variant = 'login',
    showCloseButton = true
}: TripboardAccessModalFrameProps) {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            <div
                className={cn(
                    'relative bg-natural-white rounded-[24px] shadow-2xl flex flex-col max-w-[360px] lg:max-w-[400px] w-full overflow-hidden',
                    FRAME_VARIANT_HEIGHT[variant]
                )}
                onClick={(e) => e.stopPropagation()}>
                {showCloseButton ? (
                    <button
                        type="button"
                        onClick={onClose}
                        className={cn(
                            'absolute right-4 top-3.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-grey-4 transition-colors hover:bg-natural-white',
                            closeButtonClassName
                        )}>
                        <X className="w-5 h-5 text-grey-0" />
                    </button>
                ) : null}

                <div
                    className={cn(
                        'relative shrink-0 overflow-hidden bg-grey-5',
                        FRAME_HERO_HEIGHT[variant]
                    )}>
                    <div className="lg:hidden">
                        {MODAL_IMAGE_CARDS.map((card) => (
                            <div
                                key={card.title}
                                className={`absolute w-[130px] h-[85px] rounded-[10px] overflow-hidden shadow-[0_8px_22px_rgba(16,16,16,0.2)] ${card.className}`}>
                                <img src={card.src} alt={card.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                                    <p className="text-[9px] text-white font-medium leading-none truncate">{card.title}</p>
                                </div>
                            </div>
                        ))}
                        {MODAL_ACTIVITY_CHIPS.map((chip) => (
                            <div
                                key={chip.text}
                                className={`absolute z-30 rounded-sm bg-natural-white border border-grey-4 shadow-[0_2px_10px_rgba(16,16,16,0.12)] px-2.5 py-1.5 flex items-center gap-1.5 ${chip.className}`}>
                                <img src={chip.image} alt={chip.text} className="w-4 h-4 rounded-full object-cover" />
                                <p className="text-[9px] leading-none font-semibold text-grey-0 whitespace-nowrap">{chip.text}</p>
                            </div>
                        ))}
                    </div>

                    <div className="hidden lg:block">
                        {MODAL_IMAGE_CARDS_DESKTOP.map((card) => (
                            <div
                                key={card.title}
                                className={`absolute w-[165px] h-[102px] rounded-[10px] overflow-hidden shadow-[0_8px_22px_rgba(16,16,16,0.2)] ${card.className}`}>
                                <img src={card.src} alt={card.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                                    <p className="text-[10px] text-white font-medium leading-none truncate">{card.title}</p>
                                </div>
                            </div>
                        ))}
                        {MODAL_ACTIVITY_CHIPS_DESKTOP.map((chip) => (
                            <div
                                key={chip.text}
                                className={`absolute z-30 rounded-sm bg-natural-white border border-grey-4 shadow-[0_2px_10px_rgba(16,16,16,0.12)] px-2.5 py-1.5 flex items-center gap-1.5 ${chip.className}`}>
                                <img src={chip.image} alt={chip.text} className="w-4 h-4 rounded-full object-cover" />
                                <p className="text-[10px] leading-none font-semibold text-grey-0 whitespace-nowrap">{chip.text}</p>
                            </div>
                        ))}
                    </div>

                    <div className="absolute inset-0 z-[35] pointer-events-none bg-gradient-to-b from-white/75 via-white/65 to-white/80" />
                </div>

                <div className="shrink-0 px-5 pb-0 pt-1">{title}</div>

                <div
                    className={cn(
                        variant === 'profile'
                            ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
                            : 'w-full max-h-[calc(92vh-11.5rem)] shrink-0 overflow-y-auto'
                    )}>
                    {children}
                </div>
            </div>
        </div>
    )
}
