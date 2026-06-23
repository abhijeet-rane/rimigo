import { GEM_ICON, HEART_ICON, STAR_ICON, TICK_ICON } from '@/constants/thiingsIcons'

export const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
    cultural: { label: 'Cultural', icon: '🏛️' },
    adventure: { label: 'Adventure', icon: '🏔️' },
    food: { label: 'Food & Dining', icon: '🍽️' },
    nature: { label: 'Nature', icon: '🌿' },
    entertainment: { label: 'Entertainment', icon: '🎭' },
    shopping: { label: 'Shopping', icon: '🛍️' },
    wellness: { label: 'Wellness', icon: '🧘' },
    nightlife: { label: 'Nightlife', icon: '🌃' }
}

export const PRIORITY_LABELS: Record<string, { label: string; icon: string }> = {
    '0': { label: 'Must Do', icon: TICK_ICON },
    '2': { label: 'Popular', icon: STAR_ICON },
    '4': { label: 'Underrated', icon: GEM_ICON },
    '6': { label: 'Offbeat', icon: HEART_ICON }
}

export const RECOMMENDATION_MODE_LABELS: Record<string, string> = {
    curated: 'Curated Only',
    trending: 'Trending',
    budget: 'Budget Friendly'
}

export const RECOMMENDATION_MODES = [
    { id: 'all', label: 'All Experiences' },
    { id: 'curated', label: 'Curated Only' },
    { id: 'trending', label: 'Trending' },
    { id: 'budget', label: 'Budget Friendly' }
]

export const CITY_ICON = '🏙️'
export const RECOMMENDATION_ICON = '🎯'
export const PRICE_ICON = '💰'
export const DEFAULT_ICON = '🏷️'
