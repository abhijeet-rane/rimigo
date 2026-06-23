import React from 'react'
import clsx from 'clsx'

type FontFamily = 'manrope' | 'redhat'
type FontWeight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black'

type FontSize =
    | 'xs'
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | '2xl'
    | '24'
    | '14'
    | '16'
    | '17'
    | '10'
    | '48'
    | '20'
    | '12'
    | '13'
    | '9'
    | '11'
    | '18'
    | '15'
    | '28'
    | 'header-description'
    | 'header-mobile'
    | 'header-hero-mobile'
    | 'story-card-header'

export interface TypographyProps extends React.HTMLAttributes<HTMLSpanElement> {
    children: React.ReactNode
    family?: FontFamily
    weight?: FontWeight
    size?: FontSize
    color?: string
    textAlign?: 'left' | 'center' | 'right' | 'justify'
    underline?: boolean
    italic?: boolean
    gap?: number
    gradientColors?: string[]
    lineHeight?: string | number
    pop?: boolean // if true, shows a line-through (like old price)
}

/**
 * Typography component adapted to index.css variables
 */
const Typography: React.FC<TypographyProps> = ({
    children,
    family = 'redhat',
    weight = 'normal',
    size = 'md',
    color,
    textAlign = 'left',
    underline = false,
    italic = false,
    lineHeight,
    gap = 0,
    gradientColors,
    pop = false, // default false
    className,
    style,
    ...props
}) => {
    const textClasses = clsx(
        {
            'font-light': weight === 'light',
            'font-normal': weight === 'normal',
            'font-medium': weight === 'medium',
            'font-semibold': weight === 'semibold',
            'font-bold': weight === 'bold',
            'font-extrabold': weight === 'extrabold',
            'font-black': weight === 'black'
        },
        {
            'text-left': textAlign === 'left',
            'text-center': textAlign === 'center',
            'text-right': textAlign === 'right',
            'text-justify': textAlign === 'justify',
            underline,
            italic
        },
        className
    )

    const fontSizeMap: Record<FontSize, string> = {
        xs: 'var(--font-size-xs)',
        sm: 'var(--font-size-sm)',
        md: 'var(--font-size-md)',
        lg: 'var(--font-size-lg)',
        xl: 'var(--font-size-xl)',
        '48': 'var(--font-size-48)',
        '14': 'var(--font-size-14)',
        '20': 'var(--font-size-20)',
        '9': 'var(--font-size-9)',
        '17': 'var(--font-size-17)',
        '10': 'var(--font-size-10)',
        '11': 'var(--font-size-11)',
        '2xl': 'var(--font-size-2xl)',
        '18': 'var(--font-size-18)',
        '28': 'var(--font-size-28)',
        'header-description': 'var(--font-size-header-description)',
        'header-mobile': 'var(--font-size-header-mobile)',
        'header-hero-mobile': 'var(--font-size-header-hero-mobile)',
        'story-card-header': 'var(--font-size-story-card-header)',
        '16': 'var(--font-size-16)',
        '15': 'var(--font-size-15)',
        '24': 'var(--font-size-24)',
        '12': 'var(--font-size-12)',
        '13': 'var(--font-size-sm)' // 13px
    }

    const resolvedFamily = family === 'redhat' ? 'var(--font-red-hat-display)' : 'var(--font-manrope)'
    const resolvedFontSize = size ? fontSizeMap[size] : fontSizeMap.md
    const resolvedColor = color ? (color.startsWith('#') || color.startsWith('rgb') ? color : `var(--color-${color})`) : undefined

    const combinedStyle: React.CSSProperties = {
        fontSize: resolvedFontSize,
        fontFamily: resolvedFamily,
        color: resolvedColor,
        marginBottom: gap,
        lineHeight,
        ...style,
        ...(gradientColors && gradientColors.length > 1
            ? {
                  backgroundImage: `linear-gradient(to right, ${gradientColors.join(',')})`,
                  WebkitBackgroundClip: 'text',
                  color: 'transparent'
              }
            : {}),
        ...(pop && resolvedColor
            ? {
                  textDecoration: 'line-through',
                  textDecorationColor: resolvedColor
              }
            : {})
    }

    return (
        <span
            {...props}
            className={textClasses}
            style={combinedStyle}>
            {children}
        </span>
    )
}

export default Typography
