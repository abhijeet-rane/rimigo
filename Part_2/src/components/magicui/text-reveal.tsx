import { motion, MotionValue, useScroll, useTransform } from 'motion/react'
import { ComponentPropsWithoutRef, FC, ReactNode, useRef } from 'react'

import { cn } from '@/lib/utils'
import { AvatarCircles } from './avatar-circles'

export interface TextRevealProps extends ComponentPropsWithoutRef<'div'> {
    children: string
}

const avatars = [
    {
        imageUrl: 'https://avatars.githubusercontent.com/u/16860528',
        profileUrl: 'https://github.com/dillionverma'
    },
    {
        imageUrl: 'https://avatars.githubusercontent.com/u/20110627',
        profileUrl: 'https://github.com/tomonarifeehan'
    },
    {
        imageUrl: 'https://avatars.githubusercontent.com/u/106103625',
        profileUrl: 'https://github.com/BankkRoll'
    }
]

export const TextReveal: FC<TextRevealProps> = ({ children, className }) => {
    const targetRef = useRef<HTMLDivElement | null>(null)
    const { scrollYProgress } = useScroll({
        target: targetRef
    })

    if (typeof children !== 'string') {
        throw new Error('TextReveal: children must be a string')
    }

    const words = children.split(' ')

    return (
        <div
            ref={targetRef}
            className={cn('relative z-0 h-[200vh]', className)}>
            <div className={'sticky top-0  flex h-[50%]  items-center justify-start bg-transparent '}>
                <span
                    ref={targetRef}
                    className={'flex flex-wrap text-2xl text-black/20 md:text-3xl lg:text-2xl xl:text-3xl leading-3'}>
                    {words.map((word, i) => {
                        const start = i / words.length - 0.1
                        const end = start + 1 / words.length
                        return word === 'Rimigo' ? (
                            <Word
                                key={i}
                                progress={scrollYProgress}
                                range={[start, end]}>
                                <span className="text-primary">{word}</span>
                                {/* {word} */}
                            </Word>
                        ) : word === 'squad' ? (
                            <Word
                                key={i}
                                progress={scrollYProgress}
                                range={[start, end]}>
                                <AvatarCircles
                                    avatarUrls={avatars}
                                    numPeople={99}
                                />
                            </Word>
                        ) : (
                            <Word
                                key={i}
                                progress={scrollYProgress}
                                range={[start, end]}>
                                {word}
                            </Word>
                        )
                    })}
                </span>
            </div>
        </div>
    )
}

interface WordProps {
    children: ReactNode
    progress: MotionValue<number>
    range: [number, number]
}

const Word: FC<WordProps> = ({ children, progress, range }) => {
    const opacity = useTransform(progress, range, [0, 1])
    return (
        <span className="xl:lg-3 relative mx-1 lg:mx-1.5">
            <span className="absolute opacity-30">{children}</span>
            <motion.span
                style={{ opacity: opacity }}
                className={'text-black '}>
                {children}
            </motion.span>
        </span>
    )
}
