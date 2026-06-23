import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { BadgeCheck, Zap, Star } from 'lucide-react'
import { getIconByAmenity } from '../../../Utils/iconMapping'
import { PriceRangeSlider } from '../../PriceRangeSlider'
import type { FilterContentProps } from '../types'
import type { StaysFilterMetadata, StaysFilterInitialData, StaysFilterResult } from './types'

export const StaysFilterContent = ({
    metadata,
    initialData,
    onChange
}: FilterContentProps<StaysFilterMetadata, StaysFilterInitialData, StaysFilterResult>) => {
    // State for selected values
    const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>(initialData?.selectedPropertyTypes || [])
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>(initialData?.selectedAmenities || [])
    const [selectedCities, setSelectedCities] = useState<string[]>(initialData?.selectedCities || [])
    const [selectedStarRatings, setSelectedStarRatings] = useState<number[]>(initialData?.selectedStarRatings || [])
    const [showAllAmenities, setShowAllAmenities] = useState(false)
    const [isVerifiedFilter, setIsVerifiedFilter] = useState<boolean | null>(initialData?.isVerified ?? null)
    const [isB2bFilter, setIsB2bFilter] = useState<boolean | null>(initialData?.isB2bDealAvailable ?? null)
    const [budgetRange, setBudgetRange] = useState<{ min: number; max: number } | undefined>(initialData?.budgetRange)

    // Notify parent of changes
    useEffect(() => {
        onChange({
            propertyTypes: selectedPropertyTypes,
            amenities: selectedAmenities,
            cities: selectedCities,
            starRatings: selectedStarRatings,
            isVerified: isVerifiedFilter,
            isB2bDealAvailable: isB2bFilter,
            budgetRange
        })
    }, [selectedPropertyTypes, selectedAmenities, selectedCities, selectedStarRatings, isVerifiedFilter, isB2bFilter, budgetRange, onChange])

    const handleStarRatingToggle = (rating: number) => {
        setSelectedStarRatings((prev) => (prev.includes(rating) ? prev.filter((r) => r !== rating) : [...prev, rating]))
    }

    const handlePropertyTypeToggle = (typeId: string) => {
        setSelectedPropertyTypes((prev) => (prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]))
    }

    const handleAmenityToggle = (amenityId: string) => {
        setSelectedAmenities((prev) => (prev.includes(amenityId) ? prev.filter((id) => id !== amenityId) : [...prev, amenityId]))
    }

    const handleCityToggle = (cityId: string) => {
        setSelectedCities((prev) => (prev.includes(cityId) ? prev.filter((id) => id !== cityId) : [...prev, cityId]))
    }

    // Combine all amenities from metadata
    const allAmenities = metadata?.amenities
        ? [
              ...metadata.amenities.primary,
              ...metadata.amenities.essentials,
              ...metadata.amenities.features,
              ...metadata.amenities.location,
              ...metadata.amenities.services
          ]
        : []

    // Display logic
    const displayedAmenities = showAllAmenities ? allAmenities : metadata?.amenities?.primary.slice(0, 6) || []

    const totalAmenitiesCount = allAmenities.length
    const primaryCount = metadata?.amenities?.primary.length || 0

    const showBudget = metadata?.priceHistogram !== undefined || metadata?.priceHistogramLoading

    return (
        <div className="px-6 py-4">
            {/* Budget — single price range slider for the current city */}
            {showBudget && (
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-grey-grey_0 mb-4">Budget</h3>
                    <PriceRangeSlider
                        data={metadata?.priceHistogram}
                        loading={!!metadata?.priceHistogramLoading || !metadata?.priceHistogram}
                        initialMin={budgetRange?.min}
                        initialMax={budgetRange?.max}
                        onPriceChange={(min, max) => setBudgetRange({ min, max })}
                    />
                </div>
            )}

            {/* Divider after Budget */}
            {showBudget && (metadata?.showVerificationFilters || (metadata?.propertyTypes && metadata.propertyTypes.length > 0)) && (
                <div className="h-px w-full bg-feature-card-border mb-8" />
            )}

            {/* Verification Filters — internal users only */}
            {metadata?.showVerificationFilters && (
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-grey-grey_0 mb-4">Stay Status</h3>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setIsVerifiedFilter(isVerifiedFilter === true ? null : true)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-manrope font-medium transition-all cursor-pointer border',
                                isVerifiedFilter === true
                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                                    : 'bg-white border-grey-4 text-grey-1 hover:bg-grey-5'
                            )}>
                            <BadgeCheck className="w-3.5 h-3.5" />
                            Verified
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsB2bFilter(isB2bFilter === true ? null : true)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-manrope font-medium transition-all cursor-pointer border',
                                isB2bFilter === true
                                    ? 'bg-violet-50 border-violet-400 text-violet-700'
                                    : 'bg-white border-grey-4 text-grey-1 hover:bg-grey-5'
                            )}>
                            <Zap className="w-3.5 h-3.5" />
                            B2B Deals
                        </button>
                    </div>
                </div>
            )}
            {/* Property Types Section */}
            {metadata?.propertyTypes && metadata.propertyTypes.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-grey-grey_0 mb-4">Property Type</h3>
                    <div className="grid grid-cols-4 gap-4">
                        {metadata.propertyTypes.map((type) => {
                            const isSelected = selectedPropertyTypes.includes(type.id)
                            return (
                                <div
                                    key={type.id}
                                    className="flex flex-col items-center gap-2">
                                    <button
                                        onClick={() => handlePropertyTypeToggle(type.id)}
                                        className={cn(
                                            'relative w-full aspect-square p-3 rounded-lg transition-all cursor-pointer flex items-center justify-center',
                                            isSelected
                                                ? 'border border-primary-default bg-primary-default-80'
                                                : 'border border-feature-card-border hover:border-grey-grey_2'
                                        )}>
                                        <img
                                            src={type.icon_url}
                                            alt={type.label}
                                            className="w-12 h-12 object-contain"
                                        />
                                    </button>
                                    <span className={cn('text-sm font-medium text-center', isSelected ? 'text-primary-default' : 'text-grey-grey_1')}>
                                        {type.label}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Divider */}
            {metadata?.propertyTypes && metadata.propertyTypes.length > 0 && (metadata?.amenities && totalAmenitiesCount > 0 || metadata?.cities && metadata.cities.length > 0) && (
                <div className="h-px w-full bg-feature-card-border mb-8" />
            )}

            {/* Amenities Section */}
            {metadata?.amenities && totalAmenitiesCount > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-grey-grey_0 mb-4">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                        {displayedAmenities.map((amenity) => {
                            const isSelected = selectedAmenities.includes(amenity.unique_id)
                            const icon = getIconByAmenity(amenity.unique_id)

                            return (
                                <button
                                    key={amenity.unique_id}
                                    onClick={() => handleAmenityToggle(amenity.unique_id)}
                                    className={cn(
                                        'flex items-center gap-2 px-4 py-2 border rounded-full transition-all cursor-pointer',
                                        isSelected
                                            ? 'border-primary-default bg-primary-default-80 text-primary-default'
                                            : 'border-feature-card-border text-grey-grey_1 hover:border-grey-grey_2'
                                    )}>
                                    {icon && <span className="shrink-0">{icon}</span>}
                                    <span className="text-sm font-medium">{amenity.label}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* See More Button */}
                    {primaryCount > 6 && (
                        <button
                            onClick={() => setShowAllAmenities(!showAllAmenities)}
                            className="mt-4 text-sm font-medium text-primary-default hover:text-primary-default_80 transition-colors">
                            {showAllAmenities ? 'See less' : `See more (${totalAmenitiesCount - 6} more)`}
                        </button>
                    )}
                </div>
            )}

            {/* Divider before Rating */}
            {metadata?.showStarRatings && metadata?.amenities && totalAmenitiesCount > 0 && (
                <div className="h-px w-full bg-feature-card-border mb-8" />
            )}

            {/* Star Rating Section */}
            {metadata?.showStarRatings && (
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-grey-grey_0 mb-4">Rating</h3>
                    <div className="flex flex-wrap gap-2">
                        {[3, 4, 5].map((rating) => {
                            const isSelected = selectedStarRatings.includes(rating)
                            return (
                                <button
                                    key={rating}
                                    type="button"
                                    onClick={() => handleStarRatingToggle(rating)}
                                    className={cn(
                                        'flex items-center gap-1.5 px-4 py-2 border rounded-full transition-all cursor-pointer',
                                        isSelected
                                            ? 'border-primary-default bg-primary-default-80 text-primary-default'
                                            : 'border-feature-card-border text-grey-grey_1 hover:border-grey-grey_2'
                                    )}>
                                    <Star
                                        className="w-4 h-4"
                                        fill={isSelected ? 'currentColor' : 'none'}
                                        stroke="currentColor"
                                    />
                                    <span className="text-sm font-medium">{rating}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Divider */}
            {metadata?.amenities && totalAmenitiesCount > 0 && metadata?.cities && metadata.cities.length > 0 && (
                <div className="h-px w-full bg-feature-card-border mb-8" />
            )}

            {/* Cities Section */}
            {metadata?.cities && metadata.cities.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-grey-grey_0 mb-4">City</h3>
                    <div className="flex flex-wrap gap-2">
                        {metadata.cities.map((city) => {
                            const isSelected = selectedCities.includes(city.id)
                            return (
                                <button
                                    key={city.id}
                                    onClick={() => handleCityToggle(city.id)}
                                    className={cn(
                                        'flex items-center gap-2 px-4 py-2 border rounded-full transition-all cursor-pointer',
                                        isSelected
                                            ? 'border-primary-default bg-primary-default-80 text-primary-default'
                                            : 'border-feature-card-border text-grey-grey_1 hover:border-grey-grey_2'
                                    )}>
                                    <span className="text-sm font-medium">{city.name}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
