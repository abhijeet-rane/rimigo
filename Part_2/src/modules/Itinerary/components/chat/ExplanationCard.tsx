import React from 'react'
import { ChevronRight } from 'lucide-react'
import type { ExplanationData } from './types'
import ChatCardShell from './primitives/ChatCardShell'
import ResponseText from './primitives/ResponseText'
import SubjectLine from './primitives/SubjectLine'
import ContentBox from './primitives/ContentBox'
import SectionHeader from './primitives/SectionHeader'

interface ExplanationCardProps {
    data: ExplanationData
    onNavigateToSlot?: (dayIndex: number, slotIndex: number) => void
}

const ExplanationCard: React.FC<ExplanationCardProps> = ({ data, onNavigateToSlot }) => (
    <ChatCardShell intent="neutral">
        {data.response && <ResponseText text={data.response} size="body" />}

        {data.subject && <SubjectLine prefix="About" subject={data.subject} />}

        {data.reasoning && (
            <ContentBox>
                <p className="text-sm text-grey_0 font-manrope leading-5 whitespace-pre-line">
                    {data.reasoning}
                </p>
            </ContentBox>
        )}

        {(data.related_slots?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-2">
                <SectionHeader>Related Activities</SectionHeader>
                <div className="flex flex-wrap gap-2">
                    {(data.related_slots || []).map((slot, idx) => (
                        <button
                            key={idx}
                            onClick={() => onNavigateToSlot?.(slot.day_index, slot.slot_index)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-grey_4 text-xs font-medium text-primary-default font-manrope hover:bg-primary-default/5 transition-colors cursor-pointer"
                        >
                            {slot.title || `Day ${slot.day_index + 1}, Slot ${slot.slot_index + 1}`}
                            <ChevronRight size={12} />
                        </button>
                    ))}
                </div>
            </div>
        )}
    </ChatCardShell>
)

export default ExplanationCard
