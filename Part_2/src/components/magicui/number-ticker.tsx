import { useInView, useMotionValue, useSpring } from 'motion/react'
import { ComponentPropsWithoutRef, useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

interface NumberTickerProps extends ComponentPropsWithoutRef<'span'> {
    value: number
    direction?: 'up' | 'down'
    delay?: number // delay in s
    decimalPlaces?: number
    locale?: string
}

export function NumberTicker({ value, direction = 'up', delay = 0, className, decimalPlaces = 0, locale = 'en-US', ...props }: NumberTickerProps) {
    const ref = useRef<HTMLSpanElement>(null)
    const motionValue = useMotionValue(direction === 'down' ? value : 0)
    const springValue = useSpring(motionValue, {
        damping: 60,
        stiffness: 100
    })
    const isInView = useInView(ref, { once: false, margin: '0px' })

    useEffect(() => {
        if (isInView) {
            const timer = setTimeout(() => {
                motionValue.set(direction === 'down' ? 0 : value)
            }, delay * 1000)
            return () => clearTimeout(timer)
        }
    }, [motionValue, isInView, delay, value, direction])

    useEffect(
        () =>
            springValue.on('change', (latest) => {
                if (ref.current) {
                    ref.current.textContent = Intl.NumberFormat(locale, {
                        minimumFractionDigits: decimalPlaces,
                        maximumFractionDigits: decimalPlaces
                    }).format(Number(latest.toFixed(decimalPlaces)))
                }
            }),
        [springValue, decimalPlaces, locale]
    )

    return (
        <span
            ref={ref}
            className={cn('inline-block tabular-nums tracking-wider text-black ', className)}
            {...props}
        />
    )
}
