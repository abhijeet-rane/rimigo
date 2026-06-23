import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import UpdateDiffCard from '../UpdateDiffCard'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const addSlotChange = {
    updated_slot_paths: [
        {
            day_index: 0,
            slot_index: 2,
            title: 'Senso-ji Temple',
            kind: 'activity',
            change_type: 'add_slot',
        },
    ],
}

const removeSlotChange = {
    updated_slot_paths: [
        {
            day_index: 0,
            slot_index: 1,
            title: 'Tokyo Tower',
            kind: 'activity',
            change_type: 'remove_slot',
        },
    ],
}

const replaceSlotChange = {
    updated_slot_paths: [
        {
            day_index: 1,
            slot_index: 0,
            title: 'Meiji Shrine',
            kind: 'activity',
            change_type: 'replace_slot',
        },
    ],
}

const modifySlotChange = {
    updated_slot_paths: [
        {
            day_index: 0,
            slot_index: 0,
            title: 'Tsukiji Market',
            kind: 'food',
            change_type: 'modify_slot',
        },
    ],
}

const multiDayChanges = {
    updated_slot_paths: [
        {
            day_index: 0,
            slot_index: 0,
            title: 'Morning Walk',
            kind: 'activity',
            change_type: 'add_slot',
        },
        {
            day_index: 0,
            slot_index: 1,
            title: 'Lunch Spot',
            kind: 'food',
            change_type: 'modify_slot',
        },
        {
            day_index: 2,
            slot_index: 0,
            title: 'Kinkaku-ji',
            kind: 'activity',
            change_type: 'replace_slot',
        },
    ],
}

const noTitleChange = {
    updated_slot_paths: [
        {
            day_index: 1,
            slot_index: 0,
            change_type: 'add_slot',
        },
    ],
}

const unknownChangeType = {
    updated_slot_paths: [
        {
            day_index: 0,
            slot_index: 0,
            title: 'Some Slot',
            change_type: 'unknown_type',
        },
    ],
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UpdateDiffCard', () => {
    it('renders add_slot with green background and title', () => {
        const { container } = render(<UpdateDiffCard changes={addSlotChange} />)

        expect(screen.getByText('Senso-ji Temple')).toBeInTheDocument()
        expect(screen.getByText('activity')).toBeInTheDocument()

        // Green bg for add_slot
        const slotRow = container.querySelector('.bg-emerald-50')
        expect(slotRow).toBeInTheDocument()

        // Green text icon
        const iconSpan = container.querySelector('.text-emerald-600')
        expect(iconSpan).toBeInTheDocument()
    })

    it('renders remove_slot with red background and strikethrough', () => {
        const { container } = render(<UpdateDiffCard changes={removeSlotChange} />)

        expect(screen.getByText('Tokyo Tower')).toBeInTheDocument()

        // Red bg for remove_slot
        const slotRow = container.querySelector('.bg-red-50')
        expect(slotRow).toBeInTheDocument()

        // Red icon
        const iconSpan = container.querySelector('.text-red-500')
        expect(iconSpan).toBeInTheDocument()

        // Strikethrough text
        const titleEl = screen.getByText('Tokyo Tower')
        expect(titleEl.className).toContain('line-through')
    })

    it('renders replace_slot with purple background', () => {
        const { container } = render(<UpdateDiffCard changes={replaceSlotChange} />)

        expect(screen.getByText('Meiji Shrine')).toBeInTheDocument()

        // Purple bg for replace_slot
        const slotRow = container.querySelector('.bg-purple-50')
        expect(slotRow).toBeInTheDocument()

        // Purple icon
        const iconSpan = container.querySelector('.text-purple-600')
        expect(iconSpan).toBeInTheDocument()
    })

    it('renders modify_slot with amber background', () => {
        const { container } = render(<UpdateDiffCard changes={modifySlotChange} />)

        expect(screen.getByText('Tsukiji Market')).toBeInTheDocument()

        // Amber bg for modify_slot
        const slotRow = container.querySelector('.bg-amber-50')
        expect(slotRow).toBeInTheDocument()

        // Amber icon
        const iconSpan = container.querySelector('.text-amber-600')
        expect(iconSpan).toBeInTheDocument()
    })

    it('groups changes by day', () => {
        render(<UpdateDiffCard changes={multiDayChanges} />)

        // Day 1 (day_index 0) and Day 3 (day_index 2)
        expect(screen.getByText('Day 1')).toBeInTheDocument()
        expect(screen.getByText('Day 3')).toBeInTheDocument()

        // All three titles rendered
        expect(screen.getByText('Morning Walk')).toBeInTheDocument()
        expect(screen.getByText('Lunch Spot')).toBeInTheDocument()
        expect(screen.getByText('Kinkaku-ji')).toBeInTheDocument()
    })

    it('shows slot title when available', () => {
        render(<UpdateDiffCard changes={addSlotChange} />)
        expect(screen.getByText('Senso-ji Temple')).toBeInTheDocument()
    })

    it('shows readable fallback when title empty', () => {
        render(<UpdateDiffCard changes={noTitleChange} />)

        // Without a title, should fall back to config.label = "Activity added"
        expect(screen.getByText('Activity added')).toBeInTheDocument()
    })

    it('renders nothing when updated_slot_paths is empty', () => {
        const { container } = render(
            <UpdateDiffCard changes={{ updated_slot_paths: [] }} />
        )
        expect(container.firstChild).toBeNull()
    })

    it('handles undefined updated_slot_paths gracefully', () => {
        const { container } = render(
            <UpdateDiffCard changes={{ updated_slot_paths: undefined }} />
        )
        expect(container.firstChild).toBeNull()
    })

    it('handles changes object without updated_slot_paths key', () => {
        const { container } = render(<UpdateDiffCard changes={{}} />)
        expect(container.firstChild).toBeNull()
    })

    it('renders "Diff" header label', () => {
        render(<UpdateDiffCard changes={addSlotChange} />)
        expect(screen.getByText('Diff')).toBeInTheDocument()
    })

    it('uses default config for unknown change_type', () => {
        const { container } = render(<UpdateDiffCard changes={unknownChangeType} />)

        expect(screen.getByText('Some Slot')).toBeInTheDocument()

        // Default bg
        const slotRow = container.querySelector('.bg-grey_5')
        expect(slotRow).toBeInTheDocument()
    })

    it('uses day_number for display label when available', () => {
        const changes = {
            updated_slot_paths: [
                {
                    day_index: 0,
                    slot_index: 0,
                    title: 'Test Slot',
                    change_type: 'add_slot',
                    day_number: 5,
                },
            ],
        }

        render(<UpdateDiffCard changes={changes} />)

        // day_number=5 should override day_index+1=1
        expect(screen.getByText('Day 5')).toBeInTheDocument()
        expect(screen.queryByText('Day 1')).not.toBeInTheDocument()
    })

    it('renders kind badge when slot has kind', () => {
        render(<UpdateDiffCard changes={addSlotChange} />)
        expect(screen.getByText('activity')).toBeInTheDocument()
    })

    it('does not render kind badge when slot lacks kind', () => {
        render(<UpdateDiffCard changes={noTitleChange} />)

        // The noTitleChange fixture has no kind property
        expect(screen.queryByText('activity')).not.toBeInTheDocument()
        expect(screen.queryByText('food')).not.toBeInTheDocument()
    })
})
