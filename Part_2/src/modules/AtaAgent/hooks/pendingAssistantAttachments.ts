/**
 * Module-level handoff buffer for chip → assistant attachments.
 * Mobile chip's input is read-only, so attachments staged in the
 * chip would be lost on tap without this buffer.
 */

import type { AttachmentDraft } from '@/modules/AtaAgent/types/Attachments'

let pending: AttachmentDraft[] = []
// Reverse buffer: assistant→chip handoff when the assistant closes
// without sending. Kept separate from the chip→assistant buffer so
// chip listeners don't accidentally drain their own outgoing handoff.
let returning: AttachmentDraft[] = []
const returningListeners = new Set<() => void>()

export const setPendingAttachments = (drafts: AttachmentDraft[]): void => {
    // Shallow-copy so callers can clear their state safely.
    pending = drafts.map((d) => ({ ...d }))
}

export const consumePendingAttachments = (): AttachmentDraft[] => {
    const drafts = pending
    pending = []
    return drafts
}

export const hasPendingAttachments = (): boolean => pending.length > 0

export const returnAttachmentsToChip = (drafts: AttachmentDraft[]): void => {
    returning = drafts.map((d) => ({ ...d }))
    returningListeners.forEach((fn) => fn())
}

export const consumeReturningAttachments = (): AttachmentDraft[] => {
    const drafts = returning
    returning = []
    return drafts
}

export const subscribeReturningAttachments = (fn: () => void): (() => void) => {
    returningListeners.add(fn)
    return () => {
        returningListeners.delete(fn)
    }
}
