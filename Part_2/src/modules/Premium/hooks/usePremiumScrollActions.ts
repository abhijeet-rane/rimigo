import { useCallback, RefObject } from 'react'

type TrackButtonClickCustom = (params: {
    buttonPage: string
    buttonName: string
    buttonAction: string
    extra?: Record<string, unknown>
}) => void

export function usePremiumScrollActions(
    premiumFormRef: RefObject<HTMLDivElement | null>,
    premiumBenefitsRef: RefObject<HTMLDivElement | null>,
    trackButtonClickCustom: TrackButtonClickCustom
) {
    const scrollToPremiumForm = useCallback(() => {
        trackButtonClickCustom({
            buttonPage: 'premium_landing_v1',
            buttonName: 'request_callback_clicked',
            buttonAction: 'scroll_to_premium_form',
            extra: { section: 'premium_landing' }
        })
        premiumFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [premiumFormRef, trackButtonClickCustom])

    const scrollToPremiumBenefits = useCallback(() => {
        trackButtonClickCustom({
            buttonPage: 'premium_landing_v1',
            buttonName: 'buy_now_clicked',
            buttonAction: 'scroll_to_premium_benefits',
            extra: { section: 'premium_landing' }
        })
        premiumBenefitsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, [premiumBenefitsRef, trackButtonClickCustom])

    return { scrollToPremiumForm, scrollToPremiumBenefits }
}
