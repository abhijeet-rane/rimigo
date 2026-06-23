/**
 * Client for the Tripboard AI Assistant attachment endpoints.
 *
 * Endpoints (krysto):
 *   POST /api/tripboard/attachments/                  Create (upload | link)
 *   POST /api/tripboard/attachments/<id>/ingest/      Confirm S3 PUT done
 *   GET  /api/tripboard/attachments/<id>/             Poll status
 */
import axios from 'axios'

import apiClient from '@/lib/api/apiClient'
import type {
    AttachmentKind,
    AttachmentRecord,
} from '@/modules/AtaAgent/types/Attachments'

interface CreateUploadResponseData {
    attachment_id: string
    presigned_url: string
    s3_key: string
    s3_bucket: string
    status: string
}

interface CreateLinkResponseData {
    attachment_id: string
    status: string
}

interface AttachmentApiEnvelope<T> {
    message?: string
    response_code?: string
    data?: T
    // Some legacy endpoints flatten payloads — be tolerant.
    attachment_id?: string
    status?: string
    presigned_url?: string
    s3_key?: string
    s3_bucket?: string
}

const unwrap = <T,>(envelope: AttachmentApiEnvelope<T>): T => {
    if (envelope?.data !== undefined && envelope?.data !== null) return envelope.data as T
    return envelope as unknown as T
}

export interface CreateUploadParams {
    // 'voucher' is the generic kind for the Vouchers feature — accepts any
    // file type the traveler may have (PDF, image, .pkpass, .eml,
    // screenshot…). The chat AttachmentExtractionTask never runs on
    // 'voucher' kind; the voucher-specific extractor handles it instead.
    kind: 'pdf' | 'docx' | 'xlsx' | 'csv' | 'voucher'
    filename: string
    sizeBytes: number
    mimeType: string
    tripId?: string | null
    threadId?: string | null
}

export interface CreateLinkParams {
    kind: 'youtube' | 'instagram'
    sourceUrl: string
    tripId?: string | null
    threadId?: string | null
}

export const createUploadAttachment = async (
    params: CreateUploadParams,
): Promise<CreateUploadResponseData> => {
    const body = {
        mode: 'upload',
        kind: params.kind,
        filename: params.filename,
        size_bytes: params.sizeBytes,
        mime_type: params.mimeType,
        trip_id: params.tripId ?? null,
        thread_id: params.threadId ?? null,
    }
    const resp = await apiClient.post('/api/tripboard/attachments/', body)
    return unwrap<CreateUploadResponseData>(resp.data)
}

export const createLinkAttachment = async (
    params: CreateLinkParams,
): Promise<CreateLinkResponseData> => {
    const body = {
        mode: 'link',
        kind: params.kind,
        source_url: params.sourceUrl,
        trip_id: params.tripId ?? null,
        thread_id: params.threadId ?? null,
    }
    const resp = await apiClient.post('/api/tripboard/attachments/', body)
    return unwrap<CreateLinkResponseData>(resp.data)
}

export const putFileToS3 = async (
    presignedUrl: string,
    file: File,
    onProgress?: (pct: number) => void,
): Promise<void> => {
    // Direct PUT to S3 — must NOT carry the apiClient's auth headers (would
    // break the presigned signature). Use a fresh axios instance.
    await axios.put(presignedUrl, file, {
        headers: {
            'Content-Type': file.type || 'application/octet-stream',
        },
        onUploadProgress: (e) => {
            if (!onProgress || !e.total) return
            const pct = Math.round((e.loaded / e.total) * 100)
            onProgress(pct)
        },
    })
}

export const confirmAttachmentIngest = async (
    attachmentId: string,
    etag?: string,
): Promise<AttachmentRecord> => {
    const resp = await apiClient.post(
        `/api/tripboard/attachments/${attachmentId}/ingest/`,
        etag ? { etag } : {},
    )
    return unwrap<AttachmentRecord>(resp.data)
}

export const getAttachment = async (
    attachmentId: string,
): Promise<AttachmentRecord> => {
    const resp = await apiClient.get(`/api/tripboard/attachments/${attachmentId}/`)
    return unwrap<AttachmentRecord>(resp.data)
}

interface PollOptions {
    intervalMs?: number
    timeoutMs?: number
    /**
     * Called every poll with the latest record. Useful for chip status
     * updates while we wait.
     */
    onUpdate?: (record: AttachmentRecord) => void
    /** Returns false to abort polling early (caller cancelled). */
    isCancelled?: () => boolean
}

/**
 * Poll the status endpoint until status ∈ {completed, failed} or timeout.
 * Backs off after the 10th poll: 2s → 3s → 5s → 8s (cap).
 *
 * Default 180s — Instagram reels with no captions need Supadata
 * (60–90s) → yt-dlp + Whisper (15s) → vision pass (20–30s) on the
 * first hit. Supadata caches afterwards so repeats are sub-second.
 * YouTube usually finishes in 5–10s.
 */
export const pollAttachment = async (
    attachmentId: string,
    options: PollOptions = {},
): Promise<AttachmentRecord> => {
    const intervalMs = options.intervalMs ?? 2000
    const timeoutMs = options.timeoutMs ?? 180_000
    const start = Date.now()
    let pollIdx = 0

    while (Date.now() - start < timeoutMs) {
        if (options.isCancelled?.()) {
            throw new Error('cancelled')
        }
        const rec = await getAttachment(attachmentId)
        options.onUpdate?.(rec)
        if (rec.status === 'completed' || rec.status === 'failed') {
            return rec
        }
        const wait = nextBackoff(pollIdx++, intervalMs)
        await new Promise((res) => setTimeout(res, wait))
    }
    throw new Error('attachment-poll-timeout')
}

function nextBackoff(idx: number, base: number): number {
    if (idx < 10) return base
    if (idx < 15) return Math.min(base * 1.5, 3000)
    if (idx < 20) return Math.min(base * 2.5, 5000)
    return Math.min(base * 4, 8000)
}

/** Helper: kind from an HTML File. */
export const kindFromFile = (
    file: File,
): 'pdf' | 'docx' | 'xlsx' | 'csv' | null => {
    const mime = (file.type || '').toLowerCase()
    const name = (file.name || '').toLowerCase()
    if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
    if (
        mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mime === 'application/msword' ||
        name.endsWith('.docx')
    ) {
        return 'docx'
    }
    if (
        mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        name.endsWith('.xlsx') ||
        name.endsWith('.xls')
    ) {
        return 'xlsx'
    }
    if (mime === 'text/csv' || mime === 'application/csv' || name.endsWith('.csv')) {
        return 'csv'
    }
    return null
}

/** Helper: detect the link kind from the URL. */
export const kindFromUrl = (url: string): AttachmentKind | null => {
    const u = (url || '').toLowerCase().trim()
    if (!u) return null
    if (/youtu\.be\/|youtube\.com\//.test(u)) return 'youtube'
    if (/instagram\.com\//.test(u)) return 'instagram'
    return null
}

// Match http(s) URLs for known video hosts. Anchored to host so a stray
// "instagram" word doesn't false-positive; trailing punctuation is
// trimmed off after extraction so "...reel/abc)." doesn't keep the ")."
const ATTACHABLE_URL_REGEX =
    /https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/[^\s]+|youtu\.be\/[^\s]+|instagram\.com\/[^\s]+)/gi

// Trailing punctuation stripped when a URL is the last token in a sentence
// (e.g. "...reel/abc)." → "...reel/abc"). Shared by extract + strip below.
const URL_TRAILING_PUNCT_CLASS = `[).,!?;:"']`
const trimUrlTrailingPunct = (url: string): string => url.replace(new RegExp(`${URL_TRAILING_PUNCT_CLASS}+$`), '')

export interface ExtractedAttachableUrl {
    url: string
    kind: 'youtube' | 'instagram'
}

/**
 * Pulls YouTube / Instagram URLs out of free text so the chat input can
 * auto-promote them to attachments instead of sending them as plain
 * prompt text. Returns matches in order of first appearance, deduped.
 */
export const extractAttachableUrls = (text: string): ExtractedAttachableUrl[] => {
    if (!text) return []
    const seen = new Set<string>()
    const out: ExtractedAttachableUrl[] = []
    const matches = text.match(ATTACHABLE_URL_REGEX) || []
    for (const raw of matches) {
        const url = trimUrlTrailingPunct(raw)
        if (seen.has(url)) continue
        const kind = kindFromUrl(url)
        if (kind !== 'youtube' && kind !== 'instagram') continue
        seen.add(url)
        out.push({ url, kind })
    }
    return out
}

/** Remove the given URLs from a text blob, collapsing leftover whitespace. */
export const stripUrlsFromText = (text: string, urls: string[]): string => {
    if (!text || urls.length === 0) return text
    let out = text
    for (const u of urls) {
        // Escape regex special chars in the URL and allow optional trailing punctuation.
        const escaped = u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        out = out.replace(new RegExp(escaped + `${URL_TRAILING_PUNCT_CLASS}*`, 'g'), '')
    }
    return out.replace(/\s{2,}/g, ' ').trim()
}
