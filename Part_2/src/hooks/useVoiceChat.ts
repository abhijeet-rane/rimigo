import { useState, useRef, useCallback, useEffect } from 'react'
import apiClient from '@/lib/api/apiClient'
import { buildVoiceSystemPrompt } from '@/modules/Tripboard/components/Voice/voicePrompt'
import { getVoiceToolDefinitions } from '@/modules/Tripboard/components/Voice/voiceTools'

export type VoiceState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking'

interface TranscriptEntry {
    role: 'user' | 'assistant'
    text: string
    timestamp: number
}

interface FunctionExecution {
    name: string
    arguments: Record<string, unknown>
    result: Record<string, unknown>
}

interface UseVoiceChatOptions {
    tripId: string
    onFunctionExecuted?: (execution: FunctionExecution) => void
    onError?: (error: string) => void
    voice?: string
}

interface UseVoiceChatReturn {
    voiceState: VoiceState
    transcript: TranscriptEntry[]
    currentTranscript: string
    startSession: () => Promise<void>
    stopSession: () => void
    cancelResponse: () => void
    isActive: boolean
}

/** Client-side functions that don't need a backend call */
const CLIENT_SIDE_FUNCTIONS = new Set(['delegate_to_expert', 'navigate_ui'])

/**
 * Voice chat hook using WebRTC direct connection to OpenAI Realtime API.
 *
 * Architecture:
 * - Backend provides: ephemeral token + raw trip context data
 * - Frontend owns: system prompt, tool definitions, session config
 * - Audio flows: browser ↔ OpenAI directly (no proxy)
 * - Function calls: client-side (UI actions) or REST to Krysto (itinerary mutations)
 */
export function useVoiceChat({
    tripId,
    onFunctionExecuted,
    onError,
    voice = 'shimmer',
}: UseVoiceChatOptions): UseVoiceChatReturn {
    const [voiceState, setVoiceState] = useState<VoiceState>('idle')
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
    const [currentTranscript, setCurrentTranscript] = useState('')

    const pcRef = useRef<RTCPeerConnection | null>(null)
    const dcRef = useRef<RTCDataChannel | null>(null)
    const mediaStreamRef = useRef<MediaStream | null>(null)
    const audioElRef = useRef<HTMLAudioElement | null>(null)
    const assistantTranscriptRef = useRef('')

    const isActive = voiceState !== 'idle'

    // ── Execute function calls ─────────────────────────────────────────
    const executeFunction = useCallback(async (
        callId: string,
        name: string,
        args: Record<string, unknown>,
    ) => {
        const dc = dcRef.current
        if (!dc || dc.readyState !== 'open') return

        const sendResult = (result: Record<string, unknown>) => {
            dc.send(JSON.stringify({
                type: 'conversation.item.create',
                item: { type: 'function_call_output', call_id: callId, output: JSON.stringify(result) },
            }))
            dc.send(JSON.stringify({ type: 'response.create' }))
        }

        // Client-side functions — handle locally, no backend call
        if (CLIENT_SIDE_FUNCTIONS.has(name)) {
            const result = name === 'delegate_to_expert'
                ? { success: true, action: 'delegate_to_frontend_expert', prompt: args.request }
                : { success: true, action: 'navigate_ui', ui_action: args.action, target: args.target }

            sendResult(result as Record<string, unknown>)
            onFunctionExecuted?.({ name, arguments: args, result: result as Record<string, unknown> })
            return
        }

        // Server-side functions — call Krysto REST
        try {
            const response = await apiClient.post('/api/voice/function/', {
                trip_id: tripId,
                function_name: name,
                arguments: args,
            })
            sendResult(response.data)
            onFunctionExecuted?.({ name, arguments: args, result: response.data })
        } catch (err) {
            const error = err instanceof Error ? err.message : 'Function execution failed'
            sendResult({ error })
        }
    }, [tripId, onFunctionExecuted])

    // ── Handle data channel messages from OpenAI ───────────────────────
    const handleDataChannelMessage = useCallback((event: MessageEvent) => {
        const data = JSON.parse(event.data)
        const eventType = data.type || ''

        switch (eventType) {
            case 'session.created':
            case 'session.updated':
                console.log('[VoiceChat] Session ready')
                setVoiceState('listening')
                break

            case 'input_audio_buffer.speech_started':
                setVoiceState('listening')
                setCurrentTranscript('')
                assistantTranscriptRef.current = ''
                break

            case 'input_audio_buffer.speech_stopped':
                setVoiceState('thinking')
                break

            case 'conversation.item.input_audio_transcription.completed':
                if (data.transcript) {
                    setTranscript(prev => [...prev, {
                        role: 'user',
                        text: data.transcript,
                        timestamp: Date.now(),
                    }])
                }
                break

            case 'response.audio_transcript.delta':
                assistantTranscriptRef.current += data.delta || ''
                setCurrentTranscript(assistantTranscriptRef.current)
                setVoiceState('speaking')
                break

            case 'response.audio_transcript.done':
                if (assistantTranscriptRef.current) {
                    setTranscript(prev => [...prev, {
                        role: 'assistant',
                        text: assistantTranscriptRef.current,
                        timestamp: Date.now(),
                    }])
                    assistantTranscriptRef.current = ''
                    setCurrentTranscript('')
                }
                break

            case 'response.done':
                setVoiceState('listening')
                break

            case 'response.function_call_arguments.done':
                executeFunction(
                    data.call_id || '',
                    data.name || '',
                    JSON.parse(data.arguments || '{}'),
                )
                break

            case 'error':
                console.error('[VoiceChat] OpenAI error:', data.error)
                onError?.(data.error?.message || 'Voice error')
                break
        }
    }, [executeFunction, onError])

    // ── Start session ──────────────────────────────────────────────────
    const startSession = useCallback(async () => {
        try {
            setVoiceState('connecting')
            setTranscript([])
            setCurrentTranscript('')
            assistantTranscriptRef.current = ''

            // 1. Get ephemeral token + trip context from Krysto
            console.log('[VoiceChat] Requesting session token + context...')
            const tokenResponse = await apiClient.post('/api/voice/session/', {
                trip_id: tripId,
                voice,
            })
            const {
                client_secret,
                itinerary_context,
                tripboard_context,
                model: sessionModel,
            } = tokenResponse.data

            if (!client_secret) throw new Error('Failed to get voice session token')

            // The ephemeral client_secret is minted bound to a specific GA model
            // on the backend (voice_session.py → OPENAI_REALTIME_MODEL). The SDP
            // exchange MUST use that same model — never hardcode here, or it goes
            // stale the way `gpt-4o-realtime-preview` did. Fall back to the GA
            // default if an older backend doesn't return it.
            const realtimeModel = sessionModel || 'gpt-realtime-2'
            console.log('[VoiceChat] Got token + context')

            // 2. Build system prompt and tools on the frontend
            const systemPrompt = buildVoiceSystemPrompt(tripId, itinerary_context, tripboard_context)
            const tools = getVoiceToolDefinitions()

            // 3. Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true },
            })
            mediaStreamRef.current = stream

            // 4. Create RTCPeerConnection
            const pc = new RTCPeerConnection()
            pcRef.current = pc

            // 5. Set up audio playback
            const audioEl = document.createElement('audio')
            audioEl.autoplay = true
            audioElRef.current = audioEl
            pc.ontrack = (event) => {
                console.log('[VoiceChat] Got remote audio track')
                audioEl.srcObject = event.streams[0]
            }

            // 6. Add mic track
            stream.getTracks().forEach(track => pc.addTrack(track, stream))

            // 7. Create data channel
            const dc = pc.createDataChannel('oai-events')
            dcRef.current = dc
            dc.onmessage = handleDataChannelMessage
            dc.onopen = () => {
                console.log('[VoiceChat] Data channel open — sending session config')
                // Send system prompt + tools via data channel (frontend owns these)
                dc.send(JSON.stringify({
                    type: 'session.update',
                    session: {
                        instructions: systemPrompt,
                        tools,
                        tool_choice: 'auto',
                    },
                }))
            }
            dc.onclose = () => console.log('[VoiceChat] Data channel closed')

            // 8. Create + send SDP offer
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            console.log('[VoiceChat] Sending SDP offer to OpenAI...')
            // GA Realtime: the SDP exchange moved from the beta `/v1/realtime`
            // to `/v1/realtime/calls`. Posting SDP to the bare `/v1/realtime`
            // is what OpenAI now rejects with `beta_api_shape_disabled`
            // ("The Realtime Beta API is no longer supported"). No `OpenAI-Beta`
            // header on the GA interface. Model comes from the ephemeral session
            // the backend minted (see realtimeModel above).
            const sdpResponse = await fetch(
                `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(realtimeModel)}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${client_secret}`,
                        'Content-Type': 'application/sdp',
                    },
                    body: offer.sdp,
                },
            )

            if (!sdpResponse.ok) throw new Error(`OpenAI SDP exchange failed: ${sdpResponse.status}`)

            // 9. Set remote SDP answer
            const answerSdp = await sdpResponse.text()
            await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
            console.log('[VoiceChat] WebRTC connected')

            // 10. Handle connection state changes
            pc.onconnectionstatechange = () => {
                console.log('[VoiceChat] Connection state:', pc.connectionState)
                if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                    setVoiceState('idle')
                }
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to start voice session'
            console.error('[VoiceChat] Start error:', message)
            onError?.(message)
            setVoiceState('idle')
        }
    }, [tripId, voice, handleDataChannelMessage, onError])

    // ── Stop session ───────────────────────────────────────────────────
    const stopSession = useCallback(() => {
        if (dcRef.current) { dcRef.current.close(); dcRef.current = null }
        if (pcRef.current) { pcRef.current.close(); pcRef.current = null }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop())
            mediaStreamRef.current = null
        }
        if (audioElRef.current) { audioElRef.current.srcObject = null; audioElRef.current = null }
        setVoiceState('idle')
        setCurrentTranscript('')
        assistantTranscriptRef.current = ''
    }, [])

    // ── Cancel response (interrupt) ────────────────────────────────────
    const cancelResponse = useCallback(() => {
        if (dcRef.current?.readyState === 'open') {
            dcRef.current.send(JSON.stringify({ type: 'response.cancel' }))
        }
        setVoiceState('listening')
    }, [])

    // Cleanup on unmount
    useEffect(() => {
        return () => { stopSession() }
    }, [stopSession])

    return { voiceState, transcript, currentTranscript, startSession, stopSession, cancelResponse, isActive }
}
