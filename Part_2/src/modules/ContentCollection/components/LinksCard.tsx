import type { Section } from '../types/contentCollection'
import { useLinkPreview } from '../hooks/useLinkPreview'
import { ArrowUpRight } from 'lucide-react'
import DescriptionWithShowMore from '@/components/shared/DescriptionWithShowMore/DescriptionWithShowMore'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'

interface LinksCardProps {
    section: Section
}

interface LinkItemProps {
    url: string
    description?: string
}

const LinkItem: React.FC<LinkItemProps> = ({ url, description: blockDescription }) => {
    const { previewData } = useLinkPreview(url)
    const { trackButtonClickCustom } = usePostHog()

    const previewDescription = previewData?.description || blockDescription || ''
    const displayName = previewData?.title || previewData?.siteName || 'Provider'
    const faviconUrl = previewData?.favicon || previewData?.image

    const handleBookClick = (e: React.MouseEvent) => {
        e.preventDefault()
        trackButtonClickCustom?.({
        buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
        buttonName: POSTHOG_EVENTS.PROVIDER_BOOK_CLICK,
        buttonAction: POSTHOG_ACTIONS.CLICK,
        extra: {
            url,
            providerName: displayName,
        },
    })
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    return (
        <div className="w-full rounded-md bg-white border border-grey-4 p-4 flex flex-col gap-3">
            {/* Provider Icon and Name */}
            <div className="flex items-center gap-3">
                {/* Provider Icon (circular, smaller) */}
                <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
                    {faviconUrl ? (
                        <img
                            src={faviconUrl}
                            alt={displayName}
                            className="w-full h-full object-cover rounded-full"
                            onError={(e) => {
                                // Fallback to a placeholder if image fails to load
                                e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${url}&sz=64`
                            }}
                        />
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
            </div>

            {/* Description */}
            {previewDescription && (
                <DescriptionWithShowMore
                    description={previewDescription}
                    className="font-manrope text-sm text-grey-1"
                    textSize="14px"
                    lineHeight="20px"
                    maxLines={2}
                />
            )}

            {/* Book Button - Right Aligned */}
            <div className="flex justify-end">
                <button
                    onClick={handleBookClick}
                    className="px-4 py-2 bg-white text-grey-0 border border-grey-3 rounded-md hover:bg-grey-5 transition-colors font-manrope font-medium text-xs flex items-center gap-1 cursor-pointer">
                    BOOK
                    <ArrowUpRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}

const LinksCard: React.FC<LinksCardProps> = ({ section }) => {
    // Get the first block with links (or any block)
    const linkBlock = section.blocks?.find((block) => block.block_type === 'links' && block.value?.items && block.value.items.length > 0)

    if (!linkBlock) {
        return null
    }

    const items = linkBlock.value.items || []

    if (items.length === 0) {
        return null
    }

    return (
        <div className="flex flex-col gap-0.5">
            {items.map((item, itemIndex) => (
                <LinkItem
                    key={itemIndex}
                    url={item.url}
                    description={linkBlock.description || undefined}
                />
            ))}
        </div>
    )
}

export default LinksCard
