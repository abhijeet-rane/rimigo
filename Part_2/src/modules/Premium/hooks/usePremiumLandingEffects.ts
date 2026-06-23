import { useEffect, useRef } from 'react'

export function usePremiumLandingEffects(
    setHideHamburger: (value: boolean) => void,
    isAuthenticated: boolean,
    premiumBenefitsRef: React.RefObject<HTMLDivElement | null>
) {
    const hasScrolledToBenefitsRef = useRef(false)

    useEffect(() => {
        setHideHamburger(false)
        return () => setHideHamburger(false)
    }, [setHideHamburger])

    useEffect(() => {
        const hash = window.location.hash
        if (
            hash === '#premium-benefits' &&
            isAuthenticated &&
            premiumBenefitsRef.current &&
            !hasScrolledToBenefitsRef.current
        ) {
            const timer = setTimeout(() => {
                premiumBenefitsRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                })
                window.history.replaceState(null, '', window.location.pathname + window.location.search)
                hasScrolledToBenefitsRef.current = true
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [isAuthenticated, premiumBenefitsRef])
}
