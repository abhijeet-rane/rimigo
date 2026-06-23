import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { RegionalSection } from '../RegionalSection'
import type { LocationResponse } from '@/modules/Onboarding/api/onboardingAPI'

const fixture = (over: Partial<LocationResponse>): LocationResponse => ({
  id: 'x', country_id: 'X', country_name: 'X', flag_icon_url: '/x.svg', icon_url: '', is_live: true,
  best_months: [], peak_season: [], recommended_for_travel_purpose: [],
  recommended_for_group_type: [], recommended_for_occasions: [], suggestion_priority: 0,
  ...over,
})

const asia: LocationResponse[] = [
  fixture({ country_id: 'TH', country_name: 'Thailand' }),
  fixture({ country_id: 'KR', country_name: 'South Korea' }),
]

describe('RegionalSection', () => {
  it('renders the region header and country rows', () => {
    render(<RegionalSection region="Asia" countries={asia} selectedIds={new Set()} onToggle={() => {}} />)
    expect(screen.getByRole('heading', { name: /asia/i })).toBeInTheDocument()
    expect(screen.getByText('Thailand')).toBeInTheDocument()
    expect(screen.getByText('South Korea')).toBeInTheDocument()
  })

  it('invokes onToggle with the country and source "regional" when row is clicked', async () => {
    const onToggle = vi.fn()
    render(<RegionalSection region="Asia" countries={asia} selectedIds={new Set()} onToggle={onToggle} />)
    await userEvent.click(screen.getByText('Thailand'))
    expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ country_id: 'TH' }), 'regional')
  })

  it('renders nothing when countries array is empty', () => {
    const { container } = render(
      <RegionalSection region="Asia" countries={[]} selectedIds={new Set()} onToggle={() => {}} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})
