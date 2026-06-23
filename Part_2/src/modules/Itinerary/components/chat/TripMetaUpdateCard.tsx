import React from 'react'
import type { TripMetaUpdateData } from './types'
import ChatCardShell from './primitives/ChatCardShell'
import ResponseText from './primitives/ResponseText'
import ContentBox from './primitives/ContentBox'
import SectionHeader from './primitives/SectionHeader'
import StatusBadge from './primitives/StatusBadge'

interface TripMetaUpdateCardProps {
    data: TripMetaUpdateData
}

const TripMetaUpdateCard: React.FC<TripMetaUpdateCardProps> = ({ data }) => (
    <ChatCardShell intent="neutral">
        {data.response && <ResponseText text={data.response} size="body" />}

        <ContentBox>
            <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-grey_2 font-manrope uppercase tracking-wide">
                    {data.field_changed.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center gap-2">
                    {data.old_value && (
                        <>
                            <StatusBadge variant="neutral" size="md">{data.old_value}</StatusBadge>
                            <span className="text-grey_3">→</span>
                        </>
                    )}
                    <StatusBadge variant="primary" size="md">{data.new_value}</StatusBadge>
                </div>
            </div>
        </ContentBox>

        {data.side_effects && data.side_effects.length > 0 && (
            <div className="flex flex-col gap-1.5">
                <SectionHeader>Side Effects</SectionHeader>
                {data.side_effects.map((effect, idx) => (
                    <p key={idx} className="text-xs text-grey_2 font-manrope flex items-start gap-2">
                        <span className="text-amber-500 flex-shrink-0 mt-0.5">•</span>
                        {effect}
                    </p>
                ))}
            </div>
        )}
    </ChatCardShell>
)

export default TripMetaUpdateCard
