import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useVoiceChat } from '@/hooks/useVoiceChat'
import { useVoiceFunctionCalls } from '@/hooks/useVoiceFunctionCalls'
import VoiceTriggerButton from './VoiceTriggerButton'
import VoiceOverlay from './VoiceOverlay'

interface TripboardVoiceProps {
    tripId: string
    itineraryId?: string
    onExpertDelegated?: (interactionId: string) => void
}

export default function TripboardVoice({
    tripId,
    itineraryId,
    onExpertDelegated,
}: TripboardVoiceProps) {
    const [isOverlayOpen, setIsOverlayOpen] = useState(false)

    const handleSlotChanged = useCallback((slotId: string) => {
        // Dispatch a custom event so the Itinerary page can highlight the changed slot
        window.dispatchEvent(new CustomEvent('voice:slot-changed', { detail: { slotId } }))
    }, [])

    const { handleFunctionExecuted } = useVoiceFunctionCalls({
        tripId,
        itineraryId,
        onExpertDelegated,
        onSlotChanged: handleSlotChanged,
    })

    const {
        voiceState,
        transcript,
        currentTranscript,
        startSession,
        stopSession,
        cancelResponse,
        isActive,
    } = useVoiceChat({
        tripId,
        onFunctionExecuted: handleFunctionExecuted,
        onError: (error) => {
            toast.error(error)
            setIsOverlayOpen(false)
        },
    })

    const handleTriggerClick = useCallback(async () => {
        if (isActive) {
            setIsOverlayOpen(true)
            return
        }

        setIsOverlayOpen(true)
        await startSession()
    }, [isActive, startSession])

    const handleClose = useCallback(() => {
        stopSession()
        setIsOverlayOpen(false)
    }, [stopSession])

    return (
        <>
            {/* Mic button — fixed above the floating input bar */}
            {!isOverlayOpen && (
                <div className="fixed bottom-[96px] right-[28px] md:bottom-[128px] md:right-[56px] z-[40]">
                    <VoiceTriggerButton
                        onClick={handleTriggerClick}
                        isActive={isActive}
                    />
                </div>
            )}

            {/* Bottom bar overlay — portaled, itinerary stays visible */}
            <VoiceOverlay
                isOpen={isOverlayOpen}
                voiceState={voiceState}
                transcript={transcript}
                currentTranscript={currentTranscript}
                onClose={handleClose}
                onCancelResponse={cancelResponse}
            />
        </>
    )
}
