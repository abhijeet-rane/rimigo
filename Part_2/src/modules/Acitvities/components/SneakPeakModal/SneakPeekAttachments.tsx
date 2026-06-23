import React from 'react'
import Typography from '@/components/shared/Typography'
import { FileText, ExternalLink } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export interface Attachment {
    id: string
    type: string
    name: string
    url: string
}

interface SneakPeekAttachmentsProps {
    attachments: Attachment[]
}

export const SneakPeekAttachments: React.FC<SneakPeekAttachmentsProps> = ({ attachments }) => {
    if (!attachments?.length)
        return (
            <div
                className="
     py-1
                     
                    ">
                <Typography
                    size="10"
                    family="manrope"
                    weight="medium"
                    color="grey-2">
                    No attachments
                </Typography>
            </div>
        )

    // Check if URL is an image
    const isImage = (url: string) => /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i.test(url)

    // Get favicon URL for a link
    const getFavicon = (url: string) => {
        try {
            const domain = new URL(url).origin
            return `https://www.google.com/s2/favicons?domain=${domain}`
        } catch {
            return ''
        }
    }

    const getDomain = (url: string) => {
        try {
            return new URL(url).hostname.replace(/^www\./, '')
        } catch {
            return ''
        }
    }

    const getFileExtension = (url: string, name: string) => {
        const source = name.includes('.') ? name : url
        const match = source.match(/\.([a-z0-9]{1,5})(?:[?#]|$)/i)
        return match ? match[1].toUpperCase() : 'File'
    }

    return (
        <div className="w-full bg-white py-4 gap-2 flex flex-col">
            <Typography
                size="14"
                weight="semibold"
                family="manrope"
                color="grey-1"
                className="mb-3">
                Attachments
            </Typography>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                {attachments.map((att) => {
                    const showImage = isImage(att.url)
                    const isLink = att.type === 'link'
                    const subtitle = showImage
                        ? 'Image'
                        : isLink
                            ? getDomain(att.url) || 'Open link'
                            : getFileExtension(att.url, att.name)
                    const ariaLabel = isLink ? `${att.name} — ${att.url}` : att.name

                    return (
                        <Tooltip key={att.id}>
                            <TooltipTrigger asChild>
                                <a
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={ariaLabel}
                                    className="flex items-center gap-3 p-3 border border-grey-4 rounded-md transition-colors hover:border-grey-2 hover:bg-grey-5 group leading-tight">
                                    {/* Preview */}
                                    <div className="w-12 h-12 flex-shrink-0 rounded-md bg-grey-4 flex items-center justify-center overflow-hidden">
                                        {showImage ? (
                                            <img
                                                src={att.url}
                                                alt={att.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : isLink ? (
                                            <img
                                                src={getFavicon(att.url)}
                                                alt=""
                                                className="w-6 h-6"
                                            />
                                        ) : (
                                            <FileText
                                                size={20}
                                                className="text-grey-1"
                                            />
                                        )}
                                    </div>

                                    {/* Text Info */}
                                    <div className="flex flex-col min-w-0 flex-1">
                                        <Typography
                                            size="14"
                                            family="manrope"
                                            weight="medium"
                                            className="truncate">
                                            {att.name}
                                        </Typography>
                                        <Typography
                                            size="12"
                                            family="manrope"
                                            color="grey-1"
                                            className="truncate">
                                            {subtitle}
                                        </Typography>
                                    </div>

                                    <ExternalLink
                                        size={16}
                                        className="flex-shrink-0 text-grey-2 group-hover:text-grey-1 transition-colors"
                                        aria-hidden="true"
                                    />
                                </a>
                            </TooltipTrigger>
                            <TooltipContent
                                side="top"
                                sideOffset={8}
                                className="z-[10000] max-w-xs break-words bg-grey-0 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg"
                                arrowClassName="bg-grey-0 fill-grey-0">
                                {att.name}
                            </TooltipContent>
                        </Tooltip>
                    )
                })}
            </div>
        </div>
    )
}
