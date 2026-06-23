import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { toast } from 'sonner'

// Type for API with addSection method
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
}

interface AddLinkModalProps {
    isOpen: boolean
    onClose: () => void
    collectionIdentifier: string
    onSuccess?: () => void
    sectionType?: 'links' | 'visa' | 'sim' // Allow specifying section type, default to 'links'
    api?: CollectionApi // Optional API instance (defaults to contentCollectionApi)
}

const AddLinkModal: React.FC<AddLinkModalProps> = ({ isOpen, onClose, collectionIdentifier, onSuccess, sectionType = 'links', api = contentCollectionApi }) => {
    const [title, setTitle] = useState<string>('')
    const [url, setUrl] = useState<string>('')
    const [description, setDescription] = useState<string>('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setTitle('')
            setUrl('')
            setDescription('')
        }
    }, [isOpen])

    const generateRandomId = (): string => {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    }

    const generateRandomOrder = (): number => {
        return Math.floor(Math.random() * 1000) + 1
    }

    const validateUrl = (urlString: string): boolean => {
        try {
            const urlObj = new URL(urlString)
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
        } catch {
            return false
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!title.trim()) {
            toast.error('Title is required')
            return
        }

        if (!url.trim()) {
            toast.error('URL is required')
            return
        }

        // Validate URL format
        if (!validateUrl(url.trim())) {
            toast.error('Please enter a valid URL (must start with http:// or https://)')
            return
        }

        setIsSubmitting(true)

        try {
            // Create a new section with the link
            const sectionPayload = {
                id: generateRandomId(),
                section_type: sectionType,
                title: sectionType === 'visa' ? 'Visa' : sectionType === 'sim' ? 'SIM' : 'Links',
                description: description.trim() || null,
                sections_order: generateRandomOrder(),
                entity_type: sectionType,
                blocks: [
                    {
                        block_type: 'links',
                        label: title.trim(),
                        description: description.trim() || null,
                        value: {
                            text: description.trim() || null,
                            items: [
                                {
                                    url: url.trim(),
                                    platform: null
                                }
                            ]
                        }
                    }
                ]
            }

            await api.addSection(collectionIdentifier, sectionPayload)

            toast.success(sectionType === 'visa' ? 'Visa link added successfully' : sectionType === 'sim' ? 'SIM link added successfully' : 'Link added successfully')

            // Reset form
            setTitle('')
            setUrl('')
            setDescription('')

            onSuccess?.()
            onClose()
        } catch (error) {
            console.error('Error adding link:', error)
            toast.error('Failed to add link. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        if (!isSubmitting) {
            setTitle('')
            setUrl('')
            setDescription('')
            onClose()
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 z-10">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-grey-4">
                    <h2 className="text-xl font-semibold font-red-hat-display text-grey-0">
                        {sectionType === 'visa' ? 'Add New Visa Link' : sectionType === 'sim' ? 'Add New SIM Link' : 'Add New Link'}
                    </h2>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="p-1 hover:bg-grey-5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <X className="w-5 h-5 text-grey-1" />
                    </button>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="p-6">
                    <div className="flex flex-col gap-6">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-semibold text-grey-0 mb-2 font-red-hat-display">
                                Title <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                disabled={isSubmitting}
                                placeholder="e.g. Apply Online"
                                required
                                className="w-full px-4 py-2 border border-grey-4 rounded-lg bg-white text-grey-0 font-manrope focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* URL */}
                        <div>
                            <label className="block text-sm font-semibold text-grey-0 mb-2 font-red-hat-display">
                                Link URL <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                disabled={isSubmitting}
                                placeholder="https://example.com"
                                required
                                className="w-full px-4 py-2 border border-grey-4 rounded-lg bg-white text-grey-0 font-manrope focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-semibold text-grey-0 mb-2 font-red-hat-display">
                                Description <span className="text-grey-2 text-xs">(Optional)</span>
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                disabled={isSubmitting}
                                placeholder="Enter link description"
                                rows={4}
                                className="w-full px-4 py-2 border border-grey-4 rounded-lg bg-white text-grey-0 font-manrope focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-grey-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-lg border border-grey-4 text-grey-0 font-semibold font-red-hat-display hover:bg-grey-5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !title.trim() || !url.trim()}
                            className="px-4 py-2 rounded-lg bg-primary-default text-white font-semibold font-red-hat-display hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSubmitting ? 'Adding...' : sectionType === 'visa' ? 'Add Visa Link' : sectionType === 'sim' ? 'Add SIM Link' : 'Add Link'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddLinkModal
