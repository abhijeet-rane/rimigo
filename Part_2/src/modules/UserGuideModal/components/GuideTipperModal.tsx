import RichText from '@/components/shared/RichText'
import Typography from '@/components/shared/Typography'
import { Triangle } from '@/utils/SvgUtils'
import ActionButton from './ActionButton'
import { X } from 'lucide-react'

interface GuideTipperModalProps {
    title?: string
    subtitle?: string
    closeTitle?: string
    onClose?: () => void
    primaryTitle?: string
    highlight?: string[]
    onPrimary?: () => void
    showTriangle?: boolean
    position: 'top' | 'bottom' | 'left' | 'right'
}

const GuideTipperModal: React.FC<GuideTipperModalProps> = ({
    title,
    highlight,
    subtitle,
    closeTitle,
    onClose,
    primaryTitle,
    onPrimary,
    showTriangle = true,
    position
}) => {
    // Positioning classes relative to the parent wrapper
    const positionClasses: Record<string, string> = {
        top: 'absolute bottom-full mb-2 left-1/2 -translate-x-1/2',
        bottom: 'absolute top-full mt-2 left-1/2 -translate-x-1/2',
        left: 'absolute right-full mr-2 top-1/2 -translate-y-1/2',
        right: 'absolute left-full ml-2 top-1/2 -translate-y-1/2'
    }

    const triangleRotation: Record<string, string> = {
        top: 'rotate-180 mb-[1px] -translate-y-[10%] ',
        bottom: '',
        left: 'rotate-90',
        right: '-rotate-90'
    }

    return (
        <div className={`absolute z-50 ${positionClasses[position]} w-full`}>
            <div className="flex flex-col items-center max-w-[280px] w-full">
                {/* Triangle */}
                {showTriangle && position === 'bottom' && (
                    <div className={triangleRotation[position]}>
                        <Triangle />
                    </div>
                )}

                {/* Modal content */}
                <div className="bg-grey-0 -mt-0.5 rounded-[8px] p-4 gap-4 flex flex-col">
                    {/* Header Area */}
                    {(title || subtitle) && (
                        <div className="flex flex-col gap-0.5">
                            {/* CASE 1: Title exists → RichText + X */}
                            {title && (
                                <div className="flex flex-row justify-between items-start">
                                    {/* RichText title with highlight words */}
                                    <RichText
                                        textAlign="left"
                                        content={title.split(' ').map((word, index) => ({
                                            text: word + (index < title.split(' ').length - 1 ? ' ' : ''),
                                            color: highlight?.includes(word) ? 'primary-light' : 'natural-white',
                                            size: '16',
                                            family: 'redhat',
                                            weight: highlight?.includes(word) ? 'bold' : 'semibold'
                                        }))}
                                    />

                                    {/* X only if closeTitle is not provided */}
                                    {!closeTitle && onClose && (
                                        <div
                                            onClick={onClose}
                                            className="w-5 h-5 bg-grey-1 rounded-full flex items-center justify-center cursor-pointer shrink-0">
                                            <X
                                                size={12}
                                                strokeWidth={3}
                                                className="text-natural-white"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* CASE 2: No title → subtitle & X in same row */}
                            {!title && subtitle && (
                                <div className="flex flex-row items-start gap-2">
                                    <Typography
                                        size="14"
                                        weight="medium"
                                        color="natural-white"
                                        family="manrope"
                                        className="flex-1">
                                        {subtitle}
                                    </Typography>

                                    {!closeTitle && onClose && (
                                        <div
                                            onClick={onClose}
                                            className="w-5 h-5 bg-grey-1 rounded-full flex items-center justify-center cursor-pointer shrink-0">
                                            <X
                                                size={12}
                                                strokeWidth={3}
                                                className="text-natural-white"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Subtitle when title exists */}
                            {title && subtitle && (
                                <Typography
                                    size="14"
                                    weight="medium"
                                    color="natural-white"
                                    family="manrope">
                                    {subtitle}
                                </Typography>
                            )}
                        </div>
                    )}

                    {(closeTitle || primaryTitle) && (
                        <div className="flex flex-row items-center">
                            {closeTitle && (
                                <div className="flex-1 flex justify-center">
                                    <ActionButton
                                        title={closeTitle}
                                        bgColor="bg-grey-0"
                                        textColor="natural-white"
                                        onClick={onClose ?? (() => {})}
                                    />
                                </div>
                            )}

                            {primaryTitle && (
                                <ActionButton
                                    title={primaryTitle}
                                    bgColor="bg-primary-default"
                                    textColor="natural-white"
                                    onClick={onPrimary ?? (() => {})}
                                />
                            )}
                        </div>
                    )}
                </div>
                {showTriangle && position === 'top' && (
                    <div className={triangleRotation[position]}>
                        <Triangle />
                    </div>
                )}
            </div>
        </div>
    )
}

export default GuideTipperModal