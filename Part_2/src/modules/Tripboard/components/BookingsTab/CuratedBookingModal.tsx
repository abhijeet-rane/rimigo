import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
    X,
    Plus,
    Trash2,
    CarTaxiFront,
    Bus,
    Train,
    Ship,
    Package,
    ShieldCheck,
    Stamp,
    Smartphone,
    Banknote,
    FileText,
    type LucideIcon
} from 'lucide-react'
import { CURATED_PROVIDER_OPTIONS } from '../../api/curatedBookingsApi'
import type { CuratedBookingItem, CuratedBookingItemPayload, CuratedCategory, CuratedCtaType } from '../../api/curatedBookingsApi'

/* Create/edit modal for curated Transport & Ancillary booking items
 * (rimigo_internal users only). Category is preset by the opening section.
 * Defaults cover currency (INR), price unit (per person) and ordering. New
 * items default to hidden so they're staged before going live. */

interface CuratedBookingModalProps {
    open: boolean
    category: CuratedCategory
    initial?: CuratedBookingItem | null
    /** When the modal opens from an itinerary leg (the "Complete & add" flow),
     *  required fields that are still empty get a red border so the internal
     *  user sees exactly what's left to fill before the item can be added. */
    highlightMissing?: boolean
    onSave: (payload: CuratedBookingItemPayload) => Promise<void>
    onClose: () => void
}

const PROVIDER_OPTIONS = CURATED_PROVIDER_OPTIONS
const OTHER = '__other__'

const SUBTYPE_SUGGESTIONS: Record<CuratedCategory, string[]> = {
    transport: ['Train', 'Bus', 'Ferry', 'Metro', 'Car Rental', 'Transfer'],
    ancillary: ['Visa', 'Insurance', 'eSim', 'Forex', 'Document']
}

const CTA_OPTIONS: { value: CuratedCtaType; label: string }[] = [
    { value: 'price_link', label: 'Price + link' },
    { value: 'book_now', label: 'Book now' },
    { value: 'get_quote', label: 'Get quote' }
]

/** Type-keyword → icon for the header tile (mirrors the card's rules). */
const TYPE_ICON_RULES: { match: string[]; icon: LucideIcon }[] = [
    { match: ['train', 'rail', 'metro', 'subway'], icon: Train },
    { match: ['bus', 'coach'], icon: Bus },
    { match: ['transfer', 'taxi', 'cab', 'shuttle', 'ride'], icon: CarTaxiFront },
    { match: ['ferry', 'boat', 'cruise', 'ship'], icon: Ship },
    { match: ['visa', 'passport'], icon: Stamp },
    { match: ['sim', 'esim', 'data'], icon: Smartphone },
    { match: ['insurance', 'cover'], icon: ShieldCheck },
    { match: ['forex', 'currency', 'cash', 'money'], icon: Banknote },
    { match: ['document', 'permit', 'pass', 'ticket'], icon: FileText }
]

const resolveHeaderIcon = (subtype: string, category: CuratedCategory): LucideIcon => {
    const key = subtype.trim().toLowerCase()
    const rule = key ? TYPE_ICON_RULES.find((r) => r.match.some((m) => key.includes(m))) : undefined
    return rule?.icon || (category === 'transport' ? CarTaxiFront : Package)
}

interface OfferDraft {
    provider: string // preset name or OTHER
    custom_name: string
    cta_type: CuratedCtaType
    price: string
    link: string
    headline: string
    /** Preserved untouched from the edited offer so saving never wipes them. */
    tags: string[]
    currency: string
}

const emptyOffer = (): OfferDraft => ({
    provider: PROVIDER_OPTIONS[0].name,
    custom_name: '',
    cta_type: 'price_link',
    price: '',
    link: '',
    headline: '',
    tags: [],
    currency: 'INR'
})

const toOfferDraft = (offer: CuratedBookingItem['offers'][number]): OfferDraft => {
    const preset = PROVIDER_OPTIONS.find((option) => option.name === offer.provider_name)
    return {
        provider: preset ? preset.name : OTHER,
        custom_name: preset ? '' : offer.provider_name,
        cta_type: offer.cta_type,
        price: offer.price != null ? String(offer.price) : '',
        link: offer.link ?? '',
        headline: offer.headline ?? '',
        tags: offer.tags ?? [],
        currency: offer.currency ?? 'INR'
    }
}

const labelClass = 'font-manrope text-[12px] font-semibold text-grey-2'
const optionalClass = 'font-manrope text-[12px] font-medium text-grey-3'
const inputClass =
    'border border-border-subtle rounded-[10px] px-3 py-2 font-manrope text-[13px] text-grey-0 w-full bg-white focus:border-primary-default outline-none transition-colors'
const errorClass = 'font-manrope text-[12px] text-secondary-red'
// Red border / outline for a required-but-empty field in the "Complete & add"
// flow. Inline styles (not Tailwind classes) so they always render — the base
// red-border/ring utilities aren't reliably emitted as dynamic classes.
const MISSING_BORDER: React.CSSProperties = { borderColor: 'var(--color-secondary-red)', borderWidth: 2 }
const MISSING_OUTLINE: React.CSSProperties = { outline: '2px solid var(--color-secondary-red)', outlineOffset: 2, borderRadius: 12 }

export const CuratedBookingModal: React.FC<CuratedBookingModalProps> = ({ open, category, initial, highlightMissing = false, onSave, onClose }) => {
    const [title, setTitle] = useState('')
    const [subtype, setSubtype] = useState('')
    // YYYY-MM-DD for the date input; empty = no date (trip-spanning passes).
    const [date, setDate] = useState('')
    // True when the type isn't one of the presets → show the free-text input.
    const [customType, setCustomType] = useState(false)
    const [isVisible, setIsVisible] = useState(false)
    const [offers, setOffers] = useState<OfferDraft[]>([emptyOffer()])
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)
    const [topError, setTopError] = useState<string | null>(null)

    useEffect(() => {
        if (!open) return
        setTitle(initial?.title ?? '')
        setSubtype(initial?.subtype ?? '')
        // Itinerary date is a full datetime; the date input needs YYYY-MM-DD.
        setDate(initial?.date ? initial.date.slice(0, 10) : '')
        setCustomType(!!initial?.subtype && !SUBTYPE_SUGGESTIONS[category].includes(initial.subtype))
        setIsVisible(initial?.is_visible ?? false)
        setOffers(initial?.offers?.length ? initial.offers.map(toOfferDraft) : [emptyOffer()])
        setErrors({})
        setSaving(false)
        setTopError(null)
    }, [open, initial, category])

    useEffect(() => {
        if (!open) return
        const original = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !saving) onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => {
            document.body.style.overflow = original
            window.removeEventListener('keydown', onKey)
        }
    }, [open, saving, onClose])

    if (!open) return null

    // Red highlight helpers — only active in the "Complete & add" flow.
    const missingBorder = (isMissing: boolean): React.CSSProperties | undefined => (highlightMissing && isMissing ? MISSING_BORDER : undefined)
    const missingOutline = (isMissing: boolean): React.CSSProperties | undefined => (highlightMissing && isMissing ? MISSING_OUTLINE : undefined)

    const updateOffer = (index: number, patch: Partial<OfferDraft>) => {
        setOffers((prev) => prev.map((offer, i) => (i === index ? { ...offer, ...patch } : offer)))
    }

    const providerName = (offer: OfferDraft) => (offer.provider === OTHER ? offer.custom_name.trim() : offer.provider)

    const validate = (): Record<string, string> => {
        const next: Record<string, string> = {}
        if (!title.trim()) next.title = 'Title is required'
        if (!subtype.trim()) next.subtype = 'Type is required'
        offers.forEach((offer, index) => {
            if (!providerName(offer)) next[`provider-${index}`] = 'Provider is required'
            if (offer.cta_type === 'price_link') {
                const price = Number(offer.price)
                if (!offer.price.trim() || !Number.isFinite(price) || price <= 0) next[`price-${index}`] = 'Price must be greater than 0'
            }
            if ((offer.cta_type === 'price_link' || offer.cta_type === 'book_now') && !offer.link.trim()) next[`link-${index}`] = 'Link is required'
        })
        return next
    }

    const handleSave = () => {
        const next = validate()
        setErrors(next)
        if (Object.keys(next).length) return
        const payload: CuratedBookingItemPayload = {
            category,
            subtype: subtype.trim(),
            title: title.trim(),
            // Transport only — itinerary legs prefill their date, passes leave
            // it blank; ancillaries are never date-bound.
            date: category === 'transport' ? date || null : null,
            image: initial?.image ?? null,
            description: initial?.description ?? null,
            badge: initial?.badge ?? null,
            sort_order: initial?.sort_order ?? 0,
            is_visible: isVisible,
            offers: offers.map((offer) => {
                const preset = PROVIDER_OPTIONS.find((option) => option.name === offer.provider)
                const price = offer.price.trim() ? Number(offer.price) : null
                return {
                    headline: offer.headline.trim() || undefined,
                    provider_name: providerName(offer),
                    // Backend validates this as a URL — data-URI catalog logos
                    // stay client-side and resolve by name at render time.
                    provider_logo: preset?.logo.startsWith('http') ? preset.logo : null,
                    cta_type: offer.cta_type,
                    price,
                    currency: offer.currency,
                    price_unit: price != null ? ('per_person' as const) : null,
                    link: offer.link.trim() || null,
                    tags: offer.tags
                }
            })
        }
        setSaving(true)
        setTopError(null)
        onSave(payload)
            .then(() => onClose())
            .catch(() => {
                setSaving(false)
                setTopError('Could not save this item. Please try again.')
            })
    }

    const isEdit = !!initial?.item_id
    const HeaderIcon = resolveHeaderIcon(subtype, category)
    const noun = category === 'transport' ? 'transport' : 'ancillary'

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="curated-booking-modal-title"
                className="bg-white rounded-2xl max-w-[420px] w-full max-h-[78vh] flex flex-col overflow-hidden shadow-xl">
                {/* ── Header ── */}
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border-subtle">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-9 h-9 rounded-[10px] bg-primary-pale-purple flex items-center justify-center shrink-0">
                            <HeaderIcon className="w-[18px] h-[18px] text-primary-default" />
                        </span>
                        <div className="flex flex-col min-w-0">
                            <h2
                                id="curated-booking-modal-title"
                                className="font-red-hat-display text-[15px] font-bold text-grey-0 leading-tight capitalize">
                                {isEdit ? 'Edit' : 'Add'} {noun}
                            </h2>
                            <span className="font-manrope text-[12px] text-grey-2">
                                {isEdit ? 'Update the details below' : 'A bookable option travelers can act on'}
                            </span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        aria-label="Close"
                        className="shrink-0 rounded-full p-1.5 text-grey-2 hover:bg-grey-5 transition-colors cursor-pointer disabled:cursor-not-allowed">
                        <X className="w-[18px] h-[18px]" />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto px-4 py-3.5 flex flex-col gap-3.5">
                    {highlightMissing && (
                        <div className="flex items-start gap-2 rounded-[10px] bg-warning-bg ring-1 ring-warning-border px-3 py-2">
                            <span className="font-manrope text-[12px] font-medium text-warning-text leading-relaxed">
                                Prefilled from the itinerary — complete the fields outlined in red to add it.
                            </span>
                        </div>
                    )}

                    {/* Details */}
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                            <label
                                className={labelClass}
                                htmlFor="curated-item-title">
                                Title *
                            </label>
                            <input
                                id="curated-item-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. JR Rail Pass"
                                className={inputClass}
                                style={missingBorder(!title.trim())}
                            />
                            {errors.title && <p className={errorClass}>{errors.title}</p>}
                        </div>

                        {/* Type — selectable chips, "Other" reveals a text input */}
                        <div className="flex flex-col gap-1">
                            <label className={labelClass}>Type *</label>
                            <div
                                className="flex flex-wrap gap-2"
                                style={missingOutline(!subtype.trim())}>
                                {SUBTYPE_SUGGESTIONS[category].map((option) => {
                                    const selected = !customType && subtype === option
                                    return (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => {
                                                setCustomType(false)
                                                setSubtype(option)
                                            }}
                                            className={`px-2.5 py-1 rounded-full font-red-hat-display text-[12px] font-bold tracking-[-0.24px] border transition-colors cursor-pointer ${
                                                selected
                                                    ? 'bg-primary-default text-white border-primary-default'
                                                    : 'bg-white text-grey-1 border-border-subtle hover:border-primary-default/50 hover:text-primary-default'
                                            }`}>
                                            {option}
                                        </button>
                                    )
                                })}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCustomType(true)
                                        setSubtype('')
                                    }}
                                    className={`px-2.5 py-1 rounded-full font-red-hat-display text-[12px] font-bold tracking-[-0.24px] border transition-colors cursor-pointer ${
                                        customType
                                            ? 'bg-primary-default text-white border-primary-default'
                                            : 'bg-white text-grey-1 border-border-subtle hover:border-primary-default/50 hover:text-primary-default'
                                    }`}>
                                    Other…
                                </button>
                            </div>
                            {customType && (
                                <input
                                    type="text"
                                    value={subtype}
                                    onChange={(e) => setSubtype(e.target.value)}
                                    placeholder="Custom type (e.g. Cable car)"
                                    className={inputClass}
                                    style={missingBorder(!subtype.trim())}
                                />
                            )}
                            {errors.subtype && <p className={errorClass}>{errors.subtype}</p>}
                        </div>

                        {/* Date — transport only; ancillaries (visa, sim, forex)
                            aren't tied to a day. */}
                        {category === 'transport' && (
                            <div className="flex flex-col gap-1">
                                <label
                                    className="flex items-center gap-1.5"
                                    htmlFor="curated-item-date">
                                    <span className={labelClass}>Date</span>
                                    <span className={optionalClass}>· optional</span>
                                </label>
                                <input
                                    id="curated-item-date"
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className={`${inputClass} md:max-w-[220px]`}
                                />
                                <span className="font-manrope text-[11px] text-grey-3">Leave blank for trip-wide passes (e.g. a rail pass)</span>
                            </div>
                        )}
                    </div>

                    {/* Visibility toggle */}
                    <button
                        type="button"
                        role="switch"
                        aria-checked={isVisible}
                        onClick={() => setIsVisible((v) => !v)}
                        className="flex items-center justify-between gap-3 rounded-[12px] border border-border-subtle px-3 py-2.5 text-left hover:border-grey-3 transition-colors cursor-pointer">
                        <span className="flex flex-col">
                            <span className="font-red-hat-display text-[14px] font-semibold text-grey-0">Visible to travelers</span>
                            <span className="font-manrope text-[12px] text-grey-2">
                                {isVisible ? 'Travelers can see this item' : 'Hidden — staged until you turn it on'}
                            </span>
                        </span>
                        <span
                            className={`relative w-10 h-6 rounded-full shrink-0 transition-colors ${isVisible ? 'bg-primary-default' : 'bg-grey-3'}`}>
                            <span
                                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${isVisible ? 'translate-x-4' : 'translate-x-0'}`}
                            />
                        </span>
                    </button>

                    {/* Offers */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="font-red-hat-display text-[14px] font-bold text-grey-0">Provider offers</span>
                            <span className="font-manrope text-[12px] text-grey-3">{offers.length > 1 ? `${offers.length} offers` : ''}</span>
                        </div>

                        {offers.map((offer, index) => {
                            const preset = PROVIDER_OPTIONS.find((option) => option.name === offer.provider)
                            const priceMissing = offer.cta_type === 'price_link' && (!offer.price.trim() || !(Number(offer.price) > 0))
                            const linkMissing = (offer.cta_type === 'price_link' || offer.cta_type === 'book_now') && !offer.link.trim()
                            return (
                                <div
                                    key={index}
                                    className="rounded-[12px] border border-border-subtle bg-grey-5/40 p-3 flex flex-col gap-2.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-red-hat-display text-[12px] font-bold uppercase tracking-[0.4px] text-grey-2">
                                            Offer {index + 1}
                                        </span>
                                        {offers.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setOffers((prev) => prev.filter((_, i) => i !== index))}
                                                className="flex items-center gap-1 font-red-hat-display text-[12px] font-bold text-grey-2 hover:text-secondary-red transition-colors cursor-pointer">
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Remove
                                            </button>
                                        )}
                                    </div>

                                    {/* Provider */}
                                    <div className="flex flex-col gap-1">
                                        <label className={labelClass}>Provider *</label>
                                        <div className="flex items-center gap-2">
                                            <span className="w-10 h-10 rounded-[10px] border border-border-subtle bg-white flex items-center justify-center shrink-0 overflow-hidden">
                                                {preset ? (
                                                    <img
                                                        src={preset.logo}
                                                        alt=""
                                                        className="w-full h-full object-contain p-1.5"
                                                    />
                                                ) : (
                                                    <Package className="w-4 h-4 text-grey-3" />
                                                )}
                                            </span>
                                            <select
                                                value={offer.provider}
                                                onChange={(e) => updateOffer(index, { provider: e.target.value })}
                                                className={inputClass}
                                                style={missingBorder(!providerName(offer))}>
                                                {PROVIDER_OPTIONS.map((option) => (
                                                    <option
                                                        key={option.name}
                                                        value={option.name}>
                                                        {option.name}
                                                    </option>
                                                ))}
                                                <option value={OTHER}>Other…</option>
                                            </select>
                                        </div>
                                        {offer.provider === OTHER && (
                                            <input
                                                type="text"
                                                value={offer.custom_name}
                                                onChange={(e) => updateOffer(index, { custom_name: e.target.value })}
                                                placeholder="Provider name"
                                                className={inputClass}
                                                style={missingBorder(!providerName(offer))}
                                            />
                                        )}
                                        {errors[`provider-${index}`] && <p className={errorClass}>{errors[`provider-${index}`]}</p>}
                                    </div>

                                    {/* How it shows — segmented control */}
                                    <div className="flex flex-col gap-1">
                                        <label className={labelClass}>How it shows</label>
                                        <div className="inline-flex w-full rounded-[10px] bg-grey-5 p-1 border border-border-subtle">
                                            {CTA_OPTIONS.map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onClick={() => updateOffer(index, { cta_type: option.value })}
                                                    className={`flex-1 px-2 py-1.5 rounded-[8px] font-red-hat-display text-[12px] font-bold tracking-[-0.24px] transition-colors cursor-pointer ${
                                                        offer.cta_type === option.value
                                                            ? 'bg-white text-primary-default shadow-sm'
                                                            : 'text-grey-2 hover:text-grey-0'
                                                    }`}>
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Price + Link — shown only when relevant to the CTA */}
                                    {offer.cta_type !== 'get_quote' && (
                                        <div className={`grid gap-3 ${offer.cta_type === 'price_link' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                            {offer.cta_type === 'price_link' && (
                                                <div className="flex flex-col gap-1">
                                                    <label className={labelClass}>Price (₹ per person) *</label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={offer.price}
                                                        onChange={(e) => updateOffer(index, { price: e.target.value })}
                                                        placeholder="0"
                                                        className={inputClass}
                                                        style={missingBorder(priceMissing)}
                                                    />
                                                    {errors[`price-${index}`] && <p className={errorClass}>{errors[`price-${index}`]}</p>}
                                                </div>
                                            )}
                                            <div className="flex flex-col gap-1">
                                                <label className={labelClass}>Booking link *</label>
                                                <input
                                                    type="text"
                                                    value={offer.link}
                                                    onChange={(e) => updateOffer(index, { link: e.target.value })}
                                                    placeholder="https://…"
                                                    className={inputClass}
                                                    style={missingBorder(linkMissing)}
                                                />
                                                {errors[`link-${index}`] && <p className={errorClass}>{errors[`link-${index}`]}</p>}
                                            </div>
                                        </div>
                                    )}

                                    {/* Headline */}
                                    <div className="flex flex-col gap-1">
                                        <label className="flex items-center gap-1.5">
                                            <span className={labelClass}>Headline</span>
                                            <span className={optionalClass}>· optional</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={offer.headline}
                                            onChange={(e) => updateOffer(index, { headline: e.target.value })}
                                            placeholder="e.g. 14-day unlimited pass"
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            )
                        })}

                        <button
                            type="button"
                            onClick={() => setOffers((prev) => [...prev, emptyOffer()])}
                            className="flex items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-grey-3 py-2.5 font-red-hat-display text-[13px] font-bold text-grey-2 hover:text-primary-default hover:border-primary-default/50 transition-colors cursor-pointer">
                            <Plus className="w-4 h-4" />
                            Add another offer
                        </button>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-subtle">
                    {topError && <span className="mr-auto font-manrope text-[12px] text-secondary-red">{topError}</span>}
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="font-red-hat-display font-bold text-[14px] text-grey-1 rounded-[10px] px-4 py-2.5 hover:bg-grey-5 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-primary-default text-white rounded-[10px] px-5 py-2.5 font-red-hat-display font-bold text-[14px] hover:opacity-90 transition-opacity cursor-pointer disabled:cursor-not-allowed disabled:opacity-60">
                        {saving ? 'Saving…' : isEdit ? 'Save changes' : `Add ${noun}`}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}
