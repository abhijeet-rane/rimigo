/**
 * Horizontal scrollable row of contextual action chips.
 * Shown above the chat input to guide users toward common actions.
 */
import React, { useState } from 'react'
import { STAR_PRIMARY_DEFAULT } from '@/constants/icons/svgFromCDN'
import type { ActionChipConfig } from './chipConfigs'

interface ActionChipsProps {
    chips: ActionChipConfig[]
    onChipTap: (prompt: string, metadata?: Record<string, any>) => void
    disabled?: boolean
}

// Mirrors the popup's SuggestionChips. Warning variant kept amber.
const VARIANT_CLASSES: Record<string, string> = {
    primary: 'bg-white text-primary-default border-primary-default hover:bg-primary-default/[0.06]',
    secondary: 'bg-white text-primary-default border-primary-default hover:bg-primary-default/[0.06]',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
}

const DISABLED_CLASSES = 'bg-grey_5 text-grey_3 border-grey_4 cursor-default'

const ActionChips: React.FC<ActionChipsProps> = ({ chips, onChipTap, disabled = false }) => {
    const [tapped, setTapped] = useState(false)
    const isDisabled = disabled || tapped

    const handleTap = (chip: ActionChipConfig) => {
        if (isDisabled) return
        setTapped(true)
        onChipTap(chip.prompt, chip.metadata)
        // Reset after 2s to allow re-interaction
        setTimeout(() => setTapped(false), 2000)
    }

    if (chips.length === 0) return null

    return (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 pr-1" role="group" aria-label="Quick actions">
            {chips.map((chip) => {
                const variant = chip.variant || 'secondary'
                const classes = isDisabled ? DISABLED_CLASSES : VARIANT_CLASSES[variant]

                return (
                    <button
                        key={chip.label}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => handleTap(chip)}
                        className={`flex-shrink-0 inline-flex items-center gap-1 rounded-[12px] px-2.5 py-1 text-[12px] font-medium font-manrope border transition-colors cursor-pointer ${classes}`}
                    >
                        {/* Same star sprite the popup's SuggestionChips use,
                            so the chat-input row visually matches the
                            floating popup's pill row. */}
                        <img
                            src={STAR_PRIMARY_DEFAULT}
                            alt=""
                            aria-hidden
                            className="h-3 w-3 flex-shrink-0"
                        />
                        {chip.label}
                    </button>
                )
            })}
        </div>
    )
}

export default ActionChips
