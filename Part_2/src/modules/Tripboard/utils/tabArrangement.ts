import { getSectionTypesVisibleInTabs } from '@/modules/ContentCollection/lib/collectionConfig'
import { itineraryHasMealSlots } from '@/modules/ContentCollection/utils/itineraryFoodAdapter'
import type { IItineraryCompletedResponse } from '@/modules/Itinerary/hooks/ItineraryHook'

export interface SectionType {
    section_type: string
    name: string
}

export const MUST_HAVE_SECTION_TYPES = new Set(['links', 'sim', 'tips', 'visa'])

const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
    restaurant: 'Food',
    experience: 'Activities',
    flights: 'Flights'
}

/**
 * Build the tripboard tab list from server-provided section types.
 *
 * Order rules (applied in this order so the last one wins on conflict):
 *   1. Display names overridden (restaurant→Food, experience→Activities, flights→Flights).
 *   2. Stays + Flights are guaranteed to exist (appended if missing — final
 *      positions fixed below). Flights is always visible because the tab
 *      drives its own search/shortlist UX even when no flights are saved yet.
 *   3. visa/links/sim collapsed into a single "Must Have" tab at the first such position.
 *   4. Stays repositioned to immediately BEFORE Activities.
 *   5. Flights repositioned to immediately AFTER Activities.
 *   6. Budget inserted after Flights so the cluster
 *      Stays → Activities → Flights → Budget stays contiguous.
 */
export function buildBaseAllTabs(sectionTypes: SectionType[]): SectionType[] {
    const visibleSectionTypes = getSectionTypesVisibleInTabs('traveler_collections', sectionTypes)
    const withDisplayNames: SectionType[] = visibleSectionTypes.map((t) => {
        const override = DISPLAY_NAME_OVERRIDES[t.section_type]
        return override ? { ...t, name: override } : t
    })

    if (!withDisplayNames.some((t) => t.section_type === 'stays')) {
        withDisplayNames.push({ section_type: 'stays', name: 'Stays' })
    }
    if (!withDisplayNames.some((t) => t.section_type === 'flights')) {
        withDisplayNames.push({ section_type: 'flights', name: 'Flights' })
    }

    const hasMustHaveSection = withDisplayNames.some((t) => MUST_HAVE_SECTION_TYPES.has(t.section_type))
    const baseTabs = hasMustHaveSection ? collapseMustHave(withDisplayNames) : withDisplayNames

    if (baseTabs.length === 0) return baseTabs

    const reordered = [...baseTabs]
    moveStaysBeforeExperience(reordered)
    moveFlightsAfterExperience(reordered)
    insertBudget(reordered)
    return reordered
}

/**
 * Append a synthetic Food tab when the collection has no restaurant section but the
 * itinerary has meal slots. Placed next to Budget (or end) to mirror the natural order.
 */
export function appendSyntheticFoodTab(
    baseAllTabs: SectionType[],
    itineraryData: IItineraryCompletedResponse | undefined
): SectionType[] {
    const hasRestaurantTab = baseAllTabs.some((t) => t.section_type === 'restaurant')
    if (hasRestaurantTab || !itineraryHasMealSlots(itineraryData)) return baseAllTabs
    const budgetIdx = baseAllTabs.findIndex((t) => t.section_type === 'budget')
    const foodTab: SectionType = { section_type: 'restaurant', name: 'Food' }
    if (budgetIdx >= 0) {
        return [...baseAllTabs.slice(0, budgetIdx + 1), foodTab, ...baseAllTabs.slice(budgetIdx + 1)]
    }
    return [...baseAllTabs, foodTab]
}

/**
 * Append a synthetic Vouchers tab when the trip has ≥1 voucher, OR when the
 * caller explicitly wants the tab present (e.g. user just clicked
 * "Add Vouchers" in the header — the URL pushes `?tab=vouchers` and we
 * pass `force: true` so the tab strip can resolve the active tab). Once a
 * voucher exists server-side, the tab sticks around without `force`.
 *
 * Always placed at the end of the strip — vouchers are companion content
 * for travelers, not part of the planning cluster (Stays → Activities →
 * Flights → Budget).
 */
export function appendSyntheticVouchersTab(
    baseAllTabs: SectionType[],
    opts: { voucherCount: number; force?: boolean }
): SectionType[] {
    const hasVouchersTab = baseAllTabs.some((t) => t.section_type === 'vouchers')
    if (hasVouchersTab) return baseAllTabs
    if (opts.voucherCount <= 0 && !opts.force) return baseAllTabs
    return [...baseAllTabs, { section_type: 'vouchers', name: 'Vouchers' }]
}

/**
 * Collapse Tips/Sim/Visa/Links into a single "Must Have" tab at the position
 * of the first matching section type. */
export function collapseMustHave(tabs: SectionType[]): SectionType[] {
    const merged: SectionType[] = []
    let inserted = false
    for (const t of tabs) {
        if (MUST_HAVE_SECTION_TYPES.has(t.section_type)) {
            if (!inserted) {
                merged.push({ ...t, section_type: 'must_have', name: 'Must Have' })
                inserted = true
            }
        } else {
            merged.push(t)
        }
    }
    return merged
}

function moveFlightsAfterExperience(tabs: SectionType[]): void {
    const flightsIdx = tabs.findIndex((t) => t.section_type === 'flights')
    const experienceIdx = tabs.findIndex((t) => t.section_type === 'experience')
    if (flightsIdx < 0 || experienceIdx < 0 || flightsIdx === experienceIdx + 1) return
    const [flightsTab] = tabs.splice(flightsIdx, 1)
    const newExperienceIdx = tabs.findIndex((t) => t.section_type === 'experience')
    tabs.splice(newExperienceIdx + 1, 0, flightsTab)
}

export function insertBudget(tabs: SectionType[]): void {
    // Visible label is "Bookings" (design revamp); section_type stays 'budget'
    // so ?tab=budget deep links and analytics keep working.
    const budgetTab: SectionType = { section_type: 'budget', name: 'Bookings' }
    const flightsAnchor = tabs.findIndex((t) => t.section_type === 'flights')
    const experienceAnchor = tabs.findIndex((t) => t.section_type === 'experience')
    const staysAnchor = tabs.findIndex((t) => t.section_type === 'stays')
    // Anchor priority matches the cluster order Stays → Activities → Flights → Budget,
    // so Budget lands right after the cluster's tail (Flights), with sensible
    // fallbacks when earlier anchors are absent.
    let insertAt: number
    if (flightsAnchor >= 0) insertAt = flightsAnchor + 1
    else if (experienceAnchor >= 0) insertAt = experienceAnchor + 1
    else if (staysAnchor >= 0) insertAt = staysAnchor + 1
    else insertAt = tabs.length
    tabs.splice(insertAt, 0, budgetTab)
}

function moveStaysBeforeExperience(tabs: SectionType[]): void {
    const staysIdx = tabs.findIndex((t) => t.section_type === 'stays')
    const experienceIdx = tabs.findIndex((t) => t.section_type === 'experience')
    // Already correctly placed: Stays directly precedes Activities.
    if (staysIdx < 0 || experienceIdx < 0 || staysIdx === experienceIdx - 1) return
    const [staysTab] = tabs.splice(staysIdx, 1)
    // After splice, re-find experience because the index may have shifted left.
    const newExperienceIdx = tabs.findIndex((t) => t.section_type === 'experience')
    tabs.splice(newExperienceIdx, 0, staysTab)
}
