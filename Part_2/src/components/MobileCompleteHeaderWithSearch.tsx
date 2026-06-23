import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MobileBaseHeader from './MobileBaseHeader'
import type {
    PreferencesSegmentConfig,
    LocationPreference,
    GuestsSegmentConfig,
    RoomsSegmentConfig,
    WhereSegmentConfig,
    WhenSegmentConfig,
    SegmentConfig
} from './common/SearchBar'
import MobileSearchModal from './MobileSearchBar'
import { WishlistButtonConfig } from './WishlistHeader'

interface MobileCompleteHeaderWithSearchProps {
    title: string
    showSearchBar?: boolean
    wishlistConfig?: WishlistButtonConfig
    /** Optional content for the right side of the header (e.g. share button) */
    rightSlot?: React.ReactNode
    headerType: 'stays' | 'experiences'
    onSearch?: (params: any) => void
    preferencesConfig?: PreferencesSegmentConfig
    locationPreferences?: LocationPreference[]
    guestsConfig?: GuestsSegmentConfig
    roomsConfig?: RoomsSegmentConfig
    countryConfig?: SegmentConfig
    whereConfig?: WhereSegmentConfig
    whenConfig?: WhenSegmentConfig
    iconSrc?: string
    onSearchModalOpenChange?: (isOpen: boolean) => void
}

const MobileCompleteHeaderWithSearch: React.FC<MobileCompleteHeaderWithSearchProps> = ({
    title,
    wishlistConfig,
    rightSlot,
    headerType,
    iconSrc,
    onSearch,
    preferencesConfig,
    locationPreferences,
    guestsConfig,
    roomsConfig,
    countryConfig,
    whereConfig,
    whenConfig,
    onSearchModalOpenChange
}) => {
    return (
        <AnimatePresence initial={false}>
            <motion.div
                key="mobile-complete-header"
                layout
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="md:hidden w-full bg-natural-white overflow-hidden">
                {/* Base Header */}
                <MobileBaseHeader
                    title={title}
                    wishlistConfig={wishlistConfig ?? { enabled: false }}
                    rightSlot={rightSlot}
                />

                {/* Search Bar */}
                {onSearch && (
                    <div className="px-5 py-3 border-y border-grey-4">
                        <MobileSearchModal
                            iconSrc={iconSrc}
                            onSearch={onSearch}
                            headerType={headerType}
                            preferencesConfig={preferencesConfig}
                            locationPreferences={locationPreferences}
                            guestsConfig={guestsConfig}
                            roomsConfig={roomsConfig}
                            countryConfig={countryConfig}
                            whereConfig={whereConfig}
                            whenConfig={whenConfig}
                            onOpenChange={onSearchModalOpenChange}
                        />
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    )
}

export default MobileCompleteHeaderWithSearch
