// types/fileTypes.ts

export interface FileType {
    value: string
    label: string
}

export const FILE_TYPES: FileType[] = [
    { value: 'voucher', label: 'Voucher' },
    { value: 'link', label: 'Link' },

    { value: 'receipt', label: 'Receipt' },
    { value: 'ticket', label: 'Ticket' },
    { value: 'pass', label: 'Pass' },
    { value: 'qr_code', label: 'QR Code' },
    { value: 'reservation', label: 'Reservation' },
    { value: 'passport', label: 'Passport' },
    { value: 'visa', label: 'Visa' },
    { value: 'arr_dept_document', label: 'Arrival / Departure Document' },
    { value: 'other', label: 'Other' }
]
