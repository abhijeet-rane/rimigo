import { useState, useMemo, type ReactNode } from 'react'
import { CreatorAttributionCtx, CreatorAttributionSetterCtx, type CreatorAttribution } from './creatorAttributionHooks'

// Stateful provider mounted once at the app root (above PostHogProvider). Pages call
// `useSetCreatorAttribution()` to push their derived attribution into context on mount
// and clear it (null) on unmount. PostHog's trackEvent reads the value via
// `useCreatorAttribution()` and merges it into event payloads scoped to descendants
// of THIS provider — no module-level snapshot, no global tagging across unrelated UI.
export const CreatorAttributionProvider = ({ children }: { children: ReactNode }) => {
    const [value, setValue] = useState<CreatorAttribution | null>(null)
    // Stable setter ref — the setter from useState is already stable, but we wrap
    // in useMemo to make the contract explicit for consumers.
    const setter = useMemo(() => setValue, [])
    return (
        <CreatorAttributionCtx.Provider value={value}>
            <CreatorAttributionSetterCtx.Provider value={setter}>{children}</CreatorAttributionSetterCtx.Provider>
        </CreatorAttributionCtx.Provider>
    )
}
