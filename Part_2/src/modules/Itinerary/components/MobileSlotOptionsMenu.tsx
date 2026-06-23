import { useEffect, useRef, useState, FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Eye, Pencil, Trash2, Sparkles } from 'lucide-react'

interface MobileSlotOptionsMenuProps {
    isOpen: boolean
    onClose: () => void
    /** Rect of the trigger (⋯ button); used to position the popover. */
    anchorRect: DOMRect | null
    onViewDetails?: () => void
    onEditSlot?: () => void
    onDeleteSlot?: () => void
    onAskTellMeAboutSpot?: () => void
    onAskSuggestAlternatives?: () => void
    /** Free-form prompt — fires the AI assistant with the typed query. */
    onAskCustom?: (text: string) => void
    aiTellLabel?: string
    aiAlternativesLabel?: string
    showAiOptions?: boolean
}

const MENU_WIDTH = 220
const MENU_SELECTOR = '[data-mobile-slot-menu]'

const isInsideMenu = (target: EventTarget | null) =>
    Boolean((target as HTMLElement | null)?.closest?.(MENU_SELECTOR))

// Module-level so it isn't recreated each parent render (which would remount
// every row whenever askText changes).
const Item = ({
    icon: Icon,
    label,
    onClick,
    danger = false,
    purple = false,
}: {
    icon: typeof Eye
    label: string
    onClick?: () => void
    danger?: boolean
    purple?: boolean
}) => {
    const tone = danger ? 'text-red-500' : purple ? 'text-primary-default' : 'text-grey-0'
    const iconTone = danger ? 'text-red-500' : purple ? 'text-primary-default' : 'text-grey-1'
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-grey-5 active:bg-grey-4/40">
            <Icon size={17} className={`shrink-0 ${iconTone}`} />
            <span className={`font-manrope text-[14px] font-medium ${tone}`}>{label}</span>
        </button>
    )
}

export const MobileSlotOptionsMenu = ({
    isOpen,
    onClose,
    anchorRect,
    onViewDetails,
    onEditSlot,
    onDeleteSlot,
    onAskTellMeAboutSpot,
    onAskSuggestAlternatives,
    onAskCustom,
    showAiOptions = true,
    aiTellLabel = 'Tell me about this spot',
    aiAlternativesLabel = 'Suggest alternatives',
}: MobileSlotOptionsMenuProps) => {
    const [askText, setAskText] = useState('')

    // Capture latest onClose so listeners don't re-attach every render.
    const onCloseRef = useRef(onClose)
    onCloseRef.current = onClose

    useEffect(() => {
        if (!isOpen) setAskText('')
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = '' }
    }, [isOpen])

    // Outside-tap dismiss. Capture phase across mouse + touch + click so the
    // underlying card never sees the gesture (avoids accidental SneakPeek).
    useEffect(() => {
        if (!isOpen) return
        const dismiss = (e: Event) => {
            if (isInsideMenu(e.target)) return
            e.preventDefault()
            e.stopPropagation()
            onCloseRef.current()
        }
        const types = ['pointerdown', 'mousedown', 'touchstart', 'click'] as const
        types.forEach((t) => document.addEventListener(t, dismiss, true))
        return () => types.forEach((t) => document.removeEventListener(t, dismiss, true))
    }, [isOpen])

    // Block iOS scroll. Native listener with passive:false — JSX onTouchMove
    // can't suppress scroll because React makes touch listeners passive.
    useEffect(() => {
        if (!isOpen) return
        const blockScroll = (e: TouchEvent) => {
            if (isInsideMenu(e.target)) return
            e.preventDefault()
        }
        document.addEventListener('touchmove', blockScroll, { passive: false })
        return () => document.removeEventListener('touchmove', blockScroll)
    }, [isOpen])

    if (typeof document === 'undefined') return null

    const handleAskSubmit = (e: FormEvent) => {
        e.preventDefault()
        const t = askText.trim()
        if (!t || !onAskCustom) return
        onAskCustom(t)
        onClose()
    }

    // Anchor the menu's bottom edge above the trigger so its size doesn't
    // matter; flip downward only when there's much more room below.
    const positionStyle: React.CSSProperties = {}
    if (anchorRect) {
        const viewportH = window.innerHeight
        const spaceAbove = anchorRect.top
        const spaceBelow = viewportH - anchorRect.bottom
        positionStyle.right = Math.max(8, window.innerWidth - anchorRect.right)
        positionStyle.width = MENU_WIDTH
        if (spaceAbove >= 200 || spaceAbove >= spaceBelow) {
            positionStyle.bottom = viewportH - anchorRect.top + 6
        } else {
            positionStyle.top = anchorRect.bottom + 6
        }
    }

    // Run the action then dismiss.
    const fire = (handler?: () => void) => () => {
        handler?.()
        onClose()
    }

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Click-blocker — covers exit-animation gap when the
                        document listeners above have already detached. */}
                    <motion.div
                        key="mobile-slot-menu-clickblocker"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onClose() }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose() }}
                        style={{ touchAction: 'none' }}
                        className="fixed inset-0 z-[9990] bg-transparent"
                    />

                    <motion.div
                        key="mobile-slot-menu-panel"
                        data-mobile-slot-menu="true"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.96, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 4 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        style={positionStyle}
                        className="fixed z-[9999] overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_rgba(15,23,42,0.22)] ring-1 ring-grey-4">
                        <div className="py-1.5">
                            {onViewDetails && (
                                <Item icon={Eye} label="View Details" onClick={fire(onViewDetails)} />
                            )}
                            {onEditSlot && (
                                <Item icon={Pencil} label="Edit slot" onClick={fire(onEditSlot)} />
                            )}
                            {onDeleteSlot && (
                                <Item icon={Trash2} label="Delete slot" onClick={fire(onDeleteSlot)} danger />
                            )}
                        </div>

                        {showAiOptions && (onAskTellMeAboutSpot || onAskSuggestAlternatives) && (
                            <div className="border-t border-grey-4/70 py-1.5">
                                {onAskTellMeAboutSpot && (
                                    <Item icon={Sparkles} label={aiTellLabel} onClick={fire(onAskTellMeAboutSpot)} purple />
                                )}
                                {onAskSuggestAlternatives && (
                                    <Item icon={Sparkles} label={aiAlternativesLabel} onClick={fire(onAskSuggestAlternatives)} purple />
                                )}
                            </div>
                        )}

                        {showAiOptions && onAskCustom && (
                            <form onSubmit={handleAskSubmit} className="border-t border-grey-4/70 px-2.5 py-2.5">
                                <input
                                    type="text"
                                    value={askText}
                                    onChange={(e) => setAskText(e.target.value)}
                                    placeholder="Ask something else…"
                                    // Stop pointer events so the document
                                    // capture handlers don't dismiss while typing.
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: '#7011f6' }}
                                    className="w-full rounded-full bg-white px-3.5 py-2 font-manrope text-[13px] text-grey-0 placeholder:text-grey-3 outline-none"
                                />
                            </form>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body,
    )
}

export default MobileSlotOptionsMenu
