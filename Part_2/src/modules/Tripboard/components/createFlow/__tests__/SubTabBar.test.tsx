import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SubTabBar } from '../SubTabBar'

const tabs = [
  { id: 'destination',    label: 'WHERE TO?',    subheading: 'Select Destination' },
  { id: 'departure-city', label: 'FLYING FROM?', subheading: 'Select City' },
] as const

describe('SubTabBar', () => {
  it('renders both tab labels and subheadings', () => {
    render(<SubTabBar tabs={tabs} activeId="destination" onChange={() => {}} />)
    expect(screen.getByText('WHERE TO?')).toBeInTheDocument()
    expect(screen.getByText('Select Destination')).toBeInTheDocument()
    expect(screen.getByText('FLYING FROM?')).toBeInTheDocument()
    expect(screen.getByText('Select City')).toBeInTheDocument()
  })

  it('marks the active tab with .wf-tab--active', () => {
    render(<SubTabBar tabs={tabs} activeId="destination" onChange={() => {}} />)
    expect(screen.getByTestId('tab-destination')).toHaveClass('wf-tab--active')
    expect(screen.getByTestId('tab-departure-city')).not.toHaveClass('wf-tab--active')
  })

  it('invokes onChange when an inactive tab is clicked', async () => {
    const onChange = vi.fn()
    render(<SubTabBar tabs={tabs} activeId="destination" onChange={onChange} />)
    await userEvent.click(screen.getByTestId('tab-departure-city'))
    expect(onChange).toHaveBeenCalledWith('departure-city')
  })
})
