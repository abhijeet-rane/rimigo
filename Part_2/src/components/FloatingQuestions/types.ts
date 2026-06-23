import type { ReactNode } from 'react'
export interface FloatingQuestion {
    id: string
    question: string
    category?: string
    priority?: number
}

export interface FloatingQuestionsResult {
    questions?: FloatingQuestion[]
}

export interface FloatingQuestionsResponseShape {
    status?: string
    result?: FloatingQuestionsResult
}

export interface FloatingQuestionsFetcherResponse {
    status: number
    data?: {
        data?: FloatingQuestionsResponseShape
    }
}

export interface FloatingQuestionsUIProps {
    title?: string
    isLoading: boolean
    questions: FloatingQuestion[]
    shimmerCount?: number
    onQuestionClick?: (question: string) => void
    assistantLabel?: string
    className?: string
}

export interface FloatingQuestionsContainerProps {
    identifier?: string | null
    fetchFloatingQuestions: (identifier: string) => Promise<FloatingQuestionsFetcherResponse>
    fallbackQuestions?: FloatingQuestion[]
    onQuestionClick?: (question: string) => void
    questionLimit?: number
    pollIntervals?: number[]
    title?: string
    shimmerCount?: number
    assistantLabel?: string
    className?: string
    renderUI?: (uiProps: FloatingQuestionsUIProps) => ReactNode
}
