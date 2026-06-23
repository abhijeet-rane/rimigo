import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { FilterContentProps } from '@/pages/Stays/Components/Filters/types'
import type { ExperienceFilterMetadata, ExperienceFilterInitialData, ExperienceFilterResult } from './types'

export const ExperienceFilterContent = ({
    metadata,
    initialData,
    onChange
}: FilterContentProps<ExperienceFilterMetadata, ExperienceFilterInitialData, ExperienceFilterResult>) => {
    // State for selected priorities
    const [selectedPriorities, setSelectedPriorities] = useState<string[]>(initialData?.selectedPriorities || [])

    // Notify parent of changes
    useEffect(() => {
        onChange({
            priorities: selectedPriorities
        })
    }, [selectedPriorities, onChange])

    const handlePriorityToggle = (priorityId: string) => {
        setSelectedPriorities((prev) => (prev.includes(priorityId) ? prev.filter((id) => id !== priorityId) : [...prev, priorityId]))
    }

    return (
        <div className="px-6 py-4">
            {/* Priority Section */}
            {metadata?.suggestionPriorities && metadata.suggestionPriorities.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-lg font-semibold text-grey-grey_0 mb-4">Experience Type</h3>
                    <div className="flex flex-wrap gap-2">
                        {metadata.suggestionPriorities.map((priority) => {
                            const isSelected = selectedPriorities.includes(priority.id)
                            return (
                                <button
                                    key={priority.id}
                                    onClick={() => handlePriorityToggle(priority.id)}
                                    className={cn(
                                        'p-2 px-4 rounded-lg border transition-colors text-left cursor-pointer flex items-center gap-2',
                                        isSelected
                                            ? 'border-primary-default bg-primary-default-80'
                                            : 'border-grey_4 hover:border-grey-grey_3 hover:bg-grey-grey_5'
                                    )}>
                                    <img
                                        src={priority.icon}
                                        alt={priority.label}
                                        className="w-5 h-5 object-contain"
                                    />
                                    <div className="font-medium text-header-black">{priority.label}</div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
