import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { DestinationPicker } from '../DestinationPicker'
import type { LocationResponse } from '@/modules/Onboarding/api/onboardingAPI'

const make = (over: Partial<LocationResponse>): LocationResponse => ({
  id: over.country_id || 'X', country_id: 'X', country_name: 'X',
  flag_icon_url: '/x.svg', icon_url: '', is_live: true, region: 'Asia',
  best_months: [], peak_season: [], recommended_for_travel_purpose: [],
  recommended_for_group_type: [], recommended_for_occasions: [], suggestion_priority: 0,
  ...over,
})

const countries: LocationResponse[] = [
  make({ country_id: 'JP', country_name: 'Japan' }),
  make({ country_id: 'TH', country_name: 'Thailand' }),
  make({ country_id: 'FR', country_name: 'France', region: 'Europe' }),
]

describe('DestinationPicker', () => {
  it('renders header text and search input', () => {
    render(<DestinationPicker countries={countries} popularCountryIds={[]} selectedIds={new Set()} onToggle={() => {}} />)
    expect(screen.getByText('Where are you headed?')).toBeInTheDocument()
    expect(screen.getByText('Select the countries you plan to visit')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search country')).toBeInTheDocument()
  })

  it('renders Popular and Regional sections when search is empty', () => {
    render(<DestinationPicker countries={countries} popularCountryIds={[]} selectedIds={new Set()} onToggle={() => {}} />)
    expect(screen.getByRole('heading', { name: /popular destinations/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /asia/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /europe/i })).toBeInTheDocument()
  })

  it('hides section headers and shows flat results when typing in search', async () => {
    render(<DestinationPicker countries={countries} popularCountryIds={[]} selectedIds={new Set()} onToggle={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText('Search country'), 'thai')
    expect(screen.queryByRole('heading', { name: /popular destinations/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /asia/i })).not.toBeInTheDocument()
    expect(screen.getByText('Thailand')).toBeInTheDocument()
    expect(screen.queryByText('France')).not.toBeInTheDocument()
  })

  it('shows no-match message when search yields nothing', async () => {
    render(<DestinationPicker countries={countries} popularCountryIds={[]} selectedIds={new Set()} onToggle={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText('Search country'), 'zzzz')
    expect(screen.getByText(/no countries match "zzzz"/i)).toBeInTheDocument()
  })
})
