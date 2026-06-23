import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CountryCard } from '../CountryCard'

const baseProps = {
  display_name: 'Japan',
  flag_url: '/flags/jp.svg',
  image_url: '/assets/popular/japan.webp',
  selected: false,
  onToggle: () => {},
}

describe('CountryCard', () => {
  it('renders display name, flag image, and the + button when not selected', () => {
    render(<CountryCard {...baseProps} />)
    expect(screen.getByText('Japan')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /japan flag/i })).toHaveAttribute(
      'src',
      '/flags/jp.svg',
    )
    expect(screen.getByRole('button', { name: /add japan/i })).toBeInTheDocument()
  })

  it('shows the check button when selected', () => {
    render(<CountryCard {...baseProps} selected />)
    expect(
      screen.getByRole('button', { name: /remove japan/i }),
    ).toBeInTheDocument()
  })

  it('invokes onToggle when the action button is clicked', async () => {
    const onToggle = vi.fn()
    render(<CountryCard {...baseProps} onToggle={onToggle} />)
    await userEvent.click(screen.getByRole('button', { name: /add japan/i }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
