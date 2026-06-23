import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import InlinePresentOptionsCard from '../InlinePresentOptionsCard'

// Mock the cross-module card components so we exercise the carousel's
// kind-aware branching in isolation rather than the inner card internals
// (and their transitive providers/modals).
vi.mock('../ExperienceOptionCard', () => ({
    default: ({
        data,
        reason,
        onView,
        action
    }: {
        data: { id: string; title: string }
        reason?: string
        onView?: () => void
        action?: ReactNode
    }) => (
        <div
            data-testid="experience-card"
            onClick={() => onView?.()}>
            {data.title}
            {reason ? ` — ${reason}` : ''}
            {action}
        </div>
    )
}))
vi.mock('@/modules/Experiences/adapters/experienceAdapter', () => ({
    adaptConciergeExperienceCardData: (cardData: { id: string; name: string }) => ({
        id: cardData.id,
        title: cardData.name
    })
}))
vi.mock('../FlightTransportCard', () => ({
    default: ({ flight }: { flight: { airline?: string; flight_number?: string } }) => (
        <div data-testid="flight-card">
            {flight.airline} {flight.flight_number}
        </div>
    )
}))

const experienceItem = (overrides: Record<string, unknown> = {}) => ({
    display: { title: 'Skydiving Cebu', subtitle: 'Best pick — quieter than Cenang' },
    on_select: {
        action_text: 'Add Skydiving to day 2',
        structured_data: { day: 2, op: 'add', entity_id: 'exp-1' }
    },
    card_data: { id: 'exp-1', name: 'Skydiving over Mactan' },
    hydration_status: 'hydrated',
    ...overrides
})

const flightItem = {
    display: { title: 'IndiGo 6E 1234' },
    on_select: {
        action_text: 'Add this flight',
        structured_data: { flight_reference: 'AK377@DPS-BLR@15:25' }
    },
    card_data: {
        airline: 'IndiGo',
        flight_number: '6E 1234',
        origin: 'DEL',
        destination: 'BOM',
        departure_time: '2026-06-01T09:10:00',
        arrival_time: '2026-06-01T11:20:00',
        duration_minutes: 130,
        stops: 0,
        price: 4820,
        currency: 'INR'
    },
    hydration_status: 'hydrated'
}

describe('InlinePresentOptionsCard — typed carousels', () => {
    it('renders the experience option card (hydrated) with the AI reason and a Select', () => {
        render(
            <InlinePresentOptionsCard
                kind="experience_carousel"
                items={[experienceItem()]}
                interactionId="int-1"
                onSelect={vi.fn()}
            />
        )
        const card = screen.getByTestId('experience-card')
        expect(card).toHaveTextContent('Skydiving over Mactan')
        expect(card).toHaveTextContent('Best pick — quieter than Cenang')
        expect(screen.getByRole('radio', { name: 'Select' })).toBeInTheDocument()
    })

    it('fires onSelect with action_text and the on_select.structured_data directive (not the whole item)', async () => {
        const user = userEvent.setup()
        const onSelect = vi.fn()
        render(
            <InlinePresentOptionsCard
                kind="experience_carousel"
                items={[experienceItem()]}
                interactionId="int-1"
                onSelect={onSelect}
            />
        )
        await user.click(screen.getByRole('radio', { name: 'Select' }))
        expect(onSelect).toHaveBeenCalledTimes(1)
        const [text, meta] = onSelect.mock.calls[0]
        expect(text).toBe('Add Skydiving to day 2')
        expect(meta.action).toBe('present_options_select')
        expect(meta.source_interaction_id).toBe('int-1')
        // The authored + backend-enriched directive flows back verbatim …
        expect(meta.structured_data).toEqual({ day: 2, op: 'add', entity_id: 'exp-1' })
        // … and the heavy card_data payload is NOT echoed back to the model.
        expect(meta.structured_data).not.toHaveProperty('card_data')
    })

    it('renders the flight card (hydrated) in a flight_carousel', () => {
        render(
            <InlinePresentOptionsCard
                kind="flight_carousel"
                items={[flightItem]}
                interactionId="int-2"
                onSelect={vi.fn()}
            />
        )
        expect(screen.getByTestId('flight-card')).toHaveTextContent('IndiGo 6E 1234')
        expect(screen.getByRole('radio', { name: 'Select' })).toBeInTheDocument()
    })

    it('falls back to the generic tile when an experience item is not hydrated', () => {
        render(
            <InlinePresentOptionsCard
                kind="experience_carousel"
                items={[experienceItem({ hydration_status: 'fallback', card_data: undefined })]}
                interactionId="int-3"
                onSelect={vi.fn()}
            />
        )
        expect(screen.queryByTestId('experience-card')).not.toBeInTheDocument()
        expect(screen.getByText('Skydiving Cebu')).toBeInTheDocument()
    })

    it('renders a restaurant_carousel with the shared experience card layout', () => {
        render(
            <InlinePresentOptionsCard
                kind="restaurant_carousel"
                items={[{
                    display: { title: 'Cafe Secret Alley', subtitle: 'Quiet courtyard, great filter coffee' },
                    on_select: { action_text: 'Swap lunch', structured_data: { day: 3, place_id: 'gp123' } },
                    card_data: { name: 'Cafe Secret Alley', rating: 4.6, formatted_address: '1 Lane, Kandy', photo_url: 'https://cdn/p.jpg' },
                    hydration_status: 'hydrated'
                }]}
                interactionId="int-5"
                onSelect={vi.fn()}
            />
        )
        // Restaurants/places reuse the same ExperienceOptionCard layout.
        const card = screen.getByTestId('experience-card')
        expect(card).toHaveTextContent('Cafe Secret Alley')
        expect(card).toHaveTextContent('Quiet courtyard, great filter coffee')
        expect(screen.getByRole('radio', { name: 'Select' })).toBeInTheDocument()
    })

    it('renders the generic tile for non-typed kinds', () => {
        render(
            <InlinePresentOptionsCard
                kind="generic_options"
                items={[{ display: { title: 'Plain option' }, on_select: { action_text: 'Pick' } }]}
                interactionId="int-4"
                onSelect={vi.fn()}
            />
        )
        expect(screen.queryByTestId('experience-card')).not.toBeInTheDocument()
        expect(screen.queryByTestId('flight-card')).not.toBeInTheDocument()
        expect(screen.getByText('Plain option')).toBeInTheDocument()
    })
})
