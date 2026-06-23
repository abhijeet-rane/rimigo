import { useState, useRef, useCallback, useEffect } from 'react'
import { Pencil } from 'lucide-react'

interface InlineTextEditProps {
    value: string
    onSave: (newValue: string) => void
    canEdit: boolean
    className?: string
    placeholder?: string
    maxLength?: number
    /** 'title' renders as single line, 'notes' renders as multiline */
    variant?: 'title' | 'notes'
}

/**
 * Inline text editor — tap on text to edit in place.
 * Shows a subtle pencil icon on hover. Saves on blur or Enter.
 */
export default function InlineTextEdit({
    value,
    onSave,
    canEdit,
    className = '',
    placeholder = 'Add text...',
    maxLength = 200,
    variant = 'title',
}: InlineTextEditProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editValue, setEditValue] = useState(value)
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

    useEffect(() => {
        if (isEditing) {
            setEditValue(value)
            // Focus after render
            requestAnimationFrame(() => inputRef.current?.focus())
        }
    }, [isEditing, value])

    const handleSave = useCallback(() => {
        const trimmed = editValue.trim()
        if (trimmed && trimmed !== value) {
            onSave(trimmed)
        }
        setIsEditing(false)
    }, [editValue, value, onSave])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSave()
        }
        if (e.key === 'Escape') {
            setIsEditing(false)
        }
    }, [handleSave])

    if (!canEdit) {
        return <span className={className}>{value}</span>
    }

    if (isEditing) {
        const sharedClass = `w-full bg-white border border-violet-300 rounded-md px-1.5 py-0.5 text-grey-0 focus:outline-none focus:ring-1 focus:ring-violet-400 ${className}`

        if (variant === 'notes') {
            return (
                <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    maxLength={maxLength}
                    rows={2}
                    className={`${sharedClass} resize-none`}
                    placeholder={placeholder}
                />
            )
        }

        return (
            <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                maxLength={maxLength}
                className={sharedClass}
                placeholder={placeholder}
            />
        )
    }

    return (
        <span
            onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
            }}
            className={`${className} cursor-pointer group/edit inline-flex items-center gap-1 hover:text-violet-700 transition-colors`}
        >
            {value || <span className="text-grey-3 italic">{placeholder}</span>}
            <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/edit:opacity-50 transition-opacity shrink-0" />
        </span>
    )
}
