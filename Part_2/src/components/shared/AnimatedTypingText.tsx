import React from 'react'
import TypingText from '@/components/ui/shadcn-io/typing-text'

export interface AnimatedTypingTextProps {
    text: string | string[]
    className?: string
    showCursor?: boolean
    hideCursorWhileTyping?: boolean
    cursorCharacter?: string | React.ReactNode
    cursorBlinkDuration?: number
    cursorClassName?: string
    typingSpeed?: number
    initialDelay?: number
    pauseDuration?: number
    deletingSpeed?: number
    loop?: boolean
    textColors?: string[]
    variableSpeed?: { min: number; max: number }
    onSentenceComplete?: (sentence: string, index: number) => void
    startOnVisible?: boolean
    reverseMode?: boolean
    as?: React.ElementType
}

/**
 * Generic AnimatedTypingText component with default configuration
 *
 * Default configuration:
 * - typingSpeed: 2000ms (overridden by variableSpeed if provided)
 * - variableSpeed: { min: 20, max: 50 }ms per character
 * - initialDelay: 0ms
 * - pauseDuration: 0ms
 * - showCursor: true
 * - cursorCharacter: "|"
 * - textColors: ['#000000']
 * - loop: false
 *
 * All props can be overridden to customize the behavior
 */
const AnimatedTypingText: React.FC<AnimatedTypingTextProps> = ({
    text,
    className = '',
    showCursor = true,
    hideCursorWhileTyping = false,
    cursorCharacter = '|',
    cursorBlinkDuration = 0.5,
    cursorClassName = '',
    typingSpeed = 2500,
    initialDelay = 0,
    pauseDuration = 0,
    deletingSpeed = 30,
    loop = false,
    textColors = ['#000000'],
    variableSpeed = { min: 20, max: 40 },
    onSentenceComplete,
    startOnVisible = false,
    reverseMode = false,
    as = 'div',
    ...props
}) => {
    return (
        <TypingText
            text={text}
            as={as}
            className={className}
            showCursor={showCursor}
            hideCursorWhileTyping={hideCursorWhileTyping}
            cursorCharacter={cursorCharacter}
            cursorBlinkDuration={cursorBlinkDuration}
            cursorClassName={cursorClassName}
            typingSpeed={typingSpeed}
            initialDelay={initialDelay}
            pauseDuration={pauseDuration}
            deletingSpeed={deletingSpeed}
            loop={loop}
            textColors={textColors}
            variableSpeed={variableSpeed}
            onSentenceComplete={onSentenceComplete}
            startOnVisible={startOnVisible}
            reverseMode={reverseMode}
            {...props}
        />
    )
}

export default AnimatedTypingText
