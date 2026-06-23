import { createContext, useContext } from 'react'

export interface CreatorAttribution {
    creator_handle: string | null
    creator_id: string | null
}

export type CreatorAttributionSetter = (value: CreatorAttribution | null) => void

// Two contexts so consumers that only need the setter don't re-render when the
// value changes, and vice versa.
export const CreatorAttributionCtx = createContext<CreatorAttribution | null>(null)
export const CreatorAttributionSetterCtx = createContext<CreatorAttributionSetter>(() => {})

export const useCreatorAttribution = (): CreatorAttribution | null => {
    return useContext(CreatorAttributionCtx)
}

export const useSetCreatorAttribution = (): CreatorAttributionSetter => {
    return useContext(CreatorAttributionSetterCtx)
}
