import { Sparkles } from 'lucide-react'
import CustomShimmer from '@/components/shared/Shimmer'
import type { FloatingQuestion, FloatingQuestionsUIProps } from './types'

const FLOATING_QUESTIONS_CARD_TITLE = 'Need help? Just ask anything'

const renderQuestions = (questions: FloatingQuestion[], onQuestionClick?: (question: string) => void) => {
    return questions.map((question) => (
        <button
            key={question.id}
            type="button"
            onClick={() => onQuestionClick?.(question.question)}
            className="flex w-full items-start gap-2 rounded-full border border-[#E0E0E0] bg-white px-3 py-2 text-left transition-colors hover:border-[#7011F6] hover:bg-[#F3E8FF] cursor-pointer">
            <Sparkles
                className="mt-0.5 h-[14px] w-[14px] flex-shrink-0 text-[#7011F6]"
                aria-hidden="true"
            />
            <span className="text-[14px] font-[467] leading-[18px] tracking-[-2%] font-red-hat-display text-grey-0">{question.question}</span>
        </button>
    ))
}

const FloatingQuestionsCard = ({
    title = FLOATING_QUESTIONS_CARD_TITLE,
    isLoading,
    questions,
    shimmerCount = 4,
    onQuestionClick,
    assistantLabel = 'Rimigo AI',
    className
}: FloatingQuestionsUIProps) => {
    return (
        <aside
            aria-labelledby="floating-questions-title"
            role="complementary"
            className={`max-md:hidden relative w-full overflow-hidden rounded-2xl border border-[#7011F6] bg-white/80 shadow-lg backdrop-blur ${className ?? ''}`}>
            <div className="flex h-full flex-col gap-4 pb-6 p-4">
                <div>
                    <h2
                        id="floating-questions-title"
                        className="text-[14px] font-[550] leading-[100%] tracking-[-1%] font-red-hat-display text-grey-0">
                        {title}
                    </h2>
                </div>

                <div className="flex flex-col gap-2">
                    {isLoading
                        ? Array.from({ length: shimmerCount }).map((_, index) => (
                              <div
                                  key={`shimmer-${index}`}
                                  className="w-full">
                                  <CustomShimmer
                                      height={40}
                                      radius={28}
                                  />
                              </div>
                          ))
                        : renderQuestions(questions, onQuestionClick)}
                </div>
            </div>

            <div className="  left-0 w-full">
                <div className="rounded-b-2xl bg-[#7011F614] py-1 text-center">
                    <span className="text-[11px] font-medium text-[#7011F6]">Powered by </span>
                    <span className="text-xs font-semibold text-[#7011F6]">{assistantLabel}</span>
                </div>
            </div>
        </aside>
    )
}

export default FloatingQuestionsCard
