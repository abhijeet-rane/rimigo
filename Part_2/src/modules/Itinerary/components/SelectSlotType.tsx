import React, { useEffect, useState } from 'react'
import { SLOT_TYPES, SlotType } from '../types/slotTypes'
import DropdownSection from './DropDownSection'
import { Utensils, Sparkles, MapPin, PenTool, TrainFront } from 'lucide-react'
import AddSlotLabel from './AddSlotLabel'

interface Props {
    defaultType?: SlotType
    onChange?: (type: SlotType) => void
    isopen: boolean
    onOpenChange?: (open: boolean) => void
}

// Icon mapping for each slot type. Transport shows a train silhouette
// as the generic marker; the specific mode (Shinkansen, Metro, Taxi,
// etc.) is picked later via TransportModeDropdown.
const getIcon = (value: string) => {
    const iconClass = 'w-4 h-4'
    switch (value) {
        case 'meal':
            return <Utensils className={iconClass} />
        case 'transport':
            return <TrainFront className={iconClass} />
        case 'experience':
            return <Sparkles className={iconClass} />
        case 'restaurant':
            return <MapPin className={iconClass} />
        case 'custom':
            return <PenTool className={iconClass} />
        default:
            return <Sparkles className={iconClass} />
    }
}

const SelectSlotType: React.FC<Props> = ({ defaultType, onChange, isopen, onOpenChange }) => {
    const [selectedType, setSelectedType] = useState<SlotType | null>(defaultType ?? null)
    const [open, setOpen] = useState(isopen)

    // ✅ Sync parent → child
    useEffect(() => {
        setOpen(isopen)
    }, [isopen])

    useEffect(() => {
        if (defaultType) {
            setSelectedType(defaultType)
        }
    }, [defaultType])

    const handleSelect = (type: SlotType) => {
        setSelectedType(type)
        onChange?.(type)
        setOpen(false)
        onOpenChange?.(false) // Notify parent
    }

    return (
        <DropdownSection
            title="What are you doing?"
            defaultOpen={open}
            onOpenChange={setOpen}
            selectedContent={
                selectedType ? (
                    <div className="flex items-center gap-2">
                        <div className="text-primary-default">{getIcon(selectedType.value)}</div>
                        <AddSlotLabel text={selectedType.label} />
                    </div>
                ) : null
            }>
            <div className="py-2">
                {' '}
                <AddSlotLabel text={'Please choose an option'} />
            </div>

            <div className="flex flex-row gap-1 overflow-x-auto scrollbar-hide">
                {SLOT_TYPES.map((type) => {
                    const isSelected = selectedType?.value === type.value
                    return (
                        <div
                            key={type.value}
                            onClick={() => handleSelect(type)}
                            className={`
                                flex items-center justify-between gap-3 px-2 py-1.5 rounded-sm
                                cursor-pointer transition-all duration-150 shrink-0
                                ${
                                    isSelected
                                        ? 'bg-primary-default/10 border border-primary-default'
                                        : 'bg-white border border-transparent hover:bg-grey-5'
                                }
                            `}>
                            {/* Icon */}
                            <div className="flex flex-row gap-3 items-center">
                                {' '}
                                <div
                                    className={`
                                    p-1 rounded-full transition-colors flex-shrink-0
                                    ${isSelected ? ' text-primary-default' : ' text-grey-0'}
                                `}>
                                    {getIcon(type.value)}
                                </div>
                                <AddSlotLabel text={type.label} />
                            </div>

                            {/* Label */}

                            {/* Check mark for selected */}
                            {isSelected && (
                                <svg
                                    className="w-5 h-5 text-primary-default flex-shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2.5}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            )}
                        </div>
                    )
                })}
            </div>
        </DropdownSection>
    )
}

export default SelectSlotType
