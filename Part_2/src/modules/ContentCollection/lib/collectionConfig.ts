import { USER_TYPE_RIMIGO_INTERNAL, USER_TYPE_RIMIGO_PREMIUM, USER_TYPE_REGULAR } from '@/constants/userConfig'

export type CollectionType = 'public_collections' | 'traveler_collections'

/** Section types to hide from collection tabs (e.g. shown elsewhere like dos_donts inside Tips) */
const SECTION_TYPES_HIDDEN_FROM_TABS: Partial<Record<CollectionType, string[]>> = {
    public_collections: ['dos_donts'],
    traveler_collections: ['dos_donts']
}

export const collectionTabsConfig = {
    public_collections: {
        experience: {
            showMap: true,
            showLockedOverlay: {
                user_type: {
                    [USER_TYPE_RIMIGO_INTERNAL]: false,
                    [USER_TYPE_RIMIGO_PREMIUM]: false,
                    [USER_TYPE_REGULAR]: false
                }
            },

            // for allowing user to change dates for prices
            updateDate: {
                user_type: {
                    [USER_TYPE_RIMIGO_INTERNAL]: true,
                    [USER_TYPE_RIMIGO_PREMIUM]: true,
                    [USER_TYPE_REGULAR]: false
                }
            }
        },
        stays: {
            showMap: true,
            showLockedOverlay: {
                user_type: {
                    [USER_TYPE_RIMIGO_INTERNAL]: false,
                    [USER_TYPE_RIMIGO_PREMIUM]: false,
                    [USER_TYPE_REGULAR]: false
                }
            },

            // for allowing user to change dates for prices
            updateDate: {
                user_type: {
                    [USER_TYPE_RIMIGO_INTERNAL]: true,
                    [USER_TYPE_RIMIGO_PREMIUM]: true,
                    [USER_TYPE_REGULAR]: false
                }
            }
        },
        itinerary: {
            showLockedOverlay: {
                user_type: {
                    [USER_TYPE_RIMIGO_INTERNAL]: false,
                    [USER_TYPE_RIMIGO_PREMIUM]: true,
                    [USER_TYPE_REGULAR]: true
                }
            }
        },
        visa: {
            showLockedOverlay: {
                user_type: {
                    [USER_TYPE_RIMIGO_INTERNAL]: false,
                    [USER_TYPE_RIMIGO_PREMIUM]: false,
                    [USER_TYPE_REGULAR]: false
                }
            }
        },
        links: {
            showLockedOverlay: {
                user_type: {
                    [USER_TYPE_RIMIGO_INTERNAL]: false,
                    [USER_TYPE_RIMIGO_PREMIUM]: false,
                    [USER_TYPE_REGULAR]: false
                }
            }
        },
        sim: {
            showLockedOverlay: {
                user_type: {
                    [USER_TYPE_RIMIGO_INTERNAL]: false,
                    [USER_TYPE_RIMIGO_PREMIUM]: false,
                    [USER_TYPE_REGULAR]: false
                }
            }
        },
        tips: {
            showLockedOverlay: {
                user_type: {
                    [USER_TYPE_RIMIGO_INTERNAL]: false,
                    [USER_TYPE_RIMIGO_PREMIUM]: false,
                    [USER_TYPE_REGULAR]: false
                }
            }
        },
        dos_donts: {
            showLockedOverlay: {
                user_type: {
                    [USER_TYPE_RIMIGO_INTERNAL]: false,
                    [USER_TYPE_RIMIGO_PREMIUM]: false,
                    [USER_TYPE_REGULAR]: false
                }
            }
        },
        restaurant: {
            showMap: true,
            showLockedOverlay: {
                user_type: {
                    [USER_TYPE_RIMIGO_INTERNAL]: false,
                    [USER_TYPE_RIMIGO_PREMIUM]: false,
                    [USER_TYPE_REGULAR]: false
                }
            }
        }
    },
    traveler_collections: {
        experience: {
            showMap: true,

            // for allowing user to change dates for prices
            updateDate: {
                user_type: {
                    [USER_TYPE_RIMIGO_INTERNAL]: true,
                    [USER_TYPE_RIMIGO_PREMIUM]: true,
                    [USER_TYPE_REGULAR]: true
                }
            }
        },
        stays: {
            showMap: true,

            // for allowing user to change dates for prices
            updateDate: {
                user_type: {
                    [USER_TYPE_RIMIGO_INTERNAL]: true,
                    [USER_TYPE_RIMIGO_PREMIUM]: true,
                    [USER_TYPE_REGULAR]: true
                }
            }
        },
        restaurant: {
            showMap: true
        },
        flights: {
            showMap: false
        }
    }
}

type UserType = typeof USER_TYPE_RIMIGO_INTERNAL | typeof USER_TYPE_RIMIGO_PREMIUM | typeof USER_TYPE_REGULAR

/**
 * Filter section types that should be shown in collection tabs.
 * Section types in SECTION_TYPES_HIDDEN_FROM_TABS for the given collection type are excluded
 * (e.g. dos_donts is shown inside Tips tab, not as its own tab).
 */
export const getSectionTypesVisibleInTabs = <T extends { section_type: string }>(collectionType: CollectionType, sectionTypes: T[]): T[] => {
    const hidden = SECTION_TYPES_HIDDEN_FROM_TABS[collectionType]
    if (!hidden?.length) return sectionTypes
    return sectionTypes.filter((s) => !hidden.includes(s.section_type))
}

/**
 * Check if a tab should show the map based on the collection config
 * @param collectionType - The type of collection ('public_collections' or 'traveler_collections')
 * @param activeTab - The currently active tab section type
 * @returns true if the tab should show the map, false otherwise (defaults to false if not mentioned in config)
 */
export const shouldShowMapForTab = (collectionType: CollectionType, activeTab: string | null): boolean => {
    if (!activeTab) return false

    const collectionConfig = collectionTabsConfig[collectionType]
    if (!collectionConfig) return false

    // Check if the tab exists in the config
    const tabConfig = (collectionConfig as Record<string, { showMap?: boolean }>)[activeTab]
    if (!tabConfig) return false

    // Return true only if showMap is explicitly true, otherwise false
    return tabConfig.showMap === true
}

/**
 * Check if a tab should show the locked overlay based on the collection config and user type
 * @param collectionType - The type of collection ('public_collections' or 'traveler_collections')
 * @param activeTab - The currently active tab section type
 * @param isRimigoInternal - Whether the user is a Rimigo internal user
 * @param isPremium - Whether the user is a premium user
 * @returns true if the tab should show the locked overlay, false otherwise (defaults to false if not mentioned in config)
 */
export const shouldShowLockedOverlayForTab = (
    collectionType: CollectionType,
    activeTab: string | null,
    isRimigoInternal: boolean,
    isPremium: boolean
): boolean => {
    if (!activeTab) return false

    const collectionConfig = collectionTabsConfig[collectionType]
    if (!collectionConfig) return false

    // Check if the tab exists in the config
    const tabConfig = (collectionConfig as Record<string, { showLockedOverlay?: { user_type?: { [key: string]: boolean } } }>)[activeTab]
    if (!tabConfig) return false

    // Check if showLockedOverlay config exists
    const overlayConfig = tabConfig.showLockedOverlay
    if (!overlayConfig || typeof overlayConfig !== 'object' || !overlayConfig.user_type) return false

    // Determine user type
    const userType: UserType = isRimigoInternal ? USER_TYPE_RIMIGO_INTERNAL : isPremium ? USER_TYPE_RIMIGO_PREMIUM : USER_TYPE_REGULAR

    // Get the value for this user type, default to false if not specified
    const shouldShow = overlayConfig.user_type[userType]
    return shouldShow === true
}

/**
 * Check if a tab should allow date updates based on the collection config and user type
 * @param collectionType - The type of collection ('public_collections' or 'traveler_collections')
 * @param activeTab - The currently active tab section type
 * @param isRimigoInternal - Whether the user is a Rimigo internal user
 * @param isPremium - Whether the user is a premium user
 * @returns true if the tab should allow date updates, false otherwise
 * For traveler_collections: allows all user types to edit dates by default
 * For public_collections: defaults to false if not mentioned in config
 */
export const shouldAllowDateUpdateForTab = (
    collectionType: CollectionType,
    activeTab: string | null,
    isRimigoInternal: boolean,
    isPremium: boolean
): boolean => {
    if (!activeTab) return false

    const collectionConfig = collectionTabsConfig[collectionType]
    if (!collectionConfig) return false

    // Check if the tab exists in the config
    const tabConfig = (collectionConfig as Record<string, { updateDate?: { user_type?: { [key: string]: boolean } } }>)[activeTab]
    if (!tabConfig) {
        // For traveler_collections, allow date editing by default if tab exists
        if (collectionType === 'traveler_collections') return true
        return false
    }

    // Check if updateDate config exists
    const updateDateConfig = tabConfig.updateDate
    if (!updateDateConfig || typeof updateDateConfig !== 'object' || !updateDateConfig.user_type) {
        // For traveler_collections, allow date editing by default if tab exists
        if (collectionType === 'traveler_collections') return true
        return false
    }

    // Determine user type
    const userType: UserType = isRimigoInternal ? USER_TYPE_RIMIGO_INTERNAL : isPremium ? USER_TYPE_RIMIGO_PREMIUM : USER_TYPE_REGULAR

    // Get the value for this user type
    const shouldAllow = updateDateConfig.user_type[userType]
    
    // For traveler_collections, default to true if not explicitly set to false
    if (collectionType === 'traveler_collections') {
        return shouldAllow !== false
    }
    
    // For public_collections, require explicit true
    return shouldAllow === true
}

/**
 * Check if a section can be deleted based on the collection config and user type
 * @param collectionType - The type of collection ('public_collections' or 'traveler_collections')
 * @param sectionType - The section type (e.g. 'experience', 'stays')
 * @param isRimigoInternal - Whether the user is a Rimigo internal user
 * @returns true if the section can be deleted, false otherwise
 * Only internal users can delete sections
 */
export const shouldAllowDeleteSection = (
    collectionType: CollectionType,
    sectionType: string | null,
    isRimigoInternal: boolean,
    isTripboard: boolean = false
): boolean => {
    // On tripboard pages, all users can delete sections; otherwise only internal users
    if (!isTripboard && !isRimigoInternal) return false

    if (!sectionType) return false

    const collectionConfig = collectionTabsConfig[collectionType]
    if (!collectionConfig) return false

    // Check if the section type exists in the config
    const tabConfig = (collectionConfig as Record<string, unknown>)[sectionType]
    if (!tabConfig) return false

    // For now, allow deletion of any section type for internal users
    // This can be made more granular in the future if needed
    return true
}




// constants
export const ENTITY_TYPE_ITINERARY = 'itinerary'
export const ENTITY_TYPE_DOS_DONTs = 'dos_donts'
export const ENTITY_TYPE_LINKS = 'links'
export const ENTITY_TYPE_SIM = 'sim'
export const ENTITY_TYPE_VISA = 'visa'
export const ENTITY_TYPE_TIPS = 'tips'
export const ENTITY_TYPE_RESTAURANT = 'restaurant'
export const ENTITY_TYPE_EXPERIENCE = 'experience'
export const ENTITY_TYPE_STAYS = 'stays'
export const ENTITY_TYPE_OVERVIEW = 'overview'
export const ENTITY_TYPE_KAYAK_STAYS = 'kayak_stay'
export const ENTITY_TYPE_FLIGHT = 'flight'