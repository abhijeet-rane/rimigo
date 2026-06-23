import React from 'react'
import Typography from '@/components/shared/Typography'
import { BULB_ICON } from '@/constants/thiingsIcons'

interface TipsListProps {
    /** Free-form note text. Split on newlines into bullet items so it stays
     * visually consistent with the suggestions row below. Empty/whitespace
     * lines are dropped. */
    notes?: string
    /** Pre-bulleted suggestion strings. */
    suggestions?: string[]
    /** Show/hide the "Tips" header. Defaults to true. */
    showHeader?: boolean
    className?: string
}

const splitNotes = (notes?: string): string[] => {
    if (!notes) return []
    return notes
        .split(/\r?\n+/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
}

const TipsList: React.FC<TipsListProps> = ({ notes, suggestions = [], showHeader = true, className }) => {
    const items = [...splitNotes(notes), ...suggestions]
    if (items.length === 0) return null

    return (
        <div className={`flex flex-col gap-2 ${className ?? ''}`}>
            {showHeader && (
                <Typography
                    size="14"
                    weight="semibold"
                    family="redhat"
                    color="grey-0">
                    Tips
                </Typography>
            )}
            <div className="flex flex-col gap-2">
                {items.map((text, i) => (
                    <div
                        key={i}
                        className="flex items-start gap-2">
                        <img
                            src={BULB_ICON}
                            alt="Tip"
                            className="mt-[2px] h-4 w-4 shrink-0 object-contain"
                        />
                        <Typography
                            size="13"
                            weight="medium"
                            family="manrope"
                            color="grey-0"
                            className="leading-relaxed">
                            {text}
                        </Typography>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default TipsList
