type PromptSender = (prompt: string, threadId: string | null, metadata?: Record<string, any>) => Promise<void>
type ThreadResolver = () => Promise<string | null>

type InputPrefiller = (text: string) => void

let openAssistant: (() => void) | null = null
let closeAssistant: (() => void) | null = null
let promptSender: PromptSender | null = null
let ensureLatestThread: ThreadResolver | null = null
let inputPrefiller: InputPrefiller | null = null

let prefillerReadyResolver: ((p: InputPrefiller) => void) | null = null
let prefillerReadyPromise: Promise<InputPrefiller> = new Promise((resolve) => {
    prefillerReadyResolver = resolve
})
const resetPrefillerPromise = () => {
    prefillerReadyPromise = new Promise((resolve) => {
        prefillerReadyResolver = resolve
    })
}

let senderReadyResolver: ((sender: PromptSender) => void) | null = null
let readinessResolver: ((resolver: ThreadResolver) => void) | null = null

let senderReadyPromise: Promise<PromptSender> = new Promise((resolve) => {
    senderReadyResolver = resolve
})

let readinessPromise: Promise<ThreadResolver> = new Promise((resolve) => {
    readinessResolver = resolve
})

const resetSenderPromise = () => {
    senderReadyPromise = new Promise((resolve) => {
        senderReadyResolver = resolve
    })
}

const resetReadinessPromise = () => {
    readinessPromise = new Promise((resolve) => {
        readinessResolver = resolve
    })
}

export const registerAssistantOpener = (openFn: () => void) => {
    openAssistant = openFn
}

export const unregisterAssistantOpener = (openFn?: () => void) => {
    if (!openFn || openFn === openAssistant) {
        openAssistant = null
    }
}

export const registerAssistantCloser = (closeFn: () => void) => {
    closeAssistant = closeFn
}

export const unregisterAssistantCloser = (closeFn?: () => void) => {
    if (!closeFn || closeFn === closeAssistant) {
        closeAssistant = null
    }
}

export const registerAssistantPromptSender = (sender: PromptSender) => {
    promptSender = sender
    senderReadyResolver?.(sender)
}

export const registerAssistantThreadResolver = (resolver: ThreadResolver) => {
    ensureLatestThread = resolver
    readinessResolver?.(resolver)
}

export const unregisterAssistantPromptSender = (sender?: PromptSender) => {
    if (!sender || sender === promptSender) {
        promptSender = null
        resetSenderPromise()
    }
}

export const unregisterAssistantThreadResolver = (resolver?: ThreadResolver) => {
    if (!resolver || resolver === ensureLatestThread) {
        ensureLatestThread = null
        resetReadinessPromise()
    }
}

export const registerAssistantInputPrefiller = (fn: InputPrefiller) => {
    inputPrefiller = fn
    prefillerReadyResolver?.(fn)
}

export const unregisterAssistantInputPrefiller = (fn?: InputPrefiller) => {
    if (!fn || fn === inputPrefiller) {
        inputPrefiller = null
        resetPrefillerPromise()
    }
}

// Open the assistant and drop `prompt` into the input WITHOUT sending —
// the user reviews/edits, then submits themselves.
export const prefillAssistantPrompt = async (prompt: string) => {
    if (!prompt) return
    if (!openAssistant) {
        console.warn('[AssistantController] No assistant opener registered.')
    } else {
        openAssistant()
    }
    const prefill = inputPrefiller ?? (await prefillerReadyPromise)
    prefill(prompt)
}

export const triggerAssistantPrompt = async (prompt: string, metadata?: Record<string, any>) => {
    if (!prompt) return

    if (!openAssistant) {
        console.warn('[AssistantController] No assistant opener registered.')
    } else {
        openAssistant()
    }

    const resolver = ensureLatestThread ?? (await readinessPromise)
    const latestThreadId = await resolver()

    const sender = promptSender ?? (await senderReadyPromise)
    await sender(prompt, latestThreadId ?? null, metadata)
}

/**
 * Wrap a user-facing message with a `<selection>...</selection>` envelope
 * containing structured intent metadata. The concierge agent's persona prompt
 * (rimigo_ai_persona.md, `<selection_metadata_rules>` and
 * `<decision_workflows>`) reads the JSON inside the envelope as the
 * authoritative source of intent and uses the natural-language portion as a
 * hint. This is the replacement for the legacy task_data shapes that the
 * frontend used to send (route confirm/cancel markers, form submission
 * markers, direct replacement dicts, etc.).
 *
 * Returns the original content unchanged when no metadata is supplied.
 */
export const wrapWithSelection = (
    content: string,
    metadata?: Record<string, unknown>,
): string => {
    if (!metadata || Object.keys(metadata).length === 0) return content
    let serialized: string
    try {
        serialized = JSON.stringify(metadata)
    } catch {
        // If metadata is somehow not serializable, fall back to plain content
        // rather than throwing — the agent loop can still infer intent from
        // the natural-language portion.
        return content
    }
    return `${content}\n<selection>${serialized}</selection>`
}

/**
 * Single entry point for sending a concierge message with structured intent
 * metadata. Wraps the content + metadata into a `<selection>` envelope and
 * dispatches via `triggerAssistantPrompt`. All legacy task_data callsites
 * (route confirm/cancel, route options, delay strategies, direct replacements,
 * form submissions) funnel through this helper.
 */
export const submitConciergeMessage = async (
    content: string,
    metadata?: Record<string, unknown>,
): Promise<void> => {
    const wrappedContent = wrapWithSelection(content, metadata)
    // Pass NO metadata downstream — it is now embedded inside wrappedContent.
    // The legacy `Object.assign(apiInputData, metadata)` path in
    // sendPromptMessage is intentionally bypassed.
    await triggerAssistantPrompt(wrappedContent)
}

/**
 * Strip a trailing `<selection>...</selection>` envelope from a message so
 * that the natural-language portion can be displayed in the chat transcript
 * without leaking the structured intent JSON to the user.
 */
export const stripSelectionEnvelope = (text: string): string => {
    if (typeof text !== 'string') return text
    return text.replace(/\n?<selection>[\s\S]*?<\/selection>\s*$/, '').trim()
}

export const openAssistantWindow = () => {
    openAssistant?.()
}

export const closeAssistantWindow = () => {
    closeAssistant?.()
}
