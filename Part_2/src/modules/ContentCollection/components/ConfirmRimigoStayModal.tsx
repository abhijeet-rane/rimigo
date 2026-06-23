import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, MapPin } from 'lucide-react'
import Typography from '@/components/shared/Typography'
import CustomDatePicker from '@/modules/Itinerary/components/CustomDatePicker'
import { formatDateToYMD } from '@/utils/dateUtils'
import type { CityOption } from './ConfirmExternalStayModal'

interface ConfirmRimigoStayModalProps {
    isOpen: boolean
    onClose: () => void
    hotelName: string
    subtitle?: string
    bannerImg?: string | null
    availableCities: CityOption[]
    isAdding?: boolean
    onConfirm: (selectedCity: CityOption, startDate: string | null, endDate: string | null) => void
    /** When set, shows "View property" to open stay details in a new tab */
    detailHref?: string | null
    /** Pre-populated check-in date (YYYY-MM-DD) from current filter */
    initialCheckIn?: string
    /** Pre-populated check-out date (YYYY-MM-DD) from current filter */
    initialCheckOut?: string
}

const parseOrDefault = (dateStr: string | undefined): Date => {
    if (!dateStr) return new Date()
    const parsed = new Date(dateStr)
    return isNaN(parsed.getTime()) ? new Date() : parsed
}

const ConfirmRimigoStayModal: React.FC<ConfirmRimigoStayModalProps> = ({
    isOpen,
    onClose,
    hotelName,
    subtitle,
    bannerImg,
    availableCities,
    isAdding = false,
    onConfirm,
    detailHref,
    initialCheckIn,
    initialCheckOut
}) => {
    const [selectedCityId, setSelectedCityId] = useState('')
    const [selectedStartDate, setSelectedStartDate] = useState<Date>(() => parseOrDefault(initialCheckIn))
    const [selectedEndDate, setSelectedEndDate] = useState<Date>(() => parseOrDefault(initialCheckOut))

    useEffect(() => {
        if (isOpen) {
            setSelectedCityId('')
            setSelectedStartDate(parseOrDefault(initialCheckIn))
            setSelectedEndDate(parseOrDefault(initialCheckOut))
        }
    }, [isOpen, initialCheckIn, initialCheckOut])

    const selectedCity = availableCities.find((c) => c.id === selectedCityId)
    const canConfirm = !!selectedCity

    const openDetails = () => {
        if (detailHref) {
            window.open(detailHref, '_blank', 'noopener,noreferrer')
        }
    }

    return createPortal(
        <AnimatePresence>
            {isOpen ? (
                <motion.div
                    key="confirm-rimigo-overlay"
                    role="presentation"
                    className="fixed inset-0 z-501 flex items-center justify-center p-4 sm:p-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}>
                    <motion.button
                        type="button"
                        aria-label="Close dialog"
                        className="absolute inset-0 bg-grey-0/55 backdrop-blur-[6px]"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="confirm-rimigo-stay-title"
                        className="relative w-full max-w-lg max-h-[min(90vh,640px)] flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_48px_-12px_rgba(15,23,42,0.25)] border border-grey-4/40"
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.96, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 10 }}
                        transition={{ type: 'spring', damping: 26, stiffness: 320 }}>
                        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b border-grey-4/60 bg-gradient-to-b from-grey-5/40 to-white">
                            <div className="min-w-0 flex-1">
                                <Typography id="confirm-rimigo-stay-title" size="18" weight="semibold" color="grey-0" className="font-red-hat-display tracking-tight">
                                    Add to collection
                                </Typography>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="shrink-0 p-2 rounded-xl text-grey-2 hover:text-grey-0 hover:bg-grey-5/80 transition-colors"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex flex-col flex-1 overflow-y-auto min-h-0 px-5 sm:px-6 py-5 gap-5">
                            {bannerImg ? (
                                <div className="rounded-xl overflow-hidden bg-grey-5 ring-1 ring-black/[0.06] aspect-video max-h-52 shadow-inner">
                                    <img src={bannerImg} alt="" className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="rounded-xl bg-gradient-to-br from-primary-default/8 via-grey-5/80 to-grey-5 aspect-video max-h-36 flex items-center justify-center ring-1 ring-primary-default/10">
                                    <MapPin className="w-10 h-10 text-primary-default/35" aria-hidden />
                                </div>
                            )}
                            <div className="flex flex-col gap-1">
                                <Typography size="17" weight="semibold" color="grey-0" className="font-red-hat-display leading-snug">
                                    {hotelName}
                                </Typography>
                                {subtitle ? (
                                    <Typography size="14" weight="medium" color="grey-1" className="leading-relaxed">
                                        {subtitle}
                                    </Typography>
                                ) : null}
                            </div>

                            {detailHref ? (
                                <button
                                    type="button"
                                    onClick={openDetails}
                                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 rounded-xl border border-grey-4 bg-white text-grey-0 text-sm font-semibold font-red-hat-display hover:bg-grey-5/60 hover:border-grey-3 transition-all shadow-sm"
                                >
                                    <ExternalLink className="w-4 h-4 text-primary-default shrink-0" />
                                    View property in new tab
                                </button>
                            ) : null}

                            <div>
                                <label htmlFor="confirm-rimigo-stay-city" className="block text-sm font-semibold text-grey-1 mb-2 font-red-hat-display">
                                    Collection city
                                </label>
                                <select
                                    id="confirm-rimigo-stay-city"
                                    value={selectedCityId}
                                    onChange={(e) => setSelectedCityId(e.target.value)}
                                    disabled={isAdding || availableCities.length === 0}
                                    className="w-full px-4 py-3.5 border border-grey-4 rounded-xl bg-grey-5/40 text-grey-0 font-manrope text-[15px] focus:outline-none focus:ring-2 focus:ring-primary-default/25 focus:border-primary-default focus:bg-white disabled:opacity-50 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">{availableCities.length === 0 ? 'No cities loaded' : 'Select a city'}</option>
                                    {availableCities.map((city) => (
                                        <option key={city.id} value={city.id}>
                                            {city.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <p className="text-sm font-semibold text-grey-1 mb-2 font-red-hat-display">Stay dates</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-[11px] font-medium text-grey-3 mb-1">Check-in</p>
                                        <CustomDatePicker value={selectedStartDate} onChange={setSelectedStartDate} openDirection="up" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-medium text-grey-3 mb-1">Check-out</p>
                                        <CustomDatePicker value={selectedEndDate} onChange={setSelectedEndDate} openDirection="up" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 px-5 sm:px-6 py-4 border-t border-grey-4/60 bg-grey-5/30">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-grey-4 bg-white text-grey-0 font-semibold text-sm font-red-hat-display hover:bg-grey-5/50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => selectedCity && onConfirm(selectedCity, formatDateToYMD(selectedStartDate), formatDateToYMD(selectedEndDate))}
                                disabled={isAdding || !canConfirm}
                                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-primary-default text-white font-semibold text-sm font-red-hat-display shadow-md shadow-primary-default/20 hover:brightness-[1.03] active:scale-[0.99] transition-all disabled:opacity-45 disabled:shadow-none disabled:pointer-events-none"
                            >
                                {isAdding ? 'Adding…' : 'Add to collection'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>,
        document.body
    )
}

export default ConfirmRimigoStayModal
