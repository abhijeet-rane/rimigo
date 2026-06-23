/**
 * Shared dispatcher for concierge ``custom_action`` tokens.
 *
 * These fire locally — no LLM round trip, no user bubble — by reusing the
 * ``voice:navigate-ui`` CustomEvent bus that ``TripboardHeader`` listens on
 * (``switch_tab`` / ``open_modal`` / ``close_modal`` / ``highlight`` + target).
 * Returns ``true`` if the token was handled.
 *
 * Single source of truth so every emitter (the assistant's follow-up chips
 * AND the chat card registry's "See all" affordance on a collection window)
 * dispatches identically. Previously this lived inline in AIAssistantWindow.
 */

/**
 * ``custom_action`` tokens the concierge can emit → the tripboard tab to switch
 * to. "Explore more" feature-discovery follow-ups: switch the tab in place and
 * close the assistant so the freshly-selected tab is visible.
 */
export const TAB_ACTION_TARGET: Record<string, string> = {
    open_stays: 'stays',
    open_experiences: 'experience',
    open_flights: 'flights',
    open_budget: 'budget',
    open_vouchers: 'vouchers',
}

export function dispatchCustomAction(token: string): boolean {
    const fire = (action: string, target: string) =>
        window.dispatchEvent(
            new CustomEvent('voice:navigate-ui', { detail: { action, target } }),
        )

    const tabTarget = TAB_ACTION_TARGET[token]
    if (tabTarget) {
        fire('switch_tab', tabTarget)
        fire('close_modal', 'assistant')
        return true
    }

    switch (token) {
        case 'open_experience_shortlist':
            // Open the desktop "Your wishlist" panel (Itenerary.tsx listens for
            // ``open_wishlist``) and close the assistant so the panel is visible.
            fire('open_wishlist', 'wishlist')
            fire('close_modal', 'assistant')
            return true
        case 'open_invite':
            // Open the tripboard overflow menu and glow the Invite row so the
            // traveler sees where invites live, then close the assistant.
            fire('highlight', 'invite')
            fire('close_modal', 'assistant')
            return true
        case 'open_share':
            fire('highlight', 'share')
            fire('close_modal', 'assistant')
            return true
        case 'open_preferences':
            fire('open_modal', 'preferences')
            fire('close_modal', 'assistant')
            return true
        default:
            return false
    }
}
