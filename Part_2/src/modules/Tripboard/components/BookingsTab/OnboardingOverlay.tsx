import React, { useEffect, useState } from 'react'
import { useBudgetTrack } from './budgetTrackContext'
import { POSTHOG_EVENTS } from '@/modules/amplitude/components/posthogEventDetails'

const SEEN_KEY = 'rimigo_bookings_tab_onboarding_seen'

const STEPS: { emoji: string; title: string; body: string }[] = [
    {
        emoji: '⚖️',
        title: 'Compare prices',
        body: 'We’ve searched and compared prices across platforms to give you the best price.'
    },
    {
        emoji: '🏷️',
        title: 'Exclusive deals',
        body: 'We’ve partnered with B2B platforms to get additional discounts that you can’t find online.'
    }
]

/** First-visit intro sheet for the Bookings tab (Figma mobile frame "How
 *  bookings work on Rimigo"). Shown once per browser, dismissed via the CTA
 *  or backdrop. */
export const OnboardingOverlay: React.FC = () => {
    const track = useBudgetTrack()
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        let seen = true
        try {
            seen = localStorage.getItem(SEEN_KEY) === '1'
        } catch {
            /* storage unavailable (SSR/private mode) — skip the overlay */
        }
        if (!seen) {
            setVisible(true)
            track(POSTHOG_EVENTS.BUDGET_TAB_ONBOARDING_VIEW)
        }
    }, [])

    const dismiss = () => {
        track(POSTHOG_EVENTS.BUDGET_TAB_ONBOARDING_DISMISS)
        try {
            localStorage.setItem(SEEN_KEY, '1')
        } catch {
            /* best-effort */
        }
        setVisible(false)
    }

    if (!visible) return null

    return (
        <div
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={dismiss}>
            <div
                className="w-full max-w-[340px] rounded-2xl bg-grey-0 text-white p-6 flex flex-col gap-5"
                onClick={(e) => e.stopPropagation()}>
                <p className="font-red-hat-display text-[20px] font-bold tracking-[-0.4px] leading-6">How bookings work on Rimigo</p>
                <div className="flex flex-col gap-4">
                    {STEPS.map((step, i) => (
                        <div
                            key={step.title}
                            className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center font-red-hat-display text-[12px] font-bold shrink-0">
                                {i + 1}
                            </span>
                            <div className="flex flex-col gap-1">
                                <p className="font-red-hat-display text-[14px] font-bold tracking-[-0.28px]">
                                    {step.title} {step.emoji}
                                </p>
                                <p className="font-manrope text-[12px] font-medium leading-4 text-white/70">{step.body}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    onClick={dismiss}
                    className="w-full rounded-lg bg-primary-default py-3 font-red-hat-display text-[14px] font-bold tracking-[-0.28px] text-white cursor-pointer hover:bg-primary-dark transition-colors">
                    Find best prices
                </button>
            </div>
        </div>
    )
}
