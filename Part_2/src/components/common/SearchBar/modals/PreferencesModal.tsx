import { Search } from 'lucide-react'
import { useState, useEffect } from 'react'
import { PriceRangeSlider } from '@/pages/Stays/Components/PriceRangeSlider'

export interface GroupType {
    key: string
    value: string
    label: string
    image: string
}

export interface PurposeType {
    key: string
    value: string
    label: string
    image: string
}

export interface LocationPreference {
    key: string
    value: string
    label: string
    icon: string
    imageUrl?: string
}

export interface BudgetMetadata {
    bucket_size: number
    buckets: Array<{ min: number; max: number; count: number }>
    total_hotels: number
    min_rate: number
    max_rate: number
    check_in_date: string
    check_out_date: string
    status: 'processing' | 'in_progress' | 'completed' | 'failed' | 'timeout' | 'estimated'
}

export interface BudgetConfig {
    enabled: boolean
    metadata?: BudgetMetadata
    initialPriceRange?: { min: number; max: number }
}

// Default budget metadata for initial display (1k - 5 lakh)
const DEFAULT_BUDGET_METADATA: BudgetMetadata = {
    bucket_size: 5000,
    buckets: [
        {
            min: 1000,
            max: 6000,
            count: 6
        },
        {
            min: 6000,
            max: 11000,
            count: 6
        },
        {
            min: 11000,
            max: 16000,
            count: 6
        },
        {
            min: 16000,
            max: 21000,
            count: 6
        },
        {
            min: 21000,
            max: 26000,
            count: 6
        },
        {
            min: 26000,
            max: 31000,
            count: 5
        },
        {
            min: 31000,
            max: 36000,
            count: 5
        },
        {
            min: 36000,
            max: 41000,
            count: 5
        },
        {
            min: 41000,
            max: 46000,
            count: 5
        },
        {
            min: 46000,
            max: 51000,
            count: 5
        },
        {
            min: 51000,
            max: 56000,
            count: 5
        },
        {
            min: 56000,
            max: 61000,
            count: 5
        },
        {
            min: 61000,
            max: 66000,
            count: 5
        },
        {
            min: 66000,
            max: 71000,
            count: 5
        },
        {
            min: 71000,
            max: 76000,
            count: 5
        },
        {
            min: 76000,
            max: 81000,
            count: 5
        },
        {
            min: 81000,
            max: 86000,
            count: 5
        },
        {
            min: 86000,
            max: 91000,
            count: 5
        },
        {
            min: 91000,
            max: 96000,
            count: 5
        },
        {
            min: 96000,
            max: 101000,
            count: 3
        },
        {
            min: 101000,
            max: 106000,
            count: 3
        },
        {
            min: 106000,
            max: 111000,
            count: 3
        },
        {
            min: 111000,
            max: 116000,
            count: 3
        },
        {
            min: 116000,
            max: 121000,
            count: 3
        },
        {
            min: 121000,
            max: 126000,
            count: 3
        },
        {
            min: 126000,
            max: 131000,
            count: 3
        },
        {
            min: 131000,
            max: 136000,
            count: 3
        },
        {
            min: 136000,
            max: 141000,
            count: 3
        },
        {
            min: 141000,
            max: 146000,
            count: 3
        },
        {
            min: 146000,
            max: 151000,
            count: 3
        },
        {
            min: 151000,
            max: 156000,
            count: 3
        },
        {
            min: 156000,
            max: 161000,
            count: 3
        },
        {
            min: 161000,
            max: 166000,
            count: 3
        },
        {
            min: 166000,
            max: 171000,
            count: 3
        },
        {
            min: 171000,
            max: 176000,
            count: 2
        },
        {
            min: 176000,
            max: 181000,
            count: 2
        },
        {
            min: 181000,
            max: 186000,
            count: 2
        },
        {
            min: 186000,
            max: 191000,
            count: 2
        },
        {
            min: 191000,
            max: 196000,
            count: 2
        },
        {
            min: 196000,
            max: 201000,
            count: 2
        },
        {
            min: 201000,
            max: 206000,
            count: 2
        },
        {
            min: 206000,
            max: 211000,
            count: 2
        },
        {
            min: 211000,
            max: 216000,
            count: 2
        },
        {
            min: 216000,
            max: 221000,
            count: 2
        },
        {
            min: 221000,
            max: 226000,
            count: 2
        },
        {
            min: 226000,
            max: 231000,
            count: 2
        },
        {
            min: 231000,
            max: 236000,
            count: 2
        },
        {
            min: 236000,
            max: 241000,
            count: 2
        },
        {
            min: 241000,
            max: 246000,
            count: 2
        },
        {
            min: 246000,
            max: 251000,
            count: 2
        },
        {
            min: 251000,
            max: 256000,
            count: 2
        },
        {
            min: 256000,
            max: 261000,
            count: 2
        },
        {
            min: 261000,
            max: 266000,
            count: 2
        },
        {
            min: 266000,
            max: 271000,
            count: 2
        },
        {
            min: 271000,
            max: 276000,
            count: 2
        },
        {
            min: 276000,
            max: 281000,
            count: 2
        },
        {
            min: 281000,
            max: 286000,
            count: 2
        },
        {
            min: 286000,
            max: 291000,
            count: 2
        },
        {
            min: 291000,
            max: 296000,
            count: 2
        },
        {
            min: 296000,
            max: 301000,
            count: 2
        },
        {
            min: 301000,
            max: 306000,
            count: 2
        },
        {
            min: 306000,
            max: 311000,
            count: 2
        },
        {
            min: 311000,
            max: 316000,
            count: 2
        },
        {
            min: 316000,
            max: 321000,
            count: 2
        },
        {
            min: 321000,
            max: 326000,
            count: 2
        },
        {
            min: 326000,
            max: 331000,
            count: 2
        },
        {
            min: 331000,
            max: 336000,
            count: 2
        },
        {
            min: 336000,
            max: 341000,
            count: 2
        },
        {
            min: 341000,
            max: 346000,
            count: 2
        },
        {
            min: 346000,
            max: 351000,
            count: 1
        },
        {
            min: 351000,
            max: 356000,
            count: 1
        },
        {
            min: 356000,
            max: 361000,
            count: 1
        },
        {
            min: 361000,
            max: 366000,
            count: 1
        },
        {
            min: 366000,
            max: 371000,
            count: 1
        },
        {
            min: 371000,
            max: 376000,
            count: 1
        },
        {
            min: 376000,
            max: 381000,
            count: 1
        },
        {
            min: 381000,
            max: 386000,
            count: 1
        },
        {
            min: 386000,
            max: 391000,
            count: 1
        },
        {
            min: 391000,
            max: 396000,
            count: 1
        },
        {
            min: 396000,
            max: 401000,
            count: 2
        },
        {
            min: 401000,
            max: 406000,
            count: 2
        },
        {
            min: 406000,
            max: 411000,
            count: 2
        },
        {
            min: 411000,
            max: 416000,
            count: 2
        },
        {
            min: 416000,
            max: 421000,
            count: 1
        },
        {
            min: 421000,
            max: 426000,
            count: 1
        },
        {
            min: 426000,
            max: 431000,
            count: 1
        },
        {
            min: 431000,
            max: 436000,
            count: 1
        },
        {
            min: 436000,
            max: 441000,
            count: 1
        },
        {
            min: 441000,
            max: 446000,
            count: 1
        },
        {
            min: 446000,
            max: 451000,
            count: 1
        },
        {
            min: 451000,
            max: 456000,
            count: 1
        },
        {
            min: 456000,
            max: 461000,
            count: 1
        },
        {
            min: 461000,
            max: 466000,
            count: 1
        },
        {
            min: 466000,
            max: 471000,
            count: 1
        },
        {
            min: 471000,
            max: 476000,
            count: 1
        },
        {
            min: 476000,
            max: 481000,
            count: 1
        },
        {
            min: 481000,
            max: 486000,
            count: 1
        },
        {
            min: 486000,
            max: 491000,
            count: 1
        },
        {
            min: 491000,
            max: 496000,
            count: 1
        },
        {
            min: 496000,
            max: 500000,
            count: 1
        }
    ],
    total_hotels: 250,
    min_rate: 1000,
    max_rate: 500000,
    check_in_date: '',
    check_out_date: '',
    status: 'completed'
}

// Preferences data
export const DEFAULT_GROUP_TYPES: GroupType[] = [
    { key: 'couple', value: 'couple', label: 'Couple', image: '/illustrations/group types/couple.png' },
    {
        key: 'couple_with_children',
        value: 'couple_with_children',
        label: 'Couple with Children',
        image: '/illustrations/group types/couple_w_children.png'
    },
    { key: 'friends_group', value: 'friends_group', label: 'Friends Group', image: '/illustrations/group types/friends.png' },
    { key: 'immediate_family', value: 'immediate_family', label: 'Family', image: '/illustrations/group types/immediate_family.png' },
    { key: 'solo_traveler', value: 'solo_traveler', label: 'Solo Traveler', image: '/illustrations/group types/solo.png' }
]

export const DEFAULT_PURPOSE_TYPES: PurposeType[] = [
    { key: 'leisure_relaxation', value: 'leisure_relaxation', label: 'Leisure & Relaxation', image: '/illustrations/purpose/leisure.png' },
    { key: 'family_vacation', value: 'family_vacation', label: 'Family Vacation', image: '/illustrations/purpose/family_vacation.png' },
    { key: 'honeymoon', value: 'honeymoon', label: 'Honeymoon', image: '/illustrations/purpose/honeymoon.png' },
    { key: 'anniversary_trip', value: 'anniversary_trip', label: 'Anniversary Trip', image: '/illustrations/purpose/anniversary.png' },
    { key: 'birthday_celebration', value: 'birthday_celebration', label: 'Birthday Celebration', image: '/illustrations/purpose/birthday.png' },
    { key: 'solo_escape', value: 'solo_escape', label: 'Solo Escape', image: '/illustrations/purpose/solo_escape.png' }
]

export const DEFAULT_LOCATION_PREFERENCES: LocationPreference[] = [
    { key: 'station_nearby', value: 'station_nearby', label: 'Near Station', icon: '🚇' },
    { key: 'city_center', value: 'city_center', label: 'City Center', icon: '🏙️' },
    { key: 'nightlife', value: 'nightlife', label: 'Nightlife', icon: '🌃' },
    { key: 'restaurant_nearby', value: 'restaurant_nearby', label: 'Restaurants', icon: '🍽️' },
    { key: 'indian_restaurant_nearby', value: 'indian_restaurant_nearby', label: 'Indian Food', icon: '🍛' },
    { key: 'perfect_area', value: 'perfect_area', label: 'Perfect Area', icon: '⭐' },
    { key: 'near_domestic_airport', value: 'near_domestic_airport', label: 'Near Domestic Airport', icon: '✈️' },
    { key: 'near_international_airport', value: 'near_international_airport', label: 'Near International Airport', icon: '🛫' },
    { key: 'supermarkets_nearby', value: 'supermarkets_nearby', label: 'Supermarkets', icon: '🛒' },
    { key: 'check_in_window', value: 'check_in_window', label: 'Check-in Window', icon: '🕐' },
    { key: 'shuttle_service', value: 'shuttle_service', label: 'Shuttle Service', icon: '🚐' },
    { key: 'parking_available', value: 'parking_available', label: 'Parking', icon: '🅿️' },
    { key: 'great_view', value: 'great_view', label: 'Great View', icon: '🌅' }
]

interface PreferencesModalProps {
    isOpen: boolean
    onClose: () => void
    groupTypes: GroupType[]
    purposeTypes: PurposeType[]
    locationPreferences: LocationPreference[]
    selectedGroupType: string
    selectedPurposeType: string
    selectedLocationPreferences: string[]
    onGroupTypeSelect: (value: string) => void
    onPurposeTypeSelect: (value: string) => void
    onLocationPreferenceToggle: (value: string) => void
    onSearch: () => void
    selectionLimit?: number | null
    budgetConfig?: BudgetConfig
    selectedPriceRange?: { min: number; max: number }
    onPriceRangeChange?: (priceRange: { min: number; max: number } | undefined) => void
}

export const PreferencesModal = ({
    isOpen,
    onClose,
    groupTypes,
    purposeTypes,
    locationPreferences,
    selectedGroupType,
    selectedPurposeType,
    selectedLocationPreferences,
    onGroupTypeSelect,
    onPurposeTypeSelect,
    onLocationPreferenceToggle,
    onSearch,
    selectionLimit,
    budgetConfig,
    selectedPriceRange,
    onPriceRangeChange
}: PreferencesModalProps) => {
    // Local state for price range (only updates parent on search click, not on slider change)
    const [localPriceRange, setLocalPriceRange] = useState<{ min: number; max: number } | undefined>(selectedPriceRange)

    // Sync local price range when modal opens or selectedPriceRange changes from parent
    useEffect(() => {
        if (isOpen) {
            setLocalPriceRange(selectedPriceRange)
        }
    }, [isOpen, selectedPriceRange])

    if (!isOpen) return null

    const limitEnabled = typeof selectionLimit === 'number' && selectionLimit > 0
    const limitDisplay = limitEnabled ? `${selectedLocationPreferences.length}/${selectionLimit}` : `${selectedLocationPreferences.length}`
    const isBudgetEnabled = budgetConfig?.enabled === true

    // Determine which budget data to use
    // Use actual metadata if available and completed, otherwise use default (1k-5 lakh)
    // This allows users to interact with price range immediately, even while histogram is loading
    const budgetData = (() => {
        if (budgetConfig?.metadata?.status === 'completed') {
            // Use actual completed data
            return budgetConfig.metadata
        }
        // Use default data (1k-5 lakh) when:
        // - No metadata exists yet
        // - Metadata is still loading/processing
        // - Metadata failed to load
        return DEFAULT_BUDGET_METADATA
    })()

    // Always show the slider (never show loading spinner)
    // Default data allows immediate interaction while histogram loads
    const isLoading = false

    // Handle search - apply all preferences including price range
    const handleSearch = () => {
        // Update parent with current local price range before searching
        // Always sync (even if undefined) so parent state matches modal state
        if (onPriceRangeChange) {
            onPriceRangeChange(localPriceRange)
        }
        // Call onSearch immediately - parent will read the updated priceRange from state
        onSearch()
    }

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-transparent z-40"
                onClick={onClose}
            />
            <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full left-1/2 transform  -translate-x-1/2 mt-2 w-[80%] md:w-[600px] z-50">
                <div className="bg-white border border-feature-card-border rounded-lg shadow-lg max-h-[85vh] flex flex-col">
                    <div className="p-6 overflow-y-auto scrollbar-hide flex-1">
                        <h2 className="text-xl font-semibold text-header-black mb-6">Preferences</h2>

                        {/* Budget Section */}
                        {isBudgetEnabled && (
                            <>
                                <div className="mb-8">
                                    <h3 className="text-lg font-medium text-header-black mb-4">Price per night</h3>
                                    <PriceRangeSlider
                                        data={budgetData as any}
                                        loading={isLoading}
                                        initialMin={localPriceRange?.min}
                                        initialMax={localPriceRange?.max}
                                        onPriceChange={(min, max) => {
                                            const nextRange = { min, max }
                                            setLocalPriceRange(nextRange)
                                            onPriceRangeChange?.(nextRange)
                                        }}
                                    />
                                </div>
                                {/* Divider */}
                                <div className="h-px w-full bg-feature-card-border mb-8" />
                            </>
                        )}

                        {/* Location Preferences Section - Only show if locationPreferences has items */}
                        {locationPreferences && locationPreferences.length > 0 && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-header-black">Location Preferences</h3>
                                    <span className="text-xs text-grey_2">{limitDisplay}</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {locationPreferences.map((preference) => {
                                        const isSelected = selectedLocationPreferences.includes(preference.value)
                                        const isDisabled = !isSelected && limitEnabled && selectedLocationPreferences.length >= (selectionLimit ?? 0)

                                        return (
                                            <button
                                                key={preference.key}
                                                onClick={() => onLocationPreferenceToggle(preference.value)}
                                                disabled={isDisabled}
                                                className={`px-3 py-2 rounded-full border transition-colors inline-flex items-center gap-2 ${
                                                    isSelected
                                                        ? 'border-primary-default bg-primary-default-80 cursor-pointer'
                                                        : isDisabled
                                                          ? 'border-grey-2 bg-grey-5 opacity-40 cursor-not-allowed'
                                                          : 'border-grey-2 hover:border-grey-3 hover:bg-grey-5 cursor-pointer'
                                                }`}>
                                                {preference.imageUrl ? (
                                                    <img
                                                        src={preference.imageUrl}
                                                        alt={preference.label}
                                                        className="h-5 w-5 object-contain"
                                                    />
                                                ) : (
                                                    preference.icon && <span className="text-sm">{preference.icon}</span>
                                                )}
                                                {/* {preference.icon && <span className="text-sm">{preference.icon}</span>} */}
                                                <span className="text-sm font-medium text-header-black">{preference.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Group Types Section */}
                        <div className="mb-8">
                            <h3 className="text-lg font-medium text-header-black mb-4">Group Type</h3>
                            <div className="flex flex-wrap gap-2">
                                {groupTypes.map((group) => (
                                    <button
                                        key={group.key}
                                        onClick={() => onGroupTypeSelect(group.value)}
                                        className={`px-3 py-2 rounded-full border transition-colors inline-flex items-center gap-2 cursor-pointer ${
                                            selectedGroupType === group.value
                                                ? 'border-primary-default bg-primary-default-80'
                                                : 'border-grey-grey_2 hover:border-grey-grey_3 hover:bg-grey-grey_5'
                                        }`}>
                                        <img
                                            src={group.image}
                                            alt={group.label}
                                            className="h-5 w-5 object-contain"
                                        />
                                        <span className="text-sm font-medium text-header-black">{group.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Purpose Types Section */}
                        <div className="mb-8">
                            <h3 className="text-lg font-medium text-header-black mb-4">Travel Purpose</h3>
                            <div className="flex flex-wrap gap-2">
                                {purposeTypes.map((purpose) => (
                                    <button
                                        key={purpose.key}
                                        onClick={() => onPurposeTypeSelect(purpose.value)}
                                        className={`px-3 py-2 rounded-full border transition-colors inline-flex items-center gap-2 cursor-pointer ${
                                            selectedPurposeType === purpose.value
                                                ? 'border-primary-default bg-primary-default-80'
                                                : 'border-grey-grey_2 hover:border-grey-grey_3 hover:bg-grey-grey_5'
                                        }`}>
                                        <img
                                            src={purpose.image}
                                            alt={purpose.label}
                                            className="h-5 w-5 object-contain"
                                        />
                                        <span className="text-sm font-medium text-header-black">{purpose.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Search Button - Sticky at bottom */}
                    <div className="sticky bottom-0 bg-white border-t border-feature-card-border p-3 flex justify-end rounded-b-lg">
                        <button
                            onClick={handleSearch}
                            className="cursor-pointer h-10 px-4 flex items-center justify-center gap-2 bg-primary-default text-natural-white rounded-md hover:bg-primary-light transition-all duration-400">
                            <Search
                                className="h-5 w-5"
                                strokeWidth={2}
                            />
                            <div
                                className="font-red-hat-display text-natural-white"
                                style={{ fontWeight: 550, fontSize: '14px' }}>
                                Search
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
