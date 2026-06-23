import React, { useMemo } from 'react'
import Markdown from 'react-markdown'

const SIZE_CLASSES = {
    title: 'text-base font-semibold text-grey_0 font-manrope leading-7',
    body: 'text-sm font-[400] text-grey_0 font-manrope leading-6',
    caption: 'text-xs text-grey_2 font-manrope leading-5',
} as const

export type ResponseTextSize = keyof typeof SIZE_CLASSES

interface ResponseTextProps {
    text: string
    /** 'title' = larger/bolder, 'body' = normal, 'caption' = smaller metadata */
    size?: ResponseTextSize
    /** Strip markdown artifacts (**, #) that LLMs inject. Default true */
    sanitize?: boolean
    /** Render as markdown. Default true */
    markdown?: boolean
    className?: string
}

/** Strip excessive markdown artifacts that LLMs sometimes inject */
const sanitizeText = (text: string): string =>
    text.replace(/^#+\s*/gm, '').trim()

/** Custom components for react-markdown to apply our design tokens */
const markdownComponents = {
    p: ({ children }: any) => <span className="block mb-1.5 last:mb-0">{children}</span>,
    strong: ({ children }: any) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }: any) => <em>{children}</em>,
    a: ({ href, children }: any) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-default underline underline-offset-2">
            {children}
        </a>
    ),
    ul: ({ children }: any) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
    li: ({ children }: any) => <li className="text-inherit">{children}</li>,
    code: ({ children }: any) => (
        <code className="px-1 py-0.5 bg-grey_5 rounded text-xs font-mono">{children}</code>
    ),
    // Suppress headings in chat context — treat as bold text
    h1: ({ children }: any) => <span className="block font-semibold mb-1">{children}</span>,
    h2: ({ children }: any) => <span className="block font-semibold mb-1">{children}</span>,
    h3: ({ children }: any) => <span className="block font-semibold mb-1">{children}</span>,
}

const ResponseText: React.FC<ResponseTextProps> = ({
    text,
    size = 'body',
    sanitize = true,
    markdown = true,
    className = '',
}) => {
    const processedText = useMemo(
        () => (sanitize ? sanitizeText(text) : text),
        [text, sanitize],
    )

    if (!processedText) return null

    const sizeClasses = SIZE_CLASSES[size]

    if (!markdown) {
        return (
            <p className={`${sizeClasses} whitespace-pre-line ${className}`}>
                {processedText}
            </p>
        )
    }

    return (
        <div className={`${sizeClasses} ${className}`}>
            <Markdown components={markdownComponents}>{processedText}</Markdown>
        </div>
    )
}

export default ResponseText
