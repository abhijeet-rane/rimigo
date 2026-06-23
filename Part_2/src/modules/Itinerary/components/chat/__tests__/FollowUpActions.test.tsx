/**
 * Unit tests for FollowUpActions — the 2-3 chip strip rendered below
 * concierge messages for intent / reply / dismiss CTAs. The pill-style
 * navigation CTAs continue to render via the existing ResponseActions
 * surface; they are intentionally NOT exercised here.
 */
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import FollowUpActions, {
    type FollowUpChipAction,
} from '../primitives/FollowUpActions'

const INTENT_PRIMARY: FollowUpChipAction = {
    action: 'intent',
    cta: 'Switch to daytime',
    style: 'primary',
    action_data: { type: 'intent', intent: 'switch_flight_mode' },
}
const INTENT_SECONDARY: FollowUpChipAction = {
    action: 'intent',
    cta: 'Trade a Bali night',
    style: 'secondary',
    action_data: { type: 'intent', intent: 'rebalance_night' },
}
const REPLY: FollowUpChipAction = {
    action: 'reply',
    cta: 'Send a different name',
    style: 'secondary',
    action_data: {
        type: 'reply',
        message: 'Actually, let me send the correct name',
    },
}
const DISMISS: FollowUpChipAction = {
    action: 'dismiss',
    cta: 'Leave it for now',
    style: 'secondary',
    action_data: { type: 'dismiss', reason: 'user_declined' },
}

describe('FollowUpActions', () => {
    it('renders one chip per action with the cta label', () => {
        render(
            <FollowUpActions
                actions={[INTENT_PRIMARY, INTENT_SECONDARY]}
                onAction={vi.fn()}
            />,
        )
        expect(screen.getByRole('button', { name: 'Switch to daytime' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Trade a Bali night' })).toBeInTheDocument()
    })

    it('returns null when actions is empty', () => {
        const { container } = render(<FollowUpActions actions={[]} onAction={vi.fn()} />)
        expect(container.firstChild).toBeNull()
    })

    it('intent tap fires onAction with the action object and its index', async () => {
        const onAction = vi.fn()
        const user = userEvent.setup()
        render(
            <FollowUpActions
                actions={[INTENT_PRIMARY, INTENT_SECONDARY]}
                onAction={onAction}
            />,
        )

        await user.click(screen.getByRole('button', { name: 'Switch to daytime' }))
        expect(onAction).toHaveBeenCalledTimes(1)
        expect(onAction).toHaveBeenCalledWith(INTENT_PRIMARY, 0)
    })

    it('reply tap fires onAction with the reply action and index', async () => {
        const onAction = vi.fn()
        const user = userEvent.setup()
        render(
            <FollowUpActions actions={[INTENT_PRIMARY, REPLY]} onAction={onAction} />,
        )

        await user.click(screen.getByRole('button', { name: 'Send a different name' }))
        expect(onAction).toHaveBeenCalledWith(REPLY, 1)
    })

    it('preselectedIdx renders the picked chip as selected and ignores re-taps', async () => {
        const onAction = vi.fn()
        const user = userEvent.setup()
        const { container } = render(
            <FollowUpActions
                actions={[INTENT_PRIMARY, INTENT_SECONDARY]}
                onAction={onAction}
                preselectedIdx={0}
            />,
        )
        // Both buttons are non-interactive when a pick is already recorded.
        const buttons = container.querySelectorAll('button')
        expect(buttons[0]).toBeDisabled()
        expect(buttons[1]).toBeDisabled()
        // Re-taps must NOT fire onAction.
        await user.click(buttons[0])
        await user.click(buttons[1])
        expect(onAction).not.toHaveBeenCalled()
    })

    it('dismiss tap does NOT call onAction — local resolution only', async () => {
        const onAction = vi.fn()
        const user = userEvent.setup()
        render(
            <FollowUpActions
                actions={[INTENT_PRIMARY, DISMISS]}
                onAction={onAction}
            />,
        )
        await user.click(screen.getByRole('button', { name: 'Leave it for now' }))
        expect(onAction).not.toHaveBeenCalled()
    })

    it('dismiss tap collapses the row in silent mode after the resolve delay', async () => {
        vi.useFakeTimers()
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

        const { container } = render(
            <FollowUpActions
                actions={[INTENT_PRIMARY, DISMISS]}
                onAction={vi.fn()}
                dismissalMode="silent"
            />,
        )
        expect(container.firstChild).not.toBeNull()

        await user.click(screen.getByRole('button', { name: 'Leave it for now' }))
        // The component schedules the silent-hide after a 220ms "register
        // the tap" beat — advance past it and let React flush.
        act(() => {
            vi.advanceTimersByTime(250)
        })
        expect(container.firstChild).toBeNull()

        vi.useRealTimers()
    })

    it('dismiss tap shows the "Dismissed" label in fade mode', async () => {
        vi.useFakeTimers()
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

        render(
            <FollowUpActions
                actions={[INTENT_PRIMARY, DISMISS]}
                onAction={vi.fn()}
                dismissalMode="fade"
            />,
        )
        await user.click(screen.getByRole('button', { name: 'Leave it for now' }))
        act(() => {
            vi.advanceTimersByTime(250)
        })
        expect(screen.getByText('Dismissed')).toBeInTheDocument()
        vi.useRealTimers()
    })

    it('intent tap locks the row — second tap on a peer is ignored', async () => {
        const onAction = vi.fn()
        const user = userEvent.setup()
        render(
            <FollowUpActions
                actions={[INTENT_PRIMARY, INTENT_SECONDARY]}
                onAction={onAction}
            />,
        )

        await user.click(screen.getByRole('button', { name: 'Switch to daytime' }))
        await user.click(screen.getByRole('button', { name: 'Trade a Bali night' }))
        // Only the first tap should make it through; peer becomes
        // dimmed/disabled while we wait for the next turn.
        expect(onAction).toHaveBeenCalledTimes(1)
    })

    it('stale prop disables every chip', async () => {
        const onAction = vi.fn()
        const user = userEvent.setup()
        render(
            <FollowUpActions
                actions={[INTENT_PRIMARY, INTENT_SECONDARY]}
                onAction={onAction}
                stale
            />,
        )

        await user.click(screen.getByRole('button', { name: 'Switch to daytime' }))
        expect(onAction).not.toHaveBeenCalled()
        // Buttons render aria-disabled so screen readers + e2e treat them
        // as inactive.
        expect(
            screen.getByRole('button', { name: 'Switch to daytime' }),
        ).toBeDisabled()
    })
})
