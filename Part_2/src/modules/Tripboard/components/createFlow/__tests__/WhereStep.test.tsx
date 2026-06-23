import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { WhereStep } from '../WhereStep'

vi.mock('@/hooks/useCountries', () => ({
  useCountries: () => ({
    allCountries: [
      { id: '1', country_id: 'JP', country_name: 'Japan', flag_icon_url: '/jp.svg', icon_url: '', is_live: true, region: 'Asia', best_months: [], peak_season: [], recommended_for_travel_purpose: [], recommended_for_group_type: [], recommended_for_occasions: [], suggestion_priority: 1 },
    ],
    isLoading: false,
    isError: false,
  }),
}))

describe('WhereStep', () => {
  it('renders DestinationPicker when sub-tab is "destination"', () => {
    render(<WhereStep currentSubTab="destination" selectedIds={new Set()} onToggle={() => {}} />)
    expect(screen.getByText('Where are you headed?')).toBeInTheDocument()
  })

  it('renders DepartureCitySubTab stub when sub-tab is "departure-city"', () => {
    render(<WhereStep currentSubTab="departure-city" selectedIds={new Set()} onToggle={() => {}} />)
    expect(screen.getByText(/coming up/i)).toBeInTheDocument()
  })
})
