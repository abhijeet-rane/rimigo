import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'

interface SaveVersionModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (params: { name: string; note: string }) => Promise<void>
    isSaving?: boolean
}

export default function SaveVersionModal({ isOpen, onClose, onSave, isSaving = false }: SaveVersionModalProps) {
    const [name, setName] = useState('')
    const [note, setNote] = useState('')
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Reset state and focus when opening
    useEffect(() => {
        if (isOpen) {
            setName('')
            setNote('')
            setError(null)
            // Default name suggestion: "Saved on <Mon DD, h:mm A>"
            const now = new Date()
            const suggested = `Saved on ${now.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
            })}, ${now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
            setName(suggested)
            setTimeout(() => inputRef.current?.select(), 50)
        }
    }, [isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) {
            setError('Please give your version a name')
            return
        }
        setError(null)
        try {
            await onSave({ name: trimmed, note: note.trim() })
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save version')
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 z-[200]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[calc(100vw-32px)] max-w-md bg-natural-white rounded-2xl shadow-2xl"
                    >
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h2 className="text-[18px] font-semibold font-manrope text-grey-0">
                                        Save a version
                                    </h2>
                                    <p className="text-[13px] text-grey-1 mt-1 font-manrope">
                                        Capture the current state of your tripboard so you can return to it later.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-1 rounded-full hover:bg-grey-5 transition-colors"
                                    aria-label="Close"
                                >
                                    <X className="w-4 h-4 text-grey-1" />
                                </button>
                            </div>

                            <label className="block">
                                <span className="block text-[13px] font-medium text-grey-0 mb-1.5 font-manrope">
                                    Version name
                                </span>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={200}
                                    placeholder="e.g. After adding Day 3 stops"
                                    disabled={isSaving}
                                    className="w-full px-3 py-2.5 rounded-lg border border-feature-card-border focus:border-primary-default focus:ring-2 focus:ring-primary-default/20 outline-none text-[14px] font-manrope text-grey-0 disabled:opacity-60"
                                />
                            </label>

                            <label className="block mt-4">
                                <span className="block text-[13px] font-medium text-grey-0 mb-1.5 font-manrope">
                                    Note <span className="text-grey-2 font-normal">(optional)</span>
                                </span>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    maxLength={2000}
                                    rows={3}
                                    placeholder="What's special about this version?"
                                    disabled={isSaving}
                                    className="w-full px-3 py-2.5 rounded-lg border border-feature-card-border focus:border-primary-default focus:ring-2 focus:ring-primary-default/20 outline-none text-[14px] font-manrope text-grey-0 resize-none disabled:opacity-60"
                                />
                            </label>

                            {error && (
                                <p className="mt-3 text-[13px] text-red-500 font-manrope">{error}</p>
                            )}

                            <div className="flex items-center justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-lg text-[14px] font-medium font-manrope text-grey-0 hover:bg-grey-5 transition-colors disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-4 py-2 rounded-lg text-[14px] font-medium font-manrope text-natural-white bg-primary-default hover:bg-primary-default/90 transition-colors disabled:opacity-60 flex items-center gap-2"
                                >
                                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {isSaving ? 'Saving…' : 'Save version'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
