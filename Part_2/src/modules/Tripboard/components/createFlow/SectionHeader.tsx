/**
 * Caption-style section header with gradient lines flanking the label on
 * both sides. Used by every group divider in the destination picker
 * (POPULAR DESTINATIONS, ASIA, EUROPE, etc.).
 *
 * Gradients fade from transparent at the outer edge to brand-purple near
 * the label, so the eye is pulled into the title.
 */
export interface SectionHeaderProps {
    /** Visible title text. Rendered uppercase via .wf-caption-s + Tailwind. */
    label: string
    /** Element id assigned to the heading so consumers can wire aria-labelledby. */
    id?: string
}

export function SectionHeader({ label, id }: SectionHeaderProps) {
    return (
        <div className="mb-4 flex items-center gap-3">
            <span
                aria-hidden
                className="h-px flex-1"
                style={{
                    background:
                        'linear-gradient(90deg, rgba(112,17,246,0) 0%, rgba(112,17,246,0.6) 100%)',
                }}
            />
            <h3
                id={id}
                className="wf-caption-s uppercase tracking-wider"
                style={{ color: 'var(--text-tertiary)' }}
            >
                {label}
            </h3>
            <span
                aria-hidden
                className="h-px flex-1"
                style={{
                    background:
                        'linear-gradient(90deg, rgba(112,17,246,0.6) 0%, rgba(112,17,246,0) 100%)',
                }}
            />
        </div>
    )
}
