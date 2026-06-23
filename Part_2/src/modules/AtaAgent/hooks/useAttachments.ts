import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
    confirmAttachmentIngest,
    createLinkAttachment,
    createUploadAttachment,
    kindFromFile,
    kindFromUrl,
    pollAttachment,
    putFileToS3,
} from '@/api/attachmentsAPI/attachmentsApi'
import { EXPERT_ATTACHMENT_EVENTS } from '@/constants/posthogEvents'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import type {
    AttachmentDraft,
    AttachmentKind,
    AttachmentRecord,
} from '@/modules/AtaAgent/types/Attachments'

const MAX_ATTACHMENTS = 5

const localId = () =>
    `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const _fallbackMimeForKind = (kind: 'pdf' | 'docx' | 'xlsx' | 'csv'): string => {
    switch (kind) {
        case 'pdf':
            return 'application/pdf'
        case 'docx':
            return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        case 'xlsx':
            return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        case 'csv':
            return 'text/csv'
    }
}

export interface UseAttachmentsOptions {
    tripId?: string | null
    threadId?: string | null
}

export interface UseAttachmentsReturn {
    attachments: AttachmentDraft[]
    addFile: (file: File) => Promise<void>
    addLink: (url: string, kind?: AttachmentKind) => Promise<void>
    remove: (localOrAttachmentId: string) => void
    clear: () => void
    /** Seed already-uploaded drafts (chip → assistant handoff). */
    seed: (drafts: AttachmentDraft[]) => void
    /** True iff every attachment is `completed` (or there are none). */
    allReady: boolean
    /** True iff any attachment is in flight or processing. */
    hasInFlight: boolean
    /** Just the ids that the agent should consume. */
    completedIds: string[]
    /** Up to date AttachmentRecord cache for rendering coverage cards. */
    records: Record<string, AttachmentRecord>
}

export function useAttachments(
    options: UseAttachmentsOptions = {},
): UseAttachmentsReturn {
    const [attachments, setAttachments] = useState<AttachmentDraft[]>([])
    const [records, setRecords] = useState<Record<string, AttachmentRecord>>({})
    const cancelMapRef = useRef<Record<string, boolean>>({})
    const startTimesRef = useRef<Record<string, number>>({})
    const { trackEvent } = usePostHog()

    const update = useCallback(
        (lid: string, patch: Partial<AttachmentDraft>) => {
            setAttachments((cur) =>
                cur.map((a) => (a.localId === lid ? { ...a, ...patch } : a)),
            )
        },
        [],
    )

    const ensureCapacity = useCallback(() => {
        if (attachments.length >= MAX_ATTACHMENTS) {
            toast.error(`You can attach up to ${MAX_ATTACHMENTS} items per message.`)
            return false
        }
        return true
    }, [attachments.length])

    const remove = useCallback((id: string) => {
        cancelMapRef.current[id] = true
        setAttachments((cur) => {
            const target = cur.find((a) => a.localId === id || a.attachmentId === id)
            if (target) {
                trackEvent(EXPERT_ATTACHMENT_EVENTS.REMOVED, {
                    attachment_id: target.attachmentId,
                    kind: target.kind,
                    status: target.status,
                    trip_id: options.tripId,
                    thread_id: options.threadId,
                })
            }
            return cur.filter((a) => a.localId !== id && a.attachmentId !== id)
        })
    }, [options.threadId, options.tripId, trackEvent])

    const clear = useCallback(() => {
        attachments.forEach((a) => {
            cancelMapRef.current[a.localId] = true
        })
        setAttachments([])
        setRecords({})
    }, [attachments])

    const seed = useCallback((drafts: AttachmentDraft[]) => {
        if (!drafts.length) return
        // Merge (don't overwrite) so in-flight uploads survive.
        setAttachments((cur) => {
            const existingIds = new Set(
                cur.map((a) => a.attachmentId || a.localId),
            )
            const incoming = drafts.filter(
                (d) => !existingIds.has(d.attachmentId || d.localId),
            )
            return [...cur, ...incoming]
        })
        // Mirror records for preview cards.
        setRecords((cur) => {
            const next = { ...cur }
            drafts.forEach((d) => {
                if (d.attachmentId && d.record) {
                    next[d.attachmentId] = d.record
                }
            })
            return next
        })
    }, [])

    const trackPolling = useCallback(
        async (lid: string, attachmentId: string) => {
            try {
                const final = await pollAttachment(attachmentId, {
                    onUpdate: (rec) => {
                        update(lid, { status: rec.status, record: rec })
                        setRecords((r) => ({ ...r, [attachmentId]: rec }))
                    },
                    isCancelled: () => cancelMapRef.current[lid] === true,
                })
                update(lid, { status: final.status, record: final })
                setRecords((r) => ({ ...r, [attachmentId]: final }))

                const startedAt = startTimesRef.current[lid]
                const durationMs = startedAt ? Date.now() - startedAt : undefined

                if (final.status === 'completed') {
                    toast.success(`Read your ${final.kind} attachment.`)
                    trackEvent(EXPERT_ATTACHMENT_EVENTS.ADD_COMPLETED, {
                        attachment_id: attachmentId,
                        kind: final.kind,
                        duration_ms: durationMs,
                        trip_id: options.tripId,
                        thread_id: options.threadId,
                    })
                } else if (final.status === 'failed') {
                    const message = final.error_message || `Couldn't read this ${final.kind}.`
                    update(lid, { error: message })
                    toast.error(message)
                    trackEvent(EXPERT_ATTACHMENT_EVENTS.ADD_FAILED, {
                        attachment_id: attachmentId,
                        kind: final.kind,
                        error_message: message,
                        trip_id: options.tripId,
                        thread_id: options.threadId,
                    })
                }
            } catch (err: any) {
                if (err?.message === 'cancelled') return
                update(lid, {
                    status: 'failed',
                    error: 'Took too long to read this attachment.',
                })
                toast.error('Took too long to read this attachment.')
                trackEvent(EXPERT_ATTACHMENT_EVENTS.ADD_FAILED, {
                    attachment_id: attachmentId,
                    error_message: 'Took too long to read this attachment.',
                    trip_id: options.tripId,
                    thread_id: options.threadId,
                })
            }
        },
        [options.threadId, options.tripId, trackEvent, update],
    )

    const addFile = useCallback(
        async (file: File) => {
            if (!ensureCapacity()) return
            const kind = kindFromFile(file)
            if (!kind) {
                toast.error('Unsupported file. Please attach a PDF or DOCX.')
                return
            }
            const lid = localId()
            const draft: AttachmentDraft = {
                localId: lid,
                kind,
                status: 'uploading',
                label: file.name,
                file,
                uploadProgress: 0,
            }
            setAttachments((cur) => [...cur, draft])
            startTimesRef.current[lid] = Date.now()
            trackEvent(EXPERT_ATTACHMENT_EVENTS.ADD_STARTED, {
                source: 'file',
                kind,
                file_size: file.size,
                mime_type: file.type || _fallbackMimeForKind(kind),
                trip_id: options.tripId,
                thread_id: options.threadId,
            })

            try {
                const created = await createUploadAttachment({
                    kind,
                    filename: file.name,
                    sizeBytes: file.size,
                    mimeType:
                        file.type || _fallbackMimeForKind(kind),
                    tripId: options.tripId,
                    threadId: options.threadId,
                })
                update(lid, {
                    attachmentId: created.attachment_id,
                    status: 'uploading',
                })

                await putFileToS3(created.presigned_url, file, (pct) => {
                    update(lid, { uploadProgress: pct })
                })

                update(lid, { status: 'processing', uploadProgress: 100 })
                await confirmAttachmentIngest(created.attachment_id)
                await trackPolling(lid, created.attachment_id)
            } catch (err: any) {
                console.error('addFile failed', err)
                const errorMessage = err?.response?.data?.error || err?.message || 'Upload failed.'
                update(lid, {
                    status: 'failed',
                    error: errorMessage,
                })
                toast.error('Could not upload that file.')
                trackEvent(EXPERT_ATTACHMENT_EVENTS.ADD_FAILED, {
                    source: 'file',
                    kind,
                    error_message: errorMessage,
                    trip_id: options.tripId,
                    thread_id: options.threadId,
                })
            }
        },
        [ensureCapacity, options.threadId, options.tripId, trackEvent, trackPolling, update],
    )

    const addLink = useCallback(
        async (url: string, hintedKind?: AttachmentKind) => {
            if (!ensureCapacity()) return
            const trimmed = (url || '').trim()
            if (!trimmed) {
                toast.error('Please paste a URL.')
                return
            }
            const kind = hintedKind ?? kindFromUrl(trimmed)
            if (kind !== 'youtube' && kind !== 'instagram') {
                toast.error('Paste a YouTube, Shorts, or Instagram Reel URL.')
                return
            }
            const lid = localId()
            const draft: AttachmentDraft = {
                localId: lid,
                kind,
                status: 'processing',
                label: trimmed,
                sourceUrl: trimmed,
            }
            setAttachments((cur) => [...cur, draft])
            startTimesRef.current[lid] = Date.now()
            trackEvent(EXPERT_ATTACHMENT_EVENTS.ADD_STARTED, {
                source: 'link',
                kind,
                trip_id: options.tripId,
                thread_id: options.threadId,
            })

            try {
                const created = await createLinkAttachment({
                    kind,
                    sourceUrl: trimmed,
                    tripId: options.tripId,
                    threadId: options.threadId,
                })
                update(lid, { attachmentId: created.attachment_id })
                await trackPolling(lid, created.attachment_id)
            } catch (err: any) {
                console.error('addLink failed', err)
                const errorMessage = err?.response?.data?.error || err?.message || 'Could not read that link.'
                update(lid, {
                    status: 'failed',
                    error: errorMessage,
                })
                toast.error('Could not read that link.')
                trackEvent(EXPERT_ATTACHMENT_EVENTS.ADD_FAILED, {
                    source: 'link',
                    kind,
                    error_message: errorMessage,
                    trip_id: options.tripId,
                    thread_id: options.threadId,
                })
            }
        },
        [ensureCapacity, options.threadId, options.tripId, trackEvent, trackPolling, update],
    )

    const completedIds = attachments
        .filter((a) => a.status === 'completed' && a.attachmentId)
        .map((a) => a.attachmentId as string)

    const allReady = attachments.every((a) => a.status === 'completed' || a.status === 'failed')
    const hasInFlight = attachments.some(
        (a) => a.status === 'processing' || a.status === 'uploading' || a.status === 'pending' || a.status === 'ready',
    )

    return {
        attachments,
        addFile,
        addLink,
        remove,
        clear,
        seed,
        allReady,
        hasInFlight,
        completedIds,
        records,
    }
}
