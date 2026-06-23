import React, { useCallback, useMemo } from 'react'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import { BudgetTrackContext, type BudgetTrackFn } from './budgetTrackContext'

export const BudgetTrackProvider: React.FC<{
    identifier?: string
    isPublic?: boolean
    children: React.ReactNode
}> = ({ identifier, isPublic, children }) => {
    const { trackButtonClickCustom } = usePostHog()
    const track = useCallback<BudgetTrackFn>(
        (eventName, extras) => {
            trackButtonClickCustom?.({
                buttonPage: POSTHOG_PAGES.BUDGET_TAB,
                buttonName: eventName,
                buttonAction: POSTHOG_ACTIONS.CLICK,
                extra: {
                    context: isPublic ? 'public_collection' : 'tripboard',
                    collection_identifier: identifier,
                    ...extras
                }
            })
        },
        [trackButtonClickCustom, identifier, isPublic]
    )
    const value = useMemo(() => track, [track])
    return <BudgetTrackContext.Provider value={value}>{children}</BudgetTrackContext.Provider>
}
