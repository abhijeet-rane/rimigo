/**
 * Registry-driven response renderer.
 * Replaces the 35+ explicit conditionals in AIAssistantWindow with a single component.
 */
import React, { Suspense } from 'react'
import { getCardEntry, type CardRenderContext } from './cardRegistry'
import type { ChatMessage } from '@/modules/AtaAgent/types/AIAssisstantWindowTypes'
import { wrapWithSelection } from '@/pages/Stays/Components/assistantController'

interface ChatResponseRendererProps {
    message: ChatMessage
    context: CardRenderContext
}

const CardSkeleton = () => (
    <div className="animate-pulse h-20 bg-grey_5 rounded-[20px]" />
)

const ChatResponseRenderer: React.FC<ChatResponseRendererProps> = ({ message, context }) => {
    const outputType = message.outputType
    if (!outputType) return null

    const entry = getCardEntry(outputType)

    if (!entry || !entry.component) return null

    // Some output types require results to be present
    if (!message.results && !['itinerary'].includes(outputType)) return null

    // Build props via propsMapper or standard pattern
    let cardProps: Record<string, any>

    if (entry.propsMapper) {
        const mapped = entry.propsMapper(message, context)
        // propsMapper might return null to skip rendering
        if (!mapped) return null
        cardProps = mapped
    } else {
        cardProps = { data: message.results }

        // Resolve required hooks from context
        if (entry.requiredHooks) {
            for (const hookName of entry.requiredHooks) {
                const hookFn = (context.hooks as any)[hookName]
                if (hookFn) {
                    cardProps[hookName] = hookFn
                } else if (hookName === 'onSendAgentMessage' && context.sendPromptMessage) {
                    cardProps[hookName] = (msg: string, meta?: Record<string, any>) => {
                        // Wrap structured intent metadata into a <selection>
                        // envelope inline (concierge rebuild — replaces legacy
                        // task_data shapes). Pass no downstream metadata so the
                        // legacy `Object.assign(apiInputData, metadata)` branch
                        // in sendPromptMessage is bypassed.
                        const wrappedMsg = wrapWithSelection(msg, meta)
                        context.sendPromptMessage(wrappedMsg, undefined, undefined)
                    }
                }
            }
        }

        // Pass sourceInteractionId
        if (message.interactionId) {
            cardProps.sourceInteractionId = message.interactionId
        }
    }

    const CardComponent = entry.component

    return (
        <Suspense fallback={<CardSkeleton />}>
            <CardComponent {...cardProps} />
        </Suspense>
    )
}

export default ChatResponseRenderer
