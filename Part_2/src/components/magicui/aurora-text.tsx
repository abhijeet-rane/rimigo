import { cn } from '@/lib/utils'
import { motion, MotionProps } from 'motion/react'
import React from 'react'

interface AuroraTextProps extends Omit<React.HTMLAttributes<HTMLElement>, keyof MotionProps>, MotionProps {
    className?: string
    children: React.ReactNode
    as?: React.ElementType
}

export default function AuroraText({ className, children, as: Component = 'span', ...props }: AuroraTextProps) {
    const MotionComponent = motion.create(Component)

    return (
        <MotionComponent
            className={cn('relative inline-flex overflow-hidden', className)}
            {...props}>
            {children}

            {/* AURORA BACKGROUND LIGHTS */}
            <span className="pointer-events-none absolute inset-0 mix-blend-lighten">
                {/* Aurora 1 */}
                <span
                    className="pointer-events-none absolute -top-1/2 h-[30vw] w-[30vw] mix-blend-overlay blur-[1rem]"
                    style={{
                        backgroundColor: 'hsl(270, 100%, 65%)',
                        animation: `
              aurora-border 6s ease-in-out infinite,
              aurora-1 12s ease-in-out infinite alternate
            `,
                        position: 'absolute',
                        top: '-50%',
                        right: '0'
                    }}
                />

                {/* Aurora 2 */}
                <span
                    className="pointer-events-none absolute right-0 top-0 h-[30vw] w-[30vw] mix-blend-overlay blur-[1rem]"
                    style={{
                        backgroundColor: 'hsl(200, 100%, 65%)',
                        animation: `
              aurora-border 6s ease-in-out infinite,
              aurora-2 12s ease-in-out infinite alternate
            `
                    }}
                />

                {/* Aurora 3 */}
                <span
                    className="pointer-events-none absolute bottom-0 left-0 h-[30vw] w-[30vw] mix-blend-overlay blur-[1rem]"
                    style={{
                        backgroundColor: 'hsl(150, 100%, 65%)',
                        animation: `
              aurora-border 6s ease-in-out infinite,
              aurora-3 12s ease-in-out infinite alternate
            `
                    }}
                />

                {/* Aurora 4 */}
                <span
                    className="pointer-events-none absolute -bottom-1/2 right-0 h-[30vw] w-[30vw] mix-blend-overlay blur-[1rem]"
                    style={{
                        backgroundColor: 'hsl(320, 100%, 65%)',
                        animation: `
              aurora-border 6s ease-in-out infinite,
              aurora-4 12s ease-in-out infinite alternate
            `
                    }}
                />
            </span>

            {/* Inline keyframes */}
            <style>{`
                @keyframes aurora-border {
                    0%,
                    100% {
                        border-radius: 37% 29% 27% 27% / 28% 25% 41% 37%;
                    }
                    25% {
                        border-radius: 47% 29% 39% 49% / 61% 19% 66% 26%;
                    }
                    50% {
                        border-radius: 57% 23% 47% 72% / 63% 17% 66% 33%;
                    }
                    75% {
                        border-radius: 28% 49% 29% 100% / 93% 20% 64% 25%;
                    }
                }

                @keyframes aurora-1 {
                    0%,
                    100% {
                        top: 0;
                        right: 0;
                    }
                    50% {
                        top: 50%;
                        right: 25%;
                    }
                    75% {
                        top: 25%;
                        right: 50%;
                    }
                }

                @keyframes aurora-2 {
                    0%,
                    100% {
                        top: 0;
                        left: 0;
                    }
                    60% {
                        top: 75%;
                        left: 25%;
                    }
                    85% {
                        top: 50%;
                        left: 50%;
                    }
                }

                @keyframes aurora-3 {
                    0%,
                    100% {
                        bottom: 0;
                        left: 0;
                    }
                    40% {
                        bottom: 50%;
                        left: 25%;
                    }
                    65% {
                        bottom: 25%;
                        left: 50%;
                    }
                }

                @keyframes aurora-4 {
                    0%,
                    100% {
                        bottom: 0;
                        right: 0;
                    }
                    50% {
                        bottom: 25%;
                        right: 40%;
                    }
                    90% {
                        bottom: 50%;
                        right: 25%;
                    }
                }
            `}</style>
        </MotionComponent>
    )
}
