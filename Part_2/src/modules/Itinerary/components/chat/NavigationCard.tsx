import React from 'react'
import { closeAssistantWindow } from '../../../../pages/Stays/Components/assistantController'
import type { NavigationData } from './types'
import ChatCardShell from './primitives/ChatCardShell'
import ResponseText from './primitives/ResponseText'
import StatusBadge from './primitives/StatusBadge'
import ContentBox from './primitives/ContentBox'
import ActionButton from './primitives/ActionButton'

interface NavigationCardProps {
    data: NavigationData
    onNavigateToSlot?: (dayIndex: number, slotIndex: number) => void
}

const NavigationCard: React.FC<NavigationCardProps> = ({ data, onNavigateToSlot }) => (
    <ChatCardShell intent="neutral">
        {data.response && <ResponseText text={data.response} size="body" />}

        {data.found && data.slot_ref && (
            <ContentBox>
                <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1 min-w-0">
                        {data.slot_ref.title && (
                            <p className="text-sm font-semibold text-grey_0 font-manrope truncate">
                                {data.slot_ref.title}
                            </p>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-grey_2 font-manrope">
                                Day {data.slot_ref.day_index + 1}
                                {data.day_date && ` (${new Date(data.day_date.length === 10 ? data.day_date + 'T00:00:00' : data.day_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})`}
                            </span>
                            {data.slot_ref.kind && (
                                <StatusBadge variant="primary" size="sm">{data.slot_ref.kind}</StatusBadge>
                            )}
                        </div>
                    </div>

                    <ActionButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            const dayIndex = data.slot_ref!.day_index
                            const slotIndex = data.slot_ref!.slot_index
                            window.dispatchEvent(new CustomEvent('rimigo:navigateToSlot', { detail: { dayIndex, slotIndex } }))
                            closeAssistantWindow()
                            onNavigateToSlot?.(dayIndex, slotIndex)
                        }}
                    >
                        Go to Day
                    </ActionButton>
                </div>
            </ContentBox>
        )}
    </ChatCardShell>
)

export default NavigationCard
