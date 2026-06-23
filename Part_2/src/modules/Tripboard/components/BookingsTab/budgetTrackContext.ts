import { createContext, useContext } from 'react'

export type BudgetTrackFn = (eventName: string, extras?: Record<string, unknown>) => void

export const BudgetTrackContext = createContext<BudgetTrackFn>(() => {})

export const useBudgetTrack = (): BudgetTrackFn => useContext(BudgetTrackContext)
