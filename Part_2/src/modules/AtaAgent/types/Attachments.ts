/**
 * Tripboard AI Assistant — attachment types.
 */

export type AttachmentKind =
    | 'youtube'
    | 'instagram'
    | 'pdf'
    | 'docx'
    | 'xlsx'
    | 'csv'

export type AttachmentStatus =
    | 'pending'
    | 'uploading'
    | 'ready'
    | 'processing'
    | 'completed'
    | 'failed'

export interface AttachmentInsights {
    summary?: string
    hotels?: Array<{ name: string; location?: string; nights?: number; notes?: string }>
    activities?: Array<{ name: string; location?: string; duration?: string; notes?: string }>
    destinations?: Array<{ name: string; role?: string; days?: number }>
    meals?: Array<{ type?: string; place?: string; cuisine?: string; notes?: string }>
    transport?: Array<{ mode: string; from?: string; to?: string; date?: string; notes?: string }>
    dates?: { trip_start?: string; trip_end?: string; durations?: string[] }
    confidence?: Record<string, number>
}

export interface AttachmentRecord {
    attachment_id: string
    kind: AttachmentKind
    status: AttachmentStatus
    title?: string | null
    filename?: string | null
    source_url?: string | null
    summary?: string | null
    insights?: AttachmentInsights | null
    error_code?: string | null
    error_message?: string | null
    /**
     * True when the source had minimal extractable content (e.g. a
     * music-only IG reel, an empty spreadsheet). The chip renders in
     * an amber "Limited" state so the user knows the agent won't have
     * detailed answers to give about this attachment.
     */
    thin_extraction?: boolean
    thin_reason?: string | null
    created_at?: string | null
    processed_at?: string | null
}

/**
 * In-memory draft tracked by the FE while the upload + extraction
 * pipeline is in progress (before the FE has a server-confirmed
 * AttachmentRecord).
 */
export interface AttachmentDraft {
    /** Stable client-side id for React keys (uuid) before the BE returns one. */
    localId: string
    /** Backend id, set as soon as the BE responds. */
    attachmentId?: string
    kind: AttachmentKind
    status: AttachmentStatus
    /** Display label — filename or URL. */
    label: string
    file?: File
    sourceUrl?: string
    /** 0–100; only for upload kinds. */
    uploadProgress?: number
    record?: AttachmentRecord
    error?: string
}

export interface AttachmentCoverage {
    attachment_id: string
    kind?: AttachmentKind
    title?: string
    covered: string[]
    missing: string[]
    highlights?: string
    suggested_actions?: Array<{ label: string; prefill_text: string }>
}
