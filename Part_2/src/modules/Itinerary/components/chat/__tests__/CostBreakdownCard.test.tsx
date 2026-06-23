import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CostBreakdownCard from '../CostBreakdownCard'
import type { CostEstimateData, CostItem } from '../types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const tripScopeData: CostEstimateData = {
    output_type: 'cost_estimate',
    response: 'Here is the estimated cost breakdown for your trip:',
    scope: 'trip',
    items: [
        { title: 'Senso-ji Temple', cost: 500, currency: 'INR' },
        { title: 'Ichiran Ramen', cost: 1200, currency: 'INR', day_index: 0 },
        { title: 'Tokyo Tower', cost: 2000, currency: 'INR', day_index: 1 }
    ],
    total: 3700,
    currency: 'INR'
}

const dayScopeData: CostEstimateData = {
    output_type: 'cost_estimate',
    response: 'Cost estimate for Day 1:',
    scope: 'day',
    items: [{ title: 'Museum Entry', cost: 800, currency: 'INR', day_index: 0 }],
    total: 800,
    currency: 'INR'
}

const emptyItemsData: CostEstimateData = {
    output_type: 'cost_estimate',
    response: 'No cost items found.',
    scope: 'trip',
    items: [],
    total: 0,
    currency: 'INR'
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CostBreakdownCard', () => {
    it('renders the response text', () => {
        render(<CostBreakdownCard data={tripScopeData} />)
        expect(screen.getByText('Here is the estimated cost breakdown for your trip:')).toBeInTheDocument()
    })

    it('renders the "Full Trip" scope badge for trip scope', () => {
        render(<CostBreakdownCard data={tripScopeData} />)
        expect(screen.getByText('Full Trip')).toBeInTheDocument()
    })

    it('renders the "Single Day" scope badge for day scope', () => {
        render(<CostBreakdownCard data={dayScopeData} />)
        expect(screen.getByText('Single Day')).toBeInTheDocument()
    })

    it('renders all line items with titles', () => {
        render(<CostBreakdownCard data={tripScopeData} />)

        expect(screen.getByText('Senso-ji Temple')).toBeInTheDocument()
        expect(screen.getByText('Ichiran Ramen')).toBeInTheDocument()
        expect(screen.getByText('Tokyo Tower')).toBeInTheDocument()
    })

    it('renders day labels for items that have day_index', () => {
        render(<CostBreakdownCard data={tripScopeData} />)

        // day_index 0 -> Day 1, day_index 1 -> Day 2
        expect(screen.getByText('Day 1')).toBeInTheDocument()
        expect(screen.getByText('Day 2')).toBeInTheDocument()
    })

    it('formats currency correctly as INR', () => {
        render(<CostBreakdownCard data={tripScopeData} />)

        // The total should be formatted. toLocaleString('en-IN', {style:'currency', currency:'INR', maximumFractionDigits:0})
        // produces something like "₹3,700"
        const totalRow = screen.getByText('Total')
        expect(totalRow).toBeInTheDocument()

        // Check that a formatted total exists in the document
        // The exact format depends on locale, but it should contain "3,700"
        expect(screen.getByText(/3,700/)).toBeInTheDocument()
    })

    it('renders the total row', () => {
        render(<CostBreakdownCard data={tripScopeData} />)
        expect(screen.getByText('Total')).toBeInTheDocument()
    })

    it('renders the "Cost Breakdown" header', () => {
        render(<CostBreakdownCard data={tripScopeData} />)
        expect(screen.getByText('Cost Breakdown')).toBeInTheDocument()
    })

    it('renders the table headers', () => {
        render(<CostBreakdownCard data={tripScopeData} />)
        expect(screen.getByText('Item')).toBeInTheDocument()
        expect(screen.getByText('Cost')).toBeInTheDocument()
    })

    it('handles empty items array', () => {
        render(<CostBreakdownCard data={emptyItemsData} />)

        expect(screen.getByText('No cost items found.')).toBeInTheDocument()
        expect(screen.getByText('Total')).toBeInTheDocument()
        expect(screen.getByText('Cost Breakdown')).toBeInTheDocument()
    })

    it('does not render response text when response is empty', () => {
        const data: CostEstimateData = { ...tripScopeData, response: '' }

        render(<CostBreakdownCard data={data} />)

        // Should still render cost breakdown
        expect(screen.getByText('Cost Breakdown')).toBeInTheDocument()
        expect(screen.getByText('Senso-ji Temple')).toBeInTheDocument()
    })
})
