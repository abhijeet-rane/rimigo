import React, { useState } from 'react'
import Typography from '@/components/shared/Typography'
import { Upload, ChevronDown, File, Image as ImageIcon, FileText } from 'lucide-react'
import { FILE_TYPES, FileType } from '../types/FileTypes'
import { UploadFileToStorage } from '../api/UploadFileApi'
import { toast } from 'sonner'
import { AttachedItem, LinkPreviewData } from './AttachFilesSection'
import AddSlotLabel from './AddSlotLabel'

interface AddAttachmentFormProps {
    onAdd: (item: AttachedItem) => void
    onCancel: () => void
    isDuplicateFile: (file: File) => boolean
}

const validateFile = (file: File): { valid: boolean; error?: string } => {
    const maxFileSize = 50 * 1024 * 1024 // 50MB

    if (file.size > maxFileSize) {
        return {
            valid: false,
            error: `File "${file.name}" is too large. Max size is 50MB`
        }
    }

    return { valid: true }
}

const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()

    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) {
        return (
            <ImageIcon
                size={20}
                className="text-blue-500"
            />
        )
    }
    if (['pdf'].includes(ext || '')) {
        return (
            <FileText
                size={20}
                className="text-red-500"
            />
        )
    }
    return (
        <File
            size={20}
            className="text-gray-500"
        />
    )
}

const fetchLinkPreview = async (url: string): Promise<LinkPreviewData | null> => {
    try {
        const urlObj = new URL(url)
        return {
            title: urlObj.hostname,
            description: `Preview of ${urlObj.hostname}`,
            favicon: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`
        }
    } catch {
        return null
    }
}

const AddAttachmentForm: React.FC<AddAttachmentFormProps> = ({ onAdd, onCancel, isDuplicateFile }) => {
    const [selectedType, setSelectedType] = useState<FileType | null>(null)
    const [label, setLabel] = useState('')
    const [linkUrl, setLinkUrl] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [filePreview, setFilePreview] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [isLabelAuto, setIsLabelAuto] = useState(true)

    const handleFileSelect = (files: FileList | null) => {
        if (!files || files.length === 0) return

        const file = files[0]
        const validation = validateFile(file)

        if (!validation.valid) {
            toast.error(validation.error)
            return
        }

        setSelectedFile(file)

        // Create preview for images
        if (file.type.startsWith('image/')) {
            const preview = URL.createObjectURL(file)
            setFilePreview(preview)
        } else {
            setFilePreview(null)
        }
    }

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault()
        e.stopPropagation()

        const files = e.dataTransfer.files
        if (files && files.length > 0) {
            handleFileSelect(files)
            e.dataTransfer.clearData()
        }
    }

    const resetForm = () => {
        setSelectedType(null)
        setLabel('')
        setIsLabelAuto(true)
        setLinkUrl('')
        setSelectedFile(null)
        if (filePreview) {
            URL.revokeObjectURL(filePreview)
        }
        setFilePreview(null)
        setDropdownOpen(false)
    }

    const handleAdd = async () => {
        // Validation
        if (!selectedType) {
            toast.error('Please select a type')
            return
        }

        if (!label.trim()) {
            toast.error('Please enter a label')
            return
        }

        const isLink = selectedType.value === 'link'

        if (isLink) {
            if (!linkUrl.trim()) {
                toast.error('Please enter a URL')
                return
            }

            try {
                new URL(linkUrl)
            } catch {
                toast.error('Please enter a valid URL')
                return
            }

            // Fetch link preview and add to list
            const preview = await fetchLinkPreview(linkUrl)

            onAdd({
                id: crypto.randomUUID(),
                type: selectedType,
                label,
                linkUrl,
                linkPreview: preview || undefined
            })

            toast.success('Link added successfully')
            resetForm()
        } else {
            // Handle file upload
            if (!selectedFile) {
                toast.error('Please select a file')
                return
            }
            if (isDuplicateFile(selectedFile)) {
                toast.error('This file is already attached')
                return
            }

            setIsUploading(true)

            try {
                await UploadFileToStorage(selectedFile, 'PUBLIC', {
                    onUploadProgress: (progress) => {
                        setUploadProgress(progress)
                    },
                    onUploadSuccess: (uploadedUrl) => {
                        onAdd({
                            id: crypto.randomUUID(),
                            type: selectedType!,
                            label,
                            file: {
                                name: selectedFile!.name,
                                size: selectedFile!.size,
                                uploadedUrl
                            }
                        })

                        toast.success('File uploaded successfully')
                        resetForm()
                        setIsUploading(false)
                        setUploadProgress(0)
                    },
                    onUploadFailure: (error) => {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to upload file'
                        toast.error(errorMessage)
                        setIsUploading(false)
                        setUploadProgress(0)
                    }
                })
            } catch (error) {
                console.error('Upload error:', error)
                toast.error('Failed to upload file')
                setIsUploading(false)
                setUploadProgress(0)
            }
        }
    }

    const isFormValid = () => {
        if (!selectedType || !label.trim()) return false

        if (selectedType.value === 'link') {
            return linkUrl.trim() !== ''
        } else {
            return selectedFile !== null
        }
    }

    return (
        <div className={`border border-grey-3 rounded-md p-4 flex flex-col gap-3 ${dropdownOpen ? 'mb-28' : 'mb-0'}`}>
            {/* Type and Label Row */}
            <div className="flex flex-row gap-2">
                {/* Type Dropdown */}
                <div className="flex flex-col gap-1 w-full">
                    <Typography
                        size="12"
                        family="manrope"
                        weight="medium"
                        color="grey-1">
                        Type *
                    </Typography>
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setDropdownOpen((p) => !p)}
                            className="w-full flex items-center rounded-sm justify-between px-3 cursor-pointer py-2 rounded-s border border-grey-3 bg-natural-white hover:border-grey-4 transition">
                            <AddSlotLabel text={selectedType?.label || 'Select type'} />

                            <ChevronDown
                                size={16}
                                className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                            />
                        </button>
                        {dropdownOpen && (
                            <div className="absolute top-full mt-1 w-full max-h-40 bg-natural-white border border-grey-4 rounded-sm shadow-lg overflow-y-auto z-10 custom-scrollbar">
                                {FILE_TYPES.map((type) => (
                                    <div
                                        key={type.value}
                                        onClick={() => {
                                            setSelectedType(type)
                                            setDropdownOpen(false)

                                            // Auto-fill label only if user hasn't customized it
                                            if (!label || isLabelAuto) {
                                                setLabel(type.label)
                                                setIsLabelAuto(true)
                                            }
                                        }}
                                        className="px-3 py-2 cursor-pointer hover:bg-grey-5 transition">
                                        <AddSlotLabel text={type.label} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Label Input */}
                <div className="flex flex-col gap-1 w-full">
                    <Typography
                        size="12"
                        family="manrope"
                        weight="medium"
                        color="grey-1">
                        Label *
                    </Typography>
                    <input
                        type="text"
                        placeholder="Ticket link"
                        value={label}
                        onChange={(e) => {
                            setLabel(e.target.value)
                            setIsLabelAuto(false)
                        }}
                        className="px-3 py-2 text-sm font-manrope rounded-sm border border-grey-3 bg-natural-white hover:border-grey-4 focus:outline-none focus:border-grey-2"
                    />
                </div>
            </div>

            {/* Link URL Input (if link type selected) */}
            {selectedType?.value === 'link' && (
                <div className="flex flex-col gap-1">
                    <Typography
                        size="12"
                        family="manrope"
                        weight="medium"
                        color="grey-1">
                        URL *
                    </Typography>
                    <input
                        type="url"
                        placeholder="Paste or enter link URL"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        className="px-3 py-2 text-sm rounded-sm border border-grey-3 bg-natural-white hover:border-grey-4 focus:outline-none focus:border-grey-2"
                    />
                </div>
            )}

            {/* File Upload (if file type selected) */}
            {selectedType && selectedType.value !== 'link' && (
                <div className="flex flex-col gap-2">
                    <Typography
                        size="12"
                        family="manrope"
                        weight="medium"
                        color="grey-1">
                        File *
                    </Typography>

                    {/* File Preview */}
                    {selectedFile && (
                        <div className="border border-grey-3 rounded-sm p-3 bg-natural-white flex items-center gap-3">
                            <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                                {filePreview ? (
                                    <img
                                        src={filePreview}
                                        alt={selectedFile.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    getFileIcon(selectedFile.name)
                                )}
                            </div>
                            <div className="flex flex-row items-center gap-2 min-w-0">
                                <Typography
                                    size="12"
                                    family="manrope"
                                    weight="medium"
                                    className="truncate">
                                    {selectedFile.name}
                                </Typography>
                                <Typography
                                    size="11"
                                    family="manrope"
                                    weight="medium"
                                    color="grey-2">
                                    {(selectedFile.size / 1024).toFixed(1)} KB
                                </Typography>

                                {/* Progress Bar */}
                                {isUploading && (
                                    <div className="mt-2">
                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                            <div
                                                className="bg-blue-600 h-1.5 rounded-full transition-all"
                                                style={{ width: `${uploadProgress}%` }}></div>
                                        </div>
                                        <Typography
                                            size="11"
                                            family="manrope"
                                            weight="medium"
                                            color="grey-2"
                                            className="mt-1">
                                            Uploading... {uploadProgress}%
                                        </Typography>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Upload Area */}
                    {!selectedFile && (
                        <label
                            onDragEnter={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                            }}
                            onDragOver={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                e.dataTransfer.dropEffect = 'copy'
                            }}
                            onDrop={handleDrop}
                            className="flex items-center justify-center gap-2 border border-dashed border-primary-default rounded-sm py-8 cursor-pointer transition">
                            <Upload
                                size={16}
                                className="text-primary-default"
                            />
                            <AddSlotLabel
                                text="Drag & drop or click to select file"
                                color="text-primary-default"
                            />

                            <input
                                type="file"
                                className="hidden"
                                onChange={(e) => handleFileSelect(e.target.files)}
                            />
                        </label>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 w-fit self-end-safe ">
                <button
                    onClick={() => {
                        resetForm()
                        onCancel()
                    }}
                    disabled={isUploading}
                    className="flex-1 px-4 py-2 rounded-sm font-medium text-sm font-manrope  cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                    Cancel
                </button>
                <button
                    onClick={handleAdd}
                    disabled={!isFormValid() || isUploading}
                    className={` flex-1 px-5 py-2 rounded-sm font-medium text-sm font-manrope ${
                        isFormValid() && !isUploading
                            ? 'bg-primary-default text-natural-white cursor-pointer'
                            : ' bg-grey-4 text-grey-3 cursor-not-allowed'
                    }`}>
                    {isUploading ? 'Uploading...' : 'Add'}
                </button>
            </div>
        </div>
    )
}

export default AddAttachmentForm
