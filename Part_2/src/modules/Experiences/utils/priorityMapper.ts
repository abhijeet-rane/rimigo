import { PRIORITY_LABELS } from '../constants/filterConstants'

export interface PriorityStyles {
    label: string
    icon: string
    bgColor: string
    textColor: string
    shadowColor: string
}

// Mapper for suggestion priority colors and styles
export const getPriorityStyles = (priority: number | null): PriorityStyles | null => {
    if (priority === null || priority === undefined) {
        return null
    }

    const priorityKey = String(priority)
    const info = PRIORITY_LABELS[priorityKey] || { label: 'Unknown', icon: '⭐' }

    // Color scheme based on priority type
    switch (priority) {
        case 0: // Must-Do
            return {
                label: info.label,
                icon: info.icon,
                bgColor: 'bg-primary-default',
                textColor: 'text-natural-white',
                shadowColor: 'rgba(112, 17, 246, 0.5)' // primary-default at 50%
            }
        case 2: // Popular
            return {
                label: info.label,
                icon: info.icon,
                bgColor: 'bg-secondary-red',
                textColor: 'text-natural-white',
                shadowColor: 'rgba(231, 52, 52, 0.5)' // secondary-red at 50%
            }
        case 4: // Hidden Gems
            return {
                label: info.label,
                icon: info.icon,
                bgColor: 'bg-secondary-green',
                textColor: 'text-natural-white',
                shadowColor: 'rgba(38, 188, 109, 0.5)' // secondary-green at 50%
            }
        case 6: // Local Favorites
            return {
                label: info.label,
                icon: info.icon,
                bgColor: 'bg-secondary-yellow',
                textColor: 'text-natural-white',
                shadowColor: 'rgba(205, 174, 0, 0.5)' // secondary-yellow at 50%
            }
        default:
            return {
                label: info.label,
                icon: info.icon,
                bgColor: 'bg-grey-grey_5',
                textColor: 'text-header-black',
                shadowColor: 'rgba(0, 0, 0, 0.1)'
            }
    }
}
