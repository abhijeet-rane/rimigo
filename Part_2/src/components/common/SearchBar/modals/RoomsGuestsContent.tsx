import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import type { OccupanciesConfig } from '@/types/occupancy'
import { DEFAULT_OCCUPANCIES, MAX_ROOMS, MAX_ADULTS_PER_ROOM, MAX_CHILDREN_PER_ROOM, DEFAULT_CHILD_AGE } from '@/types/occupancy'

interface RoomsGuestsContentProps {
    initialOccupancies?: OccupanciesConfig
    onApply: (data: OccupanciesConfig) => void
    onClose: () => void
}

const CounterBtn = ({ onClick, disabled, label }: { onClick: () => void; disabled?: boolean; label: string }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`w-9 h-9 flex items-center justify-center transition-colors ${
            disabled
                ? 'rounded-full border border-grey-grey_4 bg-grey-grey_5 cursor-not-allowed opacity-40'
                : 'rounded-full border border-primary-default bg-natural-white text-primary-default hover:bg-primary-default-80 cursor-pointer'
        }`}>
        <span className="text-lg font-medium">{label}</span>
    </button>
)

export const RoomsGuestsContent = ({ initialOccupancies, onApply, onClose }: RoomsGuestsContentProps) => {
    const [rooms, setRooms] = useState<OccupanciesConfig>(initialOccupancies || DEFAULT_OCCUPANCIES)

    const setAdults = (index: number, count: number) => {
        setRooms((prev) => prev.map((room, i) => i === index ? { ...room, numOfAdults: Math.max(1, Math.min(MAX_ADULTS_PER_ROOM, count)) } : room))
    }

    const setChildren = (index: number, count: number) => {
        const clamped = Math.max(0, Math.min(MAX_CHILDREN_PER_ROOM, count))
        setRooms((prev) =>
            prev.map((room, i) => {
                if (i !== index) return room
                const ages = [...room.childAges]
                while (ages.length < clamped) ages.push(DEFAULT_CHILD_AGE)
                return { ...room, childAges: ages.slice(0, clamped) }
            })
        )
    }

    const setChildAge = (roomIndex: number, childIndex: number, age: number) => {
        setRooms((prev) =>
            prev.map((room, i) => {
                if (i !== roomIndex) return room
                const ages = [...room.childAges]
                ages[childIndex] = age
                return { ...room, childAges: ages }
            })
        )
    }

    const addRoom = () => {
        if (rooms.length >= MAX_ROOMS) return
        setRooms((prev) => [...prev, { numOfAdults: 2, childAges: [] }])
    }

    const removeRoom = (index: number) => {
        if (rooms.length <= 1) return
        setRooms((prev) => prev.filter((_, i) => i !== index))
    }

    const handleApply = () => {
        onApply(rooms)
        onClose()
    }

    return (
        <div className="bg-white w-full flex flex-col rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-grey-4/60 shrink-0">
                <h2 className="font-['Red_Hat_Display'] text-[15px] font-bold text-header-black">Guests & Rooms</h2>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-grey-5 transition-colors cursor-pointer text-grey-2 hover:text-grey-0">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Scrollable rooms */}
            <div className="px-6 py-4 overflow-y-auto max-h-[55vh] flex-1 min-h-0">
                {rooms.map((room, roomIdx) => (
                    <div key={roomIdx} className={roomIdx > 0 ? 'mt-5 pt-5 border-t border-grey-4' : ''}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-['Red_Hat_Display'] text-[16px] font-bold leading-[20px] tracking-[-0.32px]" style={{ color: '#101010' }}>
                                Room {roomIdx + 1}
                            </h3>
                            {roomIdx > 0 && (
                                <button onClick={() => removeRoom(roomIdx)} className="p-1.5 rounded-full hover:bg-red-50 transition-colors cursor-pointer">
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="font-['Red_Hat_Display'] text-[14px] font-[550] leading-[18px] tracking-[-0.28px]" style={{ color: '#363636' }}>Adult</p>
                                <p className="font-['Manrope'] text-[11px] font-semibold tracking-[-0.22px]" style={{ color: '#747474' }}>Age 18+</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <CounterBtn onClick={() => setAdults(roomIdx, room.numOfAdults - 1)} disabled={room.numOfAdults <= 1} label="−" />
                                <span className="text-base font-semibold text-header-black w-6 text-center">{room.numOfAdults}</span>
                                <CounterBtn onClick={() => setAdults(roomIdx, room.numOfAdults + 1)} disabled={room.numOfAdults >= MAX_ADULTS_PER_ROOM} label="+" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="font-['Red_Hat_Display'] text-[14px] font-[550] leading-[18px] tracking-[-0.28px]" style={{ color: '#363636' }}>Children</p>
                                <p className="font-['Manrope'] text-[11px] font-semibold tracking-[-0.22px]" style={{ color: '#747474' }}>Age 17 or younger</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <CounterBtn onClick={() => setChildren(roomIdx, room.childAges.length - 1)} disabled={room.childAges.length <= 0} label="−" />
                                <span className="text-base font-semibold text-header-black w-6 text-center">{room.childAges.length}</span>
                                <CounterBtn onClick={() => setChildren(roomIdx, room.childAges.length + 1)} disabled={room.childAges.length >= MAX_CHILDREN_PER_ROOM} label="+" />
                            </div>
                        </div>

                        {room.childAges.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {room.childAges.map((age, childIdx) => (
                                    <select
                                        key={childIdx}
                                        value={age}
                                        onChange={(e) => setChildAge(roomIdx, childIdx, parseInt(e.target.value, 10))}
                                        className="px-3 py-2 border border-grey-4 rounded-lg text-sm font-['Manrope'] text-grey-0 bg-white cursor-pointer focus:outline-none focus:border-primary-default">
                                        {Array.from({ length: 18 }, (_, i) => (
                                            <option key={i} value={i}>Child {childIdx + 1}: Age {i}</option>
                                        ))}
                                    </select>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {rooms.length < MAX_ROOMS && (
                    <button
                        onClick={addRoom}
                        className="mt-5 w-full py-3 border border-dashed border-grey-3 rounded-xl text-sm font-semibold font-['Red_Hat_Display'] text-grey-1 hover:border-primary-default hover:text-primary-default transition-colors cursor-pointer">
                        Add Room
                    </button>
                )}
            </div>

            {/* Sticky footer */}
            <div className="px-6 pb-5 pt-3 border-t border-grey-4/60 shrink-0">
                <button
                    onClick={handleApply}
                    className="w-full py-3 bg-header-black text-white rounded-xl text-sm font-bold font-['Red_Hat_Display'] hover:bg-grey-0 transition-colors cursor-pointer">
                    Apply
                </button>
            </div>
        </div>
    )
}

export default RoomsGuestsContent
