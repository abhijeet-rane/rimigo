import Typography from '@/components/shared/Typography'
import { forwardRef, useImperativeHandle, useState, useEffect } from 'react'
import { SlotPayloadProvider } from './SlotPayloadProvider'
import { X } from 'lucide-react'
import DropdownSection from './DropDownSection'
import AddSlotLabel from './AddSlotLabel'

interface RemarksData {
    notes: string
    suggestions: string[]
}

interface RemarksSectionProps {
    initialData?: {
        notes?: string
        suggestions?: string[]
    }
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void // Add this

    onChange?: (data: RemarksData) => void
}

export const RemarksSection = forwardRef<SlotPayloadProvider, RemarksSectionProps>(
    ({ initialData, defaultOpen = false, onChange, onOpenChange }, ref) => {
        const [isOpen, setIsOpen] = useState(defaultOpen)
        const [notes, setNotes] = useState(initialData?.notes || '')
        const [suggestions, setSuggestions] = useState<string[]>(initialData?.suggestions || [])
        const [currentSuggestion, setCurrentSuggestion] = useState('')

        // Initialize once
        useEffect(() => {
            setNotes(initialData?.notes || '')
            setSuggestions(initialData?.suggestions || [])
        }, [])
        useEffect(() => {
            setIsOpen(defaultOpen)
        }, [defaultOpen])
        // Notify parent
        useEffect(() => {
            onChange?.({ notes, suggestions })
        }, [notes, suggestions, onChange])

        useImperativeHandle(ref, () => ({
            getPayload() {
                const trimmed = notes.trim()
                return {
                    notes: trimmed ? trimmed : null,
                    suggestions: suggestions.filter((s) => s.trim()).length > 0 ? suggestions : undefined
                }
            }
        }))

        const handleAddSuggestion = () => {
            const trimmedSuggestion = currentSuggestion.trim()
            if (!trimmedSuggestion) return
            if (suggestions.length >= 2) return

            setSuggestions([...suggestions, trimmedSuggestion])
            setCurrentSuggestion('')
        }

        const handleRemoveSuggestion = (index: number) => {
            setSuggestions(suggestions.filter((_, i) => i !== index))
        }

        const getSelectedContent = () => {
            const parts = []
            if (notes.trim()) parts.push('Notes added')
            if (suggestions.length > 0) parts.push(`${suggestions.length} suggestion${suggestions.length > 1 ? 's' : ''}`)

            if (parts.length === 0) return 'No remarks added'
            return parts.join(' • ')
        }

        const renderContent = () => (
            <div className="flex flex-col gap-4">
                {/* Notes Input */}
                <div className="flex flex-col gap-2">
                    <AddSlotLabel text={'Notes (Optional)'} />

                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add any additional notes or remarks"
                        rows={3}
                        className="text-sm font-manrope px-4 py-2 border border-grey-4 rounded-[12px] focus:outline-none focus:border-primary-default transition-colors resize-none placeholder:text-grey-3"
                    />
                </div>

                {/* Suggestions Input */}
                <div className="flex flex-col gap-2">
                    <AddSlotLabel text={'Suggestions (Max 2)'} />

                    {/* Display existing suggestions */}
                    {suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {suggestions.map((suggestion, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-grey-5 rounded-md">
                                    <AddSlotLabel text={suggestion} />

                                    <button
                                        onClick={() => handleRemoveSuggestion(index)}
                                        className="hover:bg-grey-4 rounded-full p-0.5">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add new suggestion */}
                    {suggestions.length < 2 && (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={currentSuggestion}
                                onChange={(e) => setCurrentSuggestion(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        handleAddSuggestion()
                                    }
                                }}
                                placeholder="Enter a suggestion"
                                className="text-sm font-manrope flex-1 h-10 px-4 border border-grey-4 rounded-[12px] focus:outline-none focus:border-primary-default transition-colors placeholder:text-grey-3"
                            />
                            <button
                                onClick={handleAddSuggestion}
                                disabled={!currentSuggestion.trim() || suggestions.length >= 2}
                                className="h-10 px-5 text-[13px] text-white rounded-[12px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-[0.98]"
                                style={{
                                    background: 'linear-gradient(90deg, #7011F6 0%, #4D1D91 100%)',
                                    fontFamily: "'Red Hat Display', sans-serif",
                                    fontWeight: 700,
                                    letterSpacing: '-0.01em',
                                    boxShadow: '0 2px 8px 0 rgba(112, 17, 246, 0.24)',
                                }}>
                                Add
                            </button>
                        </div>
                    )}

                    {suggestions.length >= 2 && (
                        <Typography
                            size="12"
                            className="text-grey-2">
                            Maximum 2 suggestions reached
                        </Typography>
                    )}
                </div>
            </div>
        )

        return (
            <DropdownSection
                title="Additional Information"
                selectedContent={getSelectedContent()}
                defaultOpen={isOpen}
                onOpenChange={(open) => {
                    setIsOpen(open)
                    onOpenChange?.(open) // Notify parent
                }}>
                {' '}
                {renderContent()}
            </DropdownSection>
        )
    }
)

RemarksSection.displayName = 'RemarksSection'
