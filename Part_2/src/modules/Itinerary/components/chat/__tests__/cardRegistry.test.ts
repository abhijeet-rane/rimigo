import { describe, it, expect } from 'vitest'
import { CARD_REGISTRY, getCardEntry } from '../cardRegistry'

// ---------------------------------------------------------------------------
// All output_types from types.ts ItineraryOutputData union that MUST be in
// the registry. These are the chat card types with real components.
// ---------------------------------------------------------------------------

const REQUIRED_OUTPUT_TYPES = [
    'alternatives',
    'discovery',
    'navigation',
    'cost_estimate',
    'explanation',
    'date_shift',
    'trip_meta_update',
    'travel_info',
    'transport_logistics',
    'dynamic_form',
    'flight_search_results',
    'hotel_search_results',
    'clarification',
    'error_with_guidance'
] as const

// Output types that are rendered by special components outside the chat/
// directory (e.g. AIAssistantWindow). Their registry entries may have null
// components but must still declare handlesText correctly.
const EXTERNAL_OUTPUT_TYPES = [
    'update',
    'missing_fields',
    'category_recommendation',
    'itinerary'
] as const

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CARD_REGISTRY', () => {
    it('has an entry for every known output_type from ItineraryOutputData', () => {
        for (const outputType of REQUIRED_OUTPUT_TYPES) {
            expect(
                CARD_REGISTRY[outputType],
                `Missing registry entry for output_type "${outputType}"`
            ).toBeDefined()
        }
    })

    it('every chat card entry has a valid component (not null/undefined)', () => {
        for (const outputType of REQUIRED_OUTPUT_TYPES) {
            const entry = CARD_REGISTRY[outputType]
            if (!entry) continue // covered by the "has an entry" test

            expect(
                entry.component,
                `Entry "${outputType}" has null/undefined component`
            ).toBeDefined()
            expect(
                typeof entry.component === 'function' || typeof entry.component === 'object',
                `Entry "${outputType}" component is not a valid React component type`
            ).toBe(true)
        }
    })

    it('every entry has handlesText as a boolean', () => {
        for (const [outputType, entry] of Object.entries(CARD_REGISTRY)) {
            expect(
                typeof entry.handlesText,
                `Entry "${outputType}" handlesText is ${typeof entry.handlesText}, expected boolean`
            ).toBe('boolean')
        }
    })

    it('every entry with requiredHooks has it as an array of strings', () => {
        for (const [outputType, entry] of Object.entries(CARD_REGISTRY)) {
            if (entry.requiredHooks !== undefined) {
                expect(
                    Array.isArray(entry.requiredHooks),
                    `Entry "${outputType}" requiredHooks is not an array`
                ).toBe(true)
                for (const hook of entry.requiredHooks!) {
                    expect(
                        typeof hook,
                        `Entry "${outputType}" has non-string requiredHook: ${hook}`
                    ).toBe('string')
                }
            }
        }
    })

    it('covers at minimum all 14 required output types', () => {
        const registeredTypes = Object.keys(CARD_REGISTRY)
        for (const t of REQUIRED_OUTPUT_TYPES) {
            expect(registeredTypes, `Registry does not contain "${t}"`).toContain(t)
        }
    })

    it('does not contain entries with empty string keys', () => {
        expect(CARD_REGISTRY).not.toHaveProperty('')
    })

    it('external output types have entries with handlesText declared', () => {
        for (const outputType of EXTERNAL_OUTPUT_TYPES) {
            const entry = CARD_REGISTRY[outputType]
            if (entry) {
                expect(
                    typeof entry.handlesText,
                    `External entry "${outputType}" handlesText is not boolean`
                ).toBe('boolean')
            }
        }
    })
})

describe('getCardEntry', () => {
    it('returns the correct entry for each known output_type', () => {
        for (const outputType of REQUIRED_OUTPUT_TYPES) {
            const entry = getCardEntry(outputType)
            expect(entry, `getCardEntry("${outputType}") returned undefined`).toBeDefined()
            expect(entry).toBe(CARD_REGISTRY[outputType])
        }
    })

    it('returns undefined for an unknown output_type', () => {
        expect(getCardEntry('nonexistent_type')).toBeUndefined()
    })

    it('returns undefined for an empty string', () => {
        expect(getCardEntry('')).toBeUndefined()
    })

    it('is case-sensitive (uppercase variant returns undefined)', () => {
        expect(getCardEntry('ALTERNATIVES')).toBeUndefined()
        expect(getCardEntry('Navigation')).toBeUndefined()
    })

    it('returns an entry with the expected shape', () => {
        const entry = getCardEntry('alternatives')
        expect(entry).toBeDefined()
        expect(entry).toHaveProperty('component')
        expect(entry).toHaveProperty('handlesText')
    })
})
