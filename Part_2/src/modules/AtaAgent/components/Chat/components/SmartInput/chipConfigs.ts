/**
 * Context-aware action chip definitions.
 * Chips change based on what the user is currently viewing.
 */

export interface ActionChipConfig {
    label: string
    /** The prompt text sent to the agent when tapped. Use '__show_date_picker__'
     *  for the inline date picker, or '__custom_action__:<token>' to fire an
     *  in-app custom action (e.g. '__custom_action__:open_invite') instead of
     *  posting to the agent. */
    prompt: string
    /** Optional metadata attached to the agent message */
    metadata?: Record<string, any>
    /** Lucide icon name */
    icon?: string
    /** Visual variant */
    variant?: 'primary' | 'secondary' | 'warning'
}

export type ViewContext =
    | { page: 'itinerary'; subview: 'day'; dayIndex: number; cityName?: string }
    | { page: 'itinerary'; subview: 'slot'; dayIndex: number; slotIndex: number; slotTitle?: string }
    | { page: 'itinerary'; subview: 'overview' }
    | { page: 'stays'; subview: 'listing' }
    | { page: 'stays'; subview: 'detail'; hotelName?: string }
    | { page: 'experience'; subview: 'detail'; experienceName?: string }
    | { page: 'generic' }

export function getContextualChips(context: ViewContext): ActionChipConfig[] {
    switch (context.page) {
        case 'itinerary':
            if (context.subview === 'slot') {
                return [
                    { label: 'Swap this', prompt: `Show me alternatives for "${context.slotTitle}" on day ${(context.dayIndex ?? 0) + 1}`, icon: 'ArrowLeftRight', variant: 'primary' },
                    { label: 'Remove', prompt: `Remove "${context.slotTitle}" from day ${(context.dayIndex ?? 0) + 1}`, icon: 'Trash2', variant: 'warning' },
                    { label: 'Move it', prompt: `Move "${context.slotTitle}" to a different time`, icon: 'MoveVertical', variant: 'secondary' },
                    { label: 'Tell me more', prompt: `Tell me more about "${context.slotTitle}"`, icon: 'Info', variant: 'secondary' },
                ]
            }
            if (context.subview === 'day') {
                return [
                    { label: 'Optimize day', prompt: `Optimize the schedule for day ${context.dayIndex + 1}`, icon: 'Zap', variant: 'primary' },
                    { label: 'Add activity', prompt: `Suggest an activity to add to day ${context.dayIndex + 1}`, icon: 'Plus', variant: 'primary' },
                    { label: 'Add food', prompt: `Suggest a restaurant for day ${context.dayIndex + 1}${context.cityName ? ` in ${context.cityName}` : ''}`, icon: 'UtensilsCrossed', variant: 'secondary' },
                    { label: 'Day cost', prompt: `How much will day ${context.dayIndex + 1} cost?`, icon: 'IndianRupee', variant: 'secondary' },
                ]
            }
            // overview — same starter prompts as the floating popup.
            return [
                { label: 'Add a day', prompt: 'Add an extra day to my itinerary', icon: 'CalendarPlus', variant: 'primary' },
                { label: 'Shift dates', prompt: '__show_date_picker__', icon: 'Calendar', variant: 'secondary' },
                { label: 'Suggest activities', prompt: 'Suggest activities I can add to my itinerary', icon: 'Sparkles', variant: 'secondary' },
                { label: 'Invite a co-traveler', prompt: '__custom_action__:open_invite', icon: 'UserPlus', variant: 'secondary' },
                { label: 'Explore stays', prompt: '__custom_action__:open_stays', icon: 'Hotel', variant: 'secondary' },
            ]
        case 'stays':
            return context.subview === 'detail'
                ? [
                    { label: 'Compare', prompt: `Compare this with similar hotels`, icon: 'GitCompare' },
                    { label: 'Nearby food', prompt: `Best restaurants near ${context.hotelName || 'the hotel'}`, icon: 'UtensilsCrossed' },
                    { label: 'Getting there', prompt: `How do I get to ${context.hotelName || 'the hotel'} from the airport?`, icon: 'Bus' },
                ]
                : [
                    { label: 'Pool + Gym', prompt: 'Show hotels with pool and gym', icon: 'Dumbbell' },
                    { label: 'Budget options', prompt: 'Show me cheaper options', icon: 'IndianRupee' },
                ]
        case 'experience':
            return [
                { label: 'Best time', prompt: `When is the best time to visit ${context.experienceName || 'this place'}?`, icon: 'Clock' },
                { label: 'Family friendly?', prompt: `Is ${context.experienceName || 'this place'} suitable for families with children?`, icon: 'Users' },
                { label: 'Nearby', prompt: `What else is nearby ${context.experienceName || 'this place'}?`, icon: 'MapPin' },
            ]
        default:
            return []
    }
}

/** Post-mutation suggestion chips */
export const POST_MUTATION_CHIPS: ActionChipConfig[] = [
    { label: 'Undo', prompt: '__undo_last_mutation__', variant: 'warning', icon: 'Undo2' },
    { label: 'What changed?', prompt: 'Show me what just changed in my itinerary', variant: 'secondary', icon: 'GitCompare' },
]
