import { Baby, User } from 'lucide-react'
import { useEffect, useState } from 'react'

export interface GuestsData {
    adults: number
    children: number
    infants: number
    children_age: number[]
}

interface WhoIsGoingProps {
    value: GuestsData
    onChange: (data: GuestsData) => void
    onNext?: () => void
    initialData?: GuestsData
}

export const WhoIsGoing: React.FC<WhoIsGoingProps> = ({ value, onChange }) => {
    const [adults, setAdults] = useState(value?.adults ?? 1)
    const [children, setChildren] = useState(value?.children ?? 0)
    const [infants, setInfants] = useState(value?.infants ?? 0)
    const [childAges, setChildAges] = useState<number[]>(value?.children_age ?? [])

    /* Sync from parent */
    useEffect(() => {
        if (!value) return
        setAdults(value.adults ?? 1)
        setChildren(value.children ?? 0)
        setInfants(value.infants ?? 0)
        setChildAges(value.children_age ?? [])
    }, [value])

    /* Auto-manage child ages */
    useEffect(() => {
        if (children > childAges.length) {
            const next = [...childAges]
            for (let i = childAges.length; i < children; i++) next.push(5)
            setChildAges(next)
        } else if (children < childAges.length) {
            setChildAges(childAges.slice(0, children))
        }
    }, [children, childAges])

    const handleAdultsChange = (newAdults: number) => {
        setAdults(newAdults)
        onChange({
            adults: newAdults,
            children,
            infants,
            children_age: childAges.slice(0, children)
        })
    }

    const handleChildrenChange = (newChildren: number) => {
        setChildren(newChildren)
        onChange({
            adults,
            children: newChildren,
            infants,
            children_age: childAges.slice(0, newChildren)
        })
    }

    const handleInfantsChange = (newInfants: number) => {
        setInfants(newInfants)
        onChange({
            adults,
            children,
            infants: newInfants,
            children_age: childAges.slice(0, children)
        })
    }

    const handleChildAgeChange = (index: number, age: number) => {
        const next = [...childAges]
        next[index] = age
        setChildAges(next)
        onChange({
            adults,
            children,
            infants,
            children_age: next.slice(0, children)
        })
    }

    const CounterRow = ({
        icon,
        label,
        subtitle,
        value,
        onDecrease,
        onIncrease,
        disableDecrease
    }: {
        icon: React.ReactNode
        label: string
        subtitle: string
        value: number
        onDecrease: () => void
        onIncrease: () => void
        disableDecrease: boolean
    }) => (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-grey-grey_5 flex items-center justify-center">{icon}</div>
                <div>
                    <p className="font-['Red_Hat_Display'] text-[16px] font-[550] leading-[20px] tracking-[-0.32px] text-[#363636]">{label}</p>
                    <p className="font-['Manrope'] text-[12px] font-semibold tracking-[-0.24px] text-[#747474]">{subtitle}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={onDecrease}
                    disabled={disableDecrease}
                    className={`w-9 h-9 flex items-center justify-center transition-colors ${
                        disableDecrease
                            ? 'rounded-full border border-grey-grey_4 bg-grey-grey_5 cursor-not-allowed opacity-40'
                            : 'rounded-full border border-primary-default bg-natural-white text-primary-default hover:bg-primary-default-80 cursor-pointer'
                    }`}>
                    <span className="text-lg font-medium">−</span>
                </button>
                <span className="text-base font-semibold text-header-black w-8 text-center">{value}</span>
                <button
                    onClick={onIncrease}
                    className="w-9 h-9 rounded-full border border-primary-default bg-natural-white text-primary-default hover:bg-primary-default-80 flex items-center justify-center cursor-pointer transition-colors">
                    <span className="text-lg font-medium">+</span>
                </button>
            </div>
        </div>
    )

    return (
        <div className=" pb-[24px] space-y-6">
            {/* Adults */}
            <CounterRow
                icon={<User className="w-5 h-5 text-grey-grey_2" />}
                label="Adult"
                subtitle="18+ years"
                value={adults}
                onDecrease={() => handleAdultsChange(Math.max(1, adults - 1))}
                onIncrease={() => handleAdultsChange(adults + 1)}
                disableDecrease={adults <= 1}
            />

            {/* Children */}
            <CounterRow
                icon={<Baby className="w-5 h-5 text-grey-grey_2" />}
                label="Child"
                subtitle="2–17 years"
                value={children}
                onDecrease={() => handleChildrenChange(Math.max(0, children - 1))}
                onIncrease={() => handleChildrenChange(children + 1)}
                disableDecrease={children <= 0}
            />

            {/* Child Ages */}
            {children > 0 && (
                <div className="ml-[30px] space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {Array.from({ length: children }).map((_, index) => (
                            <div key={index}>
                                <label className="block mb-2 font-['Red_Hat_Display'] text-[14px] font-[467] leading-[18px] tracking-[-0.28px] text-[#747474]">
                                    Child {index + 1} age (yrs)
                                </label>
                                <select
                                    value={childAges[index] ?? ''}
                                    onChange={(e) => handleChildAgeChange(index, Number(e.target.value))}
                                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-grey-grey_4 bg-natural-white text-base font-medium text-header-black cursor-pointer hover:border-primary-default focus:outline-none focus:border-primary-default appearance-none"
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
                                    {Array.from({ length: 18 }, (_, age) => (
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

            {/* Infants */}
            <CounterRow
                icon={<Baby className="w-4 h-4 text-grey-grey_2" />}
                label="Infant"
                subtitle="Under 2"
                value={infants}
                onDecrease={() => handleInfantsChange(Math.max(0, infants - 1))}
                onIncrease={() => handleInfantsChange(infants + 1)}
                disableDecrease={infants <= 0}
            />
        </div>
    )
}

export default WhoIsGoing
