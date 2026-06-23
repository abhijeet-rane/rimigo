import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import RimigoDateCalendar from '@/components/RimigoDateCalendar'
import Typography from '@/components/shared/Typography'
import { Button } from '@/components/ui/button'
import { formatDateToYMD } from '@/utils/dateUtils'

interface EditExperienceDateModalProps {
    isOpen: boolean
    onClose: () => void
    startDate: string | null | undefined
    endDate: string | null | undefined
    onSave: (startDate: string | null, endDate: string | null) => Promise<void>
    isLoading?: boolean
}

const EditExperienceDateModal: React.FC<EditExperienceDateModalProps> = ({
    isOpen,
    onClose,
    startDate,
    endDate,
    onSave,
    isLoading = false
}) => {
    const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null)
    const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null)

    // Initialize dates from props
    useEffect(() => {
        if (isOpen) {
            setSelectedStartDate(startDate ? new Date(startDate) : null)
            setSelectedEndDate(endDate ? new Date(endDate) : null)
        }
    }, [isOpen, startDate, endDate])

    const handleDateChange = (start: Date | null, end: Date | null) => {
        setSelectedStartDate(start)
        setSelectedEndDate(end)
    }

    const handleSave = async () => {
        // Format dates as YYYY-MM-DD using utility function
        await onSave(formatDateToYMD(selectedStartDate), formatDateToYMD(selectedEndDate))
    }

    if (!isOpen) return null

    const container = typeof document !== 'undefined' ? document.body : null
    if (!container) return null

    const modalContent = (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Content */}
            <div
                className="relative bg-white rounded-lg shadow-2xl flex flex-col max-w-md w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-grey-4">
                    <div className="flex-1">
                        <Typography
                            size="18"
                            weight="semibold"
                            color="grey-0"
                            family="redhat">
                            Edit Dates
                        </Typography>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-4 p-2 hover:bg-grey-5 rounded-full transition-colors shrink-0 cursor-pointer"
                        disabled={isLoading}>
                        <X className="w-5 h-5 text-grey-2" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col overflow-hidden px-6 py-6">
                    <div className="mb-4">
                        <RimigoDateCalendar
                            startDate={selectedStartDate}
                            endDate={selectedEndDate}
                            onChange={handleDateChange}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-4">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 text-md font-semibold">
                            Cancel
                        </Button>
                        <Button
                            variant="default"
                            onClick={handleSave}
                            disabled={isLoading}
                            className="flex-1 text-white text-md font-semibold">
                            {isLoading ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, container)
}

export default EditExperienceDateModal

