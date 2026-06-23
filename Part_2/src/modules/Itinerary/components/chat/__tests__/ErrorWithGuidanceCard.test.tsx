import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import ErrorWithGuidanceCard from '../ErrorWithGuidanceCard'
import type { ErrorWithGuidanceData } from '../types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fullData: ErrorWithGuidanceData = {
    output_type: 'error_with_guidance',
    response: "I couldn't find that restaurant. It may be closed or renamed.",
    error_type: 'not_found',
    suggested_actions: [
        'Search for similar restaurants',
        'Try a different name',
        'Show nearby options'
    ]
}

const noActionsData: ErrorWithGuidanceData = {
    output_type: 'error_with_guidance',
    response: 'Something went wrong, but your itinerary is safe.',
    suggested_actions: []
}

const missingActionsData: ErrorWithGuidanceData = {
    output_type: 'error_with_guidance',
    response: 'An unexpected error occurred.'
}

const responseOnlyData: ErrorWithGuidanceData = {
    output_type: 'error_with_guidance',
    response: 'We hit a temporary issue. Please try again.'
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ErrorWithGuidanceCard', () => {
    it('renders data.response as error message', () => {
        render(<ErrorWithGuidanceCard data={fullData} />)
        expect(
            screen.getByText("I couldn't find that restaurant. It may be closed or renamed.")
        ).toBeInTheDocument()
    })

    it('renders suggested_actions as QuickReplyChips', () => {
        render(<ErrorWithGuidanceCard data={fullData} />)

        expect(screen.getByText('Search for similar restaurants')).toBeInTheDocument()
        expect(screen.getByText('Try a different name')).toBeInTheDocument()
        expect(screen.getByText('Show nearby options')).toBeInTheDocument()
    })

    it('has warm styling (not alarming red)', () => {
        const { container } = render(<ErrorWithGuidanceCard data={fullData} />)

        // The error message area uses amber/warm tones, not red
        const warningBox = container.querySelector('.bg-amber-50\\/50')
        expect(warningBox).toBeInTheDocument()

        // Verify no alarming red classes are present on the wrapper
        const html = container.innerHTML
        expect(html).not.toContain('bg-red-')
        expect(html).not.toContain('text-red-')
        expect(html).not.toContain('border-red-')
    })

    it('chip tap calls onSendAgentMessage', async () => {
        const user = userEvent.setup()
        const onSendAgentMessage = vi.fn()

        render(<ErrorWithGuidanceCard data={fullData} onSendAgentMessage={onSendAgentMessage} />)

        await user.click(screen.getByText('Search for similar restaurants'))
        expect(onSendAgentMessage).toHaveBeenCalledTimes(1)
        expect(onSendAgentMessage).toHaveBeenCalledWith('Search for similar restaurants')
    })

    it('renders gracefully with empty suggested_actions', () => {
        render(<ErrorWithGuidanceCard data={noActionsData} />)

        expect(screen.getByText('Something went wrong, but your itinerary is safe.')).toBeInTheDocument()
        // No chip buttons should be rendered
        expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('renders gracefully with missing suggested_actions', () => {
        render(<ErrorWithGuidanceCard data={missingActionsData} />)

        expect(screen.getByText('An unexpected error occurred.')).toBeInTheDocument()
        expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('backward compat: renders with only response field', () => {
        render(<ErrorWithGuidanceCard data={responseOnlyData} />)

        expect(screen.getByText('We hit a temporary issue. Please try again.')).toBeInTheDocument()
        expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('does not crash when onSendAgentMessage is not provided', async () => {
        const user = userEvent.setup()
        render(<ErrorWithGuidanceCard data={fullData} />)

        // Tap a chip — should not throw
        await user.click(screen.getByText('Try a different name'))
    })

    it('card has the standard wrapper styling (rounded-[20px])', () => {
        const { container } = render(<ErrorWithGuidanceCard data={fullData} />)

        const wrapper = container.firstElementChild as HTMLElement
        expect(wrapper.className).toContain('rounded-[20px]')
    })

    it('renders the info icon for warm guidance tone', () => {
        const { container } = render(<ErrorWithGuidanceCard data={fullData} />)

        // lucide-react Info icon renders as an SVG
        const svg = container.querySelector('svg')
        expect(svg).toBeInTheDocument()
    })
})
