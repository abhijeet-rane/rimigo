import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import PlaceCard from '../primitives/PlaceCard'
import type { DiscoveryResultItem } from '../types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fullPlace: DiscoveryResultItem = {
    name: 'Ichiran Ramen Shibuya',
    category: 'Restaurant',
    address: '1-22-7 Jinnan, Shibuya, Tokyo 150-0041, Japan',
    latitude: 35.6617,
    longitude: 139.6999,
    rating: 4,
    review_count: 1250,
    distance_text: '350m away',
    image_url: 'https://example.com/ichiran.jpg',
    google_maps_url: 'https://maps.google.com/?cid=12345',
    source: 'google_places',
    entity_id: 'place-1',
}

const minimalPlace: DiscoveryResultItem = {
    name: 'Secret Ramen Spot',
    source: 'local_tip',
}

const placeWithLatLng: DiscoveryResultItem = {
    name: 'Rooftop Bar',
    latitude: 35.6895,
    longitude: 139.6917,
    source: 'google_places',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PlaceCard', () => {
    it('renders place name', () => {
        render(<PlaceCard place={fullPlace} />)
        expect(screen.getByText('Ichiran Ramen Shibuya')).toBeInTheDocument()
    })

    it('renders rating stars when rating provided', () => {
        const { container } = render(<PlaceCard place={fullPlace} />)

        // rating=4 -> 5 star SVGs rendered (4 filled, 1 unfilled)
        // Star SVGs use stroke="#f59e0b" to distinguish from lucide icons
        const starSvgs = container.querySelectorAll('svg[stroke="#f59e0b"]')
        expect(starSvgs).toHaveLength(5)

        // 4 filled stars (fill="#f59e0b"), 1 unfilled (fill="none")
        const filledStars = Array.from(starSvgs).filter(
            (svg) => svg.getAttribute('fill') === '#f59e0b'
        )
        expect(filledStars).toHaveLength(4)

        // Review count
        expect(screen.getByText('(1,250)')).toBeInTheDocument()
    })

    it('renders category badge', () => {
        render(<PlaceCard place={fullPlace} />)
        expect(screen.getByText('Restaurant')).toBeInTheDocument()
    })

    it('renders distance text when available', () => {
        render(<PlaceCard place={fullPlace} />)
        expect(screen.getByText('350m away')).toBeInTheDocument()
    })

    it('renders address truncated', () => {
        render(<PlaceCard place={fullPlace} />)
        expect(
            screen.getByText('1-22-7 Jinnan, Shibuya, Tokyo 150-0041, Japan')
        ).toBeInTheDocument()
    })

    it('renders "Directions" link with google_maps_url', () => {
        render(<PlaceCard place={fullPlace} />)

        const directionsLink = screen.getByText('Directions').closest('a')
        expect(directionsLink).toBeInTheDocument()
        expect(directionsLink).toHaveAttribute('href', 'https://maps.google.com/?cid=12345')
        expect(directionsLink).toHaveAttribute('target', '_blank')
        expect(directionsLink).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('renders "Directions" link from lat/lng when google_maps_url absent', () => {
        render(<PlaceCard place={placeWithLatLng} />)

        const directionsLink = screen.getByText('Directions').closest('a')
        expect(directionsLink).toBeInTheDocument()
        expect(directionsLink).toHaveAttribute(
            'href',
            'https://www.google.com/maps/search/?api=1&query=35.6895,139.6917'
        )
    })

    it('renders "Add" button when onAddToItinerary provided', async () => {
        const user = userEvent.setup()
        const onAdd = vi.fn()

        render(<PlaceCard place={fullPlace} onAddToItinerary={onAdd} />)

        const addButton = screen.getByRole('button', { name: /add/i })
        expect(addButton).toBeInTheDocument()

        await user.click(addButton)
        expect(onAdd).toHaveBeenCalledTimes(1)
        expect(onAdd).toHaveBeenCalledWith(fullPlace)
    })

    it('does NOT render "Add" button when onAddToItinerary not provided', () => {
        render(<PlaceCard place={fullPlace} />)

        expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument()
    })

    it('compact mode renders smaller thumbnail', () => {
        const { container } = render(<PlaceCard place={fullPlace} compact />)

        // Compact uses w-12 h-12 instead of w-14 h-14 for thumbnail
        const thumbnail = container.querySelector('.w-12.h-12')
        expect(thumbnail).toBeInTheDocument()
    })

    it('default mode renders larger thumbnail', () => {
        const { container } = render(<PlaceCard place={fullPlace} />)

        const thumbnail = container.querySelector('.w-14.h-14')
        expect(thumbnail).toBeInTheDocument()
    })

    it('handles missing optional fields gracefully', () => {
        render(<PlaceCard place={minimalPlace} />)

        // Name should render
        expect(screen.getByText('Secret Ramen Spot')).toBeInTheDocument()

        // Fallback initial letter
        expect(screen.getByText('S')).toBeInTheDocument()

        // No category, rating, distance, address, or directions
        expect(screen.queryByText('Restaurant')).not.toBeInTheDocument()
        expect(screen.queryByText('350m away')).not.toBeInTheDocument()
        expect(screen.queryByText('Directions')).not.toBeInTheDocument()
    })

    it('renders highlighted style when highlighted prop is true', () => {
        const { container } = render(<PlaceCard place={fullPlace} highlighted />)

        // The root div should have the highlighted border class
        const rootDiv = container.firstElementChild
        expect(rootDiv?.className).toContain('border-primary-default')
    })

    it('calls onMouseEnter and onMouseLeave handlers', async () => {
        const user = userEvent.setup()
        const onEnter = vi.fn()
        const onLeave = vi.fn()

        const { container } = render(
            <PlaceCard
                place={fullPlace}
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
            />
        )

        const rootDiv = container.firstElementChild!
        await user.hover(rootDiv)
        expect(onEnter).toHaveBeenCalled()

        await user.unhover(rootDiv)
        expect(onLeave).toHaveBeenCalled()
    })
})
