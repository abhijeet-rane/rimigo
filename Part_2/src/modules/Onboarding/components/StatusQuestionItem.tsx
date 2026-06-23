'use client'

import React, { useState, useEffect, useMemo } from 'react'
import clsx from 'clsx'
import Typography from '@/components/shared/Typography'

interface StatusQuestionItemProps {
    question: string
    subText?: string
    answers: string[]
    multiSelect?: boolean
    onSelectionChange?: (selected: string[]) => void
    initialSelected?: string[]
}

export const StatusQuestionItem: React.FC<StatusQuestionItemProps> = ({
    question,
    subText,
    answers,
    multiSelect = false,
    onSelectionChange,
    initialSelected = []
}) => {
    const [selected, setSelected] = useState<string[]>(initialSelected)
    const [hasUserInteracted, setHasUserInteracted] = useState(false)

    // Memoize initialSelected to prevent unnecessary re-renders
    const memoizedInitialSelected = useMemo(() => initialSelected, [initialSelected.join(',')])

    // Update selected when initialSelected changes, but only if user hasn't interacted yet
    useEffect(() => {
        if (!hasUserInteracted && memoizedInitialSelected.length > 0) {
            setSelected(memoizedInitialSelected)
        }
    }, [memoizedInitialSelected, hasUserInteracted])

    const handleSelect = (item: string) => {
        setHasUserInteracted(true)

        if (multiSelect) {
            const newSelected = selected.includes(item) ? selected.filter((i) => i !== item) : [...selected, item]
            setSelected(newSelected)
            onSelectionChange?.(newSelected)
        } else {
            const newSelected = selected.includes(item) ? [] : [item]
            setSelected(newSelected)
            onSelectionChange?.(newSelected)
        }
    }

    return (
        <div className="flex flex-col gap-3 w-full">
            {/* Question */}
            <div className="flex flex-col gap-1">
                <Typography
                    family="manrope"
                    weight="bold"
                    size="14"
                    style={{ color: 'var(--color-grey-1)' }}>
                    {question}
                </Typography>

                {/* Subtext */}
                {subText && (
                    <Typography
                        family="manrope"
                        weight="medium"
                        size="12"
                        style={{ color: 'var(--color-grey-2)' }}>
                        {subText}
                    </Typography>
                )}
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-3 mt-2 w-full">
                {answers.map((item, idx) => {
                    const isSelected = selected.includes(item)
                    const isLastSingle = answers.length % 2 === 1 && idx === answers.length - 1 // checks if last item is single in row

                    return (
                        <button
                            key={item}
                            onClick={() => handleSelect(item)}
                            className={clsx('rounded-xl border px-3 py-3 transition-colors cursor-pointer', isLastSingle ? 'col-span-2' : 'w-full')}
                            style={{
                                backgroundColor: isSelected ? 'var(--color-primary-default-80)' : 'var(--color-natural-white)',
                                borderColor: isSelected ? 'var(--color-primary-default)' : 'var(--color-grey-4)'
                            }}>
                            <Typography
                                family="redhat"
                                weight="semibold"
                                size="14"
                                color={isSelected ? 'primary-default' : 'grey-0'}>
                                {item}
                            </Typography>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
