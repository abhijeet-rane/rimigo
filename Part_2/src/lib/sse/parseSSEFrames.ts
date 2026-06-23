/**
 * Generic Server-Sent Events frame parser.
 *
 * Two exports:
 *   - `parseSseFrame(rawFrame)` — pure, single-frame parser. Returns
 *     `{event, data}` or `null` for comment/heartbeat/empty frames.
 *   - `iterateSseFrames(reader)` — async generator that drives a
 *     ReadableStream reader, decodes UTF-8 chunks, splits on `\n\n` frame
 *     boundaries, parses each frame, and yields the non-null results.
 *
 * Adapted from rimigo_web/src/api/ataAPI/streamApi.ts (the concierge
 * stream client). Duplicated rather than extracted per architectural
 * decision — concierge has its own event taxonomy and parser invariants
 * that we don't want to entangle with the batch SSE flow.
 */

export interface SSEFrame {
    /** Value of the `event:` field, or `''` if absent. */
    event: string
    /** JSON-parsed value of the `data:` field(s) (multi-line joined with `\n`). */
    data: unknown
}

/**
 * Parse one SSE record (everything between two blank lines) into an
 * `SSEFrame`. Returns `null` for:
 *   - empty or whitespace-only frames,
 *   - comment-only frames (lines starting with `:` — heartbeats, flush padding),
 *   - frames with no `data:` line,
 *   - frames whose `data:` payload is not valid JSON.
 *
 * Multi-line `data:` values are joined with `\n` per the SSE spec.
 * Unknown SSE fields are ignored per spec.
 */
export function parseSseFrame(rawFrame: string): SSEFrame | null {
    if (!rawFrame.trim()) return null

    let eventField = ''
    const dataLines: string[] = []

    for (const rawLine of rawFrame.split('\n')) {
        const line = rawLine.replace(/\r$/, '')
        if (line === '' || line.startsWith(':')) continue

        if (line.startsWith('event:')) {
            eventField = line.slice(6).trim()
            continue
        }
        if (line.startsWith('data:')) {
            let payload = line.slice(5)
            // Spec: strip exactly one leading space if present.
            if (payload.startsWith(' ')) payload = payload.slice(1)
            dataLines.push(payload)
            continue
        }
        // Unknown field — ignore per SSE spec.
    }

    if (dataLines.length === 0) return null

    const payload = dataLines.join('\n')
    let parsed: unknown
    try {
        parsed = JSON.parse(payload)
    } catch (err) {
        // Non-JSON data is unexpected from our backend SSE module — warn
        // and drop rather than throwing so a single bad frame doesn't tear
        // the whole stream down.
        console.warn('[sse] non-JSON data frame ignored', err, payload)
        return null
    }

    return { event: eventField, data: parsed }
}

/**
 * Drive a ReadableStream<Uint8Array> reader and yield parsed SSE frames as
 * they arrive. Handles UTF-8 decoding, multi-chunk frame buffering, and
 * reader lock cleanup.
 *
 * Manual `TextDecoder` instead of `pipeThrough(new TextDecoderStream())` —
 * the DOM stream-type lib has a long-running incompatibility between
 * `TextDecoderStream.writable` and the BYOB Uint8Array type that fails
 * strict TS builds. Manual decoding sidesteps it.
 */
export async function* iterateSseFrames(
    reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<SSEFrame, void, void> {
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    try {
        while (true) {
            const chunk = await reader.read()
            if (chunk.done) {
                buffer += decoder.decode()
                if (buffer.trim()) {
                    const leftover = parseSseFrame(buffer)
                    if (leftover) yield leftover
                }
                break
            }

            buffer += decoder.decode(chunk.value, { stream: true })
            let boundary: number
            while ((boundary = buffer.indexOf('\n\n')) !== -1) {
                const rawFrame = buffer.slice(0, boundary)
                buffer = buffer.slice(boundary + 2)
                const frame = parseSseFrame(rawFrame)
                if (frame === null) continue
                yield frame
            }
        }
    } finally {
        try {
            reader.releaseLock()
        } catch {
            // best-effort cleanup
        }
    }
}
