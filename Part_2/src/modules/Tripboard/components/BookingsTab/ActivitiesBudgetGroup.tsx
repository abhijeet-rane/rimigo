import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeftRight, Eye, Loader, Settings2 } from 'lucide-react'
import { FERRIS_WHEEL_ICON } from '@/constants/thiingsIcons'
import { getPlatformLogoURL } from '@/constants/icons/platformIcons'
import { useToursForExperience } from '@/modules/Experiences/hooks/useToursForExperience'
import { useSortedToursByPriority } from '@/modules/Experiences/hooks/useSortedToursByPriority'
import {
    useCollectionId,
    useCollectionIdentifier,
    useTourPriceOverride,
    useTripOwnerName
} from '@/modules/Tripboard/context/TripCollectionRecommendationsContext'
import { useUserInfo } from '@/hooks/useUserInfo'
import TourCuratePopover from '@/modules/Tripboard/components/TourCuratePopover'
import type { AdaptedTourResponseType } from '@/modules/Experiences/types/toursResponseTypes'
import type { BatchItem } from '@/modules/Experiences/api/tourLiveDataBatchAPI'
import SneakPeekModal from '@/modules/Acitvities/components/SneakPeekModal'
import CustomShimmer from '@/components/shared/Shimmer'
import type { BudgetDay, BudgetSlotItem, RecalculationTrigger } from '../../api/budgetApi'
import { useBudgetTrack } from './budgetTrackContext'
import { TourLiveDataBatchProvider } from '@/modules/Experiences/hooks/TourLiveDataBatchScope'
import { POSTHOG_EVENTS } from '@/modules/amplitude/components/posthogEventDetails'
import { CategorySection, SubSection, SubSectionHeader, SubSectionDate } from './CategorySection'
import { JourneyCard, InfoCell, ProviderCell, ProviderRow, ProviderIdentity, TagPill, PriceButton, MoreCell } from './JourneyCardKit'

interface ActivitiesBudgetGroupProps {
    days: BudgetDay[]
    excludedActivities: Set<string>
    onExclude: (slotId: string) => void
    onInclude?: (slotId: string) => void
    onSwap?: (slotId: string) => void
    isPublic?: boolean
    onTourSelect?: (slotId: string, tourId: string | null) => void
    recalculationTrigger?: RecalculationTrigger
    /** Reports the filtered-and-live activities total up so the CostOverview
     *  breakdown can mirror what the section header displays (same filter:
     *  entity_id ∧ not-excluded ∧ has-tours; same price source: live tour price). */
    onSectionTotalReport?: (total: number) => void
    /** When false, per-row live tour fetches are suppressed — used so the
     *  Budget tab doesn't hit the tour endpoints while mounted-but-hidden
     *  under another active tab. */
    isActive?: boolean
}

const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const formatCurrency = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
    getyourguide: 'GetYourGuide',
    headout: 'Headout',
    viator: 'Viator',
    klook: 'Klook',
    tripadvisor: 'Tripadvisor',
    booking: 'Booking.com'
}

const formatPlatformName = (name: string) => PLATFORM_DISPLAY_NAMES[name.toLowerCase()] || name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()

/** Minutes → readable label: <60 stays "45 min"; ≥60 rolls up to hours
 *  ("60 → 1h", "90 → 1h 30m", "300 → 5h", "600 → 10h"). */
const formatMinutes = (mins: number): string => {
    if (mins < 60) return `${mins} min`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m ? `${h}h ${m}m` : `${h}h`
}

/** "5h" / "1h 30m" / "45 min" pill text — null when duration data is absent.
 *  Minute durations roll up to hours for readability (Figma feedback). */
const formatDurationPill = (duration: AdaptedTourResponseType['duration']): string | null => {
    if (!duration || !duration.unit) return null
    const { min_duration, max_duration, unit } = duration
    const min = Number(min_duration)
    if (min_duration == null || min_duration === '' || !Number.isFinite(min) || min === 0) return null
    const max = max_duration != null && max_duration !== '' ? Number(max_duration) : null
    const hasRange = max != null && Number.isFinite(max) && max !== min
    const u = unit.toLowerCase()
    if (u.startsWith('min')) {
        return hasRange ? `${formatMinutes(min)}–${formatMinutes(max as number)}` : formatMinutes(min)
    }
    const suffix = u.startsWith('hour') ? 'h' : u.startsWith('day') ? 'd' : ` ${unit}`
    return hasRange ? `${min}–${max}${suffix}` : `${min}${suffix}`
}

/* ─────────────────────────────────────────────
   Flat item shape — each activity row carries its day context
   ───────────────────────────────────────────── */

interface FlatActivity {
    item: BudgetSlotItem
    dayNumber: number
    date: string
    cityName: string
}

/* ─────────────────────────────────────────────
   ActivityCard — JourneyCard per activity:
   [InfoCell | ProviderCell (tour rows) | MoreCell].
   Each card fetches its own tours (batch-provider backed) and reports
   price + availability back to the parent.
   ───────────────────────────────────────────── */

interface ActivityCardProps {
    activity: FlatActivity
    isExcluded: boolean
    onExclude: (slotId: string) => void
    onInclude?: (slotId: string) => void
    onSwap?: (slotId: string) => void
    onTourSelect?: (slotId: string, tourId: string | null) => void
    isCardRecalculating?: boolean
    onPriceReport?: (slotId: string, price: number | null) => void
    onTourAvailabilityReport?: (slotId: string, hasTours: boolean) => void
    /** Gates the live tour fetch so the per-row `/tours` + `/tour-data-status`
     *  calls only fire while the Budget tab is actually the active tab. */
    isActive: boolean
}

const ActivityCard: React.FC<ActivityCardProps> = ({
    activity,
    isExcluded,
    // onExclude intentionally not destructured — the exclude (eye-off) button is
    // hidden; the prop stays on the interface for when it's re-enabled.
    onInclude,
    onSwap,
    onTourSelect,
    isCardRecalculating,
    onPriceReport,
    onTourAvailabilityReport,
    isActive
}) => {
    const { item, date, cityName } = activity
    const [sneakPeekId, setSneakPeekId] = useState<string | null>(null)
    const track = useBudgetTrack()
    const [isExpanded, setIsExpanded] = useState(false)
    const experienceId = item.entity_id
    const isActivity = item.kind === 'experience'

    const { isRimigoInternal } = useUserInfo()
    const collectionIdentifier = useCollectionIdentifier()
    const tripOwnerName = useTripOwnerName()
    const ownerLabel = tripOwnerName ? tripOwnerName.toUpperCase() : 'TRAVELER'
    const canStaffToggle = isRimigoInternal && !!experienceId && !!collectionIdentifier
    const [curateTour, setCurateTour] = useState<AdaptedTourResponseType | null>(null)

    // Reads from the parent `TourLiveDataBatchProvider` (mounted below) when
    // the experience is in scope; falls through to its own 1-item stream
    // otherwise, and to legacy GET+poll on transport-failure fallback.
    const { tours, isLoading: isToursLoading, isPolling } = useToursForExperience(experienceId, false, isActive && !!experienceId, date)

    const sortedTours = useSortedToursByPriority(tours)

    const selectedTour = useMemo(() => {
        if (sortedTours.length === 0) return null
        return item.selected_tour_id ? sortedTours.find((t) => t.id === item.selected_tour_id) || sortedTours[0] : sortedTours[0]
    }, [sortedTours, item.selected_tour_id])

    // Per-tripboard price override re-prices the selected tour — same hook the Activities-tab
    // TourCard uses, and matching the budget snapshot server-side. Applied to BOTH the displayed
    // price and the price reported up for day/section totals so the row and totals stay in sync.
    const priceOverride = useTourPriceOverride(experienceId, selectedTour?.id)
    const selectedPrice = priceOverride?.price ?? selectedTour?.price?.min_price ?? null

    // Report selected tour price up for day/section totals
    useEffect(() => {
        if (!onPriceReport) return
        if (selectedTour) {
            onPriceReport(item.slot_id, selectedPrice)
        }
    }, [selectedTour, selectedPrice, item.slot_id, onPriceReport])

    // UI#5 — report zero-tour availability so parent can filter
    const toursSettled = !!experienceId && !isToursLoading && !isPolling
    useEffect(() => {
        if (!onTourAvailabilityReport || !toursSettled) return
        onTourAvailabilityReport(item.slot_id, sortedTours.length > 0)
    }, [toursSettled, sortedTours.length, item.slot_id, onTourAvailabilityReport])

    const showTourShimmer = isToursLoading || (!sortedTours.length && isPolling)

    const otherCount = Math.max(0, sortedTours.length - 1)

    // Free / self-guided: tours settled to zero but the item costs nothing —
    // it survives the parent's zero-tour filter and renders the "free
    // attraction" body instead of provider rows.
    const isFreeAttraction = toursSettled && !showTourShimmer && sortedTours.length === 0 && item.cost === 0

    const handleSneakPeek = () => {
        if (experienceId) {
            track(POSTHOG_EVENTS.BUDGET_TAB_ACTIVITY_ROW_TOGGLE, { slot_id: item.slot_id, experience_id: experienceId, open: true })
            setSneakPeekId(experienceId)
        }
    }

    // Info-cell click: open booking link if we have one; otherwise fall back
    // to the SneakPeek modal.
    const handleInfoClick = () => {
        const bookingUrl = selectedTour?.link || item.booking_link
        if (bookingUrl) {
            track(POSTHOG_EVENTS.BUDGET_TAB_ACTIVITY_BOOK_CLICK, {
                slot_id: item.slot_id,
                entity_id: item.entity_id,
                platform: selectedTour?.platform_name || item.platform,
                placement: 'card'
            })
            window.open(bookingUrl, '_blank', 'noopener,noreferrer')
            return
        }
        handleSneakPeek()
    }

    const renderTourBody = (tour: AdaptedTourResponseType) => {
        const durationLabel = formatDurationPill(tour.duration)
        const freeCancellation = !!tour.cancellation_policy && /free/i.test(tour.cancellation_policy)
        const tourLabel = tour.name || formatPlatformName(tour.platform_name)
        return (
            <div className="flex flex-col gap-1 min-w-0">
                <span
                    className="font-manrope text-[14px] font-medium tracking-[-0.28px] leading-[18px] text-grey-0 truncate"
                    title={tourLabel}>
                    {tourLabel}
                </span>
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <ProviderIdentity
                        name={formatPlatformName(tour.platform_name)}
                        faviconUrl={getPlatformLogoURL(tour.platform_name)}
                    />
                    {durationLabel && <TagPill>{durationLabel}</TagPill>}
                    {freeCancellation && <TagPill>Free Cancellation</TagPill>}
                    {!canStaffToggle && (tour.is_personally_recommended || tour.is_recommended) && (
                        <TagPill variant="success">
                            {tour.is_personally_recommended ? (isRimigoInternal && tripOwnerName ? `FOR ${ownerLabel}` : 'FOR YOU') : 'RECOMMENDED'}
                        </TagPill>
                    )}
                    {canStaffToggle && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation()
                                setCurateTour(tour)
                            }}
                            aria-label="Open curation controls"
                            title="Curate this tour"
                            className="w-5 h-5 rounded-full bg-white border border-grey-4 text-grey-2 hover:text-primary-default hover:border-primary-default flex items-center justify-center transition-colors cursor-pointer shrink-0">
                            <Settings2 className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>
        )
    }

    const renderTourPrice = (tour: AdaptedTourResponseType) => {
        const price = tour.id === selectedTour?.id ? selectedPrice : (tour.price?.min_price ?? null)
        return (
            <PriceButton
                price={price != null ? formatCurrency(price) : '—'}
                sub="per person"
                href={tour.link}
                struck={isExcluded}
                minWidthPx={114}
                centered
                onClick={(e) => {
                    e.stopPropagation()
                    track(POSTHOG_EVENTS.BUDGET_TAB_ACTIVITY_TOUR_LINK_CLICK, {
                        slot_id: item.slot_id,
                        tour_id: tour.id,
                        platform: tour.platform_name
                    })
                }}
            />
        )
    }

    // Secondary actions live as quiet icon buttons in the card's top-right
    // corner (via InfoCell's cornerAction), not as pills competing with the
    // price. The Exclude (eye-off) button is intentionally hidden; excluded
    // items still get an Include (eye) toggle, and Swap stays available.
    const iconBtn = 'w-7 h-7 rounded-full flex items-center justify-center text-grey-3 transition-colors cursor-pointer shrink-0'
    const cornerActions =
        isActivity && !showTourShimmer
            ? isExcluded
                ? onInclude && (
                      <button
                          type="button"
                          title="Include in budget"
                          aria-label="Include in budget"
                          onClick={(e) => {
                              e.stopPropagation()
                              onInclude(item.slot_id)
                          }}
                          className={`${iconBtn} hover:text-primary-default hover:bg-primary-pale-purple`}>
                          <Eye className="w-4 h-4" />
                      </button>
                  )
                : onSwap && (
                      <button
                          type="button"
                          title="Swap activity"
                          aria-label="Swap activity"
                          onClick={(e) => {
                              e.stopPropagation()
                              if (item.slot_id) {
                                  track(POSTHOG_EVENTS.BUDGET_TAB_ACTIVITY_SWAP_CLICK, { slot_id: item.slot_id })
                                  onSwap(item.slot_id)
                              }
                          }}
                          className={`${iconBtn} hover:text-primary-default hover:bg-grey-5`}>
                          <ArrowLeftRight className="w-4 h-4" />
                      </button>
                  )
            : null

    return (
        <div className="relative">
            {isCardRecalculating && (
                <div
                    className="absolute top-3 right-3 z-10"
                    aria-hidden="true">
                    <Loader className="w-4 h-4 animate-spin text-primary-default" />
                </div>
            )}
            <JourneyCard className={isCardRecalculating ? 'opacity-70' : ''}>
                <InfoCell
                    image={item.landscape_image}
                    title={item.title}
                    subtitle={cityName}
                    onClick={handleInfoClick}
                    cornerAction={cornerActions}
                />
                <ProviderCell>
                    {showTourShimmer && (
                        <div className="px-3 py-3 flex flex-col gap-2">
                            <CustomShimmer
                                height={14}
                                radius={4}
                                className="w-44"
                            />
                            <CustomShimmer
                                height={10}
                                radius={3}
                                className="w-24"
                            />
                        </div>
                    )}
                    {!showTourShimmer && isFreeAttraction && (
                        <ProviderRow
                            key="free"
                            body={
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="font-red-hat-display text-[14px] font-semibold tracking-[-0.28px] leading-[18px] text-grey-0">
                                        No ticket required
                                    </span>
                                    <span className="font-manrope text-[12px] tracking-[-0.24px] leading-4 text-grey-2">
                                        This attraction can be done on your own.
                                    </span>
                                </div>
                            }
                            right={<span className="font-red-hat-display text-[16px] font-bold tracking-[-0.32px] leading-5 text-grey-0">Free</span>}
                        />
                    )}
                    {!showTourShimmer && !isFreeAttraction && !isExpanded && selectedTour && (
                        <ProviderRow
                            key={selectedTour.id}
                            body={renderTourBody(selectedTour)}
                            right={renderTourPrice(selectedTour)}
                        />
                    )}
                    {!showTourShimmer &&
                        !isFreeAttraction &&
                        isExpanded &&
                        sortedTours.map((tour) => {
                            const isSelected = selectedTour?.id === tour.id
                            return (
                                <ProviderRow
                                    key={tour.id}
                                    showRadio
                                    selected={isSelected}
                                    onSelect={() => {
                                        if (!onTourSelect || isSelected) return
                                        onTourSelect(item.slot_id, tour.id)
                                        setIsExpanded(false)
                                    }}
                                    body={renderTourBody(tour)}
                                    right={renderTourPrice(tour)}
                                />
                            )
                        })}
                </ProviderCell>
                <MoreCell
                    count={otherCount}
                    expanded={isExpanded}
                    onToggle={() => {
                        track(POSTHOG_EVENTS.BUDGET_TAB_ACTIVITY_ROW_TOGGLE, {
                            slot_id: item.slot_id,
                            experience_id: experienceId,
                            open: !isExpanded
                        })
                        setIsExpanded((v) => !v)
                    }}
                />
            </JourneyCard>

            {sneakPeekId &&
                createPortal(
                    <SneakPeekModal
                        isOpen={true}
                        onClose={() => setSneakPeekId(null)}
                        experienceId={sneakPeekId}
                        triggerType="budget_tab"
                    />,
                    document.body
                )}

            {canStaffToggle && experienceId && curateTour && (
                <TourCuratePopover
                    open={!!curateTour}
                    onOpenChange={(open) => {
                        if (!open) setCurateTour(null)
                    }}
                    tour={curateTour}
                    experienceId={experienceId}
                    collectionIdentifier={collectionIdentifier}
                    checkIn={date}
                />
            )}
        </div>
    )
}

/* ─────────────────────────────────────────────
   Main Component — CategorySection shell + per-day SubSections
   ───────────────────────────────────────────── */

export const ActivitiesBudgetGroup: React.FC<ActivitiesBudgetGroupProps> = ({
    days,
    excludedActivities,
    onExclude,
    onInclude,
    onSwap,
    isPublic,
    onTourSelect,
    recalculationTrigger,
    onSectionTotalReport,
    isActive = true
}) => {
    // ObjectId of the collection in scope, for attribution query param.
    const collectionId = useCollectionId()

    // Live tour prices reported per slot (for totals)
    const [tourPrices, setTourPrices] = useState<Map<string, number | null>>(new Map())

    // UI#5 — zero-tour availability per slot
    const [tourAvailability, setTourAvailability] = useState<Map<string, boolean>>(new Map())

    const handlePriceReport = useCallback((slotId: string, price: number | null) => {
        setTourPrices((prev) => {
            if (prev.get(slotId) === price) return prev
            const next = new Map(prev)
            next.set(slotId, price)
            return next
        })
    }, [])

    const handleTourAvailabilityReport = useCallback((slotId: string, hasTours: boolean) => {
        setTourAvailability((prev) => {
            if (prev.get(slotId) === hasTours) return prev
            const next = new Map(prev)
            next.set(slotId, hasTours)
            return next
        })
    }, [])

    // Batch SSE items — derived from UNFILTERED days (not flatActivities) so
    // the batch signature doesn't churn as tours resolve and `tourAvailability`
    // shrinks the filtered list. Deduped by (experience_id, check_in) inside
    // the hook. Signature is stable → no stream restart per row settle.
    const batchItems: BatchItem[] = useMemo(() => {
        if (!isActive) return []
        const seen = new Set<string>()
        const items: BatchItem[] = []
        for (const day of days) {
            for (const item of day.items) {
                if (!item.entity_id) continue
                const key = `${item.entity_id}:${day.date ?? ''}`
                if (seen.has(key)) continue
                seen.add(key)
                items.push({ experienceId: item.entity_id, checkIn: day.date ?? null })
            }
        }
        return items
    }, [days, isActive])

    // Filter: drop items without entity_id and drop items confirmed to have
    // zero tours (UI#5) — UNLESS the item is free (cost 0), in which case it
    // stays and renders the self-guided "free attraction" card. Excluded items
    // REMAIN in the list — they render inline with a struck-through price and
    // an Include pill but are omitted from sectionTotal below.
    const flatActivities: FlatActivity[] = useMemo(() => {
        const flat: FlatActivity[] = []
        for (const day of days) {
            for (const item of day.items) {
                if (!item.entity_id) continue
                if (tourAvailability.get(item.slot_id) === false && item.cost > 0) continue
                flat.push({
                    item,
                    dayNumber: day.day_number,
                    date: day.date,
                    cityName: day.city_name
                })
            }
        }
        return flat
    }, [days, tourAvailability])

    // OR (not ??) so a backend `is_excluded: false` in a stale cached item
    // doesn't override the client's just-excluded Set during the recalc window.
    const isExcludedActivity = (item: BudgetSlotItem) => !!item.is_excluded || excludedActivities.has(item.slot_id)

    // Same aggregation the section header displays — kept above the
    // empty-early-return so the parent always gets a fresh report (including
    // 0 when no activities have tours) and the CostOverview breakdown matches.
    // Excluded activities are NOT counted in the total.
    const sectionTotal = flatActivities.reduce((sum, a) => {
        if (isExcludedActivity(a.item)) return sum
        const p = tourPrices.get(a.item.slot_id)
        return sum + (p != null ? p : a.item.cost)
    }, 0)

    useEffect(() => {
        onSectionTotalReport?.(sectionTotal)
    }, [sectionTotal, onSectionTotalReport])

    const totalActivities = flatActivities.length

    // Section-level indicator ("Updating prices…" spinner in the header) is
    // reserved for full_recalculate. Scoped triggers (activity_override,
    // activity_tour) light up only the specific card via `triggerSlotId` so
    // the UI stays quiet for small changes.
    const isSectionRecalculating = recalculationTrigger?.type === 'full_recalculate'

    const triggerSlotId =
        recalculationTrigger?.type === 'activity_tour' || recalculationTrigger?.type === 'activity_override' ? recalculationTrigger?.slot_id : null

    // Collapsible category body — default closed per the Bookings-tab design.
    const [isOpen, setIsOpen] = useState(false)
    const track = useBudgetTrack()

    // Day groups — consecutive items sharing a day_number collapse into one
    // SubSection with a "Day N · City" header.
    const dayGroups = useMemo(() => {
        type DayGroup = { dayNumber: number; date: string; cityName: string; activities: FlatActivity[] }
        const groups: DayGroup[] = []
        for (const a of flatActivities) {
            const last = groups[groups.length - 1]
            if (last && last.dayNumber === a.dayNumber) {
                last.activities.push(a)
            } else {
                groups.push({
                    dayNumber: a.dayNumber,
                    date: a.date,
                    cityName: a.cityName,
                    activities: [a]
                })
            }
        }
        return groups
    }, [flatActivities])

    // Render gate must come AFTER all hooks — `flatActivities` flips empty as
    // tour-availability reports drain in (or as the tab toggles isActive),
    // and short-circuiting before the hooks below would change hook count
    // across renders → "Rendered fewer hooks than expected".
    if (flatActivities.length === 0) return null

    return (
        <TourLiveDataBatchProvider
            items={batchItems}
            enabled={isActive}
            travelerCollectionId={collectionId}>
            <CategorySection
                icon={FERRIS_WHEEL_ICON}
                title="Activities"
                countLabel={`${totalActivities} booking${totalActivities !== 1 ? 's' : ''}`}
                price={formatCurrency(sectionTotal)}
                priceSub="per person"
                open={isOpen}
                // Keep cards mounted while collapsed so live tour prices are
                // fetched on tab load — the headline total is correct upfront
                // instead of jumping when Activities is first expanded.
                mountChildrenWhenClosed
                onToggle={() => {
                    track(POSTHOG_EVENTS.BUDGET_TAB_ACTIVITIES_SECTION_TOGGLE, { open: !isOpen })
                    setIsOpen((v) => !v)
                }}
                headerExtra={
                    isSectionRecalculating ? (
                        <span className="flex items-center gap-1.5 font-manrope text-[11px] font-medium text-primary-default">
                            <Loader className="w-3 h-3 animate-spin" />
                            Updating prices…
                        </span>
                    ) : undefined
                }>
                {dayGroups.map((group) => (
                    <SubSection key={group.dayNumber}>
                        <SubSectionHeader
                            lead={`Day ${group.dayNumber}`}
                            trailing={group.cityName}
                            right={!isPublic && group.date ? <SubSectionDate>{formatDate(group.date)}</SubSectionDate> : undefined}
                        />
                        {group.activities.map((activity) => (
                            <ActivityCard
                                key={activity.item.slot_id}
                                activity={activity}
                                isExcluded={isExcludedActivity(activity.item)}
                                onExclude={onExclude}
                                onInclude={onInclude}
                                onSwap={onSwap}
                                onTourSelect={onTourSelect}
                                isCardRecalculating={triggerSlotId === activity.item.slot_id}
                                onPriceReport={handlePriceReport}
                                onTourAvailabilityReport={handleTourAvailabilityReport}
                                isActive={isActive}
                            />
                        ))}
                    </SubSection>
                ))}
            </CategorySection>
        </TourLiveDataBatchProvider>
    )
}
