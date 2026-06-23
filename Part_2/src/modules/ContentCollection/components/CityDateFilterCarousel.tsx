import { Pencil } from 'lucide-react'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import type { AccommodationMetadataItem } from '@/pages/Stays/Apis/accommodationsAPI'
import type { StayCorrectedDates } from '../utils/staysDateGrouping'

export interface CityDateGroup {
    /** Unique key: `${cityId}::${dateHeading}` */
    key: string
    cityId: string
    cityName: string
    dateLabel: string
}

/** Extended group that also carries stays (used by StaysTab) */
export interface CityDateGroupWithStays extends CityDateGroup {
    stays: AccommodationMetadataItem[]
}

interface CityDateFilterCarouselProps {
    /** Pre-built groups to render */
    groups: CityDateGroup[]
    /** Currently selected group key */
    selectedGroupKey: string | null
    /** Called when a chip is clicked */
    onGroupChange: (groupKey: string) => void
    /** Called when the pencil edit button is clicked */
    onEditDate?: (groupKey: string) => void
    /** Whether to show the pencil edit button */
    allowDateEdit?: boolean
    /** Optional scroll control overrides */
    scrollControls?: {
        rightScrollArrow?: string
        rightScrollBtn?: string
        leftArrowBtn?: string
        leftScrollBtn?: string
    }
    /** Optional callback to switch to map view (renders a "Map View" button at end of carousel) */
    onMapViewClick?: () => void
    /** Optional content rendered as the LAST flex item inside the scroll
     *  container, after the chip buttons. The item uses `ml-auto` so it
     *  hugs the right edge when chips don't fill the row, and follows the
     *  last chip when they overflow. The Tripboard Activities tab uses
     *  this to surface the mobile "Explore cities" affordance after the
     *  chip scroll ends. */
    trailingItem?: React.ReactNode
    /** Extra classes for each chip button. The Tripboard Activities tab
     *  passes `h-[58px]` so single-line (date-less) chips still fill the
     *  full strip height — the carousel's inner flex is `items-start`, so
     *  without an explicit height a short chip's selected background stops
     *  above the strip's bottom edge. */
    chipClassName?: string
    /** Optional content rendered as the FIRST flex item inside the scroll
     *  container, before the chip buttons — it scrolls WITH the chips. The
     *  Tripboard Activities tab uses this on mobile to put the "Overview"
     *  tab at the head of the scrollable strip (only the country dropdown
     *  stays pinned outside). */
    leadingItem?: React.ReactNode
}

/**
 * Format a compact date label like "Apr 28 - Apr 30" from check-in / check-out YYYY-MM-DD strings.
 */
export function formatCompactDateRange(checkIn?: string | null, checkOut?: string | null): string {
    const fmt = (iso: string): string => {
        try {
            const d = new Date(iso)
            if (isNaN(d.getTime())) return iso
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        } catch {
            return iso
        }
    }
    // if same end date - start date, return only the start date
    const dayKey = (s: string) => s.trim().split('T')[0]
    if (checkIn && checkOut && dayKey(checkIn) === dayKey(checkOut)) {
        return fmt(checkIn)
    }
    if (checkIn && checkOut) return `${fmt(checkIn)} - ${fmt(checkOut)}`
    if (checkIn) return fmt(checkIn)
    if (checkOut) return fmt(checkOut)
    return ''
}

/**
 * Build city+date groups from stays.
 * Each group is a unique (cityId, dateLabel) pair sorted chronologically.
 * Dateless stays (empty dateLabel) are merged into the first existing group for their city.
 */
export function buildCityDateGroupsFromStays(
    stays: AccommodationMetadataItem[],
    correctedDatesMap: Map<string, StayCorrectedDates>,
    stayMetadataMap: Map<string, { city_id?: string; city_name?: string; [k: string]: unknown }>
): CityDateGroupWithStays[] {
    const groupMap = new Map<string, CityDateGroupWithStays>()
    // Track first group per city so dateless stays can be merged into it
    const firstGroupPerCity = new Map<string, string>() // cityId -> groupKey
    // Holds dateless stays that need to be merged after all groups are built
    const datelessStays: Array<{ stay: AccommodationMetadataItem; cityId: string; cityName: string }> = []

    stays.forEach((stay) => {
        const stayKey = stay.zentrum_hub_id || stay.id
        const metadata = stayMetadataMap.get(stayKey)
        const cityId = metadata?.city_id
        if (!cityId) return // skip stays with no city — can't group or map them
        const cityName = metadata?.city_name || 'Unknown'
        const dates = correctedDatesMap.get(stayKey)
        const dateLabel = formatCompactDateRange(dates?.checkIn, dates?.checkOut)

        // If no dates, queue for merging into first city group later
        if (!dateLabel) {
            datelessStays.push({ stay, cityId, cityName })
            return
        }

        const groupKey = `${cityId}::${dateLabel}`
        if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, { key: groupKey, cityId, cityName, dateLabel, stays: [] })
            // Record first group created for this city
            if (!firstGroupPerCity.has(cityId)) {
                firstGroupPerCity.set(cityId, groupKey)
            }
        }
        groupMap.get(groupKey)!.stays.push(stay)
    })

    // Merge dateless stays into the first group for their city.
    // If no group exists for that city, create one with empty dateLabel.
    datelessStays.forEach(({ stay, cityId, cityName }) => {
        const existingGroupKey = firstGroupPerCity.get(cityId)
        if (existingGroupKey && groupMap.has(existingGroupKey)) {
            groupMap.get(existingGroupKey)!.stays.push(stay)
        } else {
            const groupKey = `${cityId}::`
            if (!groupMap.has(groupKey)) {
                groupMap.set(groupKey, { key: groupKey, cityId, cityName, dateLabel: '', stays: [] })
                firstGroupPerCity.set(cityId, groupKey)
            }
            groupMap.get(groupKey)!.stays.push(stay)
        }
    })

    // Sort by check-in date (earliest first)
    return Array.from(groupMap.values()).sort((a, b) => {
        const aDate = correctedDatesMap.get(a.stays[0]?.zentrum_hub_id || a.stays[0]?.id || '')?.checkIn || ''
        const bDate = correctedDatesMap.get(b.stays[0]?.zentrum_hub_id || b.stays[0]?.id || '')?.checkIn || ''
        return aDate.localeCompare(bDate)
    })
}

/**
 * Build city+date groups from experiences.
 * Dateless experiences (empty dateLabel) are merged into the first existing group for their city.
 *
 * When ``resolveStartDate`` is provided it's the authoritative source for an
 * experience's start date — typically wires to the itinerary slot's day date
 * (``getOriginalDate`` on the parent) so chips reflect the live itinerary
 * rather than the section's stale ``metadata.start_date`` cache. When absent,
 * falls back to ``exp.start_date`` for backward compatibility.
 */
export function buildCityDateGroupsFromExperiences(
    experiences: Array<{ id: string; city_id?: string; city_name?: string; start_date?: string | null; end_date?: string | null }>,
    getCorrectedDate: (dateStr: string | null | undefined) => string | null,
    resolveStartDate?: (exp: { id: string; start_date?: string | null }) => string | null
): CityDateGroup[] {
    const groupMap = new Map<string, CityDateGroup & { sortDate: string }>()
    const firstGroupPerCity = new Map<string, string>() // cityId -> groupKey
    const datelessExps: Array<{ cityId: string; cityName: string }>  = []

    experiences.forEach((exp) => {
        const cityId = exp.city_id
        if (!cityId) return // skip experiences with no city — can't group or map them
        const cityName = exp.city_name || 'Unknown'
        const rawStart = resolveStartDate ? resolveStartDate(exp) : exp.start_date
        const correctedStart = getCorrectedDate(rawStart) || undefined
        // Experiences are single-day in this projection. Reading
        // ``exp.end_date`` straight from the stale section metadata would
        // pair a fresh (itinerary-resolved) start with a stale end and
        // produce ranges like "Jul 23 - Jun 23" on the chip. Drop the end
        // entirely; the formatter renders only the start.
        const dateLabel = formatCompactDateRange(correctedStart, undefined)

        // If no dates, queue for merging later
        if (!dateLabel) {
            datelessExps.push({ cityId, cityName })
            return
        }

        const groupKey = `${cityId}::${dateLabel}`
        if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, { key: groupKey, cityId, cityName, dateLabel, sortDate: correctedStart || '9999-12-31' })
            if (!firstGroupPerCity.has(cityId)) {
                firstGroupPerCity.set(cityId, groupKey)
            }
        }
    })

    // Merge dateless experiences into first group for their city
    datelessExps.forEach(({ cityId, cityName }) => {
        if (!firstGroupPerCity.has(cityId)) {
            const groupKey = `${cityId}::`
            groupMap.set(groupKey, { key: groupKey, cityId, cityName, dateLabel: '', sortDate: '9999-12-31' })
            firstGroupPerCity.set(cityId, groupKey)
        }
        // Group already exists — dateless experiences are implicitly included
        // (they match by city in filteredExperiences)
    })

    return Array.from(groupMap.values()).sort((a, b) => a.sortDate.localeCompare(b.sortDate))
}

const CityDateFilterCarousel: React.FC<CityDateFilterCarouselProps> = ({
    groups,
    selectedGroupKey,
    onGroupChange,
    onEditDate,
    allowDateEdit = false,
    scrollControls,
    onMapViewClick,
    trailingItem,
    chipClassName = '',
    leadingItem
}) => {
    // A leading item (e.g. the Activities tab's mobile Overview tab) must
    // survive an empty chip set — the Overview tab is how the user gets
    // country-wide content when a country has no city chips.
    if (groups.length === 0 && !onMapViewClick && !leadingItem) return null

    return (
        // Divider lives on the OUTER header row in ExperienceTab now —
        // having it on this inner container made it stop short under
        // the chips instead of spanning to the right-hand actions.
        <div className="flex items-center flex-1 min-w-0">
            {(groups.length > 0 || leadingItem) && (
                <div className="group/carousel relative flex-1 min-w-0">
                    <GenericCarousel
                        className="flex-1 min-w-0"
                        gap={0}
                        scrollControls={{
                            ...scrollControls,
                            rightScrollBtn: `opacity-0 group-hover/carousel:opacity-100 transition-opacity ${scrollControls?.rightScrollBtn || ''}`,
                            leftScrollBtn: `opacity-0 group-hover/carousel:opacity-100 transition-opacity ${scrollControls?.leftScrollBtn || ''}`,
                        }}
                        gradientStartColor="white"
                        gradientEndColor="rgba(255,255,255,0)"
                        // GenericCarousel hides its gradient overlays on
                        // mobile by default via `max-md:hidden`. The chip
                        // carousel needs the edge fade on mobile too so
                        // users can see there is more to scroll. Use the
                        // Tailwind v4 important-modifier (`!`) so the
                        // override wins over the default's `max-md:hidden`
                        // regardless of class-merge order.
                        leftGradientStyle="max-md:block! max-md:w-10"
                        rightGradientStyle="max-md:block! max-md:w-10">
                        {/* Leading slot — scrolls with the chips (vs the
                            pinned content callers keep outside the carousel). */}
                        {leadingItem && <div className="self-stretch flex items-stretch shrink-0">{leadingItem}</div>}
                        {groups.map((group) => {
                            const isSelected = selectedGroupKey === group.key
                            return (
                                <button
                                    key={group.key}
                                    type="button"
                                    onClick={() => onGroupChange(group.key)}
                                    className={`relative flex items-center gap-1.5 px-4 py-3 cursor-pointer shrink-0 transition-colors ${
                                        isSelected
                                            ? 'bg-[#dfdde0]'
                                            : 'bg-white hover:bg-grey-6'
                                    } ${chipClassName}`}>
                                    <div className="flex flex-col items-start">
                                        <span className="text-[14px] font-bold font-red-hat-display text-grey-0 tracking-[-0.28px] leading-[18px] whitespace-nowrap">
                                            {group.cityName}
                                        </span>
                                        {group.dateLabel && (
                                            <span className="text-[12px] font-semibold font-manrope text-grey-2 tracking-[-0.24px] leading-4 whitespace-nowrap">
                                                {group.dateLabel}
                                            </span>
                                        )}
                                    </div>
                                    {allowDateEdit && isSelected && onEditDate && (
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onEditDate(group.key)
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') { e.stopPropagation(); onEditDate(group.key) }
                                            }}
                                            className="p-1 hover:bg-black/10 rounded transition-colors flex items-center justify-center"
                                            aria-label="Edit dates">
                                            <Pencil className="w-3 h-3 text-grey-1" />
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                        {/* Trailing slot. Mobile `ml-auto` pins it right when
                            chips fit; desktop `sm:ml-0` keeps it flush after the
                            last chip. `self-stretch`+`items-center` centres it
                            vertically (chips use items-start on the parent). */}
                        {trailingItem && (
                            <div className="ml-auto sm:ml-0 self-stretch flex items-center shrink-0">
                                {trailingItem}
                            </div>
                        )}
                    </GenericCarousel>
                </div>
            )}
        </div>
    )
}

export default CityDateFilterCarousel
