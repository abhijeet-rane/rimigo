import React, { useState, useEffect } from 'react'
import { GroupType, PurposeType, LocationPreference, BudgetConfig } from './common/SearchBar/modals/PreferencesModal'
import MobileSearchExpandContent from './MobileSearchExpandContent'
import Typography from './shared/Typography'
import { PriceRangeSlider } from '@/pages/Stays/Components/PriceRangeSlider'

interface PreferencesSectionProps {
    groupTypes: GroupType[]
    purposeTypes: PurposeType[]
    locationPreferences?: LocationPreference[]
    selectedGroupType?: string
    selectedPurposeType?: string
    selectedLocationPreferences?: string[]
    onGroupTypeSelect: (value: string) => void
    onPurposeTypeSelect: (value: string) => void
    onLocationPreferenceToggle?: (value: string) => void
    onNext?: () => void
    selectionLimit?: number | null
    budgetConfig?: BudgetConfig
    selectedPriceRange?: { min: number; max: number }
    onPriceRangeChange?: (priceRange: { min: number; max: number } | undefined) => void
}

type OptionItem = {
    key: string
    value: string
    label: string
    image: string
}

const DEFAULT_BUDGET_METADATA = {
    bucket_size: 5000,
    buckets: [],
    total_hotels: 250,
    min_rate: 1000,
    max_rate: 500000,
    check_in_date: '',
    check_out_date: '',
    status: 'completed' as const
}

export const PreferencesSection: React.FC<PreferencesSectionProps> = ({
    groupTypes,
    purposeTypes,
    locationPreferences,
    selectedGroupType,
    selectedPurposeType,
    selectedLocationPreferences = [],
    onGroupTypeSelect,
    onPurposeTypeSelect,
    onLocationPreferenceToggle,
    onNext,
    selectionLimit = null,
    budgetConfig,
    selectedPriceRange,
    onPriceRangeChange
}) => {
    const [group, setGroup] = useState(selectedGroupType || '')
    const [purpose, setPurpose] = useState(selectedPurposeType || '')
    const [locationPrefs, setLocationPrefs] = useState<string[]>(selectedLocationPreferences)
    const [localPriceRange, setLocalPriceRange] = useState<{ min: number; max: number } | undefined>(selectedPriceRange)

    const limitEnabled = typeof selectionLimit === 'number' && selectionLimit > 0
    const isBudgetEnabled = budgetConfig?.enabled === true
    const showLocationPreferences = locationPreferences !== undefined && locationPreferences.length > 0

    const budgetData = budgetConfig?.metadata?.status === 'completed' ? budgetConfig.metadata : DEFAULT_BUDGET_METADATA

    useEffect(() => {
        setLocalPriceRange(selectedPriceRange)
    }, [selectedPriceRange])

    useEffect(() => {
        if (group && purpose) {
            onNext?.()
        }
    }, [group, purpose])

    const handleLocationPrefToggle = (value: string) => {
        const isSelected = locationPrefs.includes(value)
        let newPrefs: string[]

        if (isSelected) {
            newPrefs = locationPrefs.filter((item) => item !== value)
        } else {
            if (!limitEnabled || locationPrefs.length < (selectionLimit ?? 0)) {
                newPrefs = [...locationPrefs, value]
            } else {
                return
            }
        }

        setLocationPrefs(newPrefs)
        onLocationPreferenceToggle?.(value)
    }

    const renderOptions = (title: string, items: OptionItem[], selected: string, onSelect: (value: string) => void) => (
        <div className="px-2.5 pb-[24px] flex flex-col gap-3">
            <Typography
                size="14"
                weight="bold"
                family="manrope"
                color="grey-1">
                {title}
            </Typography>
            <div className="flex flex-wrap gap-3">
                {items.map((item) => {
                    const isSelected = selected === item.value
                    return (
                        <button
                            key={item.key}
                            onClick={() => onSelect(item.value)}
                            className={`p-2 px-3 rounded-[20px] border flex flex-row items-center gap-2 transition-all ${
                                isSelected ? 'border-primary-default bg-primary-default-08' : 'border-grey-4'
                            }`}>
                            <img
                                src={item.image}
                                alt={item.label}
                                className="w-4 h-4 object-contain"
                            />
                            <Typography
                                size="14"
                                weight="semibold"
                                family="manrope"
                                color="grey-0">
                                {item.label}
                            </Typography>
                        </button>
                    )
                })}
            </div>
        </div>
    )

    return (
        <MobileSearchExpandContent title="Select preferences">
            <div className="space-y-2">
                {isBudgetEnabled && (
                    <div className="px-2.5 pb-[24px] flex flex-col gap-3">
                        <Typography
                            size="14"
                            weight="bold"
                            family="manrope"
                            color="grey-1">
                            Price per night
                        </Typography>
                        <PriceRangeSlider
                            data={budgetData as any}
                            loading={false}
                            initialMin={localPriceRange?.min}
                            initialMax={localPriceRange?.max}
                            onPriceChange={(min, max) => {
                                const nextRange = { min, max }
                                setLocalPriceRange(nextRange)
                                onPriceRangeChange?.(nextRange)
                            }}
                        />
                    </div>
                )}

                {showLocationPreferences && (
                    <div className="px-2.5 pb-[24px] flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <Typography
                                size="14"
                                weight="bold"
                                family="manrope"
                                color="grey-1">
                                Location Preferences
                            </Typography>
                            {limitEnabled && (
                                <Typography
                                    size="12"
                                    weight="normal"
                                    family="manrope"
                                    color="grey-2">
                                    {locationPrefs.length}/{selectionLimit}
                                </Typography>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {locationPreferences.map((preference) => {
                                const isSelected = locationPrefs.includes(preference.value)
                                const isDisabled = !isSelected && limitEnabled && locationPrefs.length >= (selectionLimit ?? 0)

                                return (
                                    <button
                                        key={preference.key}
                                        onClick={() => !isDisabled && handleLocationPrefToggle(preference.value)}
                                        disabled={isDisabled}
                                        className={`px-3 py-2 rounded-full border transition-colors inline-flex items-center gap-2 ${
                                            isSelected
                                                ? 'border-primary-default bg-primary-default-08'
                                                : isDisabled
                                                  ? 'border-grey-4 bg-grey-5 opacity-40 cursor-not-allowed'
                                                  : 'border-grey-4'
                                        }`}>
                                        {preference.imageUrl ? (
                                            <img
                                                src={preference.imageUrl}
                                                alt={preference.label}
                                                className="h-4 w-4 object-contain"
                                            />
                                        ) : (
                                            preference.icon && <span className="text-sm">{preference.icon}</span>
                                        )}
                                        <Typography
                                            size="14"
                                            weight="semibold"
                                            family="manrope"
                                            color="grey-0">
                                            {preference.label}
                                        </Typography>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {renderOptions('Group Type', groupTypes, group, (value) => {
                    setGroup(value)
                    onGroupTypeSelect(value)
                })}

                {renderOptions('Travel Purpose', purposeTypes, purpose, (value) => {
                    setPurpose(value)
                    onPurposeTypeSelect(value)
                })}
            </div>
        </MobileSearchExpandContent>
    )
}
