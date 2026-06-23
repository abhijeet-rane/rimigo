import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import ClarificationCard from '../ClarificationCard'
import type { ClarificationData } from '../types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fullData: ClarificationData = {
    output_type: 'clarification',
    response: 'Which city did you mean — Tokyo or Kyoto?',
    suggested_replies: ['Tokyo', 'Kyoto', 'Both'],
    context: 'ambiguous_city'
}

const noRepliesData: ClarificationData = {
    output_type: 'clarification',
    response: 'Could you tell me more about what you mean?',
    suggested_replies: []
}

const missingRepliesData: ClarificationData = {
    output_type: 'clarification',
    response: 'I need a bit more context to help you.'
}

const responseOnlyData: ClarificationData = {
    output_type: 'clarification',
    response: 'Can you clarify your request?'
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ClarificationCard', () => {
    it('renders data.response as question text', () => {
        render(<ClarificationCard data={fullData} />)
        expect(screen.getByText('Which city did you mean — Tokyo or Kyoto?')).toBeInTheDocument()
    })

    it('renders QuickReplyChips when suggested_replies present', () => {
        render(<ClarificationCard data={fullData} />)

        expect(screen.getByText('Tokyo')).toBeInTheDocument()
        expect(screen.getByText('Kyoto')).toBeInTheDocument()
        expect(screen.getByText('Both')).toBeInTheDocument()
    })

    it('renders no chips when suggested_replies is empty', () => {
        render(<ClarificationCard data={noRepliesData} />)

        expect(screen.getByText('Could you tell me more about what you mean?')).toBeInTheDocument()
        // No chip buttons should be rendered
        expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('renders no chips when suggested_replies is missing', () => {
        render(<ClarificationCard data={missingRepliesData} />)

        expect(screen.getByText('I need a bit more context to help you.')).toBeInTheDocument()
        expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('chip tap calls onSendAgentMessage with chip text', async () => {
        const user = userEvent.setup()
        const onSendAgentMessage = vi.fn()

        render(<ClarificationCard data={fullData} onSendAgentMessage={onSendAgentMessage} />)

        await user.click(screen.getByText('Tokyo'))
        expect(onSendAgentMessage).toHaveBeenCalledTimes(1)
        expect(onSendAgentMessage).toHaveBeenCalledWith('Tokyo')
    })

    it('card has the standard wrapper styling (rounded-[20px])', () => {
        const { container } = render(<ClarificationCard data={fullData} />)

        const wrapper = container.firstElementChild as HTMLElement
        expect(wrapper.className).toContain('rounded-[20px]')
    })

    it('backward compat: renders with only response field (no suggested_replies)', () => {
        render(<ClarificationCard data={responseOnlyData} />)

        expect(screen.getByText('Can you clarify your request?')).toBeInTheDocument()
        expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('does not crash when onSendAgentMessage is not provided', async () => {
        const user = userEvent.setup()
        render(<ClarificationCard data={fullData} />)

        // Tap a chip — should not throw
        await user.click(screen.getByText('Kyoto'))
    })

    it('does not render response text when response is empty', () => {
        const data: ClarificationData = {
            ...fullData,
            response: ''
        }

        render(<ClarificationCard data={data} />)

        // Chips should still render
        expect(screen.getByText('Tokyo')).toBeInTheDocument()
        expect(screen.getByText('Kyoto')).toBeInTheDocument()
    })
})
