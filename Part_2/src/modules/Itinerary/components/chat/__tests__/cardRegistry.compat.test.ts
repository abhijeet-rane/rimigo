/**
 * Backward-compatibility snapshot test for the card registry.
 *
 * For each output_type we create a minimal mock interaction and verify
 * that looking it up through the registry produces the expected entry.
 * This catches regressions if the registry refactor breaks any type mapping.
 */
import { describe, it, expect } from 'vitest'
import { CARD_REGISTRY, getCardEntry } from '../cardRegistry'
import type {
    AlternativesData,
    DiscoveryData,
    NavigationData,
    CostEstimateData,
    ExplanationData,
    DateShiftData,
    TripMetaUpdateData,
    TravelInfoData,
    TransportLogisticsData,
    DynamicFormData,
    FlightSearchResultsData,
    HotelSearchResultsData,
    ClarificationData,
    ErrorWithGuidanceData,
    ItineraryOutputData
} from '../types'

// ---------------------------------------------------------------------------
// Minimal mock interactions — one per output_type
// ---------------------------------------------------------------------------

const mockInteractions: Record<string, ItineraryOutputData> = {
    alternatives: {
        output_type: 'alternatives',
        response: 'Here are alternatives.',
        slot_ref: { day_index: 0, slot_index: 0 },
        current_title: 'Test Activity',
        slot_kind: 'activity',
        experience_alternatives: [],
        place_alternatives: []
    } satisfies AlternativesData,

    discovery: {
        output_type: 'discovery',
        response: 'Found some places.',
        query: 'coffee shops',
        results: []
    } satisfies DiscoveryData,

    navigation: {
        output_type: 'navigation',
        response: 'Navigating to slot.',
        found: true,
        slot_ref: { day_index: 1, slot_index: 0 }
    } satisfies NavigationData,

    cost_estimate: {
        output_type: 'cost_estimate',
        response: 'Cost breakdown.',
        scope: 'trip',
        items: [],
        total: 0,
        currency: 'INR'
    } satisfies CostEstimateData,

    explanation: {
        output_type: 'explanation',
        response: 'Explanation follows.',
        subject: 'Test Subject',
        reasoning: 'Because reasons.',
        related_slots: []
    } satisfies ExplanationData,

    date_shift: {
        output_type: 'date_shift',
        response: 'Dates shifted.',
        days_shifted: 1,
        shifted_days: [],
        applied: true
    } satisfies DateShiftData,

    trip_meta_update: {
        output_type: 'trip_meta_update',
        response: 'Trip updated.',
        field_changed: 'title',
        new_value: 'New Title',
        side_effects: []
    } satisfies TripMetaUpdateData,

    travel_info: {
        output_type: 'travel_info',
        response: 'Travel info.',
        subject: 'Visa Requirements',
        key_facts: []
    } satisfies TravelInfoData,

    transport_logistics: {
        output_type: 'transport_logistics',
        response: 'Transport details.',
        segments: []
    } satisfies TransportLogisticsData,

    dynamic_form: {
        output_type: 'dynamic_form',
        response: 'Please fill out this form.',
        form_schema_json: '{}',
        ui_schema_json: '{}',
        form_context: 'test',
        step_count: 1
    } satisfies DynamicFormData,

    flight_search_results: {
        output_type: 'flight_search_results',
        response: 'Found flights.',
        origin: 'DEL',
        destination: 'NRT',
        flights: []
    } satisfies FlightSearchResultsData,

    hotel_search_results: {
        output_type: 'hotel_search_results',
        response: 'Found hotels.',
        hotels: [],
        city_name: 'Tokyo'
    } satisfies HotelSearchResultsData,

    clarification: {
        output_type: 'clarification',
        response: 'Could you clarify which day?',
        suggested_replies: ['Day 1', 'Day 2']
    } satisfies ClarificationData,

    error_with_guidance: {
        output_type: 'error_with_guidance',
        response: 'I could not find that activity.',
        suggested_actions: ['Try a different search']
    } satisfies ErrorWithGuidanceData
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Card registry backward compatibility', () => {
    describe('every output_type maps to the correct registry entry', () => {
        for (const [outputType, mockData] of Object.entries(mockInteractions)) {
            it(`output_type "${outputType}" resolves to a valid card entry`, () => {
                const entry = getCardEntry(mockData.output_type)

                expect(
                    entry,
                    `getCardEntry("${mockData.output_type}") returned undefined — ` +
                        `this output_type is no longer registered`
                ).toBeDefined()

                expect(entry!.component).toBeDefined()
                expect(typeof entry!.handlesText).toBe('boolean')
            })
        }
    })

    describe('registry entry snapshot stability', () => {
        it('registry keys match the full set of known output_types', () => {
            const registryKeys = Object.keys(CARD_REGISTRY).sort()
            const expectedKeys = Object.keys(mockInteractions).sort()

            // The registry may contain more keys than our mock set (future types),
            // but it must contain at least every key we test.
            for (const key of expectedKeys) {
                expect(
                    registryKeys,
                    `Registry is missing output_type "${key}"`
                ).toContain(key)
            }
        })

        it('handlesText values have not changed unexpectedly', () => {
            // Snapshot the handlesText mapping so that any change is detected
            const handlesTextMap: Record<string, boolean> = {}
            for (const outputType of Object.keys(mockInteractions)) {
                const entry = getCardEntry(outputType)
                if (entry) {
                    handlesTextMap[outputType] = entry.handlesText
                }
            }

            // Use inline snapshot — this will fail if any handlesText value changes,
            // forcing the developer to acknowledge the change explicitly.
            expect(handlesTextMap).toMatchSnapshot()
        })
    })

    describe('output_type field round-trips correctly', () => {
        for (const [outputType, mockData] of Object.entries(mockInteractions)) {
            it(`mock interaction "${outputType}" has output_type that matches its key`, () => {
                // Ensures our mock data is self-consistent
                expect(mockData.output_type).toBe(outputType)
            })
        }
    })

    describe('component references are stable', () => {
        it('each output_type maps to the same component on repeated lookups', () => {
            for (const outputType of Object.keys(mockInteractions)) {
                const first = getCardEntry(outputType)
                const second = getCardEntry(outputType)

                expect(first).toBe(second)
                expect(first?.component).toBe(second?.component)
            }
        })
    })
})
