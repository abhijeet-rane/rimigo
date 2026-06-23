import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Section, ContentCollection } from '../types/contentCollection'
import type { ApiResponse } from '../types/contentCollection'
import CustomShimmer from '@/components/shared/Shimmer'
import { toast } from 'sonner'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { DosDonts } from '@/components/shared/DosDonts'

type DosDontsApi = {
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
    addSection: (
        collectionIdentifier: string,
        payload: {
            id: string
            section_type: string
            title: string
            description?: string | null
            sections_order: number
            blocks: unknown[]
            metadata?: Record<string, unknown>
            entity_type?: string
        }
    ) => Promise<unknown>
}

const generateRandomId = (): string =>
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
const generateRandomOrder = (): number => Math.floor(Math.random() * 1000) + 1

interface DosDontsTabContentProps {
    activeCollectionResponse: ApiResponse<ContentCollection> | undefined
    activeTab: string | null
    isCollectionLoading: boolean
    collectionIdentifier?: string
    onDosDontsUpdated?: () => void
    isRimigoInternal?: boolean
    collectionApi?: DosDontsApi
}

const DosDontsTabContent: React.FC<DosDontsTabContentProps> = ({
    activeCollectionResponse,
    activeTab,
    isCollectionLoading,
    collectionIdentifier,
    onDosDontsUpdated,
    isRimigoInternal = false,
    collectionApi = contentCollectionApi
}) => {
    const queryClient = useQueryClient()
    const [addModal, setAddModal] = useState<'do' | 'dont' | null>(null)
    const [newItemText, setNewItemText] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const dosDontsSections = useMemo(() => {
        if (activeTab !== 'dos_donts' || !activeCollectionResponse?.data?.sections) return []
        return activeCollectionResponse.data.sections.filter(
            (section: Section) => section.section_type === 'dos_donts'
        )
    }, [activeCollectionResponse, activeTab])

    // Identify the LP-master section (read-only) and the saved section (editable).
    // We render BOTH together: master items first (read-only), then saved items (× removable).
    const savedSection = dosDontsSections.find((s: Section) => s.source !== 'location_personalised')
    const masterSection = dosDontsSections.find((s: Section) => s.source === 'location_personalised')

    // The "primary" section drives sectionId/blockIds for add/remove operations:
    // prefer the saved section if it exists; else master.
    const section = (savedSection || masterSection) as Section | undefined
    const sectionId = section?.id
    // True when there is no saved section at all → adds must create one.
    const isMasterOnly = !savedSection

    // Pull DOs/DONTs items from a section's blocks.
    const extractItems = (sec: Section | undefined): { dos: string[]; donts: string[]; dosBlockId?: string; dontsBlockId?: string } => {
        const blocks = sec?.blocks ?? []
        const dosBlock = blocks.find(
            (b) => b.block_type === 'text_list' && (b.label as string)?.toLowerCase().replace(/\s/g, '') === 'dos'
        )
        const dontsBlock = blocks.find(
            (b) =>
                b.block_type === 'text_list' &&
                (b.label as string)?.toLowerCase().replace(/'|\s/g, '').startsWith('dont')
        )
        const arr = (b: typeof dosBlock): string[] => {
            const items = b?.value?.items
            return Array.isArray(items) ? ((items as unknown) as string[]) : []
        }
        return { dos: arr(dosBlock), donts: arr(dontsBlock), dosBlockId: dosBlock?.id, dontsBlockId: dontsBlock?.id }
    }

    const masterParts = useMemo(() => extractItems(masterSection), [masterSection])
    const savedParts = useMemo(() => extractItems(savedSection), [savedSection])

    // Combined arrays for display: master items first (read-only), saved items after (× removable).
    const dosItems = useMemo(() => [...masterParts.dos, ...savedParts.dos], [masterParts.dos, savedParts.dos])
    const dontsItems = useMemo(() => [...masterParts.donts, ...savedParts.donts], [masterParts.donts, savedParts.donts])

    // Indices where saved items begin — passed to <DosDonts> so master items don't get an × button.
    const removableDosFromIndex = masterParts.dos.length
    const removableDontsFromIndex = masterParts.donts.length

    const handleAddItem = async (kind: 'do' | 'dont') => {
        const text = newItemText.trim()
        if (!text || !collectionIdentifier) {
            if (!collectionIdentifier) toast.error('Collection not found.')
            return
        }
        setIsSubmitting(true)
        setAddModal(null)
        setNewItemText('')
        try {
            if (isMasterOnly || !sectionId) {
                // Only LP-master is showing (or nothing yet). Create a fresh saved
                // dos_donts section that owns the new item — subsequent reads will
                // surface it as source="custom" so it's editable from here on.
                const payload = {
                    id: generateRandomId(),
                    section_type: 'dos_donts',
                    title: "Travel Dos & Don'ts",
                    description: null,
                    sections_order: generateRandomOrder(),
                    entity_type: 'dos_donts',
                    blocks: [
                        {
                            block_type: 'text_list',
                            label: 'DOs',
                            value: { items: kind === 'do' ? [text] : [] },
                        },
                        {
                            block_type: 'text_list',
                            label: "DON'Ts",
                            value: { items: kind === 'dont' ? [text] : [] },
                        },
                    ],
                }
                await collectionApi.addSection(collectionIdentifier, payload)
            } else {
                // Saved section already exists — append the new item via updateBlock.
                // Operate on the saved section's items only (not the combined display list).
                const blockId = kind === 'do' ? savedParts.dosBlockId : savedParts.dontsBlockId
                if (!blockId) {
                    toast.error('Block not found. Cannot add.')
                    return
                }
                const updatedItems = kind === 'do' ? [...savedParts.dos, text] : [...savedParts.donts, text]
                await collectionApi.updateBlock(collectionIdentifier, sectionId, blockId, { value: { items: updatedItems } })
            }
            toast.success(kind === 'do' ? 'DO added' : "DON'T added")
            queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier, 'dos_donts'] })
            onDosDontsUpdated?.()
        } catch {
            toast.error('Failed to add. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRemoveItem = async (kind: 'do' | 'dont', combinedIndex: number) => {
        if (!collectionIdentifier || !savedSection?.id) return
        // Combined index includes master items first; map back to saved-only index.
        const offset = kind === 'do' ? masterParts.dos.length : masterParts.donts.length
        const savedIndex = combinedIndex - offset
        const savedItems = kind === 'do' ? savedParts.dos : savedParts.donts
        if (savedIndex < 0 || savedIndex >= savedItems.length) {
            // Defensive — × shouldn't have been clickable on a master item.
            return
        }
        const blockId = kind === 'do' ? savedParts.dosBlockId : savedParts.dontsBlockId
        if (!blockId) {
            toast.error('Block not found. Cannot remove.')
            return
        }
        setIsSubmitting(true)
        try {
            const updatedItems = savedItems.filter((_, i) => i !== savedIndex)
            await collectionApi.updateBlock(collectionIdentifier, savedSection.id, blockId, { value: { items: updatedItems } })
            toast.success('Item removed')
            queryClient.invalidateQueries({ queryKey: ['content-collection', collectionIdentifier, 'dos_donts'] })
            onDosDontsUpdated?.()
        } catch {
            toast.error('Failed to remove. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isCollectionLoading) {
        return (
            <div className="flex flex-col gap-6 p-4 min-h-screen">
                <CustomShimmer height={200} radius={16} className="w-full" />
                <CustomShimmer height={200} radius={16} className="w-full" />
            </div>
        )
    }

    // Consumers see nothing when empty; internal users still get the section
    // (with empty lists + Add buttons) so they can populate it.
    if (dosDontsSections.length === 0 && !isRimigoInternal) {
        return null
    }

    return (
        <>
            <div className="px-4">
                <DosDonts
                    id="dosDontsSection"
                    title={section?.title || "Travel Dos & Don'ts"}
                    subtitle="Quick guidance for your trip"
                    dosItems={dosItems}
                    dontsItems={dontsItems}
                    showAddButtons={!!(collectionIdentifier && isRimigoInternal)}
                    isRimigoInternal={isRimigoInternal}
                    onAddDo={() => setAddModal('do')}
                    onAddDont={() => setAddModal('dont')}
                    onRemoveDo={
                        collectionIdentifier && savedSection
                            ? (index: number) => handleRemoveItem('do', index)
                            : undefined
                    }
                    onRemoveDont={
                        collectionIdentifier && savedSection
                            ? (index: number) => handleRemoveItem('dont', index)
                            : undefined
                    }
                    removableDosFromIndex={removableDosFromIndex}
                    removableDontsFromIndex={removableDontsFromIndex}
                    isSubmitting={isSubmitting}
                />
            </div>

            {/* Add DO / Add DON'T modal */}
            {addModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => {
                            setAddModal(null)
                            setNewItemText('')
                        }}
                        aria-hidden
                    />
                    <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 z-10 p-6">
                        <h3 className="text-lg font-semibold font-red-hat-display text-grey-0 mb-4">
                            {addModal === 'do' ? 'Add DO' : "Add DON'T"}
                        </h3>
                        <input
                            type="text"
                            value={newItemText}
                            onChange={(e) => setNewItemText(e.target.value)}
                            placeholder={addModal === 'do' ? 'e.g. Be punctual for trains' : "e.g. Don't tip in restaurants"}
                            className="w-full px-4 py-2 border border-grey-4 rounded-lg bg-white text-grey-0 font-manrope focus:outline-none focus:ring-2 focus:ring-primary-default mb-4"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setAddModal(null)
                                    setNewItemText('')
                                }}
                                className="px-4 py-2 rounded-lg border border-grey-4 text-grey-0 font-semibold hover:bg-grey-5"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAddItem(addModal)}
                                disabled={!newItemText.trim() || isSubmitting}
                                className="px-4 py-2 rounded-lg bg-primary-default text-white font-semibold hover:bg-primary-dark disabled:opacity-50"
                            >
                                {isSubmitting ? 'Adding...' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default DosDontsTabContent
