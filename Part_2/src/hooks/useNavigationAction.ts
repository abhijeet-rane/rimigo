import { useLocation } from 'react-router-dom'
import { useNavigationActionStore } from '@/stores/navigationActionStore'
import type { NavigationAction } from '@/modules/Itinerary/components/chat/types'

/**
 * Hook for chat components to dispatch navigation actions from AI responses.
 * Call dispatchNavigationAction when a response contains navigation_action.
 */
export function useNavigationAction() {
    const location = useLocation()
    const setPendingAction = useNavigationActionStore(
        (s) => s.setPendingAction
    )
    const activeHighlight = useNavigationActionStore(
        (s) => s.activeHighlight
    )

    const dispatchNavigationAction = (action: NavigationAction) => {
        setPendingAction(action, location.pathname)
    }

    return {
        dispatchNavigationAction,
        activeHighlight,
    }
}
