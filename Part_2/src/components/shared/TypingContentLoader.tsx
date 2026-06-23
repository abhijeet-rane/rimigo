import React from 'react'
import CustomShimmer from './Shimmer'

export interface ShimmerElement {
    height?: number // Optional when isContainer is true
    width?: string | number // e.g., '100%', '200px', 200
    radius?: number
    className?: string
    marginBottom?: number
    marginTop?: number
    isContainer?: boolean // If true, this is a container for subsequent elements
    containerClassName?: string // ClassName for container wrapper
}

export interface TypingContentLoaderConfig {
    shimmerElements: ShimmerElement[]
    containerClassName?: string
    animationDuration?: number // in seconds, default 0.3
    animationEasing?: string // default 'ease-in'
    fadeInDelay?: number // delay before fade-in starts, in ms, default 0
}

interface TypingContentLoaderProps {
    isTypingComplete: boolean
    config: TypingContentLoaderConfig
    children: React.ReactNode
}

/**
 * TypingContentLoader component that shows shimmer while typing is in progress
 * and fades in content with ease-in animation when typing completes.
 *
 * @param isTypingComplete - Whether the typing animation has completed
 * @param config - Configuration for shimmer structure and animation
 * @param children - Content to show after typing completes
 */
const TypingContentLoader: React.FC<TypingContentLoaderProps> = ({ isTypingComplete, config, children }) => {
    const { shimmerElements, containerClassName = '', animationDuration = 0.3, animationEasing = 'ease-in', fadeInDelay = 0 } = config

    if (!isTypingComplete) {
        // Show shimmer while typing
        const renderShimmerElements = () => {
            const elements: React.ReactNode[] = []
            let i = 0

            while (i < shimmerElements.length) {
                const element = shimmerElements[i]

                if (element.isContainer) {
                    // Find all subsequent elements until next container or end
                    const children: typeof shimmerElements = []
                    let j = i + 1
                    while (j < shimmerElements.length && !shimmerElements[j].isContainer) {
                        children.push(shimmerElements[j])
                        j++
                    }

                    elements.push(
                        <div
                            key={i}
                            className={element.containerClassName || element.className}
                            style={{
                                marginBottom: element.marginBottom ? `${element.marginBottom}px` : undefined,
                                marginTop: element.marginTop ? `${element.marginTop}px` : undefined
                            }}>
                            {children.map((childElement, childIndex) => {
                                if (!childElement.height) return null
                                const childWidthStyle =
                                    typeof childElement.width === 'number' ? `${childElement.width}px` : childElement.width || '100%'
                                return (
                                    <div
                                        key={childIndex}
                                        style={{ width: childWidthStyle }}
                                        className={childElement.className}>
                                        <CustomShimmer
                                            height={childElement.height}
                                            radius={childElement.radius}
                                            backgroundColor="#F5F5F5"
                                            foregroundColor="#FAFAFA"
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    )
                    i = j
                } else {
                    if (!element.height) {
                        i++
                        continue
                    }

                    const widthStyle = typeof element.width === 'number' ? `${element.width}px` : element.width || '100%'

                    elements.push(
                        <div
                            key={i}
                            style={{
                                width: widthStyle,
                                marginBottom: element.marginBottom ? `${element.marginBottom}px` : undefined,
                                marginTop: element.marginTop ? `${element.marginTop}px` : undefined,
                                display: element.className?.includes('inline-block') ? 'inline-block' : 'block'
                            }}
                            className={element.className}>
                            <CustomShimmer
                                height={element.height}
                                radius={element.radius}
                                backgroundColor="#F5F5F5"
                                foregroundColor="#FAFAFA"
                            />
                        </div>
                    )
                    i++
                }
            }

            return elements
        }

        return <div className={containerClassName}>{renderShimmerElements()}</div>
    }

    // Show content with fade-in animation
    return (
        <div
            style={{
                opacity: 0,
                animation: `fadeIn ${animationDuration}s ${animationEasing} ${fadeInDelay}ms forwards`
            }}>
            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
            `}</style>
            {children}
        </div>
    )
}

export default TypingContentLoader
