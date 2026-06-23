import { useState, useRef, useEffect } from 'react'
import { Ellipsis, Trash2 } from 'lucide-react'

interface RemoveSectionButtonProps {
    onClick: (e: React.MouseEvent) => void
    disabled?: boolean
}

export default function RemoveSectionButton({ onClick, disabled = false }: RemoveSectionButtonProps) {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!isOpen) return
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen])

    return (
        <div ref={menuRef} className="absolute top-2.5 right-2.5 z-10">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen(!isOpen)
                }}
                disabled={disabled}
                className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white hover:shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Section options">
                <Ellipsis className="h-4 w-4 text-grey-0" />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-[10px] shadow-lg border border-grey-4/60 overflow-hidden min-w-[140px]">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsOpen(false)
                            onClick(e)
                        }}
                        disabled={disabled}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-secondary-red hover:bg-secondary-red-80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="text-xs font-semibold font-red-hat-display">Remove</span>
                    </button>
                </div>
            )}
        </div>
    )
}
