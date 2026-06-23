import { COUPLE_ICON, COUPLE_WITH_CHILDREN_ICON, FAMILY_ICON, FRIENDS_ICON, HEART_ICON, SOLO_ICON } from '@/constants/thiingsIcons'

export const getActivitiesByGroupTypeSectionTitle = (groupType: string | null): { title: string; titleIcon: string } => {
    switch (groupType) {
        case 'couple':
            return {
                title: 'couples',
                titleIcon: HEART_ICON
            }
        case 'solo_traveler':
            return {
                title: 'solo travelers',
                titleIcon: SOLO_ICON
            }
        case 'immediate_family':
            return {
                title: 'families',
                titleIcon: FAMILY_ICON
            }
        case 'couple_with_children':
            return {
                title: 'couples with children',
                titleIcon: COUPLE_WITH_CHILDREN_ICON
            }
        case 'friends_group':
            return {
                title: 'friends',
                titleIcon: FRIENDS_ICON
            }
        default:
            return {
                title: 'couples',
                titleIcon: COUPLE_ICON
            }
    }
}
