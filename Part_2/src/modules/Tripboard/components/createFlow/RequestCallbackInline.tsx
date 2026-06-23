import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FormSection } from '@/modules/Premium/sections/FormSection'

export interface RequestCallbackInlineProps {
    /** Prompt shown above the button. */
    prompt?: string
    /** Current search text, passed to the callback form for context. */
    queryText?: string
}

/**
 * "Can't find it? → Request callback" prompt + modal. Reuses the Premium
 * `FormSection` (with `subscriptionIntent="destination_callback"`) — the same
 * callback form the MultiSelectDestinationPicker uses — so the create flow's
 * country/city search offers the identical request-callback experience.
 */
export function RequestCallbackInline({ prompt = "Can't find your destination?", queryText }: RequestCallbackInlineProps) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <div className="mt-2 flex flex-col items-center gap-2 border-t border-grey-4/50 pt-4 text-center">
                <span className="font-red-hat-display text-[14px] font-semibold text-grey-1">{prompt}</span>
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    className="w-fit min-w-40 cursor-pointer rounded-xl bg-gradient-to-r from-header-black to-black px-6 py-3 font-red-hat-display text-[15px] font-[645] text-white transition-all hover:opacity-90 active:scale-[0.98]">
                    Request callback
                </button>
            </div>

            <AnimatePresence>
                {open && (
                    <div className="fixed inset-0 z-[260] flex items-center justify-center p-4">
                        <motion.div
                            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.22, ease: 'linear' }}
                            onClick={() => setOpen(false)}
                            aria-hidden
                        />
                        <motion.div
                            className="relative w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl"
                            initial={{ opacity: 0, y: 16, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 12, scale: 0.98 }}
                            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>
                            <div className="max-h-[80vh] overflow-y-auto bg-grey_5 px-4 py-5 sm:px-5 sm:py-6">
                                <FormSection
                                    compact
                                    onCancel={() => setOpen(false)}
                                    subscriptionIntent="destination_callback"
                                    queryText={queryText}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    )
}
