import Typography from '@/components/shared/Typography'
import React from 'react'

interface PreferanceSquareCardProps {
    imageSource: string // URL or imported image
    text: string
    onPress?: () => void // callback when pressed
    isSelected?: boolean // controlled selected state
}

export const PreferanceSquareCard: React.FC<PreferanceSquareCardProps> = ({ imageSource, text, onPress, isSelected = false }) => {
    return (
        <button
            onClick={onPress}
            className={`
        py-[18px] max-w-[155px] rounded-[16px] border 
        flex flex-col items-center justify-center gap-2 
        shadow-md
       cursor-pointer
        hover:shadow-lg
        transition-shadow duration-200
      `}
            style={{
                backgroundColor: isSelected ? 'var(--color-primary-default-80)' : 'var(--color-natural-white)',
                borderColor: isSelected ? 'var(--color-primary-default)' : 'var(--color-grey-4)'
            }}>
            <img
                src={imageSource}
                alt={text}
                className="w-[56px] h-[56px] object-contain"
            />
            <Typography
                textAlign="center"
                size="14"
                weight="semibold"
                lineHeight="20px"
                family="redhat"
                color={isSelected ? 'primary-default' : 'grey-0'}>
                {text}
            </Typography>
        </button>
    )
}
