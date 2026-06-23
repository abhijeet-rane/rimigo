import React from 'react'
import { Info } from 'lucide-react'
import type { ErrorWithGuidanceData } from './types'
import ChatCardShell from './primitives/ChatCardShell'
import QuickReplyChips from './primitives/QuickReplyChips'

interface ErrorWithGuidanceCardProps {
    data: ErrorWithGuidanceData
    onSendAgentMessage?: (message: string, metadata?: Record<string, any>) => void
}

const ErrorWithGuidanceCard: React.FC<ErrorWithGuidanceCardProps> = ({ data, onSendAgentMessage }) => (
    <ChatCardShell intent="warning" role="alert" ariaLabel="Error with guidance">
        <div className="flex items-start gap-2.5 rounded-[12px] bg-amber-50/50 p-3">
            <Info className="flex-shrink-0 w-4 h-4 text-amber-600 mt-0.5" />
            <p className="text-sm text-grey_0 font-manrope leading-5">
                {data.response}
            </p>
        </div>

        {data.suggested_actions && data.suggested_actions.length > 0 && (
            <QuickReplyChips
                chips={data.suggested_actions}
                onChipTap={(text) => onSendAgentMessage?.(text)}
            />
        )}
    </ChatCardShell>
)

export default ErrorWithGuidanceCard
