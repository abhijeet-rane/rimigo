import React from 'react'
import { Bus, Car, CarTaxiFront, Ship, Train, Plane, MapPin, ArrowRight, Plus, Pencil, type LucideIcon } from 'lucide-react'
import { ProviderIdentity } from './JourneyCardKit'
import { formatDate } from './bookingsUtils'
import { isLegComplete, legMissingFields, type ItineraryTransportSlot } from './itineraryTransportSlots'

interface ItineraryTransportLegsProps {
    slots: ItineraryTransportSlot[]
    /** Complete leg → create the curated item directly. */
    onAdd: (slot: ItineraryTransportSlot) => void
    /** Incomplete leg → open the editor prefilled to fill the gaps. */
    onComplete: (slot: ItineraryTransportSlot) => void
}

/** Kind/mode → icon. Keyword `includes` so multi-word modes ("Private car",
 *  "Water taxi") still resolve; first match wins. */
const KIND_ICON_RULES: { match: string[]; icon: LucideIcon }[] = [
    { match: ['train', 'rail', 'metro', 'subway', 'tram', 'monorail'], icon: Train },
    { match: ['bus', 'coach', 'minibus'], icon: Bus },
    { match: ['transfer', 'taxi', 'cab', 'shuttle', 'ride'], icon: CarTaxiFront },
    { match: ['ferry', 'boat', 'cruise', 'ship', 'speedboat', 'water'], icon: Ship },
    { match: ['flight', 'plane', 'jet', 'helicopter', 'seaplane'], icon: Plane }
]

const resolveSlotIcon = (slot: ItineraryTransportSlot): LucideIcon => {
    const key = `${slot.kind} ${slot.mode || ''}`.toLowerCase()
    return KIND_ICON_RULES.find((rule) => rule.match.some((m) => key.includes(m)))?.icon || Car
}

const slotLabel = (slot: ItineraryTransportSlot): string =>
    slot.mode || (slot.kind ? slot.kind.charAt(0).toUpperCase() + slot.kind.slice(1).replace(/[-_]/g, ' ') : 'Transport')

const LegRow: React.FC<{ slot: ItineraryTransportSlot; onAdd: () => void; onComplete: () => void }> = ({ slot, onAdd, onComplete }) => {
    const Icon = resolveSlotIcon(slot)
    // formatDate expects a date-only string; the itinerary date is a full
    // datetime ("…T00:00:00Z"), so pass just the YYYY-MM-DD part.
    const date = slot.date ? formatDate(slot.date.slice(0, 10)) : null
    const complete = isLegComplete(slot)
    const missing = legMissingFields(slot)

    return (
        <div className="rounded-[12px] border border-border-subtle bg-white overflow-hidden">
            <div className="flex items-center gap-3 p-3">
                <span className="w-9 h-9 rounded-[10px] bg-surface-sunken flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-grey-1" />
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                    {slot.from && slot.to ? (
                        <span className="flex items-center gap-1.5 min-w-0">
                            <span className="font-red-hat-display text-[14px] font-semibold tracking-[-0.28px] leading-[18px] text-grey-0 truncate">{slot.from}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-grey-2 shrink-0" />
                            <span className="font-red-hat-display text-[14px] font-semibold tracking-[-0.28px] leading-[18px] text-grey-0 truncate">{slot.to}</span>
                        </span>
                    ) : (
                        <span className="font-red-hat-display text-[14px] font-semibold tracking-[-0.28px] leading-[18px] text-grey-0 truncate">{slot.title}</span>
                    )}
                    <span className="flex items-center gap-1.5 font-manrope text-[12px] font-semibold tracking-[-0.24px] leading-4 text-grey-2 truncate">
                        {slotLabel(slot)}
                        {date && (
                            <>
                                <span className="text-grey-3">·</span>
                                {date}
                            </>
                        )}
                        {slot.cityName && (
                            <>
                                <span className="text-grey-3">·</span>
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{slot.cityName}</span>
                            </>
                        )}
                    </span>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border-subtle px-3 py-2.5">
                {/* Provider / completeness signal */}
                {slot.provider ? (
                    <ProviderIdentity logoUrl={slot.provider.logoUrl} name={slot.provider.name} faviconUrl={slot.provider.faviconUrl} />
                ) : (
                    <span className="font-manrope text-[12px] font-medium tracking-[-0.24px] text-grey-2">No booking link</span>
                )}

                {/* Action — direct Add when complete, else Complete & add */}
                {complete ? (
                    <button
                        type="button"
                        onClick={onAdd}
                        className="flex items-center gap-1 rounded-full bg-grey-0 px-3 py-1.5 font-red-hat-display text-[12px] font-bold tracking-[-0.24px] text-white hover:opacity-90 transition-opacity cursor-pointer shrink-0">
                        <Plus className="w-3.5 h-3.5" />
                        Add
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onComplete}
                        title={`Missing ${missing.join(', ')}`}
                        className="flex items-center gap-1 rounded-full border border-primary-default bg-white px-3 py-1.5 font-red-hat-display text-[12px] font-bold tracking-[-0.24px] text-primary-default hover:bg-primary-pale-purple transition-colors cursor-pointer shrink-0">
                        <Pencil className="w-3.5 h-3.5" />
                        Complete &amp; add
                    </button>
                )}
            </div>
        </div>
    )
}

/**
 * The itinerary's own transport legs (non-flight) rendered inside the curated
 * Transport section for internal users. Each leg can be promoted into a curated
 * Transport booking: complete legs add directly, incomplete ones open the
 * prefilled editor so the missing fields (link / price / title) can be filled.
 */
export const ItineraryTransportLegs: React.FC<ItineraryTransportLegsProps> = ({ slots, onAdd, onComplete }) => {
    if (!slots.length) return null

    return (
        <div className="flex flex-col gap-3">
            <span className="font-manrope text-[12px] font-bold uppercase tracking-[0.4px] text-grey-2">From the itinerary</span>
            {slots.map((slot) => (
                <LegRow
                    key={slot.slot_id}
                    slot={slot}
                    onAdd={() => onAdd(slot)}
                    onComplete={() => onComplete(slot)}
                />
            ))}
        </div>
    )
}
