import React from 'react'
import type { ClarificationData } from './types'
import ChatCardShell from './primitives/ChatCardShell'
import ResponseText from './primitives/ResponseText'
import QuickReplyChips from './primitives/QuickReplyChips'

interface ClarificationCardProps {
    data: ClarificationData
    onSendAgentMessage?: (message: string, metadata?: Record<string, any>) => void
}

const ClarificationCard: React.FC<ClarificationCardProps> = ({ data, onSendAgentMessage }) => (
    <ChatCardShell intent="info" role="status" ariaLabel="Clarification needed">
        {data.response && <ResponseText text={data.response} size="body" />}

        {data.suggested_replies && data.suggested_replies.length > 0 && (
            <QuickReplyChips
                chips={data.suggested_replies}
                onChipTap={(text) => onSendAgentMessage?.(text)}
            />
        )}
    </ChatCardShell>
)

export default ClarificationCard
