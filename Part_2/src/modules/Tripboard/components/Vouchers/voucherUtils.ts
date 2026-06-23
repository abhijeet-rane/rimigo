/**
 * Shared voucher helpers used by both VoucherUploader and other surfaces
 * (SSE subscription, delete handler). Kept in a separate file so the
 * uploader can export only its component — Fast Refresh requires module
 * boundaries to be all-components or all-utilities, not mixed.
 */

/** Prefix used for optimistic temp voucher ids inserted into the
 *  TanStack Query cache while their files upload to S3. */
export const TEMP_VOUCHER_PREFIX = 'temp-'

export const isTempVoucherId = (id: string): boolean =>
    id.startsWith(TEMP_VOUCHER_PREFIX)
