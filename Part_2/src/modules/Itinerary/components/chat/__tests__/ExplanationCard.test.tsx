import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import ExplanationCard from '../ExplanationCard'
import type { ExplanationData } from '../types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fullData: ExplanationData = {
    output_type: 'explanation',
    response: 'Let me explain why this activity was chosen.',
    subject: 'Fushimi Inari Shrine',
    reasoning:
        'Fushimi Inari is the most visited shrine in Kyoto. The thousands of vermillion torii gates create an unforgettable experience. It is best visited early morning to avoid crowds.',
    related_slots: [
        { day_index: 2, slot_index: 0, title: 'Kinkaku-ji Temple' },
        { day_index: 2, slot_index: 2, title: 'Arashiyama Bamboo Grove' }
    ]
}

const noRelatedSlotsData: ExplanationData = {
    output_type: 'explanation',
    response: 'Here is the explanation.',
    subject: 'Hotel Selection',
    reasoning: 'This hotel was chosen for its central location and excellent reviews.',
    related_slots: []
}

const slotsWithoutTitles: ExplanationData = {
    output_type: 'explanation',
    response: 'Explanation with untitled slots.',
    subject: 'Route Optimization',
    reasoning: 'The route was optimized for minimal travel time.',
    related_slots: [
        { day_index: 0, slot_index: 1 },
        { day_index: 3, slot_index: 0 }
    ]
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ExplanationCard', () => {
    it('renders the response text', () => {
        render(<ExplanationCard data={fullData} />)
        expect(screen.getByText('Let me explain why this activity was chosen.')).toBeInTheDocument()
    })

    it('renders the subject', () => {
        render(<ExplanationCard data={fullData} />)
        expect(screen.getByText('Fushimi Inari Shrine')).toBeInTheDocument()
        expect(screen.getByText(/About:/)).toBeInTheDocument()
    })

    it('renders the reasoning text', () => {
        render(<ExplanationCard data={fullData} />)
        expect(
            screen.getByText(/Fushimi Inari is the most visited shrine in Kyoto/)
        ).toBeInTheDocument()
    })

    it('renders related slot buttons with titles', () => {
        render(<ExplanationCard data={fullData} />)

        expect(screen.getByText('Related Activities')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Kinkaku-ji Temple/ })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Arashiyama Bamboo Grove/ })).toBeInTheDocument()
    })

    it('clicking a slot button calls onNavigateToSlot with correct indices', async () => {
        const user = userEvent.setup()
        const onNavigateToSlot = vi.fn()

        render(<ExplanationCard data={fullData} onNavigateToSlot={onNavigateToSlot} />)

        await user.click(screen.getByRole('button', { name: /Kinkaku-ji Temple/ }))
        expect(onNavigateToSlot).toHaveBeenCalledWith(2, 0)

        await user.click(screen.getByRole('button', { name: /Arashiyama Bamboo Grove/ }))
        expect(onNavigateToSlot).toHaveBeenCalledWith(2, 2)
    })

    it('does not render "Related Activities" section when related_slots is empty', () => {
        render(<ExplanationCard data={noRelatedSlotsData} />)

        expect(screen.queryByText('Related Activities')).not.toBeInTheDocument()
    })

    it('renders fallback labels for slots without titles', () => {
        render(<ExplanationCard data={slotsWithoutTitles} />)

        // day_index 0 -> Day 1, slot_index 1 -> Slot 2
        expect(screen.getByRole('button', { name: /Day 1, Slot 2/ })).toBeInTheDocument()
        // day_index 3 -> Day 4, slot_index 0 -> Slot 1
        expect(screen.getByRole('button', { name: /Day 4, Slot 1/ })).toBeInTheDocument()
    })

    it('does not crash when onNavigateToSlot is not provided', async () => {
        const user = userEvent.setup()
        render(<ExplanationCard data={fullData} />)

        const button = screen.getByRole('button', { name: /Kinkaku-ji Temple/ })
        await user.click(button)
        // Should not throw
    })

    it('does not render reasoning block when reasoning is empty', () => {
        const data: ExplanationData = {
            ...fullData,
            reasoning: ''
        }

        render(<ExplanationCard data={data} />)

        // Subject should still be present
        expect(screen.getByText('Fushimi Inari Shrine')).toBeInTheDocument()
    })

    it('does not render response text when response is empty', () => {
        const data: ExplanationData = {
            ...fullData,
            response: ''
        }

        render(<ExplanationCard data={data} />)

        // Subject and reasoning should still render
        expect(screen.getByText('Fushimi Inari Shrine')).toBeInTheDocument()
        expect(screen.getByText(/Fushimi Inari is the most visited shrine/)).toBeInTheDocument()
    })
})
