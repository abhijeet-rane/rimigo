import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import AlternativesCarousel from '../AlternativesCarousel'
import type { AlternativesData, AlternativeItem } from '../types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseAlternative: AlternativeItem = {
    entity_id: 'alt-1',
    name: 'Senso-ji Temple',
    image_url: 'https://example.com/sensoji.jpg',
    categories: ['Temple', 'Historic', 'Cultural'],
    estimated_cost: 500,
    currency: 'INR',
    duration_minutes: 90,
    match_reason: 'Highly rated cultural site near your hotel',
    short_description: 'Ancient Buddhist temple in Asakusa'
}

const secondAlternative: AlternativeItem = {
    entity_id: 'alt-2',
    name: 'Meiji Shrine',
    categories: ['Shrine', 'Nature'],
    estimated_cost: 0,
    currency: 'INR',
    duration_minutes: 60,
    match_reason: 'Beautiful shrine surrounded by forest'
}

const fullData: AlternativesData = {
    output_type: 'alternatives',
    response: 'Here are some alternatives to Fushimi Inari Shrine:',
    slot_ref: { day_index: 2, slot_index: 1, title: 'Fushimi Inari Shrine', kind: 'activity' },
    current_title: 'Fushimi Inari Shrine',
    alternatives: [baseAlternative, secondAlternative]
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AlternativesCarousel', () => {
    it('renders the response text', () => {
        render(<AlternativesCarousel data={fullData} />)
        expect(screen.getByText('Here are some alternatives to Fushimi Inari Shrine:')).toBeInTheDocument()
    })

    it('renders all alternative cards with name, categories, cost, and duration', () => {
        render(<AlternativesCarousel data={fullData} />)

        // Names
        expect(screen.getByText('Senso-ji Temple')).toBeInTheDocument()
        expect(screen.getByText('Meiji Shrine')).toBeInTheDocument()

        // Categories
        expect(screen.getByText('Temple')).toBeInTheDocument()
        expect(screen.getByText('Historic')).toBeInTheDocument()
        expect(screen.getByText('Cultural')).toBeInTheDocument()
        expect(screen.getByText('Shrine')).toBeInTheDocument()
        expect(screen.getByText('Nature')).toBeInTheDocument()

        // Duration
        expect(screen.getByText('90 min')).toBeInTheDocument()
        expect(screen.getByText('60 min')).toBeInTheDocument()
    })

    it('renders a Select button for each alternative', () => {
        render(<AlternativesCarousel data={fullData} />)
        const selectButtons = screen.getAllByRole('button', { name: 'Select' })
        expect(selectButtons).toHaveLength(2)
    })

    it('calls onSendAgentMessage with the correct message when Select is clicked', async () => {
        const user = userEvent.setup()
        const onSendAgentMessage = vi.fn()

        render(<AlternativesCarousel data={fullData} onSendAgentMessage={onSendAgentMessage} />)

        const selectButtons = screen.getAllByRole('button', { name: 'Select' })

        // Click the first Select (Senso-ji Temple). day_index=2 -> day 3
        await user.click(selectButtons[0])
        expect(onSendAgentMessage).toHaveBeenCalledWith(
            'Replace Fushimi Inari Shrine with Senso-ji Temple on day 3'
        )

        // Click the second Select (Meiji Shrine)
        await user.click(selectButtons[1])
        expect(onSendAgentMessage).toHaveBeenCalledWith(
            'Replace Fushimi Inari Shrine with Meiji Shrine on day 3'
        )
    })

    it('does not crash when onSendAgentMessage is not provided', async () => {
        const user = userEvent.setup()
        render(<AlternativesCarousel data={fullData} />)

        const selectButtons = screen.getAllByRole('button', { name: 'Select' })
        // Should not throw
        await user.click(selectButtons[0])
    })

    it('handles missing optional fields (no image, no cost, no categories)', () => {
        const minimalAlt: AlternativeItem = {
            name: 'Minimal Place',
            categories: [],
            currency: 'INR',
            match_reason: 'Budget friendly'
        }

        const data: AlternativesData = {
            ...fullData,
            alternatives: [minimalAlt]
        }

        render(<AlternativesCarousel data={data} />)

        expect(screen.getByText('Minimal Place')).toBeInTheDocument()
        expect(screen.getByText('Budget friendly')).toBeInTheDocument()
        // Should render the initial letter fallback instead of an image
        expect(screen.getByText('M')).toBeInTheDocument()
    })

    it('handles empty alternatives array', () => {
        const data: AlternativesData = {
            ...fullData,
            alternatives: []
        }

        render(<AlternativesCarousel data={data} />)

        // Response text should still render
        expect(screen.getByText('Here are some alternatives to Fushimi Inari Shrine:')).toBeInTheDocument()
        // No Select buttons
        expect(screen.queryAllByRole('button', { name: 'Select' })).toHaveLength(0)
    })

    it('does not render response text when response is empty', () => {
        const data: AlternativesData = {
            ...fullData,
            response: ''
        }

        const { container } = render(<AlternativesCarousel data={data} />)

        // The first child should not be a <p> with response text
        const paragraphs = container.querySelectorAll('p')
        const responseP = Array.from(paragraphs).find(
            (p) => p.textContent === 'Here are some alternatives to Fushimi Inari Shrine:'
        )
        expect(responseP).toBeUndefined()
    })

    it('truncates categories to a maximum of 3', () => {
        const altWithManyCategories: AlternativeItem = {
            name: 'Many Cats Place',
            categories: ['Cat1', 'Cat2', 'Cat3', 'Cat4', 'Cat5'],
            currency: 'INR',
            match_reason: 'Test'
        }

        const data: AlternativesData = {
            ...fullData,
            alternatives: [altWithManyCategories]
        }

        render(<AlternativesCarousel data={data} />)

        expect(screen.getByText('Cat1')).toBeInTheDocument()
        expect(screen.getByText('Cat2')).toBeInTheDocument()
        expect(screen.getByText('Cat3')).toBeInTheDocument()
        expect(screen.queryByText('Cat4')).not.toBeInTheDocument()
        expect(screen.queryByText('Cat5')).not.toBeInTheDocument()
    })
})
