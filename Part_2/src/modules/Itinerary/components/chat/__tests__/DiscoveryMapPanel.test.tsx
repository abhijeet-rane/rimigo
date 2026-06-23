import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import DiscoveryMapPanel from '../DiscoveryMapPanel'
import type { DiscoveryData, DiscoveryResultItem } from '../types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fullResult: DiscoveryResultItem = {
    name: 'Ichiran Ramen Shibuya',
    category: 'Restaurant',
    address: '1-22-7 Jinnan, Shibuya, Tokyo',
    latitude: 35.6617,
    longitude: 139.6999,
    rating: 4,
    review_count: 1250,
    distance_text: '350m away',
    image_url: 'https://example.com/ichiran.jpg',
    source: 'google_places',
    entity_id: 'disc-1'
}

const minimalResult: DiscoveryResultItem = {
    name: 'Secret Ramen Spot',
    source: 'local_tip'
}

const fullData: DiscoveryData = {
    output_type: 'discovery',
    response: 'I found some great ramen spots near your hotel.',
    query: 'ramen near Shibuya',
    results: [fullResult, minimalResult],
    map_center: { lat: 35.6617, lng: 139.6999 },
    anchor_slot_ref: { day_index: 1, slot_index: 0 }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DiscoveryMapPanel', () => {
    it('renders response text and query', () => {
        render(<DiscoveryMapPanel data={fullData} />)

        expect(screen.getByText('I found some great ramen spots near your hotel.')).toBeInTheDocument()
        expect(screen.getByText('ramen near Shibuya')).toBeInTheDocument()
        expect(screen.getByText(/Searched for:/)).toBeInTheDocument()
    })

    it('renders all results with name, category, rating stars, and distance', () => {
        render(<DiscoveryMapPanel data={fullData} />)

        // Names
        expect(screen.getByText('Ichiran Ramen Shibuya')).toBeInTheDocument()
        expect(screen.getByText('Secret Ramen Spot')).toBeInTheDocument()

        // Category
        expect(screen.getByText('Restaurant')).toBeInTheDocument()

        // Review count
        expect(screen.getByText('(1250)')).toBeInTheDocument()

        // Distance
        expect(screen.getByText('350m away')).toBeInTheDocument()

        // Address
        expect(screen.getByText('1-22-7 Jinnan, Shibuya, Tokyo')).toBeInTheDocument()
    })

    it('renders star icons for rated results', () => {
        const { container } = render(<DiscoveryMapPanel data={fullData} />)

        // The full result has rating=4, so 5 star SVGs should be rendered (4 filled, 1 unfilled)
        const starSvgs = container.querySelectorAll('svg')
        // Each result row has SVGs. The rated result should have 5 stars.
        expect(starSvgs.length).toBeGreaterThanOrEqual(5)
    })

    it('renders an "Add to Itinerary" button for each result', () => {
        render(<DiscoveryMapPanel data={fullData} />)

        const addButtons = screen.getAllByRole('button', { name: 'Add to Itinerary' })
        expect(addButtons).toHaveLength(2)
    })

    it('calls onSendAgentMessage with correct message including day number', async () => {
        const user = userEvent.setup()
        const onSendAgentMessage = vi.fn()

        render(<DiscoveryMapPanel data={fullData} onSendAgentMessage={onSendAgentMessage} />)

        const addButtons = screen.getAllByRole('button', { name: 'Add to Itinerary' })

        // anchor_slot_ref.day_index=1 -> day 2
        await user.click(addButtons[0])
        expect(onSendAgentMessage).toHaveBeenCalledWith(
            'Add Ichiran Ramen Shibuya to day 2 as a new activity'
        )

        await user.click(addButtons[1])
        expect(onSendAgentMessage).toHaveBeenCalledWith(
            'Add Secret Ramen Spot to day 2 as a new activity'
        )
    })

    it('omits day number from message when anchor_slot_ref is absent', async () => {
        const user = userEvent.setup()
        const onSendAgentMessage = vi.fn()

        const dataWithoutAnchor: DiscoveryData = {
            ...fullData,
            anchor_slot_ref: undefined
        }

        render(<DiscoveryMapPanel data={dataWithoutAnchor} onSendAgentMessage={onSendAgentMessage} />)

        const addButtons = screen.getAllByRole('button', { name: 'Add to Itinerary' })
        await user.click(addButtons[0])

        expect(onSendAgentMessage).toHaveBeenCalledWith(
            'Add Ichiran Ramen Shibuya as a new activity'
        )
    })

    it('shows map placeholder when map_center is provided', () => {
        render(<DiscoveryMapPanel data={fullData} />)
        expect(screen.getByText('Map view coming soon')).toBeInTheDocument()
    })

    it('does not show map placeholder when map_center is absent', () => {
        const dataWithoutMap: DiscoveryData = {
            ...fullData,
            map_center: undefined
        }

        render(<DiscoveryMapPanel data={dataWithoutMap} />)
        expect(screen.queryByText('Map view coming soon')).not.toBeInTheDocument()
    })

    it('handles missing optional fields on result items', () => {
        const dataMinimal: DiscoveryData = {
            ...fullData,
            results: [minimalResult]
        }

        render(<DiscoveryMapPanel data={dataMinimal} />)

        expect(screen.getByText('Secret Ramen Spot')).toBeInTheDocument()
        // Should show initial letter fallback
        expect(screen.getByText('S')).toBeInTheDocument()
        // Should not have category, rating, distance, or address
        expect(screen.queryByText('Restaurant')).not.toBeInTheDocument()
        expect(screen.queryByText('350m away')).not.toBeInTheDocument()
    })

    it('does not crash when onSendAgentMessage is not provided', async () => {
        const user = userEvent.setup()
        render(<DiscoveryMapPanel data={fullData} />)

        const addButtons = screen.getAllByRole('button', { name: 'Add to Itinerary' })
        await user.click(addButtons[0])
        // Should not throw
    })

    it('handles empty results array', () => {
        const emptyData: DiscoveryData = {
            ...fullData,
            results: []
        }

        render(<DiscoveryMapPanel data={emptyData} />)

        expect(screen.getByText('I found some great ramen spots near your hotel.')).toBeInTheDocument()
        expect(screen.queryAllByRole('button', { name: 'Add to Itinerary' })).toHaveLength(0)
    })
})
