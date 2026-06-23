import { useState, useMemo, useEffect } from 'react'
import { Plus, ArrowUpRight, Edit, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Section, SectionSource, ApiResponse, ContentCollection } from '../types/contentCollection'
import { useLinkPreview } from '../hooks/useLinkPreview'
import { MustHaveSkeletonGrid } from './MustHaveCardSkeleton'
import Typography from '@/components/shared/Typography'
import AddLinkModal from './AddLinkModal'
import EditLinkModal from './EditLinkModal'
import DeleteConfirmationModal from './DeleteConfirmationModal'
import DescriptionWithShowMore from '@/components/shared/DescriptionWithShowMore/DescriptionWithShowMore'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { toast } from 'sonner'
import { usePostHog } from '@/modules/amplitude/components/PostHogProvider'
import { POSTHOG_ACTIONS, POSTHOG_EVENTS, POSTHOG_PAGES } from '@/modules/amplitude/components/posthogEventDetails'
import { getPlatformLogoURL, extractPlatformNameFromUrl } from '@/constants/icons/platformIcons'
import { LINK_ICON } from '@/constants/thiingsIcons'

const HOURS_24 = 24 * 60 * 60 * 1000

// Type for API with addSection, getByIdentifier, and updateBlock methods
type CollectionApi = {
    addSection: (
        collectionIdentifier: string,
        payload: {
            id: string
            section_type: string
            title: string
            description?: string | null
            sections_order: number
            blocks: unknown[]
        }
    ) => Promise<unknown>
    getByIdentifier: (identifier: string, sectionType?: string) => Promise<ApiResponse<ContentCollection>>
    updateBlock: (
        identifier: string,
        sectionId: string,
        blockId: string,
        payload: Partial<{
            block_type: string
            label: string | null
            description: string | null
            value: Record<string, unknown>
        }>
    ) => Promise<unknown>
    deleteSection: (identifier: string, sectionId: string) => Promise<void>
}

interface LinksTabContentProps {
    isRimigoInternal?: boolean
    collectionIdentifier: string
    isActive?: boolean
    onLinkAdded?: () => void
    /** Reports whether this sub-section has zero items (after load) so the
     *  parent can hide the whole section + header for consumers. */
    onEmptyChange?: (isEmpty: boolean) => void
    api?: CollectionApi // Optional API instance (defaults to contentCollectionApi)
}

interface LinkItemData {
    url: string
    title?: string
    description?: string
    buttonLabel?: string
    sectionId?: string
    blockId?: string
    isRimigoInternal?: boolean
    /** From backend: 'custom' = editable, 'location_personalised' = read-only */
    source?: SectionSource
    onEdit?: (sectionId: string, blockId: string, url: string, description?: string, title?: string) => void
    onDelete?: (sectionId: string) => void
}

const LinkItem: React.FC<LinkItemData> = ({ url, title: blockTitle, description: blockDescription, buttonLabel, sectionId, blockId, isRimigoInternal = false, source, onEdit, onDelete }) => {
    const { previewData } = useLinkPreview(url)

    const previewDescription = previewData?.description || blockDescription || ''
    const displayName = blockTitle || previewData?.title || previewData?.siteName || 'Provider'

    // Try to get platform icon from constants first
    const platformName = useMemo(() => extractPlatformNameFromUrl(url), [url])
    const platformIconUrl = useMemo(() => getPlatformLogoURL(platformName), [platformName])

    // Fall back to fetched favicon if platform icon not found; use thiingsIcons when preview not available
    const faviconUrl = platformIconUrl || previewData?.favicon || previewData?.image
    const iconToShow = faviconUrl || LINK_ICON
    const { trackButtonClickCustom } = usePostHog()



    const handleBookClick = (e: React.MouseEvent) => {
        e.preventDefault()
        trackButtonClickCustom?.({
            buttonPage: POSTHOG_PAGES.COLLECTION_PAGE,
            buttonName: POSTHOG_EVENTS.PROVIDER_BOOK_CLICK,
            buttonAction: POSTHOG_ACTIONS.CLICK,
            extra: {
                url,
                providerName: displayName
            }
        })
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
                                e.currentTarget.src = LINK_ICON
                            }}
                        />
                    ) : (
                        <div className="w-full h-full bg-grey-5 flex items-center justify-center rounded-full">
                            <img src={LINK_ICON} alt="link-icon" className="w-4 h-4 object-contain" />
                        </div>
                    )}
                </div>

                {/* Provider Name */}
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-grey-0 font-red-hat-display truncate">{displayName}</h4>
                </div>

                {/* Edit Button - Only for rimigo internal users on saved sections (LP master is read-only) */}
                {isRimigoInternal && sectionId && blockId && onEdit && source !== 'location_personalised' && (
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

                {/* Delete Button - Only for rimigo internal users on saved sections (LP master is read-only) */}
                {isRimigoInternal && sectionId && onDelete && source !== 'location_personalised' && (
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

const LinksTabContent: React.FC<LinksTabContentProps> = ({
    isRimigoInternal = false,
    collectionIdentifier,
    isActive = false,
    onLinkAdded,
    onEmptyChange,
    api = contentCollectionApi
}) => {
    const queryClient = useQueryClient()
    const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false)
    const [editingLink, setEditingLink] = useState<{
        sectionId: string
        blockId: string
        url: string
        title?: string
        description?: string
    } | null>(null)
    const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Fetch collection data for links section - only when tab is active
    const { data: linksCollectionResponse, isLoading: isCollectionLoading } = useQuery({
        queryKey: ['content-collection', collectionIdentifier, 'links'],
        queryFn: async () => {
            return await api.getByIdentifier(collectionIdentifier, 'links')
        },
        enabled: !!collectionIdentifier && isActive,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    // Extract Links sections that have blocks (for display)
    const linksSections = useMemo(() => {
        if (!linksCollectionResponse?.data?.sections) return []
        return linksCollectionResponse.data.sections.filter(
            (section: Section) => section.section_type === 'links' && section.blocks && section.blocks.length > 0
        )
    }, [linksCollectionResponse])

    // Flatten all link items from all sections into a single array with section and block IDs
    const allLinkItems = useMemo(() => {
        const items: LinkItemData[] = []
        linksSections.forEach((section: Section) => {
            const linkBlock = section.blocks?.find((block) => block.block_type === 'links' && block.value?.items && block.value.items.length > 0)
            if (linkBlock && linkBlock.value?.items && section.id && linkBlock.id) {
                const blockTitle = linkBlock.label ?? undefined
                const source = section.source
                linkBlock.value.items.forEach((item: { url: string; platform?: string }) => {
                    items.push({
                        url: item.url,
                        title: blockTitle || undefined,
                        description: linkBlock.description || undefined,
                        buttonLabel: (linkBlock.value?.button_label as string) || undefined,
                        sectionId: section.id!,
                        blockId: linkBlock.id!,
                        isRimigoInternal,
                        source,
                        onEdit: (sectionId: string, blockId: string, url: string, description?: string, title?: string) => {
                            setEditingLink({ sectionId, blockId, url, description, title })
                        },
                        onDelete: (sectionId: string) => {
                            setDeletingSectionId(sectionId)
                        }
                    })
                })
            }
        })
        return items
    }, [linksSections, isRimigoInternal])

    // Report emptiness up to the parent once loaded so it can hide the
    // section + header for consumers (internal users keep it to add items).
    // Gate on `linksCollectionResponse` (query actually returned data) — when
    // the tab isn't active the query is disabled, `isCollectionLoading` is
    // false, and items is empty: reporting "empty" here would unmount the
    // sub-tab and prevent the query from ever running when the user clicks in.
    useEffect(() => {
        if (!linksCollectionResponse) return
        onEmptyChange?.(allLinkItems.length === 0)
    }, [linksCollectionResponse, allLinkItems.length, onEmptyChange])

    const handleAddLinkClick = () => {
        setIsAddLinkModalOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!deletingSectionId || !collectionIdentifier) return
        
        setIsDeleting(true)
        try {
            await api.deleteSection(collectionIdentifier, deletingSectionId)
            queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier, 'links'] })
            onLinkAdded?.()
            toast.success('Section deleted successfully')
            setDeletingSectionId(null)
        } catch (error) {
            const errorMessage =
                (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
                (error as { message?: string })?.message ||
                'Failed to delete section. Please try again.'
            toast.error(errorMessage)
        } finally {
            setIsDeleting(false)
        }
    }

    if (isCollectionLoading) {
        return <MustHaveSkeletonGrid variant="link" />
    }

    return (
        <>
            <div className="flex flex-col gap-6 px-4 py-4">
                {/* Add Link Button - Only for rimigo_internal users */}
                {isRimigoInternal && collectionIdentifier && (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={handleAddLinkClick}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-grey-4 bg-white text-grey-0 font-semibold font-red-hat-display hover:bg-grey-5 transition-colors">
                            <Plus className="w-4 h-4" />
                            Add
                        </button>
                    </div>
                )}

                {/* Empty State (internal only — consumers get the whole section
                    hidden by the parent) or Links Grid */}
                {allLinkItems.length === 0 ? (
                    isRimigoInternal ? (
                        <div className="text-center py-12">
                            <Typography
                                size="16"
                                weight="medium"
                                color="grey-1">
                                No links found in this collection.
                            </Typography>
                        </div>
                    ) : null
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {allLinkItems.map((item, index) => (
                            <LinkItem
                                key={`${item.url}-${index}`}
                                url={item.url}
                                title={item.title}
                                description={item.description}
                                buttonLabel={item.buttonLabel}
                                sectionId={item.sectionId}
                                blockId={item.blockId}
                                isRimigoInternal={item.isRimigoInternal}
                                source={item.source}
                                onEdit={item.onEdit}
                                onDelete={item.onDelete}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Add Link Modal */}
            {isRimigoInternal && collectionIdentifier && (
                <AddLinkModal
                    isOpen={isAddLinkModalOpen}
                    onClose={() => {
                        setIsAddLinkModalOpen(false)
                    }}
                    collectionIdentifier={collectionIdentifier}
                    onSuccess={() => {
                        // Invalidate links query to refetch data
                        queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier, 'links'] })
                        onLinkAdded?.()
                        setIsAddLinkModalOpen(false)
                    }}
                    api={api}
                />
            )}

            {/* Edit Link Modal */}
            {isRimigoInternal && collectionIdentifier && editingLink && (
                <EditLinkModal
                    isOpen={!!editingLink}
                    onClose={() => {
                        setEditingLink(null)
                    }}
                    collectionIdentifier={collectionIdentifier}
                    sectionId={editingLink.sectionId}
                    blockId={editingLink.blockId}
                    initialTitle={editingLink.title}
                    initialUrl={editingLink.url}
                    initialDescription={editingLink.description}
                    onSuccess={() => {
                        // Invalidate links query to refetch data
                        queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier, 'links'] })
                        onLinkAdded?.()
                        setEditingLink(null)
                    }}
                    api={api}
                />
            )}

            {/* Delete Confirmation Modal */}
            {isRimigoInternal && collectionIdentifier && deletingSectionId && (
                <DeleteConfirmationModal
                    isOpen={!!deletingSectionId}
                    onClose={() => {
                        setDeletingSectionId(null)
                    }}
                    onConfirm={handleDeleteConfirm}
                    title="Delete Link Section"
                    message="Are you sure you want to delete this link section? This action cannot be undone."
                    isDeleting={isDeleting}
                />
            )}
        </>
    )
}

export default LinksTabContent
