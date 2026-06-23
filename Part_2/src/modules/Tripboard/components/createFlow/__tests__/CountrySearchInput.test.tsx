import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { CountrySearchInput } from '../CountrySearchInput'

describe('CountrySearchInput', () => {
  it('renders placeholder and globe icon', () => {
    render(<CountrySearchInput value="" onChange={() => {}} />)
    expect(screen.getByPlaceholderText('Search country')).toBeInTheDocument()
    expect(screen.getByText('🌐')).toBeInTheDocument()
  })

  it('invokes onChange when user types', async () => {
    const onChange = vi.fn()
    render(<CountrySearchInput value="" onChange={onChange} />)
    await userEvent.type(screen.getByPlaceholderText('Search country'), 'jap')
    expect(onChange).toHaveBeenLastCalledWith('p')
    expect(onChange).toHaveBeenCalledTimes(3)
  })
})
