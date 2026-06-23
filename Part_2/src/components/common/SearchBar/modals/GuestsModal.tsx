import { Baby, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export interface GuestsData {
    adults: number
    children: number
    infants: number
    children_age: number[]
}

interface GuestsModalProps {
    isOpen: boolean
    onClose: () => void
    initialData?: GuestsData
    onApply: (data: GuestsData) => void
    anchorRef?: React.RefObject<HTMLElement | null>
    usePortal?: boolean
    positionOffset?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'bottom-center' | 'top-center'
    /** When true, the page behind the modal remains scrollable */
    allowScrollBehind?: boolean
}

export const GuestsModal = ({
    isOpen,
    onClose,
    initialData,
    onApply,
    anchorRef,
    usePortal = false,
    positionOffset = 'bottom-center',
    allowScrollBehind = false
}: GuestsModalProps) => {
    const [adults, setAdults] = useState(initialData?.adults || 1)
    const [children, setChildren] = useState(initialData?.children || 0)
    const [infants, setInfants] = useState(initialData?.infants || 0)
    const [childAges, setChildAges] = useState<number[]>(initialData?.children_age || [])
    const [modalPosition, setModalPosition] = useState<{ top: number; left: number } | null>(null)
    const modalContentRef = useRef<HTMLDivElement>(null)

    // Click-outside detection when allowScrollBehind is true (overlay has pointer-events: none)
    useEffect(() => {
        if (!isOpen || !allowScrollBehind) return
        const handlePointerDown = (e: PointerEvent) => {
            if (modalContentRef.current && !modalContentRef.current.contains(e.target as Node)) {
                onClose()
            }
        }
        document.addEventListener('pointerdown', handlePointerDown)
        return () => document.removeEventListener('pointerdown', handlePointerDown)
    }, [isOpen, allowScrollBehind, onClose])

    // Update state when initialData changes
    useEffect(() => {
        if (initialData) {
            setAdults(initialData.adults || 1)
            setChildren(initialData.children || 0)
            setInfants(initialData.infants || 0)
            setChildAges(initialData.children_age || [])
        }
    }, [initialData])

    // Calculate modal position when using portal
    useEffect(() => {
        if (usePortal && isOpen && anchorRef?.current) {
            const updatePosition = () => {
                const rect = anchorRef.current!.getBoundingClientRect()
                const scrollY = window.scrollY
                const scrollX = window.scrollX
                const offset = 8 // mt-2 = 8px
                
                let top: number
                let left: number
                
                // Calculate position based on positionOffset
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
                        // Default: bottom-center (centered below the anchor)
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

    // Update child ages array when children count changes
    useEffect(() => {
        if (children > childAges.length) {
            // Add default ages for new children
            const newAges = [...childAges]
            for (let i = childAges.length; i < children; i++) {
                newAges.push(5) // Default age
            }
            setChildAges(newAges)
        } else if (children < childAges.length) {
            // Remove excess ages
            setChildAges(childAges.slice(0, children))
        }
    }, [children, childAges])

    const handleApply = () => {
        onApply({
            adults,
            children,
            infants,
            children_age: childAges.slice(0, children)
        })
        onClose()
    }

    const handleChildAgeChange = (index: number, age: number) => {
        const newAges = [...childAges]
        newAges[index] = age
        setChildAges(newAges)
    }

    if (!isOpen) return null

    const container = typeof document !== 'undefined' ? document.body : null
    if (!container) return null

    const modalContent = (
        <>
            {/* Overlay — semi-transparent on mobile for bottom sheet effect */}
            <div
                className="fixed inset-0 w-screen h-screen max-md:bg-black/30 bg-transparent"
                onClick={onClose}
                style={{ zIndex: 10050, pointerEvents: allowScrollBehind ? 'none' : 'auto' }}
            />
            <div
                ref={modalContentRef}
                onClick={(e) => e.stopPropagation()}
                className={`
                    max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:w-full max-md:animate-[slideUp_0.3s_ease-out] max-md:pb-[env(safe-area-inset-bottom)]
                    ${usePortal ? 'md:fixed' : 'md:absolute'} ${usePortal ? '' : 'md:top-full md:left-1/2 md:transform md:-translate-x-1/2'} md:mt-2 ${usePortal ? 'md:w-[450px] md:max-w-[90vw]' : 'md:w-[450px]'} md:max-h-[700px] md:overflow-y-auto
                `}
                style={{
                    zIndex: 10051,
                    ...(usePortal && modalPosition ? {
                        top: `${modalPosition.top}px`,
                        left: `${modalPosition.left}px`,
                        transform: positionOffset === 'bottom-right' || positionOffset === 'top-right'
                            ? 'translateX(-100%)'
                            : positionOffset === 'bottom-left' || positionOffset === 'top-left'
                            ? 'translateX(0)'
                            : 'translateX(-50%)' // Default: center for bottom-center, top-center
                    } : {})
                }}>
                <div className="bg-white border border-feature-card-border rounded-lg shadow-lg max-md:border-t max-md:border-x-0 max-md:border-b-0 max-md:rounded-t-2xl max-md:rounded-b-none max-md:flex max-md:flex-col max-md:max-h-[75vh]">
                    {/* Drag handle for mobile */}
                    <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
                        <div className="w-10 h-1 rounded-full bg-grey-grey_4" />
                    </div>
                    {/* Scrollable content area on mobile, normal on desktop */}
                    <div className="p-6 max-md:pt-3 max-md:pb-4 max-md:overflow-y-auto max-md:flex-1 max-md:min-h-0">
                    <h2 className="text-xl font-semibold text-header-black mb-6">Select Guests</h2>

                    {/* Adults, Children, Infants Counters */}
                    <div className="space-y-4 mb-6 max-md:px-1">
                        {/* Adults */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-grey-grey_5 flex items-center justify-center">
                                    <User className="w-5 h-5 text-grey-grey_2" />
                                </div>
                                <div>
                                    <p
                                        className="font-['Red_Hat_Display'] text-[16px] font-[550] leading-[20px] tracking-[-0.32px]"
                                        style={{ color: '#363636' }}>
                                        Adult
                                    </p>
                                    <p
                                        className="font-['Manrope'] text-[12px] font-semibold tracking-[-0.24px]"
                                        style={{ color: '#747474' }}>
                                        18+ years
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setAdults(Math.max(1, adults - 1))}
                                    disabled={adults <= 1}
                                    className={`w-9 h-9 flex items-center justify-center transition-colors ${
                                        adults <= 1
                                            ? 'rounded-full border border-grey-grey_4 bg-grey-grey_5 cursor-not-allowed opacity-40'
                                            : 'rounded-full border border-primary-default bg-natural-white text-primary-default hover:bg-primary-default-80 cursor-pointer'
                                    }`}>
                                    <span className="text-lg font-medium">−</span>
                                </button>
                                <span className="text-base font-semibold text-header-black w-8 text-center">{adults}</span>
                                <button
                                    onClick={() => setAdults(adults + 1)}
                                    className="w-9 h-9 rounded-full border border-primary-default bg-natural-white text-primary-default hover:bg-primary-default-80 flex items-center justify-center cursor-pointer transition-colors">
                                    <span className="text-lg font-medium">+</span>
                                </button>
                            </div>
                        </div>

                        {/* Children */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-grey-grey_5 flex items-center justify-center">
                                    <Baby className="w-5 h-5 text-grey-grey_2" />
                                </div>
                                <div>
                                    <p
                                        className="font-['Red_Hat_Display'] text-[16px] font-[550] leading-[20px] tracking-[-0.32px]"
                                        style={{ color: '#363636' }}>
                                        Child
                                    </p>
                                    <p
                                        className="font-['Manrope'] text-[12px] font-semibold tracking-[-0.24px]"
                                        style={{ color: '#747474' }}>
                                        2-17 years
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setChildren(Math.max(0, children - 1))}
                                    disabled={children <= 0}
                                    className={`w-9 h-9 flex items-center justify-center transition-colors ${
                                        children <= 0
                                            ? 'rounded-full border border-grey-grey_4 bg-grey-grey_5 cursor-not-allowed opacity-40'
                                            : 'rounded-full border border-primary-default bg-natural-white text-primary-default hover:bg-primary-default-80 cursor-pointer'
                                    }`}>
                                    <span className="text-lg font-medium">−</span>
                                </button>
                                <span className="text-base font-semibold text-header-black w-8 text-center">{children}</span>
                                <button
                                    onClick={() => setChildren(children + 1)}
                                    className="w-9 h-9 rounded-full border border-primary-default bg-natural-white text-primary-default hover:bg-primary-default-80 flex items-center justify-center cursor-pointer transition-colors">
                                    <span className="text-lg font-medium">+</span>
                                </button>
                            </div>
                        </div>

                        {/* Infants */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-grey-grey_5 flex items-center justify-center">
                                    <Baby className="w-4 h-4 text-grey-grey_2" />
                                </div>
                                <div>
                                    <p
                                        className="font-['Red_Hat_Display'] text-[16px] font-[550] leading-[20px] tracking-[-0.32px]"
                                        style={{ color: '#363636' }}>
                                        Infant
                                    </p>
                                    <p
                                        className="font-['Manrope'] text-[12px] font-semibold tracking-[-0.24px]"
                                        style={{ color: '#747474' }}>
                                        Under 2
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setInfants(Math.max(0, infants - 1))}
                                    disabled={infants <= 0}
                                    className={`w-9 h-9 flex items-center justify-center transition-colors ${
                                        infants <= 0
                                            ? 'rounded-full border border-grey-grey_4 bg-grey-grey_5 cursor-not-allowed opacity-40'
                                            : 'rounded-full border border-primary-default bg-natural-white text-primary-default hover:bg-primary-default-80 cursor-pointer'
                                    }`}>
                                    <span className="text-lg font-medium">−</span>
                                </button>
                                <span className="text-base font-semibold text-header-black w-8 text-center">{infants}</span>
                                <button
                                    onClick={() => setInfants(infants + 1)}
                                    className="w-9 h-9 rounded-full border border-primary-default bg-natural-white text-primary-default hover:bg-primary-default-80 flex items-center justify-center cursor-pointer transition-colors">
                                    <span className="text-lg font-medium">+</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Child Ages Section */}
                    {children > 0 && (
                        <div className=" ml-[50px] border-t border-grey_4 pt-6 mb-6">
                            <h3 className="text-base font-medium text-grey-grey_2 mb-4">Child Ages</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {Array.from({ length: children }).map((_, index) => (
                                    <div key={index}>
                                        <label
                                            className="block mb-2 font-['Red_Hat_Display'] text-[14px] font-[467] leading-[18px] tracking-[-0.28px]"
                                            style={{ color: '#747474' }}>
                                            Child {index + 1} age (yrs)
                                        </label>
                                        <select
                                            value={childAges[index] !== undefined ? childAges[index] : ''}
                                            onChange={(e) => handleChildAgeChange(index, Number(e.target.value))}
                                            className="w-full pl-4 pr-10 py-3 rounded-xl border border-grey-grey_4 bg-natural-white text-base font-medium text-header-black cursor-pointer hover:border-primary-default focus:outline-none focus:border-primary-default transition-colors appearance-none"
                                            style={{
                                                borderRadius: '12px',
                                                border: '1px solid #E0E0E0',
                                                background: '#FFF',
                                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23363636' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                                                backgroundRepeat: 'no-repeat',
                                                backgroundPosition: 'right 1rem center',
                                                backgroundSize: '12px 8px'
                                            }}>
                                            <option
                                                value=""
                                                disabled>
                                                Select age
                                            </option>
                                            {Array.from({ length: 18 }, (_, i) => i).map((age) => (
                                                <option
                                                    key={age}
                                                    value={age}>
                                                    {age}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    </div>
                    {/* Apply Button — sticky at bottom on mobile, with safe spacing above floating chat bar */}
                    <div className="max-md:px-6 max-md:pb-6 max-md:pt-3 max-md:shrink-0 max-md:bg-white md:contents">
                    <button
                        onClick={handleApply}
                        className="w-full h-12 bg-header-black text-natural-white rounded-md font-semibold text-base hover:bg-opacity-90 transition-all duration-200 flex items-center justify-center gap-2 max-md:rounded-xl">
                        <span>Done</span>
                    </button>
                    </div>
                </div>
            </div>
        </>
    )

    return usePortal ? createPortal(modalContent, container) : modalContent
}
