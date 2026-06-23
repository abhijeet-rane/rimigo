import { useUserInfo } from '@/hooks/useUserInfo'

/**
 * Central rule: Airbnb availability tag is visible to all users.
 * Kept as a single function so the rule stays in one place if it changes.
 * `_isRimigoInternal` is intentionally unused but kept in the signature
 * so callers don't need to change as they were already passing it.
 */
export function shouldShowAirbnb(_isRimigoInternal: boolean, isAvailableOnAirbnb: boolean): boolean {
    return isAvailableOnAirbnb
}

export interface StayCardBadgeVisibility {
    showVerifiedBadge: boolean
    showB2bBadge: boolean
    showAirbnbBadge: boolean
}

export function useStayCardBadges(
    isVerified: boolean,
    isB2bDealAvailable: boolean,
    isAvailableOnAirbnb: boolean = false
): StayCardBadgeVisibility {
    const { isRimigoInternal } = useUserInfo()
    return {
        showVerifiedBadge: isVerified,
        showB2bBadge: isRimigoInternal && isB2bDealAvailable,
        showAirbnbBadge: shouldShowAirbnb(isRimigoInternal, isAvailableOnAirbnb),
    }
}
