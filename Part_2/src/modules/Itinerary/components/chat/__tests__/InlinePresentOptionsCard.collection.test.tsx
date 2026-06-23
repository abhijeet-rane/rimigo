import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import InlinePresentOptionsCard from '../InlinePresentOptionsCard'

// Collection-window mode of present_options: when the backend stamps a
// `collection`, the card must render an HONEST, backend-owned count header
// ("Showing N of M") + a "See all M" affordance — never a count derived from
// the rendered items, and never present at all for a plain pick-set.
// kind="generic_options" keeps us on the lightweight OptionTile renderer.

const card = (title: string) => ({
    display: { title },
    on_select: { action_text: `Add ${title}`, structured_data: { id: title } },
})

const base = {
    kind: 'generic_options',
    items: [card('A'), card('B'), card('C')],
    interactionId: 'int-1',
    onSelect: () => {},
}

describe('InlinePresentOptionsCard — collection mode', () => {
    it('renders an honest "Showing N of M {label}" header + "See all M"', () => {
        render(
            <InlinePresentOptionsCard
                {...base}
                totalCount={9}
                shownCount={3}
                collectionLabel="saved"
                viewAll={{ action: 'open_experience_shortlist' }}
                onViewAll={() => {}}
            />,
        )
        expect(screen.getByText('Showing 3 of 9 saved')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'See all 9' })).toBeInTheDocument()
    })

    it('renders the AUTHORITATIVE totalCount verbatim — never items.length', () => {
        render(
            <InlinePresentOptionsCard
                {...base}
                items={[card('A'), card('B')]}
                totalCount={9}
                shownCount={2}
                collectionLabel="saved"
                viewAll={{ action: 'open_experience_shortlist' }}
                onViewAll={() => {}}
            />,
        )
        expect(screen.getByText('Showing 2 of 9 saved')).toBeInTheDocument()
        expect(screen.queryByText(/of 2/)).not.toBeInTheDocument()
    })

    it('collapses to "{total} {label}" and hides See-all when nothing more remains', () => {
        render(
            <InlinePresentOptionsCard
                {...base}
                totalCount={3}
                shownCount={3}
                collectionLabel="saved"
                viewAll={{ action: 'open_experience_shortlist' }}
                onViewAll={() => {}}
            />,
        )
        expect(screen.getByText('3 saved')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /See all/ })).not.toBeInTheDocument()
    })

    it('fires the viewAll custom_action token when "See all" is tapped', async () => {
        const onViewAll = vi.fn()
        render(
            <InlinePresentOptionsCard
                {...base}
                totalCount={9}
                shownCount={3}
                collectionLabel="saved"
                viewAll={{ action: 'open_experience_shortlist' }}
                onViewAll={onViewAll}
            />,
        )
        await userEvent.click(screen.getByRole('button', { name: 'See all 9' }))
        expect(onViewAll).toHaveBeenCalledWith('open_experience_shortlist')
    })

    it('stays a plain picker (no count header / See-all) when no collection props', () => {
        render(<InlinePresentOptionsCard {...base} title="Pick one" />)
        expect(screen.queryByText(/Showing/)).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /See all/ })).not.toBeInTheDocument()
    })
})
