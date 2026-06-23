import RichText from '@/components/shared/RichText'
import Typography from '@/components/shared/Typography'
import { Triangle } from '@/utils/SvgUtils'
import ActionButton from './ActionButton'
import { X } from 'lucide-react'

interface GuideTipperInlineModalProps {
    title?: string
    subtitle?: string
    closeTitle?: string
    onClose?: () => void
    primaryTitle?: string
    highlight?: string[]
    onPrimary?: () => void
    position: 'top' | 'bottom' | 'left' | 'right'
}

const GuideTipperInlineModal: React.FC<GuideTipperInlineModalProps> = ({
    title,
    subtitle,
    closeTitle,
    onClose,
    primaryTitle,
    highlight,
    onPrimary,
    position
}) => {
    /** Layout orientation (triangle + box) */
    const layoutClass =
        position === 'left'
            ? 'flex flex-row items-center gap-2'
            : position === 'right'
              ? 'flex flex-row-reverse items-center gap-2'
              : position === 'top'
                ? 'flex flex-col items-center gap-2'
                : 'flex flex-col-reverse items-center gap-2'

    /** Triangle rotation */
    const triangleRotation: Record<string, string> = {
        top: 'rotate-180',
        bottom: '',
        left: '-rotate-90 -mr-[14px]',
        right: 'rotate-90 -ml-[14px]'
    }

    return (
        <div className={layoutClass}>
            {/* Triangle pointer */}
            <div className={`${triangleRotation[position]}`}>
                <Triangle />
            </div>

            {/* Modal body */}
            <div className="bg-grey-0 rounded-[8px] p-4 gap-4 flex flex-col max-w-[280px]">
                {(title || subtitle) && (
                    <div className="flex flex-col gap-0.5">
                        {/* CASE 1 — Title exists → Title + X in same row */}
                        {title && (
                            <div className="flex flex-row justify-between items-start">
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

                        {/* CASE 2 — No title, subtitle exists → Subtitle + X in same row */}
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

                        {/* CASE 3 — Both title + subtitle → Subtitle below title */}
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
                    <div className="flex flex-row items-center gap-2">
                        {closeTitle && (
                            <ActionButton
                                title={closeTitle}
                                bgColor="bg-grey-0"
                                textColor="natural-white"
                                onClick={onClose ?? (() => {})}
                            />
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
        </div>
    )
}

export default GuideTipperInlineModal
