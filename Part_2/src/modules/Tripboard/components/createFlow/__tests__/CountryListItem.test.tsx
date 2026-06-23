import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CountryListItem } from '../CountryListItem'

const baseProps = {
  display_name: 'Thailand',
  flag_url: '/flags/th.svg',
  selected: false,
  onToggle: () => {},
}

describe('CountryListItem', () => {
  it('renders name and flag', () => {
    render(<CountryListItem {...baseProps} />)
    expect(screen.getByText('Thailand')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /thailand flag/i })).toHaveAttribute('src', '/flags/th.svg')
  })

  it('reflects selected state', () => {
    render(<CountryListItem {...baseProps} selected />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('invokes onToggle when clicked', async () => {
    const onToggle = vi.fn()
    render(<CountryListItem {...baseProps} onToggle={onToggle} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
