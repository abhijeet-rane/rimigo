/**
 * Thin wrapper for the itinerary creation output.
 * Renders the executive summary in a card shell.
 */
import React from 'react'
import ChatCardShell from './primitives/ChatCardShell'
import ResponseText from './primitives/ResponseText'

interface ItineraryCreationCardProps {
    data: {
        content?: string | React.ReactNode
        response?: string
    }
}

const ItineraryCreationCard: React.FC<ItineraryCreationCardProps> = ({ data }) => {
    const text = typeof data.content === 'string'
        ? data.content
        : data.response || 'Your itinerary has been created successfully.'

    return (
        <ChatCardShell intent="success">
            <ResponseText text={text} size="body" />
        </ChatCardShell>
    )
}

export default ItineraryCreationCard
