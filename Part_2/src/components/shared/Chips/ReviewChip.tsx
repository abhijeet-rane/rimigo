import { cn } from '@/lib/utils'

interface ReviewChipProps {
    text: 'not_recommended' | 'recommended' | null
    variant: 'not_recommended' | 'recommended' | null
}

const textMap = {
    not_recommended: 'NOT RECOMMENDED',
    recommended: 'RECOMMENDED'
}

const textColorMap = {
    not_recommended: 'text-crimson',
    recommended: 'text-green'
}

const bgColorMap = {
    not_recommended: 'bg-red-500',
    recommended: 'bg-primary-default'
}

const ReviewChip = ({ text, variant }: ReviewChipProps) => {
    if (!text) {
        return null
    }

    const color = bgColorMap[variant as keyof typeof bgColorMap]
    const textColor = textColorMap[text as keyof typeof textColorMap]
    const textValue = textMap[text as keyof typeof textMap]

    return (
        <div
            className={cn(
                'rounded-2xl w-fit flex items-center justify-center py-0.5 px-2 box-border text-center text-xs text-white font-red-hat-display ',
                color
            )}>
            <div className={cn('relative tracking-[0.01em] leading-[18px] font-extrabold', textColor)}>{textValue}</div>
        </div>
    )
}

export default ReviewChip
