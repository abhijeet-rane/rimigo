import React from 'react'
import Typography, { TypographyProps } from '@/components/shared/Typography'
import { Link } from 'react-router-dom'

interface TextPart {
    text: string
    isLink?: boolean
    navigateTo?: string
    onClick?: () => void // 👈 allow custom click handler per link
}

interface LinkStyleOverrides {
    size?: TypographyProps['size']
    weight?: TypographyProps['weight']
    color?: string
}

interface RichTextLinkProps {
    parts: TextPart[]
    size?: TypographyProps['size']
    weight?: TypographyProps['weight']
    family?: TypographyProps['family']
    color?: string
    linkStyle?: LinkStyleOverrides
}

const RichTextLink: React.FC<RichTextLinkProps> = ({ parts, size = 'md', weight = 'medium', family = 'redhat', color, linkStyle }) => {
    return (
        <div className="flex flex-wrap gap-x-1 gap-y-1">
            {parts.map((part, index) => {
                const isLink = part.isLink
                const linkColor = isLink ? (linkStyle?.color ?? color ?? 'grey-0') : undefined
                const commonProps = {
                    family,
                    size: isLink ? (linkStyle?.size ?? size) : size,
                    weight: isLink ? (linkStyle?.weight ?? weight) : weight,
                    color: linkColor ?? (isLink ? 'grey-0' : (color ?? 'grey-2')),
                    className: isLink ? 'cursor-pointer transition-all duration-200 border-b border-current hover:opacity-80' : ''
                }

                // Non-link text
                if (!isLink) {
                    return (
                        <Typography
                            key={index}
                            {...commonProps}>
                            {part.text}
                        </Typography>
                    )
                }

                // Handle links with click or navigation
                if (part.onClick) {
                    return (
                        <span
                            key={index}
                            onClick={part.onClick}>
                            <Typography {...commonProps}>{part.text}</Typography>
                        </span>
                    )
                }

                const navigateTo = part.navigateTo ?? '#'
                const isExternal = /^https?:\/\//.test(navigateTo)

                return isExternal ? (
                    <a
                        key={index}
                        href={navigateTo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="no-underline">
                        <Typography {...commonProps}>{part.text}</Typography>
                    </a>
                ) : (
                    <Link
                        key={index}
                        to={navigateTo}
                        className="no-underline">
                        <Typography {...commonProps}>{part.text}</Typography>
                    </Link>
                )
            })}
        </div>
    )
}

export default RichTextLink
