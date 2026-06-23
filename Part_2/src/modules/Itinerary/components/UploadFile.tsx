import { useState, useCallback, useRef } from 'react'
import { Upload, X, Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { UploadFileToStorage } from '../api/UploadFileApi'

interface FileUploaderProps {
    mode?: string
    acceptedFileTypes?: string[]
    maxFileSize?: number // in bytes
}

interface FileWithProgress {
    file: File
    progress: number
    uploadedUrl: string | null
    isUploading: boolean
    error: string | null
}

export default function FileUploader({
    mode = 'PUBLIC',
    acceptedFileTypes = ['*/*'],
    maxFileSize = 50 * 1024 * 1024 // 50MB default
}: FileUploaderProps) {
    const [files, setFiles] = useState<FileWithProgress[]>([])
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [isCopied, setIsCopied] = useState<Record<number, boolean>>({})
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [visibility, setVisibility] = useState<string>(mode)

    const validateFile = (fileToValidate: File): { valid: boolean; error?: string } => {
        // Check file size
        if (fileToValidate.size > maxFileSize) {
            return {
                valid: false,
                error: `File "${fileToValidate.name}" is too large. File size must be less than ${(maxFileSize / (1024 * 1024)).toFixed(0)}MB`
            }
        }

        // Check file type if specific types are specified
        if (acceptedFileTypes.length > 0 && !acceptedFileTypes.includes('*/*')) {
            const fileType = fileToValidate.type
            const isAccepted = acceptedFileTypes.some((type) => {
                if (type.endsWith('/*')) {
                    const baseType = type.split('/')[0]
                    return fileType.startsWith(`${baseType}/`)
                }
                return fileType === type
            })

            if (!isAccepted) {
                return {
                    valid: false,
                    error: `File "${fileToValidate.name}" has an invalid type. Accepted types: ${acceptedFileTypes.join(', ')}`
                }
            }
        }

        return { valid: true }
    }

    const handleFilesSelect = useCallback(
        (selectedFiles: File[]) => {
            if (selectedFiles.length === 0) return

            const validFiles: FileWithProgress[] = []
            const errors: string[] = []

            selectedFiles.forEach((file) => {
                const validation = validateFile(file)
                if (validation.valid) {
                    // Check for duplicates
                    const isDuplicate = files.some((f) => f.file.name === file.name && f.file.size === file.size)
                    if (!isDuplicate) {
                        validFiles.push({
                            file,
                            progress: 0,
                            uploadedUrl: null,
                            isUploading: false,
                            error: null
                        })
                    }
                } else {
                    errors.push(validation.error || `Invalid file: ${file.name}`)
                }
            })

            if (errors.length > 0) {
                toast.error(errors.join('. '))
            }

            if (validFiles.length > 0) {
                setFiles((prev) => [...prev, ...validFiles])
                toast.success(`${validFiles.length} file(s) added successfully`)
            }
        },
        [acceptedFileTypes, maxFileSize, files]
    )

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || [])
        handleFilesSelect(selectedFiles)
        // Reset input to allow selecting the same files again
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setIsDragging(false)

        const droppedFiles = Array.from(e.dataTransfer.files || [])
        handleFilesSelect(droppedFiles)
    }

    const handleRemoveFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index))
    }

    const handleClearAll = () => {
        setFiles([])
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleAddMoreFiles = () => {
        fileInputRef.current?.click()
    }

    const handleSubmit = async () => {
        if (files.length === 0) {
            toast.error('Please select at least one file to upload')
            return
        }

        setIsUploading(true)

        // Get files that need to be uploaded
        const filesToUpload = files.filter((f) => !f.uploadedUrl)
        let successCount = 0
        let failureCount = 0

        // Upload files sequentially to avoid overwhelming the server
        for (let i = 0; i < filesToUpload.length; i++) {
            const fileWithProgress = filesToUpload[i]
            const originalIndex = files.findIndex((f) => f.file.name === fileWithProgress.file.name && f.file.size === fileWithProgress.file.size)

            // Update state to mark file as uploading
            setFiles((prev) => prev.map((f, idx) => (idx === originalIndex ? { ...f, isUploading: true, progress: 0, error: null } : f)))

            try {
                await UploadFileToStorage(fileWithProgress.file, visibility, {
                    onUploadProgress: (progress) => {
                        setFiles((prev) => prev.map((f, idx) => (idx === originalIndex ? { ...f, progress } : f)))
                    },
                    onUploadSuccess: (objectAccessUrl) => {
                        setFiles((prev) =>
                            prev.map((f, idx) =>
                                idx === originalIndex
                                    ? {
                                          ...f,
                                          uploadedUrl: objectAccessUrl,
                                          progress: 100,
                                          isUploading: false
                                      }
                                    : f
                            )
                        )
                        successCount++
                    },
                    onUploadFailure: (error) => {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to upload file. Please try again.'
                        setFiles((prev) =>
                            prev.map((f, idx) =>
                                idx === originalIndex
                                    ? {
                                          ...f,
                                          error: errorMessage,
                                          isUploading: false,
                                          progress: 0
                                      }
                                    : f
                            )
                        )
                        failureCount++
                        toast.error(`Failed to upload "${fileWithProgress.file.name}": ${errorMessage}`)
                    }
                })
            } catch (error) {
                // Error is already handled in the onUploadFailure callback
                console.error('Upload error:', error)
            }
        }

        // Show completion summary
        if (filesToUpload.length > 0) {
            toast.success(
                `Successfully uploaded ${successCount} out of ${filesToUpload.length} file(s)${failureCount > 0 ? ` (${failureCount} failed)` : ''}`
            )
        }

        setIsUploading(false)
    }

    const handleCopyUrl = async (index: number, url: string) => {
        if (!url) return

        try {
            await navigator.clipboard.writeText(url)
            setIsCopied((prev) => ({ ...prev, [index]: true }))
            toast.success('URL copied to clipboard')
            setTimeout(() => {
                setIsCopied((prev) => ({ ...prev, [index]: false }))
            }, 2000)
        } catch (error) {
            toast.success('Failed to copy URL to clipboard')
        }
    }

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
    }

    return (
        <div className="flex flex-col items-center justify-start min-h-screen p-6 pt-8 bg-gray-50">
            <Card className="w-full max-w-2xl p-8 space-y-6">
                <h1 className="text-3xl font-bold text-center text-gray-900">Upload Files To Cloud</h1>

                {/* File Upload Area */}
                <div
                    className={cn(
                        'border-2 border-dashed rounded-lg p-12 text-center transition-colors',
                        isDragging ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-white hover:border-gray-400',
                        files.length > 0 && 'border-purple-500'
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}>
                    {files.length > 0 ? (
                        <div className="space-y-4">
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {files.map((fileWithProgress, index) => (
                                    <div
                                        key={`${fileWithProgress.file.name}-${index}`}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                                            {fileWithProgress.uploadedUrl ? (
                                                <Check className="h-5 w-5 text-green-500 shrink-0" />
                                            ) : fileWithProgress.error ? (
                                                <X className="h-5 w-5 text-red-500 shrink-0" />
                                            ) : (
                                                <div className="h-5 w-5 shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{fileWithProgress.file.name}</p>
                                                <p className="text-xs text-gray-500">{formatFileSize(fileWithProgress.file.size)}</p>
                                                {fileWithProgress.isUploading && (
                                                    <div className="mt-2">
                                                        {/* <Progress
                                                            value={fileWithProgress.progress}
                                                            className="h-1"
                                                        /> */}
                                                        <p className="text-xs text-gray-500 mt-1">{fileWithProgress.progress}%</p>
                                                    </div>
                                                )}
                                                {fileWithProgress.error && <p className="text-xs text-red-500 mt-1">{fileWithProgress.error}</p>}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveFile(index)}
                                            className="text-red-600 hover:text-red-700 shrink-0 ml-2">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            {files.length > 0 && (
                                <div className="flex items-center justify-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddMoreFiles}
                                        className="text-primary-default hover:text-purple-700 border-purple-300 hover:border-purple-400">
                                        <Upload className="h-4 w-4 mr-2" />
                                        Add more files
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleClearAll}
                                        className="text-gray-600 hover:text-gray-700">
                                        Clear all
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Upload className="mx-auto h-16 w-16 text-gray-400" />
                            <div className="space-y-2">
                                <label
                                    htmlFor="file-upload"
                                    className="cursor-pointer text-primary-default hover:text-purple-500 font-medium">
                                    Click to upload
                                </label>
                                <p className="text-sm text-gray-600">or drag and drop</p>
                                <p className="text-xs text-gray-500">You can select multiple files</p>
                            </div>
                            <p className="text-xs text-gray-500">Max file size: {formatFileSize(maxFileSize)}</p>
                        </div>
                    )}
                    {/* File input - always in DOM so it can be triggered programmatically */}
                    <input
                        id="file-upload"
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        accept={acceptedFileTypes.join(',')}
                        onChange={handleFileInputChange}
                    />
                </div>

                {/* Visibility Selector */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-sm font-medium text-gray-700">Select Visibility</span>
                        <div className="w-56">
                            <Select
                                value={visibility}
                                onValueChange={(v) => setVisibility(v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select visibility" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PUBLIC">PUBLIC</SelectItem>
                                    <SelectItem value="PRIVATE">PRIVATE</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {visibility === 'PUBLIC' && (
                        <div className="text-xs border rounded-md p-3 bg-amber-50 text-amber-900 border-amber-200">
                            Note: Selecting public will make the object visible to all.
                        </div>
                    )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-center">
                    <Button
                        onClick={handleSubmit}
                        disabled={files.length === 0 || isUploading}
                        className="w-full sm:w-auto px-8">
                        {isUploading ? 'Uploading...' : 'UPLOAD ALL'}
                    </Button>
                </div>

                {/* URL Display and Copy */}
                {files.some((f) => f.uploadedUrl) && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-700">Uploaded URLs ({files.filter((f) => f.uploadedUrl).length}):</h3>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {files.map(
                                (fileWithProgress, index) =>
                                    fileWithProgress.uploadedUrl && (
                                        <div
                                            key={`url-${index}`}
                                            className="border rounded-lg p-4 bg-gray-50">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-gray-500 mb-1">{fileWithProgress.file.name}:</p>
                                                    <p className="text-sm text-gray-900 break-all font-mono">{fileWithProgress.uploadedUrl}</p>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleCopyUrl(index, fileWithProgress.uploadedUrl!)}
                                                    className="shrink-0">
                                                    {isCopied[index] ? (
                                                        <>
                                                            <Check className="h-4 w-4 mr-2" />
                                                            Copied
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="h-4 w-4 mr-2" />
                                                            Copy
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    )
                            )}
                        </div>
                    </div>
                )}
            </Card>
        </div>
    )
}
