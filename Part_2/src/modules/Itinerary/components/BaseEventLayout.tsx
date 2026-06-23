interface BaseEventLayoutProps {
    children: React.ReactNode
    flexDirection?: 'row' | 'col'
    slotType?: SlotType
    onEditClick?: () => void
    bgColor?: string
    onDeleteClick?: () => void
    slotData?: any
    disableClick?: boolean
    canEdit?: boolean
    noPadding?: boolean
}
export const BaseEventLayout: React.FC<BaseEventLayoutProps> = ({
    children,
    flexDirection = 'row',
    slotType = 'default',
    bgColor,
    onEditClick,
    onDeleteClick,
    slotData,
    disableClick = false,
    canEdit = true,
    noPadding = false
}) => {
    const [open, setOpen] = useState(false)

    const config = SLOT_TYPE_CONFIG[slotType] || SLOT_TYPE_CONFIG.default
    const backgroundColor = bgColor?.trim() || 'var(--color-natural-white)'

    const handleClick = (_: React.MouseEvent) => {
        if (disableClick) return
        setOpen(true)
    }
    const attachmentCount = slotData?.extendedProps?.attachments?.length ?? 0

    return (
        <>
            <div
                onClick={handleClick}
                className={`
                    group
                    ${noPadding ? 'p-0' : 'p-2'} rounded-xl
                    flex flex-${flexDirection}
                    gap-2 min-w-full h-full
                    relative overflow-hidden
                    transition-shadow duration-200
                    shadow-[0_4px_12px_#e0e0e0]
                    hover:shadow-none
                    ${!disableClick ? 'cursor-pointer' : ''}
                `}
                style={{ backgroundColor }}>
                {children}

                {/* Slot icon */}
                <div
                    className={`absolute top-0 right-0 w-6 h-6 flex items-center justify-center rounded-bl-[10px] ${noPadding ? 'backdrop-blur-sm' : ''}`}
                    style={{
                        backgroundColor: noPadding ? `${config.iconBgColor}CC` : config.iconBgColor,
                        color: config.iconColor
                    }}>
                    {config.icon}
                </div>

                {/* Edit / Delete actions — show on hover; always capture clicks so calendar card doesn't open sneak peek */}
                {canEdit && (onEditClick || onDeleteClick) && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="
                        absolute max-md:hidden bottom-2 right-2 flex gap-2 z-10
                        min-w-[72px] min-h-[28px] pointer-events-auto
                        transition-opacity duration-200
                    ">
                        {onEditClick && (
                            <button
                                data-action="edit"
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onEditClick()
                                }}
                                className="
                                w-7 h-7 rounded-full opacity-0
                        group-hover:opacity-100
                                bg-white shadow-md cursor-pointer pointer-events-auto
                                flex items-center justify-center
                                hover:bg-grey-4 transition
                            ">
                                <Pencil
                                    size={14}
                                    className="text-primary-default"
                                />
                            </button>
                        )}

                        {onDeleteClick && (
                            <button
                                data-action="delete"
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDeleteClick()
                                }}
                                className="
                                w-7 h-7 rounded-full opacity-0 cursor-pointer
                        group-hover:opacity-100
                                bg-white shadow-md pointer-events-auto
                                flex items-center justify-center
                                hover:bg-red-50 transition
                            ">
                                <Trash2
                                    size={14}
                                    className="text-red-500"
                                />
                            </button>
                        )}
                        {attachmentCount > 0 && (
                            <div
                                className="
                             
                            flex items-center gap-1
                            px-2 py-1
                            rounded-md 
                            bg-white
                            shadow-sm
                            border border-grey-4
                        ">
                                <Paperclip
                                    size={10}
                                    className="text-grey-1"
                                />
                                <Typography
                                    size="10"
                                    family="manrope"
                                    weight="medium"
                                    color="grey-1">
                                    {attachmentCount}
                                </Typography>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 🔥 SLOT DETAILS MODAL */}
            {open && slotData && (
                <SlotDetailsModal
                    slot={slotData}
                    onClose={() => setOpen(false)}
                    isOpen={open}
                />
            )}
        </>
    )
}

import { Home, Binoculars, Plane, Bus, Train, Car, Wine, Pencil, Trash2, Paperclip } from 'lucide-react'
import { JSX, useState } from 'react'
import { SlotDetailsModal } from './SlotDetailsModal'
import Typography from '@/components/shared/Typography'

export type SlotType = 'meal' | 'visit' | 'experience' | 'flight' | 'train' | 'bus' | 'car' | 'transport' | 'hotel' | 'default'

export const SLOT_TYPE_CONFIG: Record<
    SlotType,
    {
        icon: JSX.Element
        iconColor: string
        iconBgColor: string
    }
> = {
    meal: {
        icon: <Wine size={14} />,
        iconColor: '#26BC6D',
        iconBgColor: '#26BC6D29'
    },
    visit: {
        icon: <Binoculars size={14} />,
        iconColor: '#1588CF',
        iconBgColor: '#1588CF29'
    },
    experience: {
        icon: <Binoculars size={14} />,
        iconColor: '#E55A34',
        iconBgColor: '#E55A3429'
    },
    flight: {
        icon: <Plane size={14} />,
        iconColor: '#1588CF',
        iconBgColor: '#1588CF29'
    },
    train: {
        icon: <Train size={14} />,
        iconColor: '#1588CF',
        iconBgColor: '#1588CF29'
    },
    bus: {
        icon: <Bus size={14} />,
        iconColor: '#1588CF',
        iconBgColor: '#1588CF29'
    },
    car: {
        icon: <Car size={14} />,
        iconColor: '#1588CF',
        iconBgColor: '#1588CF29'
    },
    transport: {
        icon: <Plane size={14} />,
        iconColor: '#1588CF',
        iconBgColor: '#1588CF29'
    },
    hotel: {
        icon: <Home size={14} />,
        iconColor: '#26BC6D',
        iconBgColor: '#26BC6D29'
    },
    default: {
        icon: <Home size={14} />,
        iconColor: '#101010',
        iconBgColor: '#E0E0E0'
    }
}
const TRANSPORT_SUBTYPE_MAP: Record<string, SlotType> = {
    flight: 'flight',
    train: 'train',
    bus: 'bus',
    transfer: 'car',
    taxi: 'car',
    shuttle: 'bus',
    ferry: 'bus',
    boat: 'bus'
}

export const resolveTransportSlotType = (kind?: string): SlotType => {
    if (!kind) return 'transport'
    return TRANSPORT_SUBTYPE_MAP[kind] ?? 'transport'
}
