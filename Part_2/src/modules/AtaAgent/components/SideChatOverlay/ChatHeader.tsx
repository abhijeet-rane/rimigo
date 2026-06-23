// import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChevronRight, X } from 'lucide-react'
import WhatsAppIcon from '@/components/icons/WhatsAppIcon'

interface ChatHeaderProps {
    logoSrc: string | null
    agentName: string | null
    featureName?: string | null
    className?: string
    onMinimize?: () => void
    onFeatureClick?: () => void
    infoBanner?: string
    onCallbackClick?: () => void
    callbackImageSrc?: string
    callbackLabel?: string
    /** If true, the "Talk to expert" button is hidden on desktop (md+) but still shown on mobile. */
    hideCallbackOnDesktop?: boolean
    onDragHandlePointerDown?: (event: React.PointerEvent) => void
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
    className,
    infoBanner,
    onMinimize,
    onCallbackClick,
    callbackLabel = 'Talk to expert',
    hideCallbackOnDesktop = false
}) => {
    return (
        <>
        {/* Mobile — floating buttons only, no bar/background/banner.
            Expert pill on the left, close (✕) on the right. */}
        <div className="md:hidden">
            {/* Top scrim: a frosted-glass fade so the floating buttons stay
                legible over content scrolling beneath. Translucent white lets
                the backdrop-blur read through; the gradient MASK fades the blur
                itself out toward the bottom (no hard edge). -webkit-mask for
                iOS Safari. Sits below the buttons (z-20 < z-30), never eats taps. */}
            <div className="scrim-fade-mask pointer-events-none fixed inset-x-0 top-0 z-20 h-[calc(env(safe-area-inset-top,0px)+76px)] bg-gradient-to-b from-white/90 via-white/25 to-transparent backdrop-blur-md" />
            {onCallbackClick && (
                <button
                    type="button"
                    onClick={onCallbackClick}
                    className="fixed left-3 top-[calc(env(safe-area-inset-top,0px)+12px)] z-30 flex min-h-[30px] items-center gap-1.5 rounded-[12px] bg-grey-0 px-2.5 py-1"
                    aria-label="Contact an expert">
                    <WhatsAppIcon className="h-4 w-4 shrink-0" />
                    <span className="text-[12px] font-semibold text-white font-manrope">{callbackLabel}</span>
                </button>
            )}
            {onMinimize && (
                <button
                    onClick={onMinimize}
                    className="fixed right-3 top-[calc(env(safe-area-inset-top,0px)+12px)] z-30 flex h-[30px] w-[30px] items-center justify-center rounded-full border border-black/[0.06] bg-white/85 text-grey-1 shadow-[0_2px_10px_rgba(15,23,42,0.12)] backdrop-blur-md hover:bg-white hover:text-grey-0 active:scale-95 transition-all duration-150 cursor-pointer"
                    aria-label="Close chat">
                    <X size={16} strokeWidth={2.5} />
                </button>
            )}
        </div>

        {/* Desktop — existing sticky bar. */}
        <div className='hidden md:block sticky top-0 z-20 '>

        <div className={cn('grid grid-cols-3 bg-grey-5 px-4 py-2 border-b border-grey_4', className)}>
            {/* Col 1 — left corner: close button. */}
            <div className="flex items-center justify-start">
                {onMinimize && (
                    <button
                        onClick={onMinimize}
                        className="flex cursor-pointer items-center text-grey-1 hover:text-grey-0 transition-colors"
                        aria-label="Close chat"
                        title="Close chat">
                        <ChevronRight size={22} strokeWidth={2.4} />
                    </button>
                )}
            </div>

            {/* Col 2 — empty spacer on desktop (logo removed). */}
            <div className="hidden md:block" aria-hidden />

            {/* Right: Talk to expert + close */}
            <div className="flex items-center justify-end gap-2">
                {onCallbackClick && (
                    <button
                        type="button"
                        onClick={onCallbackClick}
                        className={cn(
                            'flex min-h-[30px] cursor-pointer items-center gap-1.5 rounded-[12px] bg-grey-0 px-2.5 py-1 transition-colors hover:bg-grey-1',
                            hideCallbackOnDesktop && 'md:hidden'
                        )}
                        aria-label="Contact an expert"
                        title="Contact an expert">
                        <WhatsAppIcon className="h-4 w-4 shrink-0" />
                        <span className="text-[12px] font-semibold text-white font-manrope">{callbackLabel}</span>
                    </button>
                )}
            </div>

        </div>
        {infoBanner && (
            <div className="sticky top-0 z-20  flex items-center gap-2 px-4 py-2 bg-primary-default-80 border-b border-primary-default">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-primary-default flex-shrink-0">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs font-medium text-primary-default font-manrope">
                                    {infoBanner}
                                </span>
                </div>
            )}
            </div>
            </>
    )
}

export default ChatHeader
