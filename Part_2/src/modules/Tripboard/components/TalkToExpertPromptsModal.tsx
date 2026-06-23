import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import { toast } from 'sonner'

import { POTRAIT_IMAGES } from '@/modules/Premium/constants'
import { postPremiumFormData } from '@/modules/Premium/api/premiumPageAPI'
import { useTravelerDetails } from '@/modules/TravelerProfile/hooks/travelerProfile'
import { TokenStorage } from '@/lib/api/tokenStorage'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS } from '@/modules/amplitude/components/posthogEventDetails'
import {
    TRIPBOARD_HEADER_BUTTON_PAGE,
    TALK_TO_EXPERT_BUTTON_NAMES
} from '@/constants/posthogEvents'
import { getTalkToExpertPrompts } from '../constants/talkToExpertPrompts'

type ViewState = 'form' | 'submitting' | 'success'

interface TalkToExpertPromptsModalProps {
    isOpen: boolean
    onClose: () => void
    subscriptionIntent?: string
    /** Override the default per-intent preset prompts. */
    presetPrompts?: readonly string[]
    /** Override the posthog buttonPage for tracking. */
    analyticsButtonPage?: string
    headline?: string
    subtext?: string
    inputLabel?: string
    inputPlaceholder?: string
}

export function TalkToExpertPromptsModal({
    isOpen,
    onClose,
    subscriptionIntent = 'tripboard_callback',
    presetPrompts,
    analyticsButtonPage = TRIPBOARD_HEADER_BUTTON_PAGE,
    headline,
    subtext,
    inputLabel,
    inputPlaceholder
}: TalkToExpertPromptsModalProps) {
    const prompts = presetPrompts ?? getTalkToExpertPrompts(subscriptionIntent)
    const [travelerId, setTravelerId] = useState<string | undefined>()
    const { travelerDetails } = useTravelerDetails(travelerId)
    const { trackButtonClickCustom } = usePostHog()

    const [viewState, setViewState] = useState<ViewState>('form')
    const [customText, setCustomText] = useState('')
    const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) return
        TokenStorage.getUserInfo()
            .then((info) => setTravelerId(info?.traveler_id))
            .catch(() => setTravelerId(undefined))
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) {
            setViewState('form')
            setCustomText('')
            setPendingPrompt(null)
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKey)
        const originalOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            window.removeEventListener('keydown', handleKey)
            document.body.style.overflow = originalOverflow
        }
    }, [isOpen, onClose])

    const firstName = travelerDetails?.name?.split(' ')[0]?.trim() || ''
    const greeting = headline ?? `Talk to our travel experts`
    const subGreeting = subtext ?? 'Get instant advice, access to offline deals and much more.'
    const customQueryLabel = inputLabel ?? 'Anything else we can assist you with?'
    const customQueryPlaceholder = inputPlaceholder ?? 'Make a request…'

    const submit = async (queryText: string, source: 'prompt' | 'custom') => {
        if (!travelerDetails?.phone) {
            toast.error('We could not find your phone number. Please try again.')
            return
        }
        setViewState('submitting')
        setPendingPrompt(source === 'prompt' ? queryText : null)
        trackButtonClickCustom({
            buttonPage: analyticsButtonPage,
            buttonName: source === 'prompt' ? TALK_TO_EXPERT_BUTTON_NAMES.PROMPT_CLICK : TALK_TO_EXPERT_BUTTON_NAMES.SUBMIT,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: {
                subscription_intent: subscriptionIntent,
                query_text: queryText,
                source
            }
        })
        try {
            await postPremiumFormData({
                name: travelerDetails.name || '',
                phone: travelerDetails.phone,
                country_code: travelerDetails.country_code || '+91',
                subscription_intent: subscriptionIntent,
                query_text: queryText
            })
            setViewState('success')
        } catch {
            toast.error('Failed to submit your request. Please try again.')
            setViewState('form')
            setPendingPrompt(null)
        }
    }

    const handleCancel = () => {
        trackButtonClickCustom({
            buttonPage: analyticsButtonPage,
            buttonName: TALK_TO_EXPERT_BUTTON_NAMES.CANCEL,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: { subscription_intent: subscriptionIntent }
        })
        onClose()
    }

    if (!isOpen || typeof document === 'undefined') return null

    const MAX_CHARS = 500

    const showSuccess = viewState === 'success'
    const isSubmitting = viewState === 'submitting'
    const trimmedText = customText.trim()
    const charCount = customText.length
    const isOverLimit = charCount > MAX_CHARS
    const canSubmitText = trimmedText.length > 0 && !isSubmitting && !isOverLimit

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const next = e.target.value
        // Truncate at MAX_CHARS so a long paste lands as the first 500 chars
        // instead of being rejected entirely.
        setCustomText(next.length > MAX_CHARS ? next.slice(0, MAX_CHARS) : next)
    }

    return createPortal(
        <AnimatePresence>
            <motion.div
                key="tte-backdrop"
                className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}>
                <div
                    className="absolute inset-0 bg-black/40"
                    onClick={handleCancel}
                    aria-hidden
                />

                <motion.div
                    key="tte-card"
                    role="dialog"
                    aria-modal="true"
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="relative w-full max-w-[400px] rounded-2xl bg-white shadow-[0_24px_60px_rgba(16,16,16,0.18)]">
                    <button
                        type="button"
                        onClick={handleCancel}
                        aria-label="Close"
                        className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-grey-2 hover:bg-grey-5 hover:text-grey-0 transition-colors">
                        <X className="h-4 w-4" />
                    </button>

                    {showSuccess ? (
                        <div className="flex flex-col items-center px-6 py-8 text-center">
                            <div className="mb-3 h-28 w-28">
                                <DotLottieReact
                                    src="https://media.rimigo.com/1771327910853_Done.json"
                                    loop
                                    autoplay
                                    speed={1}
                                    className="h-full w-full"
                                />
                            </div>
                            <h2 className="font-red-hat-display text-[20px] font-semibold leading-tight text-grey-0">
                                Awesome{firstName ? ` ${firstName}` : ''}!
                            </h2>
                            <p className="mt-1 font-red-hat-display text-[20px] font-semibold leading-tight text-grey-0">
                                We&rsquo;ll get in touch
                            </p>
                            <p className="mt-3 max-w-[280px] font-manrope text-[14px] font-medium leading-5 text-grey-2">
                                Our travel expert will contact you to discuss the next steps.
                            </p>
                        </div>
                    ) : (
                        <div className="px-6 pb-6 pt-7">
                            <div className="mb-4 flex items-center justify-start">
                                <img
                                    src={POTRAIT_IMAGES.PORTRAIT_2}
                                    alt="Travel expert"
                                    className="h-11 w-11 rounded-full object-cover shadow-sm"
                                />
                                <img
                                    src={POTRAIT_IMAGES.PORTRAIT_3}
                                    alt="Travel expert"
                                    className="-ml-3 h-11 z-1 w-11 rounded-full object-cover shadow-sm"
                                />
                                <img
                                    src="/icons/compass.png"
                                    alt="Compass"
                                    className="-ml-2 h-11 w-11 object-contain"
                                />
                            </div>
                            <div className=''>
                            <h3 className="font-red-hat-display text-[17px] font-semibold leading-[1.3] text-grey-0">
                                {greeting}
                            </h3>
                            <p className="mt-1 font-manrope text-[13px] font-medium text-grey-2">
                                {subGreeting}
                            </p>
                            </div>

                            <div className="mt-4 flex flex-col gap-2">
                                {prompts.map((prompt) => {
                                    const isPending = pendingPrompt === prompt
                                    return (
                                        <button
                                            key={prompt}
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => submit(prompt, 'prompt')}
                                            className="flex w-full cursor-pointer items-center justify-start rounded-full border border-primary-default/30 bg-primary-default/5 px-4 py-2.5 text-left font-red-hat-display text-[13px] font-semibold text-primary-default transition-colors hover:bg-primary-default/10 disabled:cursor-not-allowed disabled:opacity-50">
                                            {isPending ? 'Sending…' : prompt}
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="mt-5 border-t border-grey-4 pt-4">
                                <label
                                    htmlFor="tte-custom-query"
                                    className="block font-red-hat-display text-[14px] font-semibold text-grey-0">
                                    {customQueryLabel}
                                </label>
                                <textarea
                                    id="tte-custom-query"
                                    value={customText}
                                    onChange={handleTextChange}
                                    placeholder={customQueryPlaceholder}
                                    rows={2}
                                    maxLength={MAX_CHARS}
                                    disabled={isSubmitting}
                                    className={`mt-2 w-full resize-none rounded-xl border bg-grey-6/40 px-3 py-2.5 font-manrope text-[13px] text-grey-0 placeholder:text-grey-3 focus:bg-white focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                                        isOverLimit
                                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                                            : 'border-grey-4 focus:border-primary-default/60 focus:ring-primary-default/20'
                                    }`}
                                />
                                {charCount > 0 && (
                                    <div
                                        className={`mt-1 text-right font-manrope text-[11px] font-medium ${
                                            isOverLimit ? 'text-red-500' : 'text-grey-2'
                                        }`}>
                                        {charCount} / {MAX_CHARS} characters
                                    </div>
                                )}
                            </div>

                            <AnimatePresence initial={false}>
                                {canSubmitText && (
                                    <motion.div
                                        key="tte-submit"
                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                        animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                        className="overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => submit(trimmedText, 'custom')}
                                            disabled={isSubmitting}
                                            className="flex w-full cursor-pointer items-center justify-center rounded-xl bg-primary-default px-5 py-3 font-red-hat-display text-[15px] font-semibold text-white transition-colors hover:bg-primary-default/90 disabled:cursor-not-allowed disabled:opacity-60">
                                            {isSubmitting ? 'Requesting\u2026' : 'Request Callback'}
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    )
}

export default TalkToExpertPromptsModal
