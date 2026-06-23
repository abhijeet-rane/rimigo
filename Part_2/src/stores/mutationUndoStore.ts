/**
 * Zustand store for tracking itinerary mutations and enabling client-side undo.
 * Snapshots React Query cache before mutations and restores on undo.
 */
import { create } from 'zustand'

export interface MutationSnapshot {
    /** Unique ID for this mutation */
    id: string
    /** The interaction ID that caused the mutation */
    interactionId: string
    /** Human-readable description */
    description: string
    /** Timestamp when the mutation happened */
    timestamp: number
    /** The itinerary data BEFORE the mutation (React Query cache snapshot) */
    previousData: any
    /** The query key to restore */
    queryKey: any[]
    /** Whether undo has been consumed */
    consumed: boolean
}

interface MutationUndoState {
    /** Stack of recent mutations (most recent first), max depth 5 */
    mutations: MutationSnapshot[]
    /** Whether to show post-mutation chips */
    showPostMutationChips: boolean

    pushMutation: (snapshot: Omit<MutationSnapshot, 'consumed'>) => void
    undoLastMutation: () => MutationSnapshot | null
    clearPostMutationChips: () => void
    clearAll: () => void
}

export const useMutationUndoStore = create<MutationUndoState>((set, get) => ({
    mutations: [],
    showPostMutationChips: false,

    pushMutation: (snapshot) =>
        set((state) => ({
            mutations: [{ ...snapshot, consumed: false }, ...state.mutations].slice(0, 5),
            showPostMutationChips: true,
        })),

    undoLastMutation: () => {
        const { mutations } = get()
        const latest = mutations.find((m) => !m.consumed)
        if (!latest) return null
        set((state) => ({
            mutations: state.mutations.map((m) =>
                m.id === latest.id ? { ...m, consumed: true } : m,
            ),
            showPostMutationChips: false,
        }))
        return latest
    },

    clearPostMutationChips: () => set({ showPostMutationChips: false }),

    clearAll: () => set({ mutations: [], showPostMutationChips: false }),
}))
