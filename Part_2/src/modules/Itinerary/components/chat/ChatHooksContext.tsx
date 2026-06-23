/**
 * React Context for distributing chat hooks to card components.
 * Eliminates the repeated prop-drilling pattern in AIAssistantWindow.
 */
import { createContext, useContext } from 'react'
import type { ItineraryHooksConfig } from './types'
import { wrapWithSelection } from '@/pages/Stays/Components/assistantController'

export interface ChatHooksContextValue extends ItineraryHooksConfig {
    /** Fallback message sender when hooksConfig.onSendAgentMessage is missing */
    sendPromptMessage: (message: string, threadId?: string | null, metadata?: Record<string, any>) => void
    /** Close the assistant window */
    onClose: () => void
}

const ChatHooksContext = createContext<ChatHooksContextValue | null>(null)

export const ChatHooksProvider = ChatHooksContext.Provider

export function useChatHooks(): ChatHooksContextValue {
    const ctx = useContext(ChatHooksContext)
    if (!ctx) throw new Error('useChatHooks must be used within a ChatHooksProvider')
    return ctx
}

/**
 * Returns onSendAgentMessage with automatic fallback to sendPromptMessage.
 * Eliminates the 7x duplicated pattern:
 *   hooksConfig?.onSendAgentMessage || ((msg, meta) => sendPromptMessage(msg, undefined, meta))
 *
 * Concierge rebuild: when meta is supplied, it is wrapped into a
 * <selection>...</selection> envelope inline before being sent. The legacy
 * `Object.assign(apiInputData, metadata)` path in sendPromptMessage is
 * intentionally bypassed.
 */
export function useSendAgentMessage(): (message: string, metadata?: Record<string, any>) => void {
    const { onSendAgentMessage, sendPromptMessage } = useChatHooks()
    if (onSendAgentMessage) return onSendAgentMessage
    return (msg: string, meta?: Record<string, any>) => {
        const wrappedMsg = wrapWithSelection(msg, meta)
        sendPromptMessage(wrappedMsg, undefined, undefined)
    }
}
