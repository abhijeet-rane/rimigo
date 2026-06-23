import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { contentCollectionApi } from '../api/contentCollectionApi'
import { toast } from 'sonner'

interface AddSectionModalProps {
    isOpen: boolean
    onClose: () => void
    collectionIdentifier: string
    onSuccess?: () => void
    existingSectionTypes?: string[] // Array of section_type values that already exist
}

const SECTION_TYPES = [
    { value: 'overview', label: 'Overview' },
    { value: 'visa', label: 'Visa' },
    { value: 'experience', label: 'Experience' },
    { value: 'stays', label: 'Stays' },
    { value: 'sim', label: 'SIM' },
    { value: 'links', label: 'Links' },
    { value: 'itinerary', label: 'Itinerary' },
    { value: 'tips', label: 'Tips' },
    { value: 'dos_donts', label: "Dos & Don'ts" },
    { value: 'restaurant', label: 'Food' }
]

const AddSectionModal: React.FC<AddSectionModalProps> = ({ isOpen, onClose, collectionIdentifier, onSuccess, existingSectionTypes = [] }) => {
    const [sectionType, setSectionType] = useState<string>('')
    const [title, setTitle] = useState<string>('')
    const [description, setDescription] = useState<string>('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Filter out section types that already exist
    const availableSectionTypes = SECTION_TYPES.filter((type) => !existingSectionTypes.includes(type.value))

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            // Set default to first available section type
            const filteredTypes = SECTION_TYPES.filter((type) => !existingSectionTypes.includes(type.value))
            const defaultType = filteredTypes[0]
            if (defaultType) {
                setSectionType(defaultType.value)
                setTitle(defaultType.label)
            } else {
                setSectionType('')
                setTitle('')
            }
            setDescription('')
        }
    }, [isOpen, existingSectionTypes])

    // Prepopulate title when section type changes (only if title matches a section type label or is empty)
    useEffect(() => {
        if (isOpen && sectionType) {
            const filteredTypes = SECTION_TYPES.filter((type) => !existingSectionTypes.includes(type.value))
            const allTypeLabels = filteredTypes.map((type) => type.label)
            const selectedType = filteredTypes.find((type) => type.value === sectionType)

            // Only update if title is empty or matches one of the section type labels
            if (!title.trim() || allTypeLabels.includes(title.trim())) {
                if (selectedType) {
                    setTitle(selectedType.label)
                }
            }
        }
    }, [sectionType, isOpen, existingSectionTypes, title])

    if (!isOpen) return null

    const generateRandomId = (): string => {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    }

    const generateRandomOrder = (): number => {
        return Math.floor(Math.random() * 1000) + 1
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!title.trim()) {
            toast.error('Title is required')
            return
        }

        setIsSubmitting(true)

        try {
            const isDosDonts = sectionType === 'dos_donts'
            const blocks = isDosDonts
                ? [
                      { block_type: 'text_list', label: 'DOs', value: { items: [] as string[] } },
                      { block_type: 'text_list', label: "DON'Ts", value: { items: [] as string[] } }
                  ]
                : []

            const sectionTypesWithEntityType = ['links', 'sim', 'visa', 'tips', 'dos_donts', 'restaurant']
            const payload: {
                id: string
                section_type: string
                title: string
                description: string | null
                sections_order: number
                blocks: unknown[]
                entity_type?: string
            } = {
                id: generateRandomId(),
                section_type: sectionType,
                title: isDosDonts ? 'Travel Dos & Don\'ts' : title.trim(),
                description: description.trim() || null,
                sections_order: generateRandomOrder(),
                blocks
            }
            if (sectionTypesWithEntityType.includes(sectionType)) {
                payload.entity_type = sectionType
            }

            await contentCollectionApi.addSection(collectionIdentifier, payload)

            // If creating overview section, also call metadata API with empty object
            if (sectionType === 'overview') {
                await contentCollectionApi.createContentCollectionMetadata(collectionIdentifier, {})
            }

            toast.success('Section added successfully')

            // Reset form
            setTitle('')
            setDescription('')
            setSectionType('visa')

            onSuccess?.()
            onClose()
        } catch (error) {
            console.error('Error adding section:', error)
            toast.error('Failed to add section. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        if (!isSubmitting) {
            setTitle('')
            setDescription('')
            setSectionType('visa')
            onClose()
        }
    }

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
                    <h2 className="text-xl font-semibold font-red-hat-display text-grey-0">Add New Section</h2>
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
                        {/* Section Type */}
                        <div>
                            <label className="block text-sm font-semibold text-grey-0 mb-2 font-red-hat-display">
                                Section Type <span className="text-red-500">*</span>
                            </label>
                            {availableSectionTypes.length === 0 ? (
                                <div className="w-full px-4 py-2 border border-grey-4 rounded-lg bg-grey-5 text-grey-2 font-manrope">
                                    All section types have been added
                                </div>
                            ) : (
                                <select
                                    value={sectionType}
                                    onChange={(e) => setSectionType(e.target.value)}
                                    disabled={isSubmitting || availableSectionTypes.length === 0}
                                    className="w-full px-4 py-2 border border-grey-4 rounded-lg bg-white text-grey-0 font-manrope focus:outline-none focus:ring-2 focus:ring-primary-default focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed">
                                    {availableSectionTypes.map((type) => (
                                        <option
                                            key={type.value}
                                            value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

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
                                placeholder="Enter section title"
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
                                placeholder="Enter section description"
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
                            disabled={isSubmitting || !title.trim() || availableSectionTypes.length === 0}
                            className="px-4 py-2 rounded-lg bg-primary-default text-white font-semibold font-red-hat-display hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSubmitting ? 'Adding...' : 'Add Section'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default AddSectionModal
