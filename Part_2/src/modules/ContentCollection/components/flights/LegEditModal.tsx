import React, { useEffect, useState } from 'react'
import { Trash2, X } from 'lucide-react'
import AirportInput from '@/pages/Flights/components/AirportInput'
import { getAirportsByCodes, type Airport } from '@/api/flights/airportSearchAPI'
import type { FlightLeg, FlightLegKind, FlightLegPayload } from '../../api/travelerCollectionApi'

interface LegEditModalProps {
    open: boolean
    mode: 'add' | 'edit'
    leg?: FlightLeg | null
    defaultKind?: FlightLegKind
    onClose: () => void
    onSubmit: (payload: FlightLegPayload) => Promise<void> | void
    /** Optional destructive action (edit mode only). Caller handles the confirm. */
    onDelete?: () => Promise<void> | void
    deleting?: boolean
    /** Itinerary day list (sorted). Used to bound date inputs to the trip
     *  window — dates outside [first.date, last.date] are rejected at submit. */
    itineraryDays?: Array<{ date: string }>
}

interface FormState {
    kind: FlightLegKind
    fromAirport: Airport | null
    toAirport: Airport | null
    date: string
    returnDate: string
}

const KIND_OPTIONS: Array<{ value: FlightLegKind; label: string }> = [
    { value: 'outbound', label: 'Outbound' },
    { value: 'inter_city', label: 'Inter-city' },
    { value: 'return', label: 'Return' },
    { value: 'round_trip', label: 'Round trip' }
]

const LegEditModal: React.FC<LegEditModalProps> = ({
    open,
    mode,
    leg,
    defaultKind = 'inter_city',
    onClose,
    onSubmit,
    onDelete,
    deleting = false,
    itineraryDays
}) => {
    // Synthetic legs (`legacy-` / `derived-` ids) come from the backend's
    // legacy-spine fallback when the itinerary has no real flight slots yet.
    // Submitting them in edit-mode actually routes through the AI assistant
    // (no slot to PUT), so the CTA should advertise that path — not pretend
    // it's a direct save.
    const isSyntheticEdit =
        mode === 'edit' && !!leg?.id && (leg.id.startsWith('legacy-') || leg.id.startsWith('derived-'))

    const tripWindow = (() => {
        if (!itineraryDays || itineraryDays.length === 0) return null
        const first = itineraryDays[0]?.date
        const last = itineraryDays[itineraryDays.length - 1]?.date
        if (!first || !last) return null
        return { min: first.slice(0, 10), max: last.slice(0, 10) }
    })()
    const [form, setForm] = useState<FormState>({
        kind: defaultKind,
        fromAirport: null,
        toAirport: null,
        date: '',
        returnDate: ''
    })
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [submitting, setSubmitting] = useState(false)

    // When opening in edit mode, hydrate the airport inputs by resolving the
    // saved IATA codes against the airport DB (so the typeahead shows the
    // city/country, not just the bare code).
    useEffect(() => {
        if (!open) return
        setErrors({})
        if (mode === 'edit' && leg) {
            setForm({
                kind: leg.kind,
                fromAirport: null,
                toAirport: null,
                date: leg.date || '',
                returnDate: leg.return_date || ''
            })
            const codes = [leg.from, leg.to].filter((c): c is string => !!c)
            if (codes.length > 0) {
                getAirportsByCodes(codes)
                    .then((resp) => {
                        const map = new Map((resp?.data?.airports || []).map((a) => [a.code, a]))
                        setForm((prev) => ({
                            ...prev,
                            fromAirport: leg.from ? map.get(leg.from) || null : null,
                            toAirport: leg.to ? map.get(leg.to) || null : null
                        }))
                    })
                    .catch(() => {
                        // Fallback: synthesize a minimal Airport object so the input shows the IATA.
                        setForm((prev) => ({
                            ...prev,
                            fromAirport: leg.from
                                ? { code: leg.from, name: leg.from, city_code: leg.from, city_name: leg.from, country_name: '' }
                                : null,
                            toAirport: leg.to
                                ? { code: leg.to, name: leg.to, city_code: leg.to, city_name: leg.to, country_name: '' }
                                : null
                        }))
                    })
            }
        } else {
            setForm({
                kind: defaultKind,
                fromAirport: null,
                toAirport: null,
                date: '',
                returnDate: ''
            })
        }
    }, [open, mode, leg, defaultKind])

    if (!open) return null

    const update = <K extends keyof FormState>(field: K, value: FormState[K]) =>
        setForm((prev) => ({ ...prev, [field]: value }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const localErrors: Record<string, string> = {}
        if (!form.fromAirport) localErrors.from = 'Pick an origin airport.'
        if (!form.toAirport) localErrors.to = 'Pick a destination airport.'
        if (!form.date) localErrors.date = 'Date is required.'
        if (form.kind === 'round_trip' && !form.returnDate) localErrors.returnDate = 'Return date is required for a round trip.'
        // Trip-window bounds — legs that fall outside the itinerary range
        // can't be projected onto a slot, so reject inline before the POST.
        if (tripWindow && !localErrors.date && form.date) {
            if (form.date < tripWindow.min || form.date > tripWindow.max) {
                localErrors.date = 'Date is outside your trip window.'
            }
        }
        if (
            tripWindow &&
            form.kind === 'round_trip' &&
            !localErrors.returnDate &&
            form.returnDate &&
            (form.returnDate < tripWindow.min || form.returnDate > tripWindow.max)
        ) {
            localErrors.returnDate = 'Date is outside your trip window.'
        }
        if (Object.keys(localErrors).length > 0) {
            setErrors(localErrors)
            return
        }
        setSubmitting(true)
        try {
            const payload: FlightLegPayload = {
                ...(leg?.id ? { id: leg.id } : {}),
                kind: form.kind,
                from: form.fromAirport?.code ?? null,
                to: form.toAirport?.code ?? null,
                from_city: form.fromAirport?.city_name ?? null,
                to_city: form.toAirport?.city_name ?? null,
                date: form.date || null,
                return_date: form.kind === 'round_trip' ? form.returnDate || null : null,
                source: 'user',
                pinned: true
            }
            await onSubmit(payload)
            onClose()
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-visible">
                <div className="flex items-center justify-between p-5 border-b border-grey-4">
                    <p className="font-red-hat-display" style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>
                        {mode === 'add' ? 'Add a flight leg' : 'Edit leg'}
                    </p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-full hover:bg-grey_6 grid place-items-center"
                        aria-label="Close">
                        <X className="w-4 h-4" style={{ color: '#747474' }} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
                    {mode === 'add' && (
                        <div className="flex flex-col gap-1.5">
                            <label
                                className="font-manrope"
                                style={{ fontWeight: 600, fontSize: 12, color: '#363636' }}>
                                Type
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {KIND_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => update('kind', opt.value)}
                                        className="font-red-hat-display"
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 999,
                                            border: '1px solid',
                                            borderColor: form.kind === opt.value ? '#7011F6' : '#E0E0E0',
                                            background: form.kind === opt.value ? '#7011F6' : '#FFFFFF',
                                            color: form.kind === opt.value ? '#FFFFFF' : '#363636',
                                            fontWeight: 600,
                                            fontSize: 12,
                                            cursor: 'pointer'
                                        }}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <AirportFieldWrapper label="From" error={errors.from}>
                        <AirportInput
                            label=""
                            placeholder="Search city or airport"
                            value={form.fromAirport}
                            onChange={(a) => {
                                update('fromAirport', a)
                                if (a && errors.from) setErrors((e) => ({ ...e, from: '' }))
                            }}
                        />
                    </AirportFieldWrapper>

                    <AirportFieldWrapper label="To" error={errors.to}>
                        <AirportInput
                            label=""
                            placeholder="Search city or airport"
                            value={form.toAirport}
                            onChange={(a) => {
                                update('toAirport', a)
                                if (a && errors.to) setErrors((e) => ({ ...e, to: '' }))
                            }}
                        />
                    </AirportFieldWrapper>

                    <DateField
                        label={form.kind === 'round_trip' ? 'Outbound date' : 'Date'}
                        value={form.date}
                        onChange={(v) => update('date', v)}
                        error={errors.date}
                        min={tripWindow?.min}
                        max={tripWindow?.max}
                    />
                    {form.kind === 'round_trip' && (
                        <DateField
                            label="Return date"
                            value={form.returnDate}
                            onChange={(v) => update('returnDate', v)}
                            error={errors.returnDate}
                            min={form.date || tripWindow?.min}
                            max={tripWindow?.max}
                        />
                    )}

                    <div className="flex items-center justify-between gap-2 mt-2">
                        {mode === 'edit' && onDelete ? (
                            <button
                                type="button"
                                disabled={deleting}
                                onClick={() => onDelete()}
                                className="font-red-hat-display inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    border: 0,
                                    background: 'transparent',
                                    color: '#E73434',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    cursor: 'pointer'
                                }}>
                                <Trash2 className="w-3.5 h-3.5" />
                                {deleting ? 'Removing…' : 'Remove leg'}
                            </button>
                        ) : (
                            <span />
                        )}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="font-red-hat-display whitespace-nowrap"
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: 8,
                                    border: '1px solid #E0E0E0',
                                    background: '#FFFFFF',
                                    color: '#363636',
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: 'pointer'
                                }}>
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="font-red-hat-display whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: 8,
                                    border: 0,
                                    background: '#7011F6',
                                    color: '#FFFFFF',
                                    fontWeight: 700,
                                    fontSize: 13,
                                    cursor: 'pointer'
                                }}>
                                {submitting
                                    ? 'Saving…'
                                    : mode === 'add' || isSyntheticEdit
                                      ? 'Search flights'
                                      : 'Save changes'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

interface AirportFieldWrapperProps {
    label: string
    error?: string
    children: React.ReactNode
}

const AirportFieldWrapper: React.FC<AirportFieldWrapperProps> = ({ label, error, children }) => (
    <div className="flex flex-col gap-1.5">
        <label className="font-manrope" style={{ fontWeight: 600, fontSize: 12, color: '#363636' }}>
            {label}
        </label>
        {children}
        {error && (
            <span className="font-manrope" style={{ fontWeight: 600, fontSize: 11, color: '#E73434' }}>
                {error}
            </span>
        )}
    </div>
)

interface DateFieldProps {
    label: string
    value: string
    onChange: (v: string) => void
    error?: string
    min?: string
    max?: string
}

const DateField: React.FC<DateFieldProps> = ({ label, value, onChange, error, min, max }) => (
    <div className="flex flex-col gap-1.5">
        <label className="font-manrope" style={{ fontWeight: 600, fontSize: 12, color: '#363636' }}>
            {label}
        </label>
        <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            min={min}
            max={max}
            className="font-manrope outline-none"
            style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: `1px solid ${error ? '#E73434' : '#E0E0E0'}`,
                background: '#FFFFFF',
                fontSize: 13,
                color: '#101010'
            }}
        />
        {error && (
            <span className="font-manrope" style={{ fontWeight: 600, fontSize: 11, color: '#E73434' }}>
                {error}
            </span>
        )}
    </div>
)

export default LegEditModal
