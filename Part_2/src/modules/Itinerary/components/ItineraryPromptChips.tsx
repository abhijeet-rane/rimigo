import React from 'react'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'

interface ItineraryPromptChipsProps {
    prompts: string[] | undefined
    isLoading: boolean
    isPolling: boolean
    selectedPrompts: string[]
    onPromptSelect: (prompt: string) => void
}

const ItineraryPromptChips: React.FC<ItineraryPromptChipsProps> = ({ prompts, isLoading, isPolling, selectedPrompts, onPromptSelect }) => {
    const hasPrompts = (prompts?.length ?? 0) > 0

    if (isLoading || isPolling) {
        return (
            <div className="mt-4">
                <GenericCarousel
                    gap={8}
                    className="w-full">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <span
                            key={`prompt-skeleton-${i}`}
                            className="inline-flex items-center gap-[6px] px-3 py-1.5 rounded-[28px] border border-grey-4 bg-grey-4/40 whitespace-nowrap shrink-0">
                            <span className="h-4 w-4 rounded-full bg-grey-4/70 animate-pulse" />
                            <span className="block h-3 w-28 rounded-full bg-grey-4/70 animate-pulse" />
                        </span>
                    ))}
                </GenericCarousel>
            </div>
        )
    }

    if (!hasPrompts) {
        return null
    }

    return (
        <div className="mt-4">
            <GenericCarousel
                gap={8}
                className="w-full">
                {prompts!.map((prompt) => {
                    const isSelected = selectedPrompts.includes(prompt)

                    return (
                        <button
                            key={prompt}
                            type="button"
                            onClick={() => onPromptSelect(prompt)}
                            className={`cursor-pointer inline-flex items-center gap-[6px] px-3 py-1.5 rounded-[28px] border text-sm font-semibold whitespace-nowrap shrink-0 transition-colors ${
                                isSelected
                                    ? 'border-primary-default bg-purple-50 text-purple-700 hover:bg-purple-100'
                                    : 'border-grey-4 bg-white text-header-black hover:border-purple-400 hover:bg-purple-50'
                            }`}>
                            <img
                                src="/icons/sparkles.svg"
                                alt=""
                                className="h-4 w-4"
                            />
                            <span>{prompt}</span>
                        </button>
                    )
                })}
            </GenericCarousel>
        </div>
    )
}

export default ItineraryPromptChips
