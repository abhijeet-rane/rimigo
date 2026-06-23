import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Dialog, DialogTitle, DialogPortal } from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { addToursToExperience, type AddToursResponse } from '@/modules/Experiences/api/tourMappingApi'

interface AddToursDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    experienceId: string
    experienceName?: string | null
}

const PLACEHOLDER = `https://www.klook.com/activity/12345-some-experience/
https://www.getyourguide.com/locationname-l1234/some-experience-t56789/`

const AddToursDialog = ({ open, onOpenChange, experienceId, experienceName }: AddToursDialogProps) => {
    const [value, setValue] = useState('')
    const queryClient = useQueryClient()

    const mutation = useMutation({
        mutationFn: async (links: string[]): Promise<AddToursResponse> => addToursToExperience(experienceId, links),
        onSuccess: (data) => {
            const newCount = data.summary.new_mappings_created
            const existingCount = data.summary.existing_mappings_found
            const errorCount = data.errors.length
            // Concise human summary — `new` reflects mappings actually created (not tours, since a tour
            // can pre-exist while still being a fresh mapping for this experience).
            toast.success(`Added ${newCount} new, ${existingCount} already mapped, ${errorCount} error${errorCount !== 1 ? 's' : ''}`)

            if (errorCount > 0) {
                // Show errors in a second toast so the success state stays scannable.
                // Truncate joined output so the toast doesn't blow up vertically.
                const joined = data.errors.join(' · ')
                const trimmed = joined.length > 240 ? `${joined.slice(0, 240)}…` : joined
                toast.error(trimmed)
            }

            // Match the partial key used by `useToursForExperience` — full key is
            // ['tours', experienceId, checkIn]; partial invalidation ignores checkIn.
            queryClient.invalidateQueries({ queryKey: ['tours', experienceId] })

            setValue('')
            onOpenChange(false)
        },
        onError: () => {
            toast.error('Could not add tours. Try again.')
        }
    })

    const handleSubmit = () => {
        const links = value
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
        if (links.length === 0) return
        mutation.mutate(links)
    }

    const isSubmitDisabled = value.trim().length === 0 || mutation.isPending

    // Use DialogPortal + DialogPrimitive.Content directly with high z-index so this dialog
    // stacks above the SneakPeek modal (which sits at z-[1310]). The default DialogContent
    // helper bakes in z-71 and z-50 for its overlay, both of which would render behind.
    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (mutation.isPending) return
                onOpenChange(next)
            }}>
            <DialogPortal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-[1400] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[1410] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow-lg overflow-hidden data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
                    <DialogTitle className="sr-only">Add tours to experience</DialogTitle>

                    <div className="px-4 pt-3.5 pb-2.5 border-b border-grey-4">
                        <div
                            className="font-red-hat-display text-[15px] font-bold text-grey-0 leading-tight truncate"
                            title={experienceName ?? undefined}>
                            Add tours to {experienceName ?? 'this experience'}
                        </div>
                        <div className="mt-0.5 font-manrope text-[11px] text-grey-2 leading-snug">
                            Paste one link per line. Klook, GetYourGuide, Viator, Headout, Agoda, or generic URLs.
                        </div>
                    </div>

                    <div className="px-4 py-3">
                        <textarea
                            rows={6}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={PLACEHOLDER}
                            disabled={mutation.isPending}
                            spellCheck={false}
                            className="w-full rounded-md border border-grey-3 bg-white px-2 py-1.5 font-mono text-[12px] leading-relaxed text-grey-0 placeholder:text-grey-3 focus:border-primary-default focus:outline-none focus:ring-1 focus:ring-primary-default disabled:opacity-60 resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 px-4 pb-3">
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            disabled={mutation.isPending}
                            className="px-3 py-1.5 rounded-md font-manrope text-[12px] font-medium text-grey-1 hover:bg-grey-5/60 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed transition-colors">
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitDisabled}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-manrope text-[12px] font-semibold text-white bg-primary-default hover:bg-primary-default/90 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-colors">
                            {mutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                            Add tours
                        </button>
                    </div>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    )
}

export default AddToursDialog
