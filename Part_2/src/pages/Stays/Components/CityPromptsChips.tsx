import { useOnboardingGuideContext } from '@/modules/UserGuideModal/context/OnboardingGuideProvider'
import GuideTipper from '@/modules/UserGuideModal/pages/GuideTipper'
import { RefreshCcw } from 'lucide-react'

interface CityPromptsChipsProps {
    prompts: string[] | undefined
    isLoading: boolean
    isPolling: boolean
    isModalOpen: boolean
    errorMessage?: string | null
    onPromptSelect?: (prompt: string) => void
    onModalClose?: (closed: boolean) => void
}

const CityPromptsChips = ({ prompts, isLoading, isModalOpen, isPolling, errorMessage, onPromptSelect, onModalClose }: CityPromptsChipsProps) => {
    const hasPrompts = (prompts?.length ?? 0) > 0
    const showError = Boolean(errorMessage) && !isLoading && !isPolling
    if (showError) {
        return null
    }
    const { guide, updateGuide } = useOnboardingGuideContext()

    const shouldShowSmartSearchGuide =
        (prompts?.length ?? 0) > 0 &&
        ((isModalOpen && !!guide?.stays) || (guide?.stays?.set_criteria_guide === true && guide?.stays?.smart_search_guide === false))

    const handleSmartSearchGuideClose = () => {
        onModalClose?.(true)

        if (!guide) return

        const updated = {
            ...guide,
            stays: {
                ...guide.stays,
                smart_search_guide: true // mark completed
            }
        }

        updateGuide(updated)
    }

    return (
        <GuideTipper
            title="Smart search for anything"
            highlight={['Smart']}
            position="bottom"
            subtitle="Here are common questions people have asked about stays."
            onClose={handleSmartSearchGuideClose}
            isOpen={shouldShowSmartSearchGuide}>
            <div className="bg-natural-white border-b border-feature-card-border">
                <div className="py-3">
                    {showError ? (
                        <div className="flex items-center gap-2 text-xs text-error-default">
                            <RefreshCcw className="h-3.5 w-3.5" />
                            {errorMessage}
                        </div>
                    ) : isLoading || isPolling ? (
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <span
                                    key={`prompt-skeleton-${index}`}
                                    className={`inline-flex items-center gap-[6px] px-3 py-1.5 rounded-[28px] border border-grey-4 bg-grey-4/40 whitespace-nowrap shrink-0 ${
                                        index === 0 ? 'ml-8' : ''
                                    }`}>
                                    <span className="h-4 w-4 rounded-full bg-grey-4/70 animate-pulse" />
                                    <span className="block h-3 w-28 rounded-full bg-grey-4/70 animate-pulse" />
                                </span>
                            ))}
                        </div>
                    ) : hasPrompts ? (
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                            {prompts!.map((prompt, index) => (
                                <button
                                    key={prompt}
                                    type="button"
                                    onClick={() => onPromptSelect?.(prompt)}
                                    className={`cursor-pointer inline-flex items-center gap-[6px] px-3 py-1.5 rounded-[28px] border border-grey-4 bg-natural-white text-sm font-semibold text-header-black whitespace-nowrap shrink-0 hover:border-primary-default hover:bg-primary-default-12 transition-colors ${
                                        index === 0 ? 'ml-8' : ''
                                    } ${index === prompts!.length - 1 ? 'mr-[15vw]' : ''}`}>
                                    <img
                                        src="/icons/sparkles.svg"
                                        alt=""
                                        className="h-4 w-4"
                                    />
                                    <span>{prompt}</span>
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </GuideTipper>
    )
}

export default CityPromptsChips
