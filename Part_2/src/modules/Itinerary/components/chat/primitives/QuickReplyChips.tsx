import React, { useState } from 'react'

interface QuickReplyChipsProps {
    chips: string[]
    onChipTap: (text: string) => void
    disabled?: boolean
}

const MAX_VISIBLE_CHIPS = 5
const SOMETHING_ELSE_LABEL = 'Something else...'

const QuickReplyChips: React.FC<QuickReplyChipsProps> = ({ chips, onChipTap, disabled: disabledProp }) => {
    const [tapped, setTapped] = useState(false)

    const isDisabled = disabledProp || tapped

    const handleTap = (text: string) => {
        if (isDisabled) return
        setTapped(true)
        onChipTap(text)
    }

    // Truncate to max visible, reserving the last slot for "Something else..."
    const visibleChips = chips.length > MAX_VISIBLE_CHIPS
        ? chips.slice(0, MAX_VISIBLE_CHIPS - 1)
        : chips

    const showSomethingElse = chips.length > MAX_VISIBLE_CHIPS
        || !chips.includes(SOMETHING_ELSE_LABEL)

    const handleKeyDown = (text: string, e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleTap(text)
        }
    }

    return (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1" role="group" aria-label="Suggested replies">
            {visibleChips.map((chip) => (
                <button
                    key={chip}
                    type="button"
                    role="button"
                    tabIndex={0}
                    disabled={isDisabled}
                    aria-disabled={isDisabled}
                    onClick={() => handleTap(chip)}
                    onKeyDown={(e) => handleKeyDown(chip, e)}
                    className={`flex-shrink-0 min-h-[44px] rounded-full px-4 py-2.5 text-sm font-medium font-manrope transition-colors ${
                        isDisabled
                            ? 'bg-grey_5 text-grey_3 cursor-default'
                            : 'bg-primary-default/10 text-primary-default border border-primary-default/20 hover:bg-primary-default/20 cursor-pointer'
                    }`}>
                    {chip}
                </button>
            ))}

            {showSomethingElse && (
                <button
                    type="button"
                    role="button"
                    tabIndex={0}
                    disabled={isDisabled}
                    aria-disabled={isDisabled}
                    onClick={() => handleTap(SOMETHING_ELSE_LABEL)}
                    onKeyDown={(e) => handleKeyDown(SOMETHING_ELSE_LABEL, e)}
                    className={`flex-shrink-0 min-h-[44px] rounded-full px-4 py-2.5 text-sm font-medium font-manrope transition-colors ${
                        isDisabled
                            ? 'bg-grey_5 text-grey_3 cursor-default'
                            : 'bg-transparent text-primary-default border border-primary-default/30 hover:bg-primary-default/5 cursor-pointer'
                    }`}>
                    {SOMETHING_ELSE_LABEL}
                </button>
            )}
        </div>
    )
}

export default QuickReplyChips
