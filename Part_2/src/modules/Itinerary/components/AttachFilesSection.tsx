import { useState, forwardRef, useImperativeHandle, useEffect } from 'react'
import DropdownSection from './DropDownSection'
import Typography from '@/components/shared/Typography'
import { Plus } from 'lucide-react'
import { FILE_TYPES, FileType } from '../types/FileTypes'
import { toast } from 'sonner'
import AddAttachmentForm from './AddAttachmentForm'
import AttachedItemCard from './AttachedItemCard'
import AddSlotLabel from './AddSlotLabel'

interface AttachedItem {
    id: string
    type: FileType
    label: string
    linkUrl?: string
    linkPreview?: LinkPreviewData
    file?: {
        name: string
        size: number
        uploadedUrl: string
    }
}

interface LinkPreviewData {
    title: string
    description?: string
    image?: string
    favicon?: string
}

/* 👇 Backend attachment shape */
interface InitialAttachment {
    id: string
    type: string
    name: string
    url: string
}

export interface AttachmentPayload {
    type: string
    name: string
    url: string
}

export interface AttachFilesRef {
    getAttachments: () => AttachmentPayload[]
    setAttachments: (items: AttachedItem[]) => void
}

interface AttachFilesSectionProps {
    defaultOpen?: boolean // Add this
    onOpenChange?: (open: boolean) => void
    initialAttachments?: InitialAttachment[]
}

const AttachFilesSection = forwardRef<AttachFilesRef, AttachFilesSectionProps>(({ initialAttachments, defaultOpen, onOpenChange }, ref) => {
    const [attachedItems, setAttachedItems] = useState<AttachedItem[]>([])
    const [showAddForm, setShowAddForm] = useState(false)
    const [isOpen, setIsOpen] = useState(defaultOpen)
    /* ✅ PREFILL IN EDIT MODE */
    useEffect(() => {
        setIsOpen(defaultOpen)
    }, [defaultOpen])
    useEffect(() => {
        if (!initialAttachments || initialAttachments.length === 0) return

        const mapped: AttachedItem[] = initialAttachments
            .map((att) => {
                const fileType = FILE_TYPES.find((t) => t.value === att.type)

                if (!fileType) return null
                return {
                    id: att.id,
                    type: fileType,
                    label: att.name,
                    linkUrl: att.type === 'link' ? att.url : undefined,
                    file:
                        att.type !== 'link'
                            ? {
                                  name: att.url.split('/').pop() || att.name,
                                  size: 0,
                                  uploadedUrl: att.url
                              }
                            : undefined
                }
            })
            .filter(Boolean) as AttachedItem[]

        setAttachedItems(mapped)
    }, [initialAttachments])

    /* 🔁 Expose methods to parent */
    useImperativeHandle(ref, () => ({
        getAttachments: () =>
            attachedItems.map((item) => ({
                type: item.type.value,
                name: item.label,
                url: item.linkUrl || item.file?.uploadedUrl || ''
            })),
        setAttachments: (items: AttachedItem[]) => {
            setAttachedItems(items)
        }
    }))

    const isDuplicateLocalFile = (file: File) => {
        return attachedItems.some((item) => item.file?.name === file.name && item.file?.size === file.size)
    }

    const handleAddItem = (item: AttachedItem) => {
        setAttachedItems((prev) => [...prev, item])
        setShowAddForm(false)
    }

    const removeItem = (id: string) => {
        setAttachedItems((prev) => prev.filter((item) => item.id !== id))
        toast.success('Attachment removed')
    }
    const getAttachmentSummary = () => {
        if (attachedItems.length === 0) {
            return 'No attachments · Click to add'
        }

        const names = attachedItems.slice(0, 2).map((item) => item.label)

        const remaining = attachedItems.length - names.length

        return remaining > 0
            ? `${attachedItems.length} attachments · ${names.join(', ')} +${remaining}`
            : `${attachedItems.length} attachment${attachedItems.length > 1 ? 's' : ''} · ${names.join(', ')}`
    }
    return (
        <DropdownSection
            defaultOpen={isOpen}
            onOpenChange={(open) => {
                setIsOpen(open)
                onOpenChange?.(open) // Notify parent
            }}
            title="Attach files"
            selectedContent={
                <div className="flex items-center gap-2 truncate">
                    <Typography
                        size="12"
                        family="manrope"
                        weight="medium"
                        color={attachedItems.length > 0 ? 'grey-1' : 'grey-2'}
                        className="truncate">
                        {getAttachmentSummary()}
                    </Typography>
                </div>
            }>
            <div className="flex flex-col gap-4">
                {/* Attached Items */}
                {attachedItems.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                        {attachedItems.map((item) => (
                            <AttachedItemCard
                                key={item.id}
                                item={item}
                                onRemove={removeItem}
                            />
                        ))}
                    </div>
                )}

                {/* Add Attachment */}
                {showAddForm ? (
                    <div className="grid grid-cols-2">
                        <AddAttachmentForm
                            onAdd={handleAddItem}
                            onCancel={() => setShowAddForm(false)}
                            isDuplicateFile={isDuplicateLocalFile}
                        />
                    </div>
                ) : (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] border border-dashed border-primary-default hover:bg-primary-default/5 cursor-pointer transition-colors">
                        <Plus
                            size={16}
                            className="text-primary-default"
                        />
                        <AddSlotLabel
                            text="Add Attachment"
                            color="text-primary-default"
                        />
                    </button>
                )}
            </div>
        </DropdownSection>
    )
})

AttachFilesSection.displayName = 'AttachFilesSection'

export default AttachFilesSection

export type { AttachedItem, LinkPreviewData }
