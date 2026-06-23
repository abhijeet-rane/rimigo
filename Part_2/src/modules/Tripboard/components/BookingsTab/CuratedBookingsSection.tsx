import React, { useState } from 'react'
import {
    ArrowUpRight,
    Banknote,
    Bus,
    Car,
    CarTaxiFront,
    ChevronDown,
    FileText,
    Lightbulb,
    Luggage,
    Package,
    Pencil,
    Plane,
    Plus,
    ShieldCheck,
    Ship,
    Smartphone,
    Stamp,
    Train,
    Trash2,
    type LucideIcon
} from 'lucide-react'
import { toast } from 'sonner'
import { resolveCuratedProviderLogo } from '../../api/curatedBookingsApi'
import type { CuratedBookingItem, CuratedBookingItemPayload, CuratedCategory, CuratedOffer } from '../../api/curatedBookingsApi'
import { CategorySection, SubSection, SubSectionHeader, SubSectionDate } from './CategorySection'
import { CheapestBadge, PriceButton, ProviderIdentity, TagPill } from './JourneyCardKit'
import { CuratedBookingModal } from './CuratedBookingModal'
import { ItineraryTransportLegs } from './ItineraryTransportLegs'
import { legTitle, legToCuratedPayload, legToCuratedSeed, type ItineraryTransportSlot } from './itineraryTransportSlots'
import { formatCurrency, formatDate } from './bookingsUtils'
import { useBudgetTrack } from './budgetTrackContext'
import { POSTHOG_EVENTS } from '@/modules/amplitude/components/posthogEventDetails'

interface CuratedBookingsSectionProps {
    category: CuratedCategory
    icon: string
    title: string
    items: CuratedBookingItem[]
    /** rimigo_internal viewers get add/edit/delete affordances. */
    isInternal: boolean
    /** Itinerary transport legs to promote into curated items (transport only,
     *  internal only). Legs already added are filtered out before render. */
    itinerarySlots?: ItineraryTransportSlot[]
    /** YYYY-MM-DD → day number, so dated items group under a "Day N" header
     *  matching the Activities section. */
    dateToDayNumber?: Map<string, number>
    onCreate?: (payload: CuratedBookingItemPayload) => Promise<unknown>
    onUpdate?: (itemId: string, payload: Partial<CuratedBookingItemPayload>) => Promise<unknown>
    onDelete?: (itemId: string) => Promise<unknown>
}

/** Type-driven icon shown in the item's header tile (Figma). Keyword `includes`
 *  match (not exact) so multi-word subtypes — "Car Rental", "Travel Insurance",
 *  "Currency Exchange", "Sim Card" — still resolve. Covers transport AND
 *  ancillary (Visa, Forex, Insurance, eSim…); first matching rule wins. */
const SUBTYPE_ICON_RULES: { match: string[]; icon: LucideIcon }[] = [
    { match: ['train', 'rail', 'metro', 'subway'], icon: Train },
    { match: ['bus', 'coach'], icon: Bus },
    // Transfer / taxi / ride-hail use the composer's CarTaxiFront (matched
    // before the generic car rule so "Car Rental" still gets the plain Car).
    { match: ['transfer', 'taxi', 'cab', 'shuttle', 'ride'], icon: CarTaxiFront },
    { match: ['car', 'rental', 'drive'], icon: Car },
    { match: ['flight', 'plane', 'air'], icon: Plane },
    { match: ['ferry', 'boat', 'cruise', 'ship'], icon: Ship },
    { match: ['visa', 'passport'], icon: Stamp },
    { match: ['sim', 'esim', 'data', 'connectivity'], icon: Smartphone },
    { match: ['insurance', 'cover'], icon: ShieldCheck },
    { match: ['forex', 'currency', 'exchange', 'money', 'cash', 'wallet'], icon: Banknote },
    { match: ['baggage', 'luggage'], icon: Luggage },
    { match: ['document', 'permit', 'pass', 'ticket'], icon: FileText }
]

const resolveSubtypeIcon = (item: CuratedBookingItem): LucideIcon => {
    const subtype = (item.subtype || '').trim().toLowerCase()
    const rule = subtype ? SUBTYPE_ICON_RULES.find((r) => r.match.some((keyword) => subtype.includes(keyword))) : undefined
    return rule?.icon || (item.category === 'transport' ? Bus : Package)
}

const priceUnitLabel = (offer: CuratedOffer): string | null => {
    if (offer.price == null) return null
    if (offer.price_unit === 'per_person') return 'per person'
    if (offer.price_unit === 'per_day') return 'per day'
    if (offer.price_unit === 'total') return 'total'
    return null
}

/** Cheapest priced offer drives the item's contribution to the section total. */
export const curatedItemPrice = (item: CuratedBookingItem): number | null => {
    const prices = item.offers.map((offer) => offer.price).filter((price): price is number => price != null && price > 0)
    return prices.length ? Math.min(...prices) : null
}

/** Purple-outlined CTA for book_now / get_quote offers (price_link uses the
 *  PriceButton chip). Matches the Figma curated card. */
const CuratedCtaButton: React.FC<{ label: string; href?: string | null; onClick?: () => void }> = ({ label, href, onClick }) => {
    const cls =
        'inline-flex items-center gap-1.5 rounded-[10px] border-[1.5px] border-primary-default bg-white px-3.5 py-2 font-red-hat-display text-[14px] font-bold tracking-[-0.28px] leading-[18px] text-primary-default hover:bg-primary-pale-purple transition-colors cursor-pointer'
    const inner = (
        <>
            {label}
            <ArrowUpRight className="w-[18px] h-[18px] text-primary-default shrink-0" />
        </>
    )
    if (href) {
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClick}
                className={cls}>
                {inner}
            </a>
        )
    }
    return (
        <button
            onClick={onClick}
            className={cls}>
            {inner}
        </button>
    )
}

/** One curated item — vertical card (Figma): type-icon + title header, optional
 *  amber tip (description), one offer row per provider, See-more footer. */
const CuratedItemCard: React.FC<{
    item: CuratedBookingItem
    isInternal: boolean
    onEdit?: () => void
    onDelete?: () => void
    onLinkClick: (offer: CuratedOffer) => void
}> = ({ item, isInternal, onEdit, onDelete, onLinkClick }) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const [imageErrored, setImageErrored] = useState(false)
    const track = useBudgetTrack()
    const sortedOffers = [...item.offers].sort((a, b) => (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER))
    const cheapestPrice = curatedItemPrice(item)
    const visibleOffers = isExpanded ? sortedOffers : sortedOffers.slice(0, 1)
    const moreCount = sortedOffers.length - 1
    const TypeIcon = resolveSubtypeIcon(item)
    // Show the image only when it's a real URL that loads; otherwise fall back
    // to the type icon (a broken/empty image was showing a placeholder glyph).
    const showImage = !!item.image && item.image.trim().startsWith('http') && !imageErrored

    const renderCta = (offer: CuratedOffer) => {
        if (offer.cta_type === 'price_link') {
            return (
                <PriceButton
                    price={formatCurrency(offer.price || 0)}
                    sub={priceUnitLabel(offer)}
                    href={offer.link || undefined}
                    minWidthPx={114}
                    centered
                    onClick={() => onLinkClick(offer)}
                />
            )
        }
        return (
            <CuratedCtaButton
                label={offer.cta_type === 'book_now' ? 'Book Now' : 'Get Quote'}
                href={offer.link || undefined}
                onClick={() => onLinkClick(offer)}
            />
        )
    }

    return (
        <div className={`rounded-[12px] border border-border-subtle bg-white overflow-hidden ${!item.is_visible ? 'opacity-60' : ''}`}>
            {/* Header: type-icon tile + title + subtype (+ badge) */}
            <div className="flex items-center gap-3 p-3">
                <span className="w-9 h-9 rounded-[10px] bg-primary-pale-purple flex items-center justify-center shrink-0 overflow-hidden">
                    {showImage ? (
                        <img
                            src={item.image as string}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={() => setImageErrored(true)}
                        />
                    ) : (
                        <TypeIcon className="w-5 h-5 text-primary-default" />
                    )}
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-red-hat-display text-[14px] font-semibold tracking-[-0.28px] leading-[18px] text-grey-0 truncate">
                        {item.title}
                    </span>
                    {item.subtype && (
                        <span className="font-manrope text-[12px] font-semibold tracking-[-0.24px] leading-4 text-grey-2 truncate">
                            {item.subtype}
                        </span>
                    )}
                </div>
                {(item.badge || !item.is_visible) && (
                    <span className="flex items-center gap-1 shrink-0">
                        {item.badge && <TagPill variant="warning">{item.badge}</TagPill>}
                        {!item.is_visible && <TagPill>Hidden</TagPill>}
                    </span>
                )}
            </div>

            {/* Tip banner — the item description (Figma amber callout) */}
            {item.description && (
                <div className="border-t border-border-subtle p-3">
                    <div className="flex items-start gap-2 rounded-[8px] bg-warning-bg px-3 py-2">
                        <Lightbulb className="w-4 h-4 text-warning-text shrink-0 mt-px" />
                        <span className="font-manrope text-[12px] font-medium tracking-[-0.24px] leading-4 text-warning-text">
                            {item.description}
                        </span>
                    </div>
                </div>
            )}

            {/* Offers — headline + provider on the left, CTA on the right */}
            {visibleOffers.map((offer, idx) => (
                <div
                    key={`${offer.provider_name}-${idx}`}
                    className="flex items-center justify-between gap-3 border-t border-border-subtle px-3 py-3">
                    <div className="flex flex-col gap-1.5 min-w-0">
                        {offer.headline && (
                            <span className="font-manrope text-[14px] font-medium tracking-[-0.28px] leading-[18px] text-grey-0 truncate">
                                {offer.headline}
                            </span>
                        )}
                        <span className="flex items-center gap-2 flex-wrap">
                            {/* faviconUrl (not logoUrl) → small logo icon + the
                                provider name beside it, matching the design. */}
                            <ProviderIdentity
                                faviconUrl={resolveCuratedProviderLogo(offer)}
                                name={offer.provider_name}
                            />
                            {offer.price != null && offer.price > 0 && offer.price === cheapestPrice && sortedOffers.length > 1 && <CheapestBadge />}
                            {(offer.tags || []).map((tag) => (
                                <TagPill key={tag}>{tag}</TagPill>
                            ))}
                        </span>
                    </div>
                    <div className="shrink-0">{renderCta(offer)}</div>
                </div>
            ))}

            {/* Internal edit/delete */}
            {isInternal && (
                <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-3 py-2.5">
                    <button
                        type="button"
                        onClick={onEdit}
                        className="flex items-center gap-1 rounded-full border border-border-subtle bg-white px-2.5 py-1 font-red-hat-display text-[12px] font-bold tracking-[-0.24px] text-grey-2 hover:text-primary-default hover:border-primary-default/40 transition-colors cursor-pointer">
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        className="flex items-center gap-1 rounded-full border border-border-subtle bg-white px-2.5 py-1 font-red-hat-display text-[12px] font-bold tracking-[-0.24px] text-grey-2 hover:text-secondary-red hover:border-secondary-red/40 transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                    </button>
                </div>
            )}

            {/* See N more / Show less footer */}
            {moreCount > 0 && (
                <button
                    onClick={() => {
                        track(POSTHOG_EVENTS.BUDGET_TAB_CURATED_ITEM_TOGGLE, { item_id: item.item_id, open: !isExpanded })
                        setIsExpanded((prev) => !prev)
                    }}
                    className="flex w-full items-center justify-center gap-1 border-t border-border-subtle bg-grey-5 py-2.5 font-red-hat-display text-[14px] font-bold tracking-[-0.28px] text-grey-0 hover:bg-grey-4/40 transition-colors cursor-pointer">
                    {isExpanded ? 'Show less' : `See ${moreCount} more`}
                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? '-scale-y-100' : ''}`} />
                </button>
            )}
        </div>
    )
}

/** Transport / Ancillaries category section — items hand-curated by
 *  rimigo_internal users (metadata.curated_bookings). Hidden entirely for
 *  travelers when empty; internal users always see it with an Add CTA. */
export const CuratedBookingsSection: React.FC<CuratedBookingsSectionProps> = ({
    category,
    icon,
    title,
    items,
    isInternal,
    itinerarySlots,
    dateToDayNumber,
    onCreate,
    onUpdate,
    onDelete
}) => {
    const [isOpen, setIsOpen] = useState(false)
    // `editing` carries an existing item (update path); `seed` carries a
    // prefilled-but-unsaved item from an itinerary leg (create path). Only one
    // is set at a time. Both feed the modal's `initial`; the empty item_id on a
    // seed keeps it on the create path.
    const [modalState, setModalState] = useState<{ open: boolean; editing: CuratedBookingItem | null; seed: CuratedBookingItem | null }>({
        open: false,
        editing: null,
        seed: null
    })
    const track = useBudgetTrack()

    // Itinerary legs already promoted into curated items are dropped — matched
    // on offer link first (stable), then title (manual/no-link adds).
    const addedLinks = new Set(items.flatMap((item) => item.offers.map((offer) => offer.link).filter(Boolean)))
    const addedTitles = new Set(items.map((item) => item.title))
    const pendingLegs = (itinerarySlots || []).filter(
        (slot) => !(slot.link && addedLinks.has(slot.link)) && !addedTitles.has(legTitle(slot))
    )

    if (!items.length && !isInternal && !pendingLegs.length) return null

    const visibleForTotals = items.filter((item) => item.is_visible)
    const total = visibleForTotals.reduce((sum, item) => sum + (curatedItemPrice(item) || 0), 0)
    const countLabel = items.length ? `${items.length} booking${items.length !== 1 ? 's' : ''}` : null

    // Dated items (itinerary-sourced) group under a "Day N · date" header like
    // the Activities section; undated items (manual passes, ancillaries) stay
    // flat below.
    const undatedItems = items.filter((item) => !item.date)
    const datedGroupMap = new Map<string, CuratedBookingItem[]>()
    for (const item of items) {
        if (!item.date) continue
        const key = item.date.slice(0, 10)
        const bucket = datedGroupMap.get(key)
        if (bucket) bucket.push(item)
        else datedGroupMap.set(key, [item])
    }
    const datedGroups = [...datedGroupMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, groupItems]) => ({ dateKey, dayNumber: dateToDayNumber?.get(dateKey), items: groupItems }))

    const handleSave = async (payload: CuratedBookingItemPayload) => {
        if (modalState.editing) {
            await onUpdate?.(modalState.editing.item_id, payload)
        } else {
            await onCreate?.(payload)
        }
        track(POSTHOG_EVENTS.BUDGET_TAB_CURATED_ITEM_SAVE, { category, editing: !!modalState.editing })
        toast.success(modalState.editing ? 'Item updated' : 'Item added')
    }

    // Complete leg → create the curated item directly, no editor.
    const handleAddLeg = async (slot: ItineraryTransportSlot) => {
        await onCreate?.(legToCuratedPayload(slot))
        track(POSTHOG_EVENTS.BUDGET_TAB_CURATED_ITEM_SAVE, { category, editing: false, from_itinerary: true })
        toast.success('Transport added')
    }

    // Incomplete leg → open the editor prefilled to fill the missing fields.
    const handleCompleteLeg = (slot: ItineraryTransportSlot) => {
        setModalState({ open: true, editing: null, seed: legToCuratedSeed(slot) })
    }

    const handleDelete = async (item: CuratedBookingItem) => {
        if (!window.confirm(`Delete "${item.title}"? Travelers will no longer see it.`)) return
        await onDelete?.(item.item_id)
        track(POSTHOG_EVENTS.BUDGET_TAB_CURATED_ITEM_DELETE, { category, item_id: item.item_id })
        toast.success('Item deleted')
    }

    const renderCard = (item: CuratedBookingItem) => (
        <CuratedItemCard
            key={item.item_id}
            item={item}
            isInternal={isInternal}
            onEdit={() => setModalState({ open: true, editing: item, seed: null })}
            onDelete={() => handleDelete(item)}
            onLinkClick={(offer) =>
                track(POSTHOG_EVENTS.BUDGET_TAB_CURATED_LINK_CLICK, {
                    category,
                    item_id: item.item_id,
                    provider: offer.provider_name,
                    cta_type: offer.cta_type
                })
            }
        />
    )

    return (
        <>
            <CategorySection
                icon={icon}
                title={title}
                countLabel={countLabel}
                price={total > 0 ? formatCurrency(total) : null}
                priceSub={total > 0 ? 'per person' : null}
                open={isOpen}
                onToggle={() => {
                    track(POSTHOG_EVENTS.BUDGET_TAB_CURATED_SECTION_TOGGLE, { category, open: !isOpen })
                    setIsOpen((prev) => !prev)
                }}>
                {/* Dated items grouped under a "Day N · date" header (same
                    design as Activities, minus the destination). */}
                {datedGroups.map((group) => (
                    <SubSection key={group.dateKey}>
                        <SubSectionHeader
                            lead={group.dayNumber ? `Day ${group.dayNumber}` : formatDate(group.dateKey)}
                            right={group.dayNumber ? <SubSectionDate>{formatDate(group.dateKey)}</SubSectionDate> : undefined}
                        />
                        {group.items.map(renderCard)}
                    </SubSection>
                ))}
                {/* Undated items (trip-wide passes, ancillaries) + the itinerary
                    leg suggestions + the manual Add button. */}
                {(undatedItems.length > 0 || isInternal) && (
                    <SubSection>
                        {undatedItems.map(renderCard)}
                        {isInternal && pendingLegs.length > 0 && (
                            <ItineraryTransportLegs
                                slots={pendingLegs}
                                onAdd={handleAddLeg}
                                onComplete={handleCompleteLeg}
                            />
                        )}
                        {isInternal && (
                            <button
                                onClick={() => setModalState({ open: true, editing: null, seed: null })}
                                className="flex items-center justify-center gap-1.5 rounded-[12px] border border-dashed border-grey-3 bg-white/60 py-3 font-red-hat-display text-[14px] font-bold tracking-[-0.28px] text-grey-2 hover:text-primary-default hover:border-primary-default/50 transition-colors cursor-pointer">
                                <Plus className="w-4 h-4" />
                                Add {category === 'transport' ? 'transport' : 'ancillary'} item
                            </button>
                        )}
                    </SubSection>
                )}
            </CategorySection>
            {isInternal && (
                <CuratedBookingModal
                    open={modalState.open}
                    category={category}
                    initial={modalState.editing ?? modalState.seed}
                    highlightMissing={!!modalState.seed}
                    onSave={handleSave}
                    onClose={() => setModalState({ open: false, editing: null, seed: null })}
                />
            )}
        </>
    )
}
