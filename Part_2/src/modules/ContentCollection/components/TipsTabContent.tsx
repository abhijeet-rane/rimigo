import { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Section, SectionSource, ApiResponse, ContentCollection } from '../types/contentCollection'
import { MustHaveSkeletonGrid } from './MustHaveCardSkeleton'
import Typography from '@/components/shared/Typography'
import { toast } from 'sonner'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { Fragment } from 'react'
import { Plus, X, Pencil, Trash2 } from 'lucide-react'
import DosDontsTabContent from './DosDontsTabContent'
import DeleteConfirmationModal from './DeleteConfirmationModal'
import Divider from '@/components/shared/Divider/Divider'
import { BULB_ICON } from '@/constants/thiingsIcons'
import { ENTITY_TYPE_TIPS } from '../lib/collectionConfig'
import ReactMarkdown from 'react-markdown'

/**
 * Renders inline markdown (bold/italic only), preserving author-entered
 * newlines as <br> (ReactMarkdown otherwise collapses them into a paragraph).
 */
const MarkdownText = ({ text, className, style }: { text: string; className?: string; style?: React.CSSProperties }) => {
    const lines = text.split('\n')
    return (
        <span className={className} style={style}>
            {lines.map((line, i) => (
                <Fragment key={i}>
                    {i > 0 && <br />}
                    <ReactMarkdown
                        allowedElements={['p', 'strong', 'em']}
                        unwrapDisallowed
                        components={{
                            p: ({ children }) => <>{children}</>
                        }}>
                        {line}
                    </ReactMarkdown>
                </Fragment>
            ))}
        </span>
    )
}

const HOURS_24 = 24 * 60 * 60 * 1000

// Type for API with addSection and getByIdentifier methods
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
    deleteSection: (identifier: string, sectionId: string) => Promise<void>
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
}

interface TipsTabContentProps {
    isRimigoInternal?: boolean
    collectionIdentifier: string
    isActive?: boolean
    onTipAdded?: () => void
    onDosDontsUpdated?: () => void
    onEmptyChange?: (isEmpty: boolean) => void
    api?: CollectionApi // Optional API instance (defaults to contentCollectionApi)
}

// Flatten tip items for grid: text blocks (label + content) and text_list items (content only)
interface TipItem {
    id: string
    category: string
    description: string
    sectionId?: string
    blockId?: string
    source?: SectionSource
}

const TipsTabContent: React.FC<TipsTabContentProps> = ({
    collectionIdentifier,
    isActive = false,
    onTipAdded,
    onDosDontsUpdated,
    onEmptyChange,
    isRimigoInternal = false,
    api = contentCollectionApi
}) => {
    const queryClient = useQueryClient()
    const [isAddTipModalOpen, setIsAddTipModalOpen] = useState(false)
    const [editingTip, setEditingTip] = useState<TipItem | null>(null)
    const [deletingTip, setDeletingTip] = useState<TipItem | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDeleteTip = async () => {
        if (!deletingTip?.sectionId || !collectionIdentifier) return
        setIsDeleting(true)
        try {
            await api.deleteSection(collectionIdentifier, deletingTip.sectionId)
            toast.success('Tip deleted')
            queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier, 'tips'] })
        } catch {
            toast.error('Failed to delete tip')
        } finally {
            setIsDeleting(false)
            setDeletingTip(null)
        }
    }

    // Fetch collection data for tips section - only when tab is active
    const {
        data: tipsCollectionResponse,
        isLoading: isCollectionLoading
    } = useQuery({
        queryKey: ['content-collection', collectionIdentifier, 'tips'],
        queryFn: async () => {
            return await api.getByIdentifier(collectionIdentifier, 'tips')
        },
        enabled: !!collectionIdentifier && isActive,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    // Fetch collection data for dos_donts section - only when tab is active
    const {
        data: dosDontsCollectionResponse
    } = useQuery({
        queryKey: ['content-collection', collectionIdentifier, 'dos_donts'],
        queryFn: async () => {
            return await api.getByIdentifier(collectionIdentifier, 'dos_donts')
        },
        enabled: !!collectionIdentifier && isActive,
        staleTime: HOURS_24,
        gcTime: HOURS_24
    })

    const tipsSections = useMemo(() => {
        if (!tipsCollectionResponse?.data?.sections) return []
        return tipsCollectionResponse.data.sections.filter(
            (section: Section) => section.section_type === 'tips'
        )
    }, [tipsCollectionResponse])

    const tipItems: TipItem[] = useMemo(() => {
        const items: TipItem[] = []
        tipsSections.forEach((section: Section) => {
            const sectionId = section.id
            const source = section.source
            section.blocks?.forEach((block, blockIndex) => {
                if (block.block_type === 'text' && (block.value?.content || block.value?.text)) {
                    const description = (block.value.content ?? block.value.text) as string
                    items.push({
                        id: block.id || `text-${sectionId}-${blockIndex}`,
                        category: (block.label as string) || 'Tip',
                        description: description || '',
                        sectionId,
                        blockId: block.id,
                        source,
                    })
                }
                if (block.block_type === 'text_list' && block.value?.items && Array.isArray(block.value.items)) {
                    const listItems = (block.value.items as unknown) as string[]
                    listItems.forEach((content, itemIndex) => {
                        items.push({
                            id: `list-${sectionId}-${blockIndex}-${itemIndex}`,
                            category: (block.label as string) || 'Tip',
                            description: typeof content === 'string' ? content : String(content),
                            sectionId,
                            source,
                        })
                    })
                }
            })
        })
        return items
    }, [tipsSections])

    const hasDosDonts = !!dosDontsCollectionResponse?.data?.sections?.some(
        (s: Section) => s.section_type === 'dos_donts'
    )

    // Tips section counts as empty only when there are no tips AND no dos/donts.
    // Gate on both queries actually returning data — when the tab isn't active
    // they're disabled (isLoading=false, data=undefined). Treating that as
    // "empty" would unmount the sub-tab and prevent it from ever fetching.
    useEffect(() => {
        if (!tipsCollectionResponse || !dosDontsCollectionResponse) return
        onEmptyChange?.(tipItems.length === 0 && !hasDosDonts)
    }, [tipsCollectionResponse, dosDontsCollectionResponse, tipItems.length, hasDosDonts, onEmptyChange])

    if (isCollectionLoading) {
        return <MustHaveSkeletonGrid variant="tip" />
    }

    const firstTipsSectionId = tipsSections[0]?.id ?? null

    return (
        <>
            <div className="flex flex-col gap-6 px-4 py-4 w-full">
                <div className="flex justify-between items-center px-4">
                    <p className="text-grey-0 font-semibold font-red-hat-display text-[24px] flex items-center gap-2">
                        Tips
                        <img src={BULB_ICON} alt="Tips" className="w-6 h-6" />
                    </p>

                    {isRimigoInternal && (
                        <button
                            type="button"
                            onClick={() => setIsAddTipModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-grey-4 bg-white text-grey-0 font-semibold font-red-hat-display hover:bg-grey-5 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add
                        </button>
                    )}
                </div>

                {tipsSections.length === 0 ? (
                    isRimigoInternal ? (
                        <div className="text-center py-12">
                            <Typography size="16" weight="medium" color="grey-1">
                                No tips in this collection.
                            </Typography>
                        </div>
                    ) : null
                ) : tipItems.length === 0 ? (
                    isRimigoInternal ? (
                        <div className="text-center py-12">
                            <Typography size="16" weight="medium" color="grey-1">
                                No tips added yet.
                            </Typography>
                        </div>
                    ) : null
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4  px-4">
                        {tipItems.map((tip, index) => (
                            <div
                                key={tip.id}
                                className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 rounded-xl bg-white border border-[#dfdde0] hover:border-grey-0 shadow-[0px_2px_8px_0px_#dfdde0] items-start justify-start group transition-colors"
                            >
                                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary-default-80 flex items-center justify-center font-semibold text-primary-default font-red-hat-display">
                                    {index + 1}
                                </div>
                                <div className="flex flex-col gap-[2px] flex-1 min-w-0">
                                    <p className="text-grey-0 font-red-hat-display text-[16px] font-medium">
                                        {tip.category}
                                    </p>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-grey-0 font-manrope text-[14px] font-medium text-grey-2">
                                            <MarkdownText text={tip.description} />
                                        </p>
                                    </div>
                                </div>
                                {isRimigoInternal && tip.sectionId && tip.source !== 'location_personalised' && (
                                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setEditingTip(tip)}
                                            className="p-1.5 text-grey-2 hover:text-primary-default hover:bg-grey-5 rounded-md transition-colors"
                                            title="Edit tip"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => setDeletingTip(tip)}
                                            className="p-1.5 text-grey-2 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                            title="Delete tip"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Dos & Don'ts section below tips. Hidden for consumers when
                    empty, but always shown to internal users so they can add. */}
                {(() => {
                    if (!hasDosDonts && !isRimigoInternal) return null
                    return (
                        <>
                            <div className="px-4">
                                <Divider className="my-4" />
                            </div>
                            <DosDontsTabContent
                                activeCollectionResponse={dosDontsCollectionResponse}
                                activeTab="dos_donts"
                                isCollectionLoading={false}
                                collectionIdentifier={collectionIdentifier}
                                onDosDontsUpdated={onDosDontsUpdated}
                                isRimigoInternal={isRimigoInternal}
                                collectionApi={api}
                            />
                        </>
                    )
                })()}
            </div>

            {/* Add Tip Modal */}
            {isRimigoInternal && (
                <AddTipModal
                    isOpen={isAddTipModalOpen}
                    onClose={() => setIsAddTipModalOpen(false)}
                    sectionId={firstTipsSectionId}
                    collectionIdentifier={collectionIdentifier ?? undefined}
                    onSuccess={onTipAdded}
                    queryClient={queryClient}
                    api={api}
                />
            )}

            {/* Edit Tip Modal */}
            {isRimigoInternal && editingTip && (
                <EditTipModal
                    isOpen={!!editingTip}
                    onClose={() => setEditingTip(null)}
                    tip={editingTip}
                    collectionIdentifier={collectionIdentifier}
                    queryClient={queryClient}
                />
            )}

            {/* Delete Confirmation Modal */}
            {isRimigoInternal && (
                <DeleteConfirmationModal
                    isOpen={!!deletingTip}
                    onClose={() => setDeletingTip(null)}
                    onConfirm={handleDeleteTip}
                    title="Delete Tip"
                    message={`Are you sure you want to delete this tip? This action cannot be undone.`}
                    isDeleting={isDeleting}
                />
            )}
        </>
    )
}

const generateRandomId = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

const generateRandomOrder = (): number => {
    return Math.floor(Math.random() * 1000) + 1
}

interface AddTipModalProps {
    isOpen: boolean
    onClose: () => void
    sectionId: string | null
    collectionIdentifier?: string
    onSuccess?: () => void
    queryClient: ReturnType<typeof useQueryClient>
    api: CollectionApi
}

const AddTipModal: React.FC<AddTipModalProps> = ({
    isOpen,
    onClose,
    collectionIdentifier,
    onSuccess,
    queryClient,
    api
}) => {
    const [category, setCategory] = useState('')
    const [description, setDescription] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    if (!isOpen) return null

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        const text = description.trim()
        if (!text) return
        if (!collectionIdentifier) {
            toast.error('Cannot add tip: collection not found.')
            return
        }
        setIsSubmitting(true)
        try {
            const payload = {
                id: generateRandomId(),
                section_type: 'tips',
                title: 'Tips',
                description: null,
                sections_order: generateRandomOrder(),
                entity_type: ENTITY_TYPE_TIPS,
                blocks: [
                    {
                        block_type: 'text',
                        label: category.trim() || 'Tip',
                        description: null,
                        value: { text }
                    }
                ]
            }
            await api.addSection(collectionIdentifier, payload)
            // eslint-disable-next-line no-console
            toast.success('Tip added successfully')
            setCategory('')
            setDescription('')
            // Invalidate tips query to refetch data
            queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier, 'tips'] })
            onSuccess?.()
            onClose()
        } catch {
            toast.error('Failed to add tip. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        setCategory('')
        setDescription('')
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={handleClose} aria-hidden />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 z-10">
                <div className="flex items-center justify-between p-6 border-b border-grey-4">
                    <h2 className="text-xl font-semibold font-red-hat-display text-grey-0">Add Tip</h2>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="p-1 hover:bg-grey-5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-grey-1" />
                    </button>
                </div>
                <form onSubmit={handleSave} className="p-6 flex flex-col gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-grey-0 mb-2 font-red-hat-display">
                            Category <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="e.g. Planning, Money, Navigation"
                            disabled={isSubmitting}
                            className="w-full px-4 py-2 border border-grey-4 rounded-lg bg-white text-grey-0 font-manrope focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-grey-0 mb-2 font-red-hat-display">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter the tip description"
                            rows={4}
                            disabled={isSubmitting}
                            className="w-full px-4 py-2 border border-grey-4 rounded-lg bg-white text-grey-0 font-manrope focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-grey-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-lg border border-grey-4 text-grey-0 font-semibold font-red-hat-display hover:bg-grey-5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!description.trim() || isSubmitting}
                            className="px-4 py-2 rounded-lg bg-primary-default text-white font-semibold font-red-hat-display hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Adding...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

/* ─────────────────────────────────────────────
   Edit Tip Modal
   ───────────────────────────────────────────── */

interface EditTipModalProps {
    isOpen: boolean
    onClose: () => void
    tip: TipItem
    collectionIdentifier: string
    queryClient: ReturnType<typeof useQueryClient>
}

const EditTipModal: React.FC<EditTipModalProps> = ({
    isOpen,
    onClose,
    tip,
    collectionIdentifier,
    queryClient,
}) => {
    const [category, setCategory] = useState(tip.category)
    const [description, setDescription] = useState(tip.description)
    const [isSubmitting, setIsSubmitting] = useState(false)

    if (!isOpen) return null

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        const text = description.trim()
        if (!text || !tip.sectionId) return
        setIsSubmitting(true)
        try {
            await contentCollectionApi.updateSectionBlocks(collectionIdentifier, tip.sectionId, [
                {
                    block_type: 'text',
                    label: category.trim() || 'Tip',
                    description: null,
                    value: { text },
                },
            ])
            toast.success('Tip updated')
            queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier, 'tips'] })
            onClose()
        } catch {
            toast.error('Failed to update tip')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 z-10">
                <div className="flex items-center justify-between p-6 border-b border-grey-4">
                    <h2 className="text-xl font-semibold font-red-hat-display text-grey-0">Edit Tip</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="p-1 hover:bg-grey-5 rounded-lg transition-colors disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5 text-grey-1" />
                    </button>
                </div>
                <form onSubmit={handleSave} className="p-6 flex flex-col gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-grey-0 mb-2 font-red-hat-display">
                            Category
                        </label>
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="e.g. Planning, Money, Navigation"
                            disabled={isSubmitting}
                            className="w-full px-4 py-2 border border-grey-4 rounded-lg bg-white text-grey-0 font-manrope focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent disabled:opacity-50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-grey-0 mb-2 font-red-hat-display">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter the tip description"
                            rows={4}
                            disabled={isSubmitting}
                            className="w-full px-4 py-2 border border-grey-4 rounded-lg bg-white text-grey-0 font-manrope focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent resize-none disabled:opacity-50"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-grey-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-lg border border-grey-4 text-grey-0 font-semibold font-red-hat-display hover:bg-grey-5 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!description.trim() || isSubmitting}
                            className="px-4 py-2 rounded-lg bg-primary-default text-white font-semibold font-red-hat-display hover:bg-primary-dark transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default TipsTabContent
