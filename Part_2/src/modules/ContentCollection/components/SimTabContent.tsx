import { useState, useMemo, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Section, ApiResponse, ContentCollection } from '../types/contentCollection'
import SimCard from './SimCard'
import { MustHaveSkeletonGrid } from './MustHaveCardSkeleton'
import Typography from '@/components/shared/Typography'
import AddLinkModal from './AddLinkModal'
import EditLinkModal from './EditLinkModal'
import DeleteConfirmationModal from './DeleteConfirmationModal'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { toast } from 'sonner'

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

interface SimTabContentProps {
    isRimigoInternal?: boolean
    collectionIdentifier: string
    isActive?: boolean
    onLinkAdded?: () => void
    onEmptyChange?: (isEmpty: boolean) => void
    api?: CollectionApi // Optional API instance (defaults to contentCollectionApi)
}

const SimTabContent: React.FC<SimTabContentProps> = ({
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

    // Fetch collection data for sim section - only when tab is active
    const { data: simCollectionResponse, isLoading: isCollectionLoading } = useQuery({
        queryKey: ['content-collection', collectionIdentifier, 'sim'],
        queryFn: async () => {
            return await api.getByIdentifier(collectionIdentifier, 'sim')
        },
        enabled: !!collectionIdentifier && isActive,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    // Extract SIM sections that have blocks
    const simSections = useMemo(() => {
        if (!simCollectionResponse?.data?.sections) return []
        return simCollectionResponse.data.sections.filter(
            (section: Section) => section.section_type === 'sim' && section.blocks && section.blocks.length > 0
        )
    }, [simCollectionResponse])

    // Gate on the query actually returning data — when the tab isn't active
    // the query is disabled (isLoading=false, data=undefined). Treating that
    // as "empty" would unmount the sub-tab and prevent it from ever fetching.
    useEffect(() => {
        if (!simCollectionResponse) return
        onEmptyChange?.(simSections.length === 0)
    }, [simCollectionResponse, simSections.length, onEmptyChange])

    if (isCollectionLoading) {
        return <MustHaveSkeletonGrid variant="link" />
    }

    const handleAddLinkClick = () => {
        setIsAddLinkModalOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!deletingSectionId || !collectionIdentifier) return
        
        setIsDeleting(true)
        try {
            await api.deleteSection(collectionIdentifier, deletingSectionId)
            queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier, 'sim'] })
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

                {/* Empty State (internal only — consumers get the section hidden) */}
                {simSections.length === 0 ? (
                    isRimigoInternal ? (
                        <div className="text-center py-12">
                            <Typography
                                size="16"
                                weight="medium"
                                color="grey-1">
                                No SIMs found in this collection.
                            </Typography>
                        </div>
                    ) : null
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {simSections.map((section: Section, index: number) => (
                            <SimCard
                                key={section.id || index}
                                section={section}
                                isRimigoInternal={isRimigoInternal}
                                onEdit={(sectionId: string, blockId: string, url: string, description?: string, title?: string) => {
                                    setEditingLink({ sectionId, blockId, url, description, title })
                                }}
                                onDelete={(sectionId: string) => {
                                    setDeletingSectionId(sectionId)
                                }}
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
                    sectionType="sim"
                    onSuccess={() => {
                        // Invalidate sim query to refetch data
                        queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier, 'sim'] })
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
                    sectionType="sim"
                    onSuccess={() => {
                        // Invalidate sim query to refetch data
                        queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier, 'sim'] })
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
                    title="Delete SIM Section"
                    message="Are you sure you want to delete this SIM section? This action cannot be undone."
                    isDeleting={isDeleting}
                />
            )}
        </>
    )
}

export default SimTabContent
