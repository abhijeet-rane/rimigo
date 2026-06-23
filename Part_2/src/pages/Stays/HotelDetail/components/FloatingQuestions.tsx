import React, { useEffect, useState } from 'react'
import { HotelDetailData } from '../../../../types/hotelDetailTypes'
import { Sparkles } from 'lucide-react'
import { getFloatingQuestions } from '../../Apis/staysAPI'
import CustomShimmer from '@/components/shared/Shimmer'

interface FloatingQuestionsProps {
    hotelData: HotelDetailData
    onOpenAssistant: (question: string) => void
}

interface QuestionItem {
    question: string
    category: string
    priority: number
}

// Fallback questions if API fails
const FALLBACK_QUESTIONS: QuestionItem[] = [
    {
        question: 'Show me the best rooms and images.',
        category: 'room',
        priority: 1
    },
    {
        question: 'What is the Cancellation Policy?',
        category: 'policy',
        priority: 2
    },
    {
        question: 'Can I book an early check-in or late checkout?',
        category: 'booking',
        priority: 3
    },
    {
        question: 'Do I need a visa or documents for stays?',
        category: 'travel',
        priority: 4
    }
]

export const FloatingQuestions: React.FC<FloatingQuestionsProps> = ({ hotelData, onOpenAssistant }) => {
    const [questions, setQuestions] = useState<QuestionItem[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                setIsLoading(true)

                // Get floating_questions_request_id from hotelData
                const questionsRequestId = hotelData.floating_questions_request_id
                if (!questionsRequestId) {
                    setQuestions(FALLBACK_QUESTIONS)
                    setIsLoading(false)
                    return
                }

                // Poll for results
                const pollingIntervals = [3000, 3000, 2000, 2000, 2000, 2000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]
                let attemptCount = 0

                const poll = async () => {
                    try {
                        const response = await getFloatingQuestions(questionsRequestId)

                        if (response.status === 200 && response.data?.data?.status === 'completed') {
                            const result = response.data.data.result
                            if (result?.questions && Array.isArray(result.questions)) {
                                // Group questions by category and sort by priority within each category
                                const questionsByCategory = new Map<string, QuestionItem[]>()

                                result.questions.forEach((q: QuestionItem) => {
                                    if (!questionsByCategory.has(q.category)) {
                                        questionsByCategory.set(q.category, [])
                                    }
                                    questionsByCategory.get(q.category)!.push(q)
                                })

                                // Sort each category by priority (lower is better)
                                questionsByCategory.forEach((questions) => {
                                    questions.sort((a, b) => a.priority - b.priority)
                                })

                                // Select questions to maximize category diversity
                                const selectedQuestions: QuestionItem[] = []
                                const categoryIndices = new Map<string, number>() // Track which question index we're at for each category

                                // Initialize indices
                                questionsByCategory.forEach((_, category) => {
                                    categoryIndices.set(category, 0)
                                })

                                // First pass: try to get one question from each category
                                const categories = Array.from(questionsByCategory.keys())
                                for (const category of categories) {
                                    if (selectedQuestions.length >= 4) break

                                    const questions = questionsByCategory.get(category)!
                                    const index = categoryIndices.get(category)!

                                    if (index < questions.length) {
                                        selectedQuestions.push(questions[index])
                                        categoryIndices.set(category, index + 1)
                                    }
                                }

                                // Second pass: if we still need more questions, take from categories we already have
                                // (only if we don't have enough unique categories)
                                if (selectedQuestions.length < 4) {
                                    for (const category of categories) {
                                        if (selectedQuestions.length >= 4) break

                                        const questions = questionsByCategory.get(category)!
                                        const index = categoryIndices.get(category)!

                                        if (index < questions.length) {
                                            selectedQuestions.push(questions[index])
                                            categoryIndices.set(category, index + 1)
                                        }
                                    }
                                }

                                // Sort final selection by priority for display
                                selectedQuestions.sort((a, b) => a.priority - b.priority)
                                const finalQuestions = selectedQuestions.slice(0, 4)

                                // Use fallback if no valid questions were selected
                                if (finalQuestions.length === 0) {
                                    setQuestions(FALLBACK_QUESTIONS)
                                } else {
                                    setQuestions(finalQuestions)
                                }
                            } else {
                                // Invalid or empty result
                                setQuestions(FALLBACK_QUESTIONS)
                            }
                            setIsLoading(false)
                            return
                        }

                        if (response.status === 202 && attemptCount < pollingIntervals.length) {
                            setTimeout(() => {
                                attemptCount++
                                poll()
                            }, pollingIntervals[attemptCount])
                        } else {
                            // Max attempts reached or unexpected status
                            setQuestions(FALLBACK_QUESTIONS)
                            setIsLoading(false)
                        }
                    } catch (error: any) {
                        if (error.response?.status === 404 || (error.response?.status >= 500 && error.response?.status < 600)) {
                            // Server error - use fallback
                            setQuestions(FALLBACK_QUESTIONS)
                            setIsLoading(false)
                        } else if (attemptCount < pollingIntervals.length) {
                            setTimeout(() => {
                                attemptCount++
                                poll()
                            }, pollingIntervals[attemptCount])
                        } else {
                            // Max attempts reached - use fallback
                            setQuestions(FALLBACK_QUESTIONS)
                            setIsLoading(false)
                        }
                    }
                }

                poll()
            } catch (error) {
                console.error('Failed to generate floating questions:', error)
                setQuestions(FALLBACK_QUESTIONS)
                setIsLoading(false)
            }
        }

        if (hotelData.floating_questions_request_id) {
            fetchQuestions()
        } else {
            setQuestions(FALLBACK_QUESTIONS)
            setIsLoading(false)
        }
    }, [hotelData.floating_questions_request_id])

    return (
        <aside
            aria-labelledby="floating-questions-heading"
            className="max-md:hidden w-full bg-white/80 backdrop-blur-md rounded-2xl border shadow-lg p-4 sm:p-6 overflow-hidden"
            style={{ borderColor: 'var(--primary-indigo, #7011F6)' }}
            role="complementary">
            <div className="flex flex-col gap-3 h-full pb-5">
                <div className="flex items-start justify-between">
                    <h2
                        id="floating-questions-heading"
                        className="text-sm font-semibold text-gray-700">
                        Need help? Just ask anything
                    </h2>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                    {isLoading
                        ? // Show shimmer while loading
                          Array.from({ length: 4 }).map((_, index) => (
                              <div
                                  key={index}
                                  style={{ width: '100%' }}>
                                  <CustomShimmer
                                      height={40}
                                      radius={28}
                                  />
                              </div>
                          ))
                        : questions.length > 0
                          ? questions.map((q, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => onOpenAssistant(q.question)}
                                    style={{
                                        display: 'flex',
                                        width: '100%',
                                        padding: '6px 12px',
                                        justifyContent: 'flex-start',
                                        alignItems: 'flex-start',
                                        borderRadius: '28px',
                                        border: '1px solid var(--grey-4, #E0E0E0)',
                                        background: 'var(--full-white, #FFF)',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--primary-indigo, #7011F6)'
                                        e.currentTarget.style.background = 'rgba(112, 17, 246, 0.06)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--grey-4, #E0E0E0)'
                                        e.currentTarget.style.background = 'var(--full-white, #FFF)'
                                    }}>
                                    <Sparkles
                                        className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5"
                                        color="#7011F6"
                                    />
                                    <span
                                        style={{
                                            fontSize: '13px',
                                            color: '#363636',
                                            fontFamily: 'Manrope, sans-serif',
                                            textAlign: 'left',
                                            fontWeight: 467,
                                            flex: 1,
                                            marginLeft: 8,
                                            wordWrap: 'break-word',
                                            overflowWrap: 'break-word'
                                        }}>
                                        {q.question}
                                    </span>
                                </button>
                            ))
                          : null}
                </div>

                {/* Footer now flush to the bottom */}
                <div
                    className="absolute bottom-0 left-0 w-full"
                    style={{ height: '23px' }}>
                    <div
                        className="text-white text-center text-xs py-1 rounded-b-1xl font-medium"
                        style={{ backgroundColor: '#7011F614' }}>
                        <span
                            style={{
                                color: 'var(--primary-indigo, #7011F6)',
                                fontFamily: 'Manrope',
                                fontSize: '11px',
                                fontStyle: 'normal',
                                fontWeight: 500,
                                lineHeight: '16px',
                                letterSpacing: '-0.11px'
                            }}>
                            Powered by{' '}
                        </span>
                        <a
                            className="font-semibold"
                            style={{
                                color: 'var(--primary-indigo, #7011F6)',
                                fontFamily: '"Red Hat Display"',
                                fontSize: '12px',
                                fontStyle: 'normal',
                                fontWeight: 645,
                                lineHeight: '16px',
                                letterSpacing: '-0.12px'
                            }}>
                            Rimigo AI
                        </a>
                    </div>
                </div>
            </div>
        </aside>
    )
}

export default FloatingQuestions
