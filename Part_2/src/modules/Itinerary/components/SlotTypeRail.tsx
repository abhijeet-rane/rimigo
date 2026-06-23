/**
 * Left rail of the redesigned Add to Itinerary composer.
 *
 * Replaces the accordion ``SelectSlotType`` dropdown. Four slot-type
 * pills are always visible with icon + label + hint; selection is one
 * click. Below the picker, a "Rimigo suggests" nudge card carries the
 * product's AI-assistant voice. Color tokens come from the design
 * system (``colors_and_type.css``).
 */
import { TrainFront, Utensils, Sparkles, PenTool, Check, MapPin } from 'lucide-react'
import { SLOT_TYPES, SlotType } from '../types/slotTypes'
import type { LucideIcon } from 'lucide-react'

interface Props {
    selected: SlotType
    onChange: (type: SlotType) => void
}

interface SlotTypeStyle {
    icon: LucideIcon
    color: string // solid accent hex
    bg: string    // pale tinted bg for the active pill
    hint: string
}

// Visual tokens for each slot type. Colors match the design system:
//   Activity  — Rimigo indigo (#7011F6)
//   Transport — info blue     (#1588CF)
//   Meal      — secondary orange (#E55A34)
//   Other     — neutral greys
const TYPE_STYLES: Record<SlotType['value'], SlotTypeStyle> = {
    experience: {
        icon: Sparkles,
        color: '#7011F6',
        bg: '#F5EDFF',
        hint: 'Temples, tours, tickets',
    },
    transport: {
        icon: TrainFront,
        color: '#1588CF',
        bg: '#E8F4FB',
        hint: 'Flight, train, taxi',
    },
    meal: {
        icon: Utensils,
        color: '#E55A34',
        bg: '#FDECE5',
        hint: 'Breakfast, lunch, dinner',
    },
    place: {
        icon: MapPin,
        color: '#7011F6',
        bg: '#F5EDFF',
        hint: 'Beach, mountain, park, temple',
    },
    custom: {
        icon: PenTool,
        color: '#363636',
        bg: '#F8F8F8',
        hint: 'Custom block',
    },
    // ``restaurant`` is not exposed in the picker — kept for type-compatibility.
    restaurant: {
        icon: Utensils,
        color: '#E55A34',
        bg: '#FDECE5',
        hint: 'Specific restaurant',
    },
}

const SlotTypeRail = ({ selected, onChange }: Props) => {
    return (
        <aside
            // Desktop: fixed 240px wide left rail. Mobile: full-width
            // horizontal chip row pinned below the header with horizontal
            // scroll so the five type chips stay tappable at narrow
            // widths. The "What are you doing?" eyebrow drops on mobile
            // — the chips themselves communicate purpose, and the
            // header already says "Add to itinerary" / "Edit slot".
            className="w-full md:w-[240px] shrink-0 bg-grey-5 border-b md:border-b-0 md:border-r border-grey-4 p-3 md:p-5 flex flex-row md:flex-col gap-2 md:gap-[18px] overflow-x-auto md:overflow-y-auto"
            style={{ minHeight: 0, scrollbarWidth: 'thin' }}>
            <div className="hidden md:block">
                <div
                    className="text-[11px] font-semibold uppercase mb-2 text-grey-2"
                    style={{ fontFamily: "'Red Hat Display', sans-serif", letterSpacing: '0.1em' }}>
                    What are you doing?
                </div>
            </div>
            <div className="flex flex-row md:flex-col gap-2 md:gap-1 w-max md:w-auto">
                {SLOT_TYPES.map((t) => {
                    const style = TYPE_STYLES[t.value]
                    const isActive = selected.value === t.value
                    const Icon = style.icon
                    return (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => onChange(t)}
                            // Mobile: compact chip — icon tile + label only.
                            // Desktop: full pill with icon + label + hint + check.
                            className="flex items-center gap-2 md:gap-3 px-3 md:px-[14px] py-2 md:py-3 rounded-full md:rounded-[14px] transition-all cursor-pointer text-left shrink-0"
                            style={{
                                background: isActive ? style.bg : '#ffffff',
                                border: `1.5px solid ${isActive ? style.color : '#E8E8E8'}`,
                            }}>
                            <div
                                className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-[10px] grid place-items-center shrink-0"
                                style={{
                                    background: isActive ? '#ffffff' : '#F8F8F8',
                                    color: isActive ? style.color : '#747474',
                                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                                }}>
                                <Icon size={15} strokeWidth={2} className="md:!w-[18px] md:!h-[18px]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div
                                    className="text-[13px] md:text-[14px] text-grey-0 whitespace-nowrap md:whitespace-normal"
                                    style={{
                                        fontFamily: "'Red Hat Display', sans-serif",
                                        fontWeight: 700,
                                        letterSpacing: '-0.01em',
                                    }}>
                                    {t.label}
                                </div>
                                {/* Hint hidden on mobile — chip row is already tight. */}
                                <div
                                    className="hidden md:block text-[11px] text-grey-2 mt-[1px] truncate"
                                    style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 500 }}>
                                    {style.hint}
                                </div>
                            </div>
                            {/* Check badge only on desktop's vertical layout — the chip's
                                border + bg already signal selection on mobile. */}
                            {isActive && (
                                <div
                                    className="hidden md:grid w-5 h-5 rounded-full place-items-center shrink-0"
                                    style={{ background: style.color, color: '#ffffff' }}>
                                    <Check size={12} strokeWidth={2.5} />
                                </div>
                            )}
                        </button>
                    )
                })}
            </div>
        </aside>
    )
}

export default SlotTypeRail
