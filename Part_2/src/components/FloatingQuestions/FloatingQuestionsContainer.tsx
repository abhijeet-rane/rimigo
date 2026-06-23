import { useEffect, useRef, useState } from 'react'
import FloatingQuestionsCard from './FloatingQuestionsCard'
import type { FloatingQuestion, FloatingQuestionsContainerProps, FloatingQuestionsResponseShape } from './types'

const DEFAULT_POLLING_INTERVALS = [3000, 3000, 2000, 2000, 2000, 2000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]

const DEFAULT_FALLBACK_QUESTIONS: FloatingQuestion[] = [
    {
        id: 'fallback-room',
        question: 'Show me the best rooms and images.',
        category: 'room',
        priority: 1
    },
    {
        id: 'fallback-policy',
        question: 'What is the Cancellation Policy?',
        category: 'policy',
        priority: 2
    },
    {
        id: 'fallback-booking',
        question: 'Can I book an early check-in or late checkout?',
        category: 'booking',
        priority: 3
    },
    {
        id: 'fallback-travel',
        question: 'Do I need a visa or documents for stays?',
        category: 'travel',
        priority: 4
    }
]

const selectQuestions = (questions: FloatingQuestion[], limit: number): FloatingQuestion[] => {
    if (!questions.length) return []

    const questionsByCategory = new Map<string, FloatingQuestion[]>()

    questions.forEach((question) => {
        const categoryKey = question.category ?? 'uncategorized'
        if (!questionsByCategory.has(categoryKey)) {
            questionsByCategory.set(categoryKey, [])
        }
        questionsByCategory.get(categoryKey)!.push(question)
    })

    questionsByCategory.forEach((categoryQuestions) => {
        categoryQuestions.sort((a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER))
    })

    // If all questions are in one category (or uncategorized), just take them all up to limit
    if (questionsByCategory.size === 1) {
        const categoryQuestions = Array.from(questionsByCategory.values())[0]
        return categoryQuestions.slice(0, limit)
    }

    const selected: FloatingQuestion[] = []
    const categoryIndices = new Map<string, number>()

    questionsByCategory.forEach((_, category) => categoryIndices.set(category, 0))

    const categories = Array.from(questionsByCategory.keys())

    // First pass: try to get one question from each category
    for (const category of categories) {
        if (selected.length >= limit) break
        const categoryQuestions = questionsByCategory.get(category)!
        const index = categoryIndices.get(category)!
        if (index < categoryQuestions.length) {
            selected.push(categoryQuestions[index])
            categoryIndices.set(category, index + 1)
        }
    }

    // Second pass: if we still need more questions, take from categories we already have
    // Use a while loop to continue until we have enough or run out of questions
    while (selected.length < limit) {
        let addedAny = false
        for (const category of categories) {
            if (selected.length >= limit) break
            const categoryQuestions = questionsByCategory.get(category)!
            const index = categoryIndices.get(category)!
            if (index < categoryQuestions.length) {
                selected.push(categoryQuestions[index])
                categoryIndices.set(category, index + 1)
                addedAny = true
            }
        }
        // If we didn't add any questions in this pass, break to avoid infinite loop
        if (!addedAny) break
    }

    return selected.slice(0, limit).sort((a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER))
}

const extractQuestions = (payload?: FloatingQuestionsResponseShape): FloatingQuestion[] => {
    if (!payload?.result?.questions || !Array.isArray(payload.result.questions)) {
        return []
    }
    return payload.result.questions
}

const FloatingQuestionsContainer = ({
    identifier,
    fetchFloatingQuestions,
    fallbackQuestions = DEFAULT_FALLBACK_QUESTIONS,
    onQuestionClick,
    questionLimit = 4,
    pollIntervals = DEFAULT_POLLING_INTERVALS,
    title,
    shimmerCount = 4,
    assistantLabel,
    className,
    renderUI
}: FloatingQuestionsContainerProps) => {
    const [questions, setQuestions] = useState<FloatingQuestion[]>(fallbackQuestions.slice(0, questionLimit))
    const [isLoading, setIsLoading] = useState<boolean>(Boolean(identifier))
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        let attemptCount = 0
        let isActive = true

        const clearExistingTimeout = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
                timeoutRef.current = null
            }
        }

        const useFallback = () => {
            if (!isActive) return
            setQuestions(fallbackQuestions.slice(0, questionLimit))
            setIsLoading(false)
        }

        const scheduleNextPoll = () => {
            if (attemptCount >= pollIntervals.length) {
                useFallback()
                return
            }
            const delay = pollIntervals[attemptCount]
            attemptCount += 1
            clearExistingTimeout()
            timeoutRef.current = setTimeout(() => {
                void poll()
            }, delay)
        }

        const poll = async () => {
            if (!identifier || !isActive) return
            try {
                const response = await fetchFloatingQuestions(identifier)

                if (!isActive) return

                const status = response.status
                const payload = response.data?.data

                if (status === 200 && payload?.status === 'completed') {
                    const extractedQuestions = extractQuestions(payload)
                    const normalized = selectQuestions(extractedQuestions, questionLimit)
                    setQuestions(normalized.length ? normalized : fallbackQuestions.slice(0, questionLimit))
                    setIsLoading(false)
                    return
                }

                if (status === 202) {
                    scheduleNextPoll()
                    return
                }

                useFallback()
            } catch (error: unknown) {
                const axiosStatus = (error as { response?: { status?: number } })?.response?.status
                if (axiosStatus === 404 || (axiosStatus && axiosStatus >= 500 && axiosStatus < 600)) {
                    useFallback()
                    return
                }

                scheduleNextPoll()
            }
        }

        if (!identifier) {
            setIsLoading(false)
            setQuestions(fallbackQuestions.slice(0, questionLimit))
            return () => {
                isActive = false
                clearExistingTimeout()
            }
        }

        setIsLoading(true)
        setQuestions([])
        void poll()

        return () => {
            isActive = false
            clearExistingTimeout()
        }
    }, [identifier, fetchFloatingQuestions, fallbackQuestions, pollIntervals, questionLimit])

    const uiProps = {
        title,
        isLoading,
        questions,
        shimmerCount,
        onQuestionClick,
        assistantLabel,
        className
    }

    // Don't render if no questions and not loading
    if (!isLoading && questions.length === 0) {
        return null
    }

    if (renderUI) {
        return renderUI(uiProps)
    }

    return <FloatingQuestionsCard {...uiProps} />
}

export default FloatingQuestionsContainer
