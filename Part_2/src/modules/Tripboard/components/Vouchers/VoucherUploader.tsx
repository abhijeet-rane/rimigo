/**
 * VoucherUploader — drag-drop / picker for booking-voucher files.
 *
 * Upload flow (per batch):
 *
 *   1. User picks N files. We *immediately* insert N "temp" voucher rows
 *      into the TanStack Query cache so the cards appear in the Unscheduled
 *      bucket of the timeline below — no separate in-flight area, no
 *      animation from "top of uploader" to "bottom of list."
 *   2. For each file, in parallel:
 *        a. createUploadAttachment({kind:'voucher'}) → presigned URL + att id
 *        b. putFileToS3(presigned_url, file)
 *      A failure here flips that voucher's temp row to `failed`.
 *   3. Once all S3 PUTs settle, fire ONE bulk createTripVouchers with the
 *      attachment ids that succeeded. The server creates real Voucher rows
 *      and queues `voucher.extract` per file. We then swap each temp row
 *      for its canonical row using setQueryData.
 *   4. From here, the existing SSE flow takes over (the cards in Unscheduled
 *      flip from `queued` → `processing` → `extracted`, and once extracted
 *      with a start_datetime they jump to their dated day in the strip).
 *
 * The temp row's `voucher_id` starts with `temp-` so SSE / delete paths can
 * skip it cleanly.
 */
import { useCallback, useRef, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import {
    createUploadAttachment,
    putFileToS3,
} from '@/api/attachmentsAPI/attachmentsApi'
import { createTripVouchers, type Voucher } from '@/api/voucherAPI/voucherAPI'
import { TRIP_VOUCHERS_QUERY_KEY } from '@/hooks/useTripVouchers'
import { TEMP_VOUCHER_PREFIX } from './voucherUtils'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { TRIPBOARD_V1_BUTTON_PAGE } from '@/constants/posthogEvents'

// Map any upload error to short, user-readable copy. Falls through to a
// caller-supplied default when the error has no recognisable HTTP status
// and no network-y signature — anything else (raw axios messages, stack
// traces, provider JSON) would only confuse the traveler.
function toFriendlyError(err: unknown, fallback: string): string {
    const status = (err as { response?: { status?: number } })?.response?.status
    const message = (err as { message?: string })?.message ?? ''
    if (status === 413) return 'This file is too large — keep it under 25 MB.'
    if (status === 401 || status === 403) return 'Your session expired — please sign in again.'
    if (status && status >= 500) return "We're having trouble on our side. Please try again in a minute."
    if (/network|timeout|ECONNABORTED|ENOTFOUND/i.test(message)) return 'Network hiccup — check your connection and retry.'
    return fallback
}

interface VoucherUploaderProps {
    tripId: string
    /** Visual variant:
     *   - `empty-state` (default): full dropzone shown when no vouchers exist.
     *   - `compact`: small inline button used in the populated-tab header.
     *   - `fab`: fixed-position floating action button (bottom-right) for
     *     mobile, where the header button would crowd the title row. */
    variant?: 'empty-state' | 'compact' | 'fab'
    /** Called once vouchers are created server-side. */
    onUploaded?: (voucherIds: string[]) => void
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB per file
const MAX_FILES_PER_BATCH = 20

const ACCEPT_MIMES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif',
    'image/webp',
    'application/vnd.apple.pkpass',
    'message/rfc822', // .eml
].join(',')

const ACCEPT_EXTENSIONS = '.pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.pkpass,.eml'


export default function VoucherUploader({
    tripId,
    variant = 'empty-state',
    onUploaded,
}: VoucherUploaderProps) {
    const queryClient = useQueryClient()
    const { trackButtonClickCustom } = usePostHog()
    const [isUploading, setIsUploading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    /** Insert one ephemeral voucher row into the cached list so it renders
     *  immediately in the Unscheduled bucket. Returns the temp id used. */
    const insertTempVoucher = useCallback(
        (file: File): string => {
            const tempId = `${TEMP_VOUCHER_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
            const tempVoucher: Voucher = {
                voucher_id: tempId,
                trip_id: tripId,
                attachment_id: '',
                status: 'queued',
                category: null,
                extracted: {},
                confidence: null,
                error_code: null,
                error_reason: null,
                created_at: new Date().toISOString(),
                extracted_at: null,
                filename: file.name,
                mime_type: file.type || null,
                file_url: null,
            }
            queryClient.setQueryData<Voucher[]>(
                TRIP_VOUCHERS_QUERY_KEY(tripId),
                (old) => [...(old ?? []), tempVoucher],
            )
            return tempId
        },
        [queryClient, tripId],
    )

    const markTempFailed = useCallback(
        (tempId: string, reason: string) => {
            queryClient.setQueryData<Voucher[]>(
                TRIP_VOUCHERS_QUERY_KEY(tripId),
                (old) =>
                    (old ?? []).map((v) =>
                        v.voucher_id === tempId
                            ? { ...v, status: 'failed', error_reason: reason }
                            : v,
                    ),
            )
        },
        [queryClient, tripId],
    )

    const uploadOne = useCallback(
        async (file: File, tempId: string): Promise<string | null> => {
            try {
                const { attachment_id, presigned_url } = await createUploadAttachment({
                    kind: 'voucher',
                    filename: file.name,
                    sizeBytes: file.size,
                    mimeType: file.type || 'application/octet-stream',
                    tripId,
                })
                await putFileToS3(presigned_url, file)
                return attachment_id
            } catch (err) {
                markTempFailed(tempId, toFriendlyError(err, "Couldn't upload this file. Please try again."))
                return null
            }
        },
        [tripId, markTempFailed],
    )

    const handleFiles = useCallback(
        async (incoming: File[]) => {
            if (incoming.length === 0) return

            const accepted: File[] = []
            const rejected: string[] = []
            for (const file of incoming) {
                if (file.size > MAX_FILE_SIZE_BYTES) {
                    rejected.push(file.name)
                    continue
                }
                accepted.push(file)
            }
            if (rejected.length) {
                toast.error(
                    `${rejected.length} file${rejected.length === 1 ? '' : 's'} couldn't be added — each must be under 25 MB.`,
                )
                trackButtonClickCustom({
                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                    buttonName: 'voucher_upload_file_rejected',
                    buttonAction: 'view',
                    extra: { trip_id: tripId, count: rejected.length, reason: 'size' },
                })
            }
            if (accepted.length === 0) return

            const batch = accepted.slice(0, MAX_FILES_PER_BATCH)

            trackButtonClickCustom({
                buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                buttonName: 'voucher_upload_batch_start',
                buttonAction: 'view',
                extra: { trip_id: tripId, count: batch.length },
            })

            // Insert temp rows in submission order → user sees immediate
            // cards in Unscheduled before a single byte hits S3.
            const tempIds = batch.map((f) => insertTempVoucher(f))

            setIsUploading(true)
            // S3 PUT results, parallel by index with `batch` / `tempIds`. Lives
            // outside the try so the catch can still walk it.
            const uploadResults: (string | null)[] = await Promise.all(
                batch.map((file, i) => uploadOne(file, tempIds[i])),
            )

            const succeeded: { attachmentId: string; tempId: string }[] = []
            uploadResults.forEach((attachmentId, i) => {
                if (attachmentId) succeeded.push({ attachmentId, tempId: tempIds[i] })
            })

            if (succeeded.length === 0) {
                // Every S3 PUT failed — `uploadOne` already flipped each
                // temp row to `failed`, so the cards stay visible and the
                // user can see what went wrong. Nothing further to do.
                setIsUploading(false)
                return
            }

            try {
                const { vouchers } = await createTripVouchers(
                    tripId,
                    succeeded.map((s) => s.attachmentId),
                )

                // Swap temp rows for canonical ones, preserving insertion
                // order. Failed temp rows (from S3 step) stay in place.
                const succeededTempIds = new Set(succeeded.map((s) => s.tempId))
                queryClient.setQueryData<Voucher[]>(
                    TRIP_VOUCHERS_QUERY_KEY(tripId),
                    (old) => [
                        ...(old ?? []).filter((v) => !succeededTempIds.has(v.voucher_id)),
                        ...vouchers,
                    ],
                )

                onUploaded?.(vouchers.map((v) => v.voucher_id))
                toast.success(
                    `${vouchers.length} voucher${vouchers.length === 1 ? '' : 's'} uploaded — extracting…`,
                )
                trackButtonClickCustom({
                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                    buttonName: 'voucher_upload_batch_success',
                    buttonAction: 'view',
                    extra: { trip_id: tripId, count: vouchers.length },
                })

                // Refetch so canonical sort + dated-day grouping settles.
                queryClient.invalidateQueries({
                    queryKey: TRIP_VOUCHERS_QUERY_KEY(tripId),
                })
            } catch (err) {
                // Bulk-create blew up — flip the succeeded temp rows to
                // failed so the user sees them and can retry.
                const friendly = toFriendlyError(err, "Couldn't save your vouchers. Please retry.")
                succeeded.forEach((s) => markTempFailed(s.tempId, friendly))
                toast.error(friendly)
                trackButtonClickCustom({
                    buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
                    buttonName: 'voucher_upload_batch_failure',
                    buttonAction: 'view',
                    extra: { trip_id: tripId, count: succeeded.length, reason: friendly },
                })
            } finally {
                setIsUploading(false)
            }
        },
        [tripId, queryClient, insertTempVoucher, uploadOne, markTempFailed, onUploaded],
    )

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files || [])
        void handleFiles(selected)
        if (inputRef.current) inputRef.current.value = ''
    }

    const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
        const dropped = Array.from(e.dataTransfer.files || [])
        trackButtonClickCustom({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: 'voucher_uploader_drop',
            buttonAction: 'click',
            extra: { trip_id: tripId, count: dropped.length, variant },
        })
        void handleFiles(dropped)
    }

    const openPicker = () => {
        trackButtonClickCustom({
            buttonPage: TRIPBOARD_V1_BUTTON_PAGE,
            buttonName: 'voucher_uploader_choose_files_click',
            buttonAction: 'click',
            extra: { trip_id: tripId, variant },
        })
        inputRef.current?.click()
    }

    if (variant === 'fab') {
        return (
            <>
                <button
                    type="button"
                    onClick={openPicker}
                    disabled={isUploading}
                    aria-label="Add vouchers"
                    title="Add vouchers"
                    // Mobile-only floating action button. Positioned to sit
                    // ABOVE the FloatingAssistantChip (fixed bottom-0
                    // z-[60] full-width) — z-[80] puts us in front of the
                    // chip, bottom-[5.5rem+safe-area] lifts us above its
                    // strip vertically. Rounded-square shape (not circle)
                    // so the "Add vouchers" label fits beneath the icon.
                    className="fixed z-[80] bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] right-4 inline-flex flex-col items-center justify-center h-16 w-16 rounded-2xl bg-primary-default text-natural-white shadow-[0_8px_20px_rgba(112,17,246,0.35)] ring-1 ring-primary-default/30 hover:bg-primary-default/90 active:scale-95 transition-all disabled:opacity-60 gap-0.5"
                >
                    {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Upload className="w-4 h-4" />
                    )}
                    <span className="text-[10px] font-semibold font-manrope leading-none">
                        Add vouchers
                    </span>
                </button>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept={`${ACCEPT_MIMES},${ACCEPT_EXTENSIONS}`}
                    onChange={onInputChange}
                    className="hidden"
                />
            </>
        )
    }

    if (variant === 'compact') {
        return (
            <>
                <button
                    type="button"
                    onClick={openPicker}
                    disabled={isUploading}
                    aria-label="Add vouchers"
                    title="Add vouchers"
                    className="shrink-0 inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg text-[13px] font-semibold font-manrope text-natural-white bg-primary-default hover:bg-primary-default/90 transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                    {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Upload className="w-3.5 h-3.5" />
                    )}
                    Add vouchers
                </button>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept={`${ACCEPT_MIMES},${ACCEPT_EXTENSIONS}`}
                    onChange={onInputChange}
                    className="hidden"
                />
            </>
        )
    }

    return (
        <div className="w-full">
            <div
                onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={openPicker}
                role="button"
                tabIndex={0}
                className={cn(
                    'w-full rounded-2xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center px-6 py-12 text-center',
                    isDragging
                        ? 'border-primary-default bg-primary-default/[0.04]'
                        : 'border-grey-4 hover:border-primary-default/60',
                )}
            >
                <div className="w-12 h-12 rounded-full bg-primary-default/10 flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5 text-primary-default" />
                </div>
                <p className="text-[15px] font-semibold font-manrope text-grey-0">
                    Drop booking vouchers here
                </p>
                <p className="text-[13px] text-grey-1 font-manrope mt-1 max-w-[360px]">
                    Flight tickets, hotel confirmations, activity bookings — PDF,
                    image, .pkpass, or .eml. We'll arrange them by date automatically.
                </p>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        openPicker()
                    }}
                    disabled={isUploading}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold font-manrope text-natural-white bg-primary-default hover:bg-primary-default/90 transition-colors disabled:opacity-60"
                >
                    {isUploading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                        <Upload className="w-3.5 h-3.5" />
                    )}
                    Choose files
                </button>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept={`${ACCEPT_MIMES},${ACCEPT_EXTENSIONS}`}
                    onChange={onInputChange}
                    className="hidden"
                />
            </div>
        </div>
    )
}

