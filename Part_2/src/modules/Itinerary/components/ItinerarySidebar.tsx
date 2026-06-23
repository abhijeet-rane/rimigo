/*
 * Layout note:
 *   The outer SideBarLayout's collapsed rail (69px) is the single source of
 *   truth for left-side chrome on the Itinerary page. Previously this file
 *   rendered its own 52px icon strip next to the rail — two columns side by
 *   side. Now the page mounts <ItineraryRailIcons /> into the outer rail via
 *   `setRailExtra` (see SideBarLayout's SidebarContext), and this file only
 *   exports the wishlist panel that slides out when the heart icon is
 *   toggled. The panel is anchored fixed to the right of the 69px rail so it
 *   doesn't reflow page content.
 */

import { CalendarDays, Columns3, Heart, X, Filter, Plus } from 'lucide-react'
import Typography from '@/components/shared/Typography'
import clsx from 'clsx'
import SafeImage from './SafeImage'
import { type ItineraryViewMode } from './HeaderCalender'
import type { ShortlistedByTripExperienceResponse } from '@/modules/Experiences/api/experienceShortlistAPI'

interface WishlistItem {
    id: string
    experience_id?: string
    experience?: {
        id: string
        name?: string
        display_props?: {
            landscape_image?: string
        }
    }
    is_traveler_shortlisted?: boolean
}

type ShortlistData = { results?: WishlistItem[] } | ShortlistedByTripExperienceResponse

interface ItineraryRailIconsProps {
    viewMode: ItineraryViewMode
    onViewModeChange: (mode: ItineraryViewMode) => void
    /** Rimigo internal: show legacy FullCalendar time-grid tab. */
    showCalendarTab?: boolean
    shortlistCount?: number
    isViewer?: boolean
    isWishlistOpen: boolean
    onWishlistToggle: (next: boolean) => void
}

/**
 * Page-specific rail icons injected into the outer SideBarLayout's collapsed
 * rail via `setRailExtra`. Renders view-toggles (Kanban / Map / optional
 * Calendar) and the heart/wishlist button — no panel rendering here.
 */
export const ItineraryRailIcons = ({
    viewMode,
    onViewModeChange,
    showCalendarTab = false,
    shortlistCount = 0,
    isViewer = false,
    isWishlistOpen,
    onWishlistToggle,
}: ItineraryRailIconsProps) => {
    // Calendar is internal-only — gated on `showCalendarTab` which the
    // Itinerary page sets to `isRimigoInternal && !isViewer`.
    const viewModes: Array<{
        mode: ItineraryViewMode
        icon: typeof Columns3
        label: string
    }> = [
        { mode: 'kanban', icon: Columns3, label: 'Board' },
        ...(showCalendarTab
            ? [{ mode: 'calendar' as const, icon: CalendarDays, label: 'Calendar' }]
            : []),
    ]

    return (
        <div className="flex flex-col items-center gap-2 w-full">
            {viewModes.map(({ mode, icon: Icon, label }) => {
                const isActive = viewMode === mode
                return (
                    <button
                        key={mode}
                        onClick={() => onViewModeChange(mode)}
                        title={label}
                        className={clsx(
                            'w-10 h-10 rounded-xl flex items-center justify-center transition-colors cursor-pointer',
                            isActive
                                ? 'bg-primary-pale-purple text-primary-default'
                                : 'text-grey-0 hover:bg-grey-5'
                        )}>
                        <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
                    </button>
                )
            })}

            {/* Separator */}
            <div className="w-6 h-px bg-grey-4 my-1" />

            {/* Wishlist button */}
            {!isViewer && (
                <button
                    onClick={() => onWishlistToggle(!isWishlistOpen)}
                    title="Your wishlist"
                    className={clsx(
                        'w-10 flex flex-col items-center gap-0.5 rounded-xl py-1.5 transition-colors cursor-pointer',
                        isWishlistOpen
                            ? 'bg-primary-pale-purple text-primary-default'
                            : 'text-grey-0 hover:bg-grey-5'
                    )}>
                    <Heart size={20} strokeWidth={1.75} />
                    {shortlistCount > 0 && (
                        <span className="font-red-hat-display text-[13px] font-semibold leading-none text-grey-0">
                            {shortlistCount}
                        </span>
                    )}
                </button>
            )}
        </div>
    )
}

interface ItineraryWishlistPanelProps {
    isOpen: boolean
    onClose: () => void
    shortlistData?: ShortlistData
    onAddShortlistItem?: (experienceId: string, experienceName: string) => void
}

/**
 * 220px wishlist panel anchored to the right edge of the 69px outer rail.
 * Uses `fixed` positioning so it doesn't reflow main content. Mobile keeps
 * using the mobile header's own wishlist button — this panel is desktop-only.
 */
export const ItineraryWishlistPanel = ({
    isOpen,
    onClose,
    shortlistData,
    onAddShortlistItem,
}: ItineraryWishlistPanelProps) => {
    if (!isOpen) return null

    const wishlistItems = shortlistData?.results?.filter(
        (item) => item.is_traveler_shortlisted && item.experience
    ) || []

    return (
        <div className="hidden md:flex flex-col fixed top-0 left-[69px] h-full w-[220px] border-r border-grey-4 bg-white z-1000 overflow-hidden">
            {/* Header */}
            <div className="px-3 py-3 border-b border-grey-4">
                <div className="flex items-center justify-between">
                    <Typography size="14" weight="bold" family="manrope" color="grey-0">
                        Your wishlist
                    </Typography>
                    <button
                        onClick={onClose}
                        className="w-6 h-6 rounded-full hover:bg-grey-5 flex items-center justify-center cursor-pointer">
                        <X size={14} className="text-grey-2" />
                    </button>
                </div>
                <Typography size="11" weight="medium" family="manrope" color="grey-3" className="mt-0.5">
                    Add shortlisted items to your itinerary
                </Typography>
            </div>

            {/* Filter */}
            <div className="px-3 py-2 border-b border-grey-4">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-grey-4 rounded-lg text-grey-2">
                    <Filter size={12} />
                    <Typography size="12" weight="medium" family="manrope" color="grey-2">
                        Filter: All Items
                    </Typography>
                </div>
            </div>

            {/* Items list */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {wishlistItems.length > 0 ? (
                    <div className="py-2">
                        {wishlistItems.map((item) => {
                            const experience = item.experience
                            if (!experience) return null

                            return (
                                <div
                                    key={item.id || experience.id}
                                    className="group/item flex items-center gap-2.5 px-3 py-2 hover:bg-grey-5 transition-colors">
                                    <SafeImage
                                        src={experience.display_props?.landscape_image || ''}
                                        alt={experience.name ?? ''}
                                        className="w-[44px] h-[44px] rounded-lg object-cover shrink-0"
                                    />
                                    <Typography
                                        size="13"
                                        weight="medium"
                                        family="manrope"
                                        color="grey-0"
                                        className="flex-1 min-w-0 line-clamp-2 leading-[17px]">
                                        {experience.name ?? 'Experience'}
                                    </Typography>
                                    {onAddShortlistItem && (
                                        <button
                                            onClick={() => onAddShortlistItem(experience.id, experience.name ?? 'Experience')}
                                            title="Add to itinerary"
                                            className="w-7 h-7 rounded-lg bg-primary-default/10 hover:bg-primary-default/20 flex items-center justify-center shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity cursor-pointer">
                                            <Plus size={14} className="text-primary-default" />
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 px-4 gap-2">
                        <Heart size={24} className="text-grey-3" />
                        <Typography size="13" weight="medium" family="manrope" color="grey-3" className="text-center">
                            No items in your wishlist yet
                        </Typography>
                    </div>
                )}
            </div>
        </div>
    )
}
