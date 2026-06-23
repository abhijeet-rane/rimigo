import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { PopularDestinations } from '../PopularDestinations'
import type { LocationResponse } from '@/modules/Onboarding/api/onboardingAPI'

const makeCountry = (overrides: Partial<LocationResponse>): LocationResponse => ({
  id: '',
  country_id: '',
  country_name: '',
  flag_icon_url: '',
  icon_url: '',
  is_live: true,
  best_months: [],
  peak_season: [],
  recommended_for_travel_purpose: [],
  recommended_for_group_type: [],
  recommended_for_occasions: [],
  suggestion_priority: 0,
  ...overrides,
})

const countries: LocationResponse[] = [
  makeCountry({ id: '1', country_id: 'JP', country_name: 'Japan', flag_icon_url: '/jp.svg', icon_url: '/jp.jpg' }),
  makeCountry({ id: '2', country_id: 'ID', country_name: 'Indonesia', flag_icon_url: '/id.svg', icon_url: '/id.jpg' }),
  makeCountry({ id: '3', country_id: 'VN', country_name: 'Vietnam', flag_icon_url: '/vn.svg', icon_url: '/vn.jpg' }),
]

describe('PopularDestinations', () => {
  it('renders the cards in popularCountryIds order, skipping unknown ids', () => {
    render(
      <PopularDestinations
        countries={countries}
        popularCountryIds={['JP', 'XX', 'ID']}
        selectedIds={new Set()}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByText('Japan')).toBeInTheDocument()
    expect(screen.getByText('Indonesia')).toBeInTheDocument()
    expect(screen.queryByText('Vietnam')).not.toBeInTheDocument()
  })

  it('caps the rendered list at 8 entries even if more are passed', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      makeCountry({ id: String(i), country_id: `C${i}`, country_name: `Country${i}` }),
    )
    const ids = many.map((c) => c.country_id)
    render(
      <PopularDestinations
        countries={many}
        popularCountryIds={ids}
        selectedIds={new Set()}
        onToggle={() => {}}
      />,
    )
    expect(screen.getAllByText(/Country\d+/)).toHaveLength(8)
    expect(screen.queryByText('Country8')).not.toBeInTheDocument()
    expect(screen.queryByText('Country9')).not.toBeInTheDocument()
  })

  it('passes selection state to each card', () => {
    render(
      <PopularDestinations
        countries={countries}
        popularCountryIds={['JP', 'ID']}
        selectedIds={new Set(['JP'])}
        onToggle={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /remove japan/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add indonesia/i })).toBeInTheDocument()
  })

  it('invokes onToggle with the matched country when a card is tapped', async () => {
    const onToggle = vi.fn()
    render(
      <PopularDestinations
        countries={countries}
        popularCountryIds={['JP']}
        selectedIds={new Set()}
        onToggle={onToggle}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /add japan/i }))
    expect(onToggle).toHaveBeenCalledWith(
      expect.objectContaining({ country_id: 'JP', country_name: 'Japan' }),
      'popular',
    )
  })
})
