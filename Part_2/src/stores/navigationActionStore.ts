import { create } from 'zustand'
import type {
    NavigationAction,
    HighlightAction,
} from '@/modules/Itinerary/components/chat/types'

interface NavigationActionState {
    /** Pending navigation action to execute */
    pendingAction: NavigationAction | null
    /** Active highlights on the current page */
    activeHighlight: HighlightAction | null
    /** Whether the chat panel should stay open across navigation */
    keepChatOpen: boolean
    /** The source page that triggered the navigation */
    sourceRoute: string | null

    // Actions
    setPendingAction: (action: NavigationAction, sourceRoute: string) => void
    clearPendingAction: () => void
    setActiveHighlight: (highlight: HighlightAction) => void
    clearActiveHighlight: () => void
}

export const useNavigationActionStore = create<NavigationActionState>(
    (set) => ({
        pendingAction: null,
        activeHighlight: null,
        keepChatOpen: false,
        sourceRoute: null,

        setPendingAction: (action, sourceRoute) =>
            set({
                pendingAction: action,
                keepChatOpen: action.keep_chat_open,
                sourceRoute,
            }),

        clearPendingAction: () =>
            set({
                pendingAction: null,
                sourceRoute: null,
            }),

        setActiveHighlight: (highlight) => set({ activeHighlight: highlight }),

        clearActiveHighlight: () => set({ activeHighlight: null }),
    })
)
