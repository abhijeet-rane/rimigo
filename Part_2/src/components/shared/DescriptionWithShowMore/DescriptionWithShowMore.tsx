import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

interface DescriptionWithShowMoreProps {
    description: string
    className?: string
    maxLines?: number
    textSize?: string
    lineHeight?: string
    /** When true, renders description as plain text (no markdown parsing). Default: false */
    plainText?: boolean
}

/**
 * Renders inline markdown (bold, italic) from a description string.
 * Only allows <strong> and <em> — all other elements are unwrapped to text.
 */
const MarkdownText = ({ text }: { text: string }) => (
    <ReactMarkdown
        allowedElements={['p', 'strong', 'em']}
        unwrapDisallowed
        components={{
            // Render <p> as a plain fragment so markdown doesn't inject block-level elements
            p: ({ children }) => <>{children}</>
        }}>
        {text}
    </ReactMarkdown>
)

/**
 * Generic component for description text with "show more" functionality.
 * Supports markdown bold (**text**) and italic (*text*) in descriptions.
 * Automatically detects if content exceeds the specified number of lines
 * and adds expand/collapse functionality.
 */
const DescriptionWithShowMore = ({
    description,
    className = '',
    maxLines = 2,
    textSize = '14px',
    lineHeight = '20px',
    plainText = false
}: DescriptionWithShowMoreProps) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const [needsTruncation, setNeedsTruncation] = useState(false)
    const descriptionRef = useRef<HTMLDivElement>(null)
    const measureRef = useRef<HTMLDivElement>(null)

    // Check if description needs truncation (more than maxLines)
    useEffect(() => {
        const checkTruncation = () => {
            const element = descriptionRef.current
            const measureElement = measureRef.current
            if (!element || !measureElement) return

            // Sync width of measure element with actual element
            measureElement.style.width = `${element.offsetWidth}px`

            // Get computed styles from the actual element
            const styles = getComputedStyle(element)
            const computedLineHeight = parseFloat(styles.lineHeight) || parseFloat(lineHeight)
            const maxHeight = computedLineHeight * maxLines

            // Use the hidden measure element to get the full height without line-clamp
            const fullHeight = measureElement.scrollHeight

            // Check if content exceeds maxLines
            const exceedsMaxLines = fullHeight > maxHeight + 2

            setNeedsTruncation(exceedsMaxLines)
        }

        // Use a small delay to ensure DOM is fully rendered
        const timeoutId = setTimeout(checkTruncation, 0)

        // Recheck on window resize
        window.addEventListener('resize', checkTruncation)

        return () => {
            clearTimeout(timeoutId)
            window.removeEventListener('resize', checkTruncation)
        }
    }, [description, maxLines, lineHeight])

    const content = plainText ? description : <MarkdownText text={description} />

    return (
        <div className={`relative ${className}`}>
            {/* Hidden element to measure full height without line-clamp */}
            <div
                ref={measureRef}
                className="absolute invisible -z-10 pointer-events-none"
                style={{
                    fontSize: textSize,
                    lineHeight: lineHeight,
                    width: '100%'
                }}>
                {content}
            </div>
            <div
                ref={descriptionRef}
                style={{
                    fontSize: textSize,
                    lineHeight: lineHeight,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'baseline',
                    gap: '0.25rem'
                }}>
                {!isExpanded && needsTruncation ? (
                    <>
                        <span
                            style={{
                                display: '-webkit-box',
                                WebkitLineClamp: maxLines,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                wordBreak: 'break-word',
                                flex: '1 1 auto',
                                minWidth: 0
                            }}>
                            {content}
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="underline cursor-pointer shrink-0"
                            style={{
                                fontSize: textSize,
                                lineHeight: lineHeight,
                                whiteSpace: 'nowrap'
                            }}>
                            show more
                        </button>
                    </>
                ) : (
                    <>
                        <span style={{ flex: '1 1 auto' }}>{content}</span>
                        {needsTruncation && (
                            <button
                                type="button"
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="underline cursor-pointer shrink-0"
                                style={{
                                    fontSize: textSize,
                                    lineHeight: lineHeight,
                                    whiteSpace: 'nowrap'
                                }}>
                                show less
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default DescriptionWithShowMore
