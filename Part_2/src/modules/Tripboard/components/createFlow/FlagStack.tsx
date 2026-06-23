import { FlagChip } from './FlagChip'

/**
 * Small overlapping stack of country flags (URL images or emoji), e.g. for the
 * "Cities from 🇯🇵🇫🇷" heading. Mirrors the step-indicator's flag rendering so
 * the look stays consistent across the create flow.
 */
export interface FlagStackProps {
    /** Flag URLs and/or emoji. Falsy entries are skipped. */
    flags: string[]
    /** Max flags to show before stopping (no "+N" — kept compact). */
    max?: number
    /** Pixel size of each flag chip. */
    size?: number
}

export function FlagStack({ flags, max = 3, size = 22 }: FlagStackProps) {
    const visible = flags.filter(Boolean).slice(0, max)
    if (visible.length === 0) return null

    return (
        <span className="inline-flex shrink-0 items-center align-middle">
            {visible.map((flag, i) => (
                <FlagChip
                    key={i}
                    flag={flag}
                    imgClassName={`shrink-0 rounded-full border border-white object-cover ${i === 0 ? '' : '-ml-1.5'}`}
                    imgStyle={{ width: size, height: size }}
                    emojiClassName={`leading-none ${i === 0 ? '' : '-ml-1'}`}
                    emojiStyle={{ fontSize: size - 2 }}
                />
            ))}
        </span>
    )
}
