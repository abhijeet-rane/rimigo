import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { capitalizeFirstLetterOfEachWord } from '@/utils/formatTextUtil'
import AddSectionModal from './AddSectionModal'
import { cn } from '@/lib/utils'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import { useAuth } from '@/lib/auth/providers/AuthProviders'

interface SectionType {
    section_type: string
    name: string
}

interface CollectionTabsProps {
    sectionTypes: SectionType[]
    activeTab: string | null
    onTabClick: (sectionType: string) => void
    sticky?: boolean
    stickyZClassName?: string
    isRimigoInternal?: boolean
    collectionIdentifier?: string
    onSectionAdded?: () => void
}

const CollectionTabs: React.FC<CollectionTabsProps> = ({
    sectionTypes,
    activeTab,
    onTabClick,
    sticky = false,
    stickyZClassName = 'z-60',
    isRimigoInternal = false,
    collectionIdentifier,
    onSectionAdded
}) => {
    const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false)
    const { trackButtonClickCustom } = usePostHog()
    const { isAuthenticated } = useAuth()

    const containerRef = useRef<HTMLDivElement>(null)
    const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
    const [underlineStyle, setUnderlineStyle] = useState<{ left: number; width: number } | null>(null)

    const updateUnderline = useCallback(() => {
        if (!activeTab || !containerRef.current) return
        const tabEl = tabRefs.current.get(activeTab)
        if (!tabEl) return
        const containerRect = containerRef.current.getBoundingClientRect()
        const tabRect = tabEl.getBoundingClientRect()
        setUnderlineStyle({
            left: tabRect.left - containerRect.left + containerRef.current.scrollLeft,
            width: tabRect.width
        })
    }, [activeTab])

    useEffect(() => {
        updateUnderline()
    }, [updateUnderline])

    const tabsClick = (sectionName : string) => {
        onTabClick(sectionName)
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
            buttonName: POSTHOG_EVENTS.COLLECTION_TAB_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: {
                tabName: sectionName,
            },
        })
    }

    const tabsContent = (
        <div className="relative w-full">
            {/* Scrollable tabs container */}
            <div className="overflow-x-auto overflow-y-hidden scrollbar-hide">
                <div ref={containerRef} className="relative flex gap-1 md:gap-6 items-center justify-start md:justify-center min-w-max  md:px-0">
                    {sectionTypes.length > 0 &&
                        sectionTypes.map((sectionType) => (
                            <button
                                key={sectionType.section_type}
                                ref={(el) => {
                                    if (el) tabRefs.current.set(sectionType.section_type, el)
                                    else tabRefs.current.delete(sectionType.section_type)
                                }}
                                type="button"
                                onClick={() => tabsClick(sectionType.section_type)}
                                className={`px-2 py-3 text-[14px] md:text-base font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                                    activeTab === sectionType.section_type
                                        ? 'text-primary-default cursor-pointer'
                                        : 'text-grey-2 cursor-pointer hover:text-grey-0'
                                }`}
                                style={{
                                    fontWeight: activeTab === sectionType.section_type ? 700 : 600
                                }}>
                                {sectionType.name ? capitalizeFirstLetterOfEachWord(sectionType.name) : ''}
                            </button>
                        ))}

                    {/* Add button - visible on mobile inline, fixed on desktop */}
                    {isRimigoInternal && collectionIdentifier && (
                        <button
                            type="button"
                            onClick={() => setIsAddSectionModalOpen(true)}
                            className="md:hidden px-2 py-3 text-sm font-medium transition-colors text-grey-2 hover:text-primary-default flex items-center gap-1 cursor-pointer whitespace-nowrap flex-shrink-0"
                            style={{
                                fontFamily: 'Manrope',
                                fontSize: '14px',
                                lineHeight: '20px',
                                letterSpacing: '-0.32px',
                                fontWeight: 600
                            }}>
                            <Plus className="w-4 h-4" />
                            Add
                        </button>
                    )}

                    {/* Animated underline */}
                    {underlineStyle && (
                        <motion.div
                            className="absolute bottom-0 h-[3px] bg-primary-default rounded-full"
                            animate={{ left: underlineStyle.left, width: underlineStyle.width }}
                            transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                        />
                    )}
                </div>
            </div>

            {/* Add button - Desktop only (absolute positioned) */}
            {isRimigoInternal && collectionIdentifier && (
                <button
                    type="button"
                    onClick={() => setIsAddSectionModalOpen(true)}
                    className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 px-2 py-2 text-sm font-medium transition-colors text-grey-2 hover:text-primary-default items-center gap-1 cursor-pointer"
                    style={{
                        fontFamily: 'Manrope',
                        fontSize: '16px',
                        lineHeight: '20px',
                        letterSpacing: '-0.32px',
                        fontWeight: 600
                    }}>
                    <Plus className="w-4 h-4" />
                    Add
                </button>
            )}
        </div>
    )

    return (
        <>
            {sectionTypes.length > 0 || (isRimigoInternal && collectionIdentifier) ? (
                <div
                    // The Bookings tab's fixed budget bar flush-mounts under this
                    // tab bar by measuring its bottom edge (same hook the private
                    // TripboardHeader uses). Only meaningful when pinned.
                    {...(sticky ? { 'data-tripboard-tabbar': '' } : {})}
                    className={cn(
                        'bg-white border-b border-grey-4',
                        sticky && 'sticky',
                        sticky && stickyZClassName,
                        sticky && (isAuthenticated ? 'top-21 md:top-18' : 'top-23 md:top-18')
                    )}
                >
                {tabsContent}
                </div>
            ) : null}

            {/* Add Section Modal */}
            {isRimigoInternal && collectionIdentifier && (
                <AddSectionModal
                    isOpen={isAddSectionModalOpen}
                    onClose={() => setIsAddSectionModalOpen(false)}
                    collectionIdentifier={collectionIdentifier}
                    existingSectionTypes={sectionTypes.map((st) => st.section_type)}
                    onSuccess={() => {
                        onSectionAdded?.()
                        setIsAddSectionModalOpen(false)
                    }}
                />
            )}
        </>
    )
}

export default CollectionTabs
