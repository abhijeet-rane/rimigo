import { BedDouble } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface RoomsModalProps {
    isOpen: boolean
    onClose: () => void
    initialRooms?: number
    onApply: (rooms: number) => void
    anchorRef?: React.RefObject<HTMLElement | null>
    usePortal?: boolean
    positionOffset?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'bottom-center' | 'top-center'
}

const MIN_ROOMS = 1
const MAX_ROOMS = 8

export const RoomsModal = ({
    isOpen,
    onClose,
    initialRooms = 1,
    onApply,
    anchorRef,
    usePortal = false,
    positionOffset = 'bottom-center'
}: RoomsModalProps) => {
    const [rooms, setRooms] = useState(initialRooms)
    const [modalPosition, setModalPosition] = useState<{ top: number; left: number } | null>(null)

    useEffect(() => {
        setRooms(initialRooms)
    }, [initialRooms])

    useEffect(() => {
        if (usePortal && isOpen && anchorRef?.current) {
            const updatePosition = () => {
                const rect = anchorRef.current!.getBoundingClientRect()
                const scrollY = window.scrollY
                const scrollX = window.scrollX
                const offset = 8

                let top: number
                let left: number

                switch (positionOffset) {
                    case 'bottom-left':
                        top = rect.bottom + scrollY + offset
                        left = rect.left + scrollX
                        break
                    case 'bottom-right':
                        top = rect.bottom + scrollY + offset
                        left = rect.right + scrollX
                        break
                    case 'top-left':
                        top = rect.top + scrollY - offset
                        left = rect.left + scrollX
                        break
                    case 'top-right':
                        top = rect.top + scrollY - offset
                        left = rect.right + scrollX
                        break
                    case 'top-center':
                        top = rect.top + scrollY - offset
                        left = rect.left + scrollX + rect.width / 2
                        break
                    case 'bottom-center':
                    default:
                        top = rect.bottom + scrollY + offset
                        left = rect.left + scrollX + rect.width / 2
                        break
                }

                setModalPosition({ top, left })
            }
            updatePosition()
            window.addEventListener('scroll', updatePosition, true)
            window.addEventListener('resize', updatePosition)
            return () => {
                window.removeEventListener('scroll', updatePosition, true)
                window.removeEventListener('resize', updatePosition)
            }
        } else if (!usePortal) {
            setModalPosition(null)
        }
    }, [usePortal, isOpen, anchorRef, positionOffset])

    const handleApply = () => {
        onApply(rooms)
        onClose()
    }

    if (!isOpen) return null

    const container = typeof document !== 'undefined' ? document.body : null
    if (!container) return null

    const modalContent = (
        <>
            <div
                className="fixed inset-0 w-screen h-screen bg-transparent"
                onClick={onClose}
                style={{ zIndex: 10050 }}
            />
            <div
                onClick={(e) => e.stopPropagation()}
                className={`${usePortal ? 'fixed' : 'absolute'} ${usePortal ? '' : 'top-full left-1/2 transform -translate-x-1/2'} mt-2 ${usePortal ? 'w-[380px] max-w-[90vw]' : 'w-[380px]'} max-h-[700px] overflow-y-auto`}
                style={{
                    zIndex: 10051,
                    ...(usePortal && modalPosition
                        ? {
                              top: `${modalPosition.top}px`,
                              left: `${modalPosition.left}px`,
                              transform:
                                  positionOffset === 'bottom-right' || positionOffset === 'top-right'
                                      ? 'translateX(-100%)'
                                      : positionOffset === 'bottom-left' || positionOffset === 'top-left'
                                        ? 'translateX(0)'
                                        : 'translateX(-50%)'
                          }
                        : {})
                }}>
                <div className="bg-white border border-grey-4 rounded-lg shadow-lg p-6">
                    <h2 className="font-red-hat-display text-xl font-semibold text-grey-0 mb-6">Select Rooms</h2>

                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-grey-5 flex items-center justify-center">
                                <BedDouble className="w-5 h-5 text-grey-2" />
                            </div>
                            <p className="font-red-hat-display text-[16px] font-[550] leading-[20px] tracking-[-0.32px] text-grey-1">
                                Rooms
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setRooms(Math.max(MIN_ROOMS, rooms - 1))}
                                disabled={rooms <= MIN_ROOMS}
                                className={`w-9 h-9 flex items-center justify-center transition-colors ${
                                    rooms <= MIN_ROOMS
                                        ? 'rounded-full border border-grey-4 bg-grey-5 cursor-not-allowed opacity-40'
                                        : 'rounded-full border border-primary-default bg-white text-primary-default hover:bg-primary-default-80 cursor-pointer'
                                }`}>
                                <span className="text-lg font-medium">−</span>
                            </button>
                            <span className="text-base font-semibold text-grey-0 w-8 text-center">{rooms}</span>
                            <button
                                onClick={() => setRooms(Math.min(MAX_ROOMS, rooms + 1))}
                                disabled={rooms >= MAX_ROOMS}
                                className={`w-9 h-9 flex items-center justify-center transition-colors ${
                                    rooms >= MAX_ROOMS
                                        ? 'rounded-full border border-grey-4 bg-grey-5 cursor-not-allowed opacity-40'
                                        : 'rounded-full border border-primary-default bg-white text-primary-default hover:bg-primary-default-80 cursor-pointer'
                                }`}>
                                <span className="text-lg font-medium">+</span>
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={handleApply}
                        className="w-full h-12 bg-grey-0 text-white rounded-md font-semibold text-base hover:bg-opacity-90 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer">
                        <span>Done</span>
                    </button>
                </div>
            </div>
        </>
    )

    return usePortal ? createPortal(modalContent, container) : modalContent
}
