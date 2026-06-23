import { createContext, useContext, type ReactNode } from 'react'

interface ShortlistDisplayContextValue {
    /** When true, descendants must not render the shortlist heart. */
    hidden: boolean
}

const ShortlistDisplayContext = createContext<ShortlistDisplayContextValue>({ hidden: false })

/** Wrap a subtree to hide every shortlist heart inside it (e.g. curator-shared pages). */
export const ShortlistDisplayProvider: React.FC<{ hidden: boolean; children: ReactNode }> = ({ hidden, children }) => (
    <ShortlistDisplayContext.Provider value={{ hidden }}>{children}</ShortlistDisplayContext.Provider>
)

/** Read `hidden` flag. Defaults to `false` when no provider is mounted. */
export const useShortlistHidden = () => useContext(ShortlistDisplayContext).hidden
