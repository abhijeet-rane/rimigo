import { useMemo } from 'react'
import type { Section } from '../types/contentCollection'
import { useLinkPreview } from '../hooks/useLinkPreview'
import { ArrowUpRight, Edit, Trash2 } from 'lucide-react'
import DescriptionWithShowMore from '@/components/shared/DescriptionWithShowMore/DescriptionWithShowMore'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import { getPlatformLogoURL, extractPlatformNameFromUrl } from '@/constants/icons/platformIcons'
import { EARTH_THIINGS_ICON } from '@/constants/thiingsIcons'

interface VisaCardProps {
    section: Section
    isRimigoInternal?: boolean
    onEdit?: (sectionId: string, blockId: string, url: string, description?: string, title?: string) => void
    onDelete?: (sectionId: string) => void
}

interface LinkItemProps {
    url: string
    title?: string
    description?: string
    buttonLabel?: string
    sectionId?: string
    blockId?: string
    isRimigoInternal?: boolean
    fallbackIcon?: string
    onEdit?: (sectionId: string, blockId: string, url: string, description?: string, title?: string) => void
    onDelete?: (sectionId: string) => void
}

const LinkItem: React.FC<LinkItemProps> = ({ url, title: blockTitle, description: blockDescription, buttonLabel, sectionId, blockId, isRimigoInternal = false, fallbackIcon, onEdit, onDelete }) => {
    const { previewData } = useLinkPreview(url)
    const { trackButtonClickCustom } = usePostHog()
    

    const previewDescription = previewData?.description || blockDescription || ''
    const displayName = blockTitle || previewData?.title || previewData?.siteName || 'Provider'
    
    // Try to get platform icon from constants first
    const platformName = useMemo(() => extractPlatformNameFromUrl(url), [url])
    const platformIconUrl = useMemo(() => getPlatformLogoURL(platformName), [platformName])
    
    // Fall back to fetched favicon if platform icon not found; use thiingsIcons when preview not available
    const faviconUrl = platformIconUrl || previewData?.favicon || previewData?.image
    const iconToShow = faviconUrl || fallbackIcon

    const handleBookClick = (e: React.MouseEvent) => {
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
            buttonName: POSTHOG_EVENTS.PROVIDER_BOOK_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: {
                url,
                providerName: displayName,
            },
        })
        e.preventDefault()
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    return (
        <div className="w-full rounded-xl bg-white border border-[#dfdde0] hover:border-grey-0 shadow-[0px_2px_8px_0px_#dfdde0] p-3 sm:p-4 flex flex-col gap-2.5 sm:gap-3 overflow-hidden transition-colors">
            {/* Provider Icon, Name and Button */}
            <div className="flex items-center gap-2 sm:gap-3">
                {/* Provider Icon (circular, smaller) - use thiingsIcons when preview not available */}
                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
                    {iconToShow ? (
                        <img
                            src={iconToShow}
                            alt={displayName}
                            className="w-full h-full object-cover rounded-full"
                            onError={(e) => {
                                e.currentTarget.src = fallbackIcon || `https://www.google.com/s2/favicons?domain=${url}&sz=64`
                            }}
                        />
                    ) : fallbackIcon ? (
                        <div className="w-full h-full bg-grey-5 flex items-center justify-center rounded-full">
                            <img src={fallbackIcon} alt="" className="w-4 h-4 object-contain" />
                        </div>
                    ) : (
                        <div className="w-full h-full bg-grey-5 flex items-center justify-center rounded-full">
                            <div className="w-4 h-4 bg-grey-3 rounded-full" />
                        </div>
                    )}
                </div>

                {/* Provider Name */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-grey-0 font-red-hat-display truncate">{displayName}</h4>
                </div>

                {/* Edit Button - Only for rimigo internal users */}
                {isRimigoInternal && sectionId && blockId && onEdit && (
                    <button
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onEdit(sectionId, blockId, url, blockDescription, blockTitle)
                        }}
                        className="p-2 text-grey-2 hover:text-primary-default hover:bg-grey-5 rounded-md transition-colors shrink-0"
                        title="Edit link">
                        <Edit className="w-4 h-4" />
                    </button>
                )}

                {/* Delete Button - Only for rimigo internal users */}
                {isRimigoInternal && sectionId && onDelete && (
                    <button
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onDelete(sectionId)
                        }}
                        className="p-2 text-grey-2 hover:text-red-600 hover:bg-grey-5 rounded-md transition-colors shrink-0"
                        title="Delete">
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}

                {/* Book Button */}
                <button
                    onClick={handleBookClick}
                    className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white text-primary-default font-red-hat-display font-bold border border-primary-default rounded-md hover:bg-grey-5 transition-colors text-xs sm:text-sm flex items-center gap-1 cursor-pointer shrink-0">
                    {(buttonLabel || 'BOOK').toUpperCase()}
                    <ArrowUpRight className="w-4 h-4" />
                </button>
            </div>

            {/* Description */}
            {previewDescription && (
                <DescriptionWithShowMore
                    description={previewDescription}
                    className="font-manrope font-medium text-sm text-grey-1"
                    textSize="14px"
                    lineHeight="20px"
                    maxLines={2}
                />
            )}
        </div>
    )
}

const VisaCard: React.FC<VisaCardProps> = ({ section, isRimigoInternal = false, onEdit, onDelete }) => {
    // Get the first block with links (or any block)
    const linkBlock = section.blocks?.find((block) => block.block_type === 'links' && block.value?.items && block.value.items.length > 0)

    if (!linkBlock) {
        return null
    }

    const items = linkBlock.value.items || []

    if (items.length === 0) {
        return null
    }

    const blockTitle = linkBlock.label ?? undefined

    const blockButtonLabel = (linkBlock.value?.button_label as string) || undefined

    // LP-master sections are read-only — drop edit/delete callbacks so the inner
    // LinkItem hides those buttons (its existing `onEdit && ...` guard handles it).
    const isReadOnly = section.source === 'location_personalised'
    const effectiveOnEdit = isReadOnly ? undefined : onEdit
    const effectiveOnDelete = isReadOnly ? undefined : onDelete

    return (
        <div className="flex flex-col gap-2">
            {items.map((item, itemIndex) => (
                <LinkItem
                    key={itemIndex}
                    url={item.url}
                    title={blockTitle}
                    description={linkBlock.description || undefined}
                    buttonLabel={blockButtonLabel}
                    sectionId={section.id}
                    blockId={linkBlock.id}
                    isRimigoInternal={isRimigoInternal}
                    fallbackIcon={EARTH_THIINGS_ICON}
                    onEdit={effectiveOnEdit}
                    onDelete={effectiveOnDelete}
                />
            ))}
        </div>
    )
}

export default VisaCard

