import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import QuickReplyChips from '../primitives/QuickReplyChips'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const threeChips = ['Change hotel', 'Show alternatives', 'Keep current']
const sixChips = ['Option A', 'Option B', 'Option C', 'Option D', 'Option E', 'Option F']

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QuickReplyChips', () => {
    it('renders correct number of chips (max 5)', () => {
        const onChipTap = vi.fn()
        render(<QuickReplyChips chips={sixChips} onChipTap={onChipTap} />)

        // When >5 chips, only first 4 are shown + "Something else..." = 5 buttons total
        const buttons = screen.getAllByRole('button')
        expect(buttons).toHaveLength(5)

        // First 4 original chips should be visible
        expect(screen.getByText('Option A')).toBeInTheDocument()
        expect(screen.getByText('Option B')).toBeInTheDocument()
        expect(screen.getByText('Option C')).toBeInTheDocument()
        expect(screen.getByText('Option D')).toBeInTheDocument()

        // 5th and 6th original chips should be truncated
        expect(screen.queryByText('Option E')).not.toBeInTheDocument()
        expect(screen.queryByText('Option F')).not.toBeInTheDocument()
    })

    it('each chip shows the text', () => {
        const onChipTap = vi.fn()
        render(<QuickReplyChips chips={threeChips} onChipTap={onChipTap} />)

        expect(screen.getByText('Change hotel')).toBeInTheDocument()
        expect(screen.getByText('Show alternatives')).toBeInTheDocument()
        expect(screen.getByText('Keep current')).toBeInTheDocument()
    })

    it('tapping a chip calls onChipTap with the chip text', async () => {
        const user = userEvent.setup()
        const onChipTap = vi.fn()
        render(<QuickReplyChips chips={threeChips} onChipTap={onChipTap} />)

        await user.click(screen.getByText('Show alternatives'))
        expect(onChipTap).toHaveBeenCalledTimes(1)
        expect(onChipTap).toHaveBeenCalledWith('Show alternatives')
    })

    it('after tapping, all chips become disabled', async () => {
        const user = userEvent.setup()
        const onChipTap = vi.fn()
        render(<QuickReplyChips chips={threeChips} onChipTap={onChipTap} />)

        // Tap the first chip
        await user.click(screen.getByText('Change hotel'))
        expect(onChipTap).toHaveBeenCalledTimes(1)

        // All buttons should now be disabled
        const buttons = screen.getAllByRole('button')
        buttons.forEach((button) => {
            expect(button).toBeDisabled()
        })

        // Tapping again should not invoke the callback
        await user.click(screen.getByText('Show alternatives'))
        expect(onChipTap).toHaveBeenCalledTimes(1)
    })

    it('last chip shows "Something else..." text', () => {
        const onChipTap = vi.fn()
        render(<QuickReplyChips chips={threeChips} onChipTap={onChipTap} />)

        expect(screen.getByText('Something else...')).toBeInTheDocument()
    })

    it('tapping "Something else..." calls onChipTap with that label', async () => {
        const user = userEvent.setup()
        const onChipTap = vi.fn()
        render(<QuickReplyChips chips={threeChips} onChipTap={onChipTap} />)

        await user.click(screen.getByText('Something else...'))
        expect(onChipTap).toHaveBeenCalledWith('Something else...')
    })

    it('chips have minimum 44px height (accessibility)', () => {
        const onChipTap = vi.fn()
        const { container } = render(<QuickReplyChips chips={threeChips} onChipTap={onChipTap} />)

        const buttons = container.querySelectorAll('button')
        buttons.forEach((button) => {
            expect(button.className).toContain('min-h-[44px]')
        })
    })

    it('empty chips array renders only "Something else..." button', () => {
        const onChipTap = vi.fn()
        render(<QuickReplyChips chips={[]} onChipTap={onChipTap} />)

        // "Something else..." is still shown because the empty array does not include it
        const buttons = screen.getAllByRole('button')
        expect(buttons).toHaveLength(1)
        expect(screen.getByText('Something else...')).toBeInTheDocument()
    })

    it('disabled prop disables all chips from the start', () => {
        const onChipTap = vi.fn()
        render(<QuickReplyChips chips={threeChips} onChipTap={onChipTap} disabled />)

        const buttons = screen.getAllByRole('button')
        buttons.forEach((button) => {
            expect(button).toBeDisabled()
        })
    })

    it('disabled prop prevents onChipTap from being called', async () => {
        const user = userEvent.setup()
        const onChipTap = vi.fn()
        render(<QuickReplyChips chips={threeChips} onChipTap={onChipTap} disabled />)

        await user.click(screen.getByText('Change hotel'))
        expect(onChipTap).not.toHaveBeenCalled()
    })
})
