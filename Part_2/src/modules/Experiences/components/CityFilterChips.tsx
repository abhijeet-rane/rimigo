import React from 'react'
import { Badge } from '@/components/ui/badge'
import { CityFilter } from '../types/city'
import { cn } from '@/lib/utils'

interface CityFilterChipsProps {
    cities: CityFilter[]
    onCitySelect: (cityId: string) => void
    className?: string
    showCount?: boolean
}

export const CityFilterChips: React.FC<CityFilterChipsProps> = ({ cities, onCitySelect, className, showCount = false }) => {
    return (
        <div className={cn('flex flex-wrap gap-2', className)}>
            {cities.map((city) => (
                <Badge
                    key={city.id}
                    onClick={() => onCitySelect(city.id)}
                    variant={city.isSelected ? 'default' : 'outline'}
                    className={cn(
                        'cursor-pointer px-4 py-2 text-sm transition-all hover:scale-105',
                        city.isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
                    )}>
                    <span>{city.name}</span>
                    {showCount && city.experienceCount && <span className="ml-1.5 text-xs opacity-80">({city.experienceCount})</span>}
                </Badge>
            ))}
        </div>
    )
}
