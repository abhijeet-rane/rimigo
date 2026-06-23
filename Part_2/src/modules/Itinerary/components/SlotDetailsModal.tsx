import Typography from '@/components/shared/Typography'
import { SlotBasicInfo } from './SlotBasicInfo'
import { X } from 'lucide-react'
import { ModalPortal } from './ModalPortal'
import { useEffect } from 'react'
import { SneakPeekAttachments } from '@/modules/Acitvities/components/SneakPeakModal/SneakPeekAttachments'

export const SlotDetailsModal = ({ isOpen, onClose, slot }: any) => {
    useEffect(() => {
        if (!isOpen) return
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
        }
    }, [isOpen])

    if (!isOpen) return null

    const notes = slot?.extendedProps?.notes
    const suggestions = slot?.extendedProps?.suggestion_reasons || []

    return (
        <ModalPortal>
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40">
                <div className="bg-natural-white rounded-md w-[90vw] md:w-[50vw] max-h-[90vh] flex flex-col overflow-hidden">
                    <div className="p-3 flex items-center justify-between ">
                        <Typography
                            family="manrope"
                            size="14"
                            weight="medium">
                            Slot Details
                        </Typography>

                        <button
                            onClick={onClose}
                            className="cursor-pointer">
                            <X
                                className="p-1.5 bg-grey-5 rounded-md"
                                size={28}
                            />
                        </button>
                    </div>

                    <div className="p-3 overflow-y-auto flex flex-col gap-6">
                        <SlotBasicInfo slot={slot} />

                        {/* Notes Section */}
                        {notes && (
                            <div className="flex flex-col gap-2">
                                <Typography
                                    size="16"
                                    weight="semibold"
                                    family="manrope"
                                    color="grey-0">
                                    Notes
                                </Typography>
                                <div className="p-3 border border-grey-4 rounded-md">
                                    <Typography
                                        size="14"
                                        weight="medium"
                                        family="manrope"
                                        color="grey-0"
                                        className="whitespace-pre-line">
                                        {notes}
                                    </Typography>
                                </div>
                            </div>
                        )}

                        {/* Suggestions Section */}
                        {suggestions.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <Typography
                                    size="16"
                                    weight="semibold"
                                    family="manrope"
                                    color="grey-0">
                                    Suggestions
                                </Typography>
                                <div className="flex flex-col gap-2 p-3 bg-primary-default-80 rounded-md border border-primary-default">
                                    {suggestions.map((suggestion: string, index: number) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-2">
                                            {/* Bullet dot */}
                                            <span className="mt-[6px] h-[6px] w-[6px] rounded-full bg-grey-1 shrink-0" />

                                            {/* Rounded background text */}
                                            <div className="flex-1 ">
                                                <Typography
                                                    size="14"
                                                    weight="medium"
                                                    family="manrope"
                                                    color="grey-0">
                                                    {suggestion}
                                                </Typography>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <SneakPeekAttachments attachments={slot.extendedProps.attachments || []} />
                    </div>
                </div>
            </div>
        </ModalPortal>
    )
}
