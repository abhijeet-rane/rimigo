import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import DateShiftCard from '../DateShiftCard'
import type { DateShiftData } from '../types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const appliedForwardData: DateShiftData = {
    output_type: 'date_shift',
    response: 'Your trip dates have been shifted forward by 2 days.',
    days_shifted: 2,
    shifted_days: [
        { day_index: 0, old_date: '2025-04-12', new_date: '2025-04-14' },
        { day_index: 1, old_date: '2025-04-13', new_date: '2025-04-15' },
        { day_index: 2, old_date: '2025-04-14', new_date: '2025-04-16' }
    ],
    applied: true
}

const pendingBackData: DateShiftData = {
    output_type: 'date_shift',
    response: 'The dates will be shifted back by 1 day.',
    days_shifted: -1,
    shifted_days: [
        { day_index: 0, old_date: '2025-04-12', new_date: '2025-04-11' },
        { day_index: 1, old_date: '2025-04-13', new_date: '2025-04-12' }
    ],
    applied: false
}

const singleDayShift: DateShiftData = {
    output_type: 'date_shift',
    response: 'Shifted by 1 day.',
    days_shifted: 1,
    shifted_days: [{ day_index: 0, old_date: '2025-04-12', new_date: '2025-04-13' }],
    applied: true
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DateShiftCard', () => {
    it('renders the response text', () => {
        render(<DateShiftCard data={appliedForwardData} />)
        expect(screen.getByText('Your trip dates have been shifted forward by 2 days.')).toBeInTheDocument()
    })

    it('renders the "Date Shift" header', () => {
        render(<DateShiftCard data={appliedForwardData} />)
        expect(screen.getByText('Date Shift')).toBeInTheDocument()
    })

    it('renders the direction badge for forward shift', () => {
        render(<DateShiftCard data={appliedForwardData} />)
        expect(screen.getByText(/Shifted forward by 2 days/)).toBeInTheDocument()
    })

    it('renders the direction badge for backward shift', () => {
        render(<DateShiftCard data={pendingBackData} />)
        expect(screen.getByText(/Shifted back by 1 day$/)).toBeInTheDocument()
    })

    it('uses singular "day" for a 1-day shift', () => {
        render(<DateShiftCard data={singleDayShift} />)
        // Should say "1 day" not "1 days"
        expect(screen.getByText(/Shifted forward by 1 day$/)).toBeInTheDocument()
    })

    it('renders before/after date rows for all shifted days', () => {
        render(<DateShiftCard data={appliedForwardData} />)

        // Day labels (day_index 0 -> Day 1, 1 -> Day 2, 2 -> Day 3)
        expect(screen.getByText('Day 1')).toBeInTheDocument()
        expect(screen.getByText('Day 2')).toBeInTheDocument()
        expect(screen.getByText('Day 3')).toBeInTheDocument()

        // Table headers
        expect(screen.getByText('Day')).toBeInTheDocument()
        expect(screen.getByText('Before')).toBeInTheDocument()
        expect(screen.getByText('After')).toBeInTheDocument()
    })

    it('formats dates correctly in the table', () => {
        render(<DateShiftCard data={appliedForwardData} />)

        // 2025-04-12 is a Saturday, 2025-04-14 is a Monday
        expect(screen.getByText(/Sat, Apr 12/)).toBeInTheDocument()
        expect(screen.getByText(/Mon, Apr 14/)).toBeInTheDocument()
    })

    it('shows "Changes applied" and "Refresh Itinerary" button when applied is true', () => {
        const onRefreshItinerary = vi.fn()
        render(<DateShiftCard data={appliedForwardData} onRefreshItinerary={onRefreshItinerary} />)

        expect(screen.getByText('Changes applied')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Refresh Itinerary' })).toBeInTheDocument()
    })

    it('shows "Pending confirmation" when applied is false', () => {
        render(<DateShiftCard data={pendingBackData} />)

        expect(screen.getByText('Pending confirmation')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Refresh Itinerary' })).not.toBeInTheDocument()
    })

    it('"Refresh Itinerary" button calls onRefreshItinerary', async () => {
        const user = userEvent.setup()
        const onRefreshItinerary = vi.fn()

        render(<DateShiftCard data={appliedForwardData} onRefreshItinerary={onRefreshItinerary} />)

        await user.click(screen.getByRole('button', { name: 'Refresh Itinerary' }))

        expect(onRefreshItinerary).toHaveBeenCalledTimes(1)
    })

    it('does not show "Refresh Itinerary" when applied is true but onRefreshItinerary is not provided', () => {
        render(<DateShiftCard data={appliedForwardData} />)

        expect(screen.getByText('Changes applied')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Refresh Itinerary' })).not.toBeInTheDocument()
    })

    it('does not render response text when response is empty', () => {
        const data: DateShiftData = { ...appliedForwardData, response: '' }

        render(<DateShiftCard data={data} />)

        // Should still show Date Shift header and table
        expect(screen.getByText('Date Shift')).toBeInTheDocument()
        expect(screen.getByText('Day 1')).toBeInTheDocument()
    })

    it('handles empty shifted_days array', () => {
        const data: DateShiftData = {
            ...appliedForwardData,
            shifted_days: []
        }

        render(<DateShiftCard data={data} />)

        // Response and header should still render
        expect(screen.getByText('Date Shift')).toBeInTheDocument()
        expect(screen.getByText('Changes applied')).toBeInTheDocument()
    })
})
