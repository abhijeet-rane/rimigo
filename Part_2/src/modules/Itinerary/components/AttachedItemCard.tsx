import React from 'react'
import Typography from '@/components/shared/Typography'
import { X, File, Image as ImageIcon, FileText, ExternalLink } from 'lucide-react'
import { AttachedItem } from './AttachFilesSection'

interface AttachedItemCardProps {
    item: AttachedItem
    onRemove: (id: string) => void
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

const AttachedItemCard: React.FC<AttachedItemCardProps> = ({ item, onRemove }) => {
    return (
        <div className="border border-grey-4 rounded-md p-1 bg-natural-white flex flex-col  relative group">
            {/* Remove button */}
            <button
                onClick={() => onRemove(item.id)}
                className="absolute top-2 right-2 p-1 rounded-full bg-grey-5 cursor-pointer">
                <X
                    size={14}
                    className="text-grey-1"
                />
            </button>

            {/* Type badge and label */}
            <div className="flex flex-row gap-2 items-center  p-2   rounded w-fit">
                <Typography
                    className="px-2 p-1 rounded-md border w-fit border-grey-3 "
                    size="10"
                    weight="medium"
                    family="manrope"
                    color="grey-1">
                    {item.type.label}
                </Typography>
                {item.type.label !== item.label && (
                    <Typography
                        size="14"
                        family="manrope"
                        weight="semibold"
                        className="pr-6">
                        {item.label}
                    </Typography>
                )}
            </div>

            {/* Link Preview */}
            {item.linkUrl && (
                <div className="flex items-center gap-2 p-2  rounded-md">
                    {item.linkPreview?.favicon && (
                        <img
                            src={item.linkPreview.favicon}
                            alt="favicon"
                            className="w-6 h-6 rounded flex-shrink-0"
                        />
                    )}
                    <a
                        href={item.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 font-medium font-manrope text-xs text-primary-default hover:underline flex-1 min-w-0 ">
                        <span className="truncate">{item.linkPreview?.title || item.linkUrl}</span>
                        <ExternalLink
                            size={16}
                            className="flex-shrink-0"
                        />
                    </a>
                </div>
            )}

            {/* File Preview */}
            {/* File Preview */}
            {item.file && item.file.uploadedUrl && (
                <a
                    href={item.file.uploadedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-grey-5 transition group/file"
                    onClick={(e) => e.stopPropagation()}>
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                        {item.file.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i) ? (
                            <img
                                src={item.file.uploadedUrl}
                                alt={item.file.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            getFileIcon(item.file.name)
                        )}
                    </div>

                    <div className="flex flex-row items-center gap-2 min-w-0">
                        <Typography
                            size="12"
                            family="manrope"
                            weight="medium"
                            className="truncate">
                            {item.file.name}
                        </Typography>

                        <Typography
                            size="10"
                            family="manrope"
                            weight="medium"
                            color="grey-2">
                            {(item.file.size / 1024).toFixed(1)} KB
                        </Typography>

                        <ExternalLink
                            size={16}
                            className="text-grey-2  transition"
                        />
                    </div>
                </a>
            )}
        </div>
    )
}

export default AttachedItemCard
