import type { CSSProperties } from 'react'

/**
 * Renders a single country flag — an `<img>` when `flag` is a URL, otherwise the
 * emoji as text. Both branches are decorative (`aria-hidden`). The wrapper passes
 * the per-site className/style so each caller keeps its own size/border/overlap.
 *
 * Shared by FlagStack, StepIndicator, and the Select-Cities route panel, which
 * all had this identical `flag.startsWith('http')` branch copy-pasted.
 */
export interface FlagChipProps {
    /** A flag image URL or an emoji string. */
    flag: string
    imgClassName?: string
    imgStyle?: CSSProperties
    emojiClassName?: string
    emojiStyle?: CSSProperties
}

export function FlagChip({ flag, imgClassName, imgStyle, emojiClassName, emojiStyle }: FlagChipProps) {
    return flag.startsWith('http') ? (
        <img
            src={flag}
            alt="flag"
            aria-hidden
            className={imgClassName}
            style={imgStyle}
        />
    ) : (
        <span
            aria-hidden
            className={emojiClassName}
            style={emojiStyle}>
            {flag}
        </span>
    )
}
