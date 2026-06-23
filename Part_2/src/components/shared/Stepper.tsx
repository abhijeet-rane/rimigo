import type { CSSProperties, ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'

/** Shared `−  value  +` control. Value node is passed as `children` so each
 *  caller keeps its own typography; visuals tune via size/border/icon props. */
export interface StepperProps {
    onIncrement: () => void
    onDecrement: () => void
    /** Base for the button aria-labels: "Increase {label}" / "Decrease {label}". */
    label: string
    decrementDisabled?: boolean
    incrementDisabled?: boolean
    /** Circular button diameter in px. Default 32. */
    size?: number
    /** Button border color. Default brand indigo. */
    borderColor?: string
    /** Icon color. Defaults to `borderColor`. */
    iconColor?: string
    /** Border thickness in px. Default 1. */
    borderWidth?: number
    /** Lucide icon size in px. Defaults to ~45% of `size`. */
    iconSize?: number
    /** Gap (px) between the buttons and the value. Default 12. */
    gap?: number
    /** The middle value node — typography owned by the caller. */
    children: ReactNode
}

export function Stepper({
    onIncrement,
    onDecrement,
    label,
    decrementDisabled,
    incrementDisabled,
    size = 32,
    borderColor = '#7011F6',
    iconColor,
    borderWidth = 1,
    iconSize,
    gap = 12,
    children
}: StepperProps) {
    const resolvedIconColor = iconColor ?? borderColor
    const resolvedIconSize = iconSize ?? Math.round(size * 0.45)
    const buttonStyle: CSSProperties = {
        width: size,
        height: size,
        borderRadius: size / 2,
        border: `${borderWidth}px solid ${borderColor}`,
        background: '#FFF',
        color: resolvedIconColor,
        flexShrink: 0
    }
    return (
        <div
            className="flex shrink-0 items-center"
            style={{ gap }}>
            <button
                type="button"
                onClick={onDecrement}
                disabled={decrementDisabled}
                aria-label={`Decrease ${label}`}
                className="flex cursor-pointer items-center justify-center transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                style={buttonStyle}>
                <Minus
                    size={resolvedIconSize}
                    strokeWidth={2}
                    aria-hidden
                />
            </button>
            {children}
            <button
                type="button"
                onClick={onIncrement}
                disabled={incrementDisabled}
                aria-label={`Increase ${label}`}
                className="flex cursor-pointer items-center justify-center transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                style={buttonStyle}>
                <Plus
                    size={resolvedIconSize}
                    strokeWidth={2}
                    aria-hidden
                />
            </button>
        </div>
    )
}
