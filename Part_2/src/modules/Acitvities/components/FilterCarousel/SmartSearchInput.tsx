import React from 'react'
import { Search, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TypingAnimation } from '@/components/ui/typing-animation'
import BackButton from './BackButton'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'
import FloatingPrompt from './FloatingPrompt'

interface FloatingPromptData {
    text: string
    onClick?: () => void
}

interface SmartSearchInputProps {
    query: string
    onQueryChange: (query: string) => void
    onBack: () => void
    onSearch?: () => void
    floatingPrompts?: FloatingPromptData[]
    className?: string
}

const SmartSearchInput: React.FC<SmartSearchInputProps> = ({ query, onQueryChange, onBack, onSearch, floatingPrompts = [], className }) => {
    // Default placeholder prompts if none provided
    const defaultPrompts: FloatingPromptData[] = [
        { text: 'Which are the best bars in Paris?' },
        { text: 'Show me places to chill & relax' },
        { text: 'Discover hidden gems for a peaceful escape' }
    ]

    const prompts = floatingPrompts.length > 0 ? floatingPrompts : defaultPrompts

    return (
        <div className={cn('w-full py-0', className)}>
            <div className="flex items-center gap-2 w-full">
                <BackButton onClick={onBack} />

                {/* Search Input */}
                <div
                    className="relative shrink-0"
                    style={{
                        borderRadius: '24px',
                        boxShadow: '0 0 14px 3px rgba(139,92,246,0.08), 0 0 28px 6px rgba(99,102,241,0.04)',
                    }}>
                    <div className="flex items-center gap-2 pl-10 pr-1.5 py-2 rounded-full border border-violet-200/60 bg-white">
                        <Wand2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400 pointer-events-none" />
                        <div className="relative">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => onQueryChange(e.target.value)}
                                placeholder=""
                                className="w-[260px] text-sm font-semibold font-manrope text-grey-0 bg-transparent border-none outline-none"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && onSearch) {
                                        onSearch()
                                    }
                                }}
                            />
                            {!query.trim() && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-sm text-violet-300 pointer-events-none truncate font-manrope">
                                    <TypingAnimation
                                        words={[
                                            '"Best bars and nightlife spots"',
                                            '"Places to chill and relax"',
                                            '"Hidden gems for foodies"',
                                            '"Outdoor adventures nearby"',
                                        ]}
                                        loop
                                        className="inline"
                                    />
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={onSearch}
                            className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0 hover:bg-violet-700 transition-colors">
                            <Search
                                size={16}
                                className="text-white"
                            />
                        </button>
                    </div>
                </div>

                {/* Floating Prompts */}
                <div className="flex-1 min-w-0">
                    <GenericCarousel
                        className="py-0"
                        gap={12}
                        gradientStartColor="white"
                        gradientEndColor="rgba(255,255,255,0)">
                        {prompts.map((prompt, index) => (
                            <FloatingPrompt
                                key={index}
                                text={prompt.text}
                                onClick={() => {
                                    // Set the prompt text as the query
                                    onQueryChange(prompt.text)
                                    // Call the prompt's onClick if provided
                                    if (prompt.onClick) {
                                        prompt.onClick()
                                    }
                                    // Trigger search
                                    if (onSearch) {
                                        onSearch()
                                    }
                                }}
                            />
                        ))}
                    </GenericCarousel>
                </div>
            </div>
        </div>
    )
}

export default SmartSearchInput
