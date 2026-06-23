export const formatGroupType = (group_type: string) => {
    if (!group_type) return 'you'
    switch (group_type) {
        case 'immediate_family':
            return 'family'
        case 'couple_with_children':
            return 'couples with children'
        case 'couple':
            return 'couples'
        case 'friends_group':
            return 'friends'
        case 'solo_traveler':
            return 'solo travelers'
        default:
            return 'you'
    }
}
