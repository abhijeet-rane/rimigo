import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import NavigationCard from '../NavigationCard'
import type { NavigationData } from '../types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const foundData: NavigationData = {
    output_type: 'navigation',
    response: 'Found your activity! Here it is:',
    found: true,
    slot_ref: { day_index: 3, slot_index: 2, title: 'Tsukiji Fish Market', kind: 'activity' },
    day_date: '2025-04-15'
}

const notFoundData: NavigationData = {
    output_type: 'navigation',
    response: 'I could not find that activity in your itinerary.',
    found: false
}

const foundNoTitleData: NavigationData = {
    output_type: 'navigation',
    response: 'Navigating to the slot.',
    found: true,
    slot_ref: { day_index: 0, slot_index: 0 },
    day_date: '2025-04-12'
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NavigationCard', () => {
    it('renders the response text', () => {
        render(<NavigationCard data={foundData} />)
        expect(screen.getByText('Found your activity! Here it is:')).toBeInTheDocument()
    })

    it('shows slot details and "Go to Day" button when found is true', () => {
        render(<NavigationCard data={foundData} />)

        // Title
        expect(screen.getByText('Tsukiji Fish Market')).toBeInTheDocument()

        // Day number (day_index 3 -> Day 4)
        expect(screen.getByText(/Day 4/)).toBeInTheDocument()

        // Kind badge
        expect(screen.getByText('activity')).toBeInTheDocument()

        // Go to Day button
        expect(screen.getByRole('button', { name: 'Go to Day' })).toBeInTheDocument()
    })

    it('formats and displays the day date', () => {
        render(<NavigationCard data={foundData} />)

        // 2025-04-15 is a Tuesday
        expect(screen.getByText(/Tue, Apr 15/)).toBeInTheDocument()
    })

    it('"Go to Day" calls onNavigateToSlot with correct day and slot indices', async () => {
        const user = userEvent.setup()
        const onNavigateToSlot = vi.fn()

        render(<NavigationCard data={foundData} onNavigateToSlot={onNavigateToSlot} />)

        await user.click(screen.getByRole('button', { name: 'Go to Day' }))

        expect(onNavigateToSlot).toHaveBeenCalledTimes(1)
        expect(onNavigateToSlot).toHaveBeenCalledWith(3, 2)
    })

    it('only shows response text when found is false', () => {
        render(<NavigationCard data={notFoundData} />)

        expect(screen.getByText('I could not find that activity in your itinerary.')).toBeInTheDocument()

        // Should not show Go to Day button or slot details
        expect(screen.queryByRole('button', { name: 'Go to Day' })).not.toBeInTheDocument()
        expect(screen.queryByText('Tsukiji Fish Market')).not.toBeInTheDocument()
    })

    it('does not crash when onNavigateToSlot is not provided', async () => {
        const user = userEvent.setup()
        render(<NavigationCard data={foundData} />)

        const button = screen.getByRole('button', { name: 'Go to Day' })
        await user.click(button)
        // Should not throw
    })

    it('renders slot without title gracefully', () => {
        render(<NavigationCard data={foundNoTitleData} />)

        // Should render Day 1 for day_index=0
        expect(screen.getByText(/Day 1/)).toBeInTheDocument()

        // Should still show Go to Day button
        expect(screen.getByRole('button', { name: 'Go to Day' })).toBeInTheDocument()
    })

    it('does not render response text when response is empty', () => {
        const emptyResponseData: NavigationData = {
            ...foundData,
            response: ''
        }

        render(<NavigationCard data={emptyResponseData} />)

        // Still shows the slot details
        expect(screen.getByText('Tsukiji Fish Market')).toBeInTheDocument()
    })
})
