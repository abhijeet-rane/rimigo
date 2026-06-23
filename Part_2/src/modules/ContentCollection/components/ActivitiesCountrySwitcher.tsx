import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface CountrySwitcherOption {
    id: string
    name: string
}

interface ActivitiesCountrySwitcherProps {
    countries: CountrySwitcherOption[]
    selectedCountryId: string | null
    onSelect: (countryId: string) => void
}

/**
 * Country dropdown for the Activities tab header. Sits at the head of the
 * chip row (grey-5 tile, name + chevron); opening it lists every trip
 * country. Selecting one swaps the Overview/city chips to that country's
 * scope. Rendered for single-country trips too (one-item list) so the
 * header reads identically across trips.
 */
const ActivitiesCountrySwitcher: React.FC<ActivitiesCountrySwitcherProps> = ({ countries, selectedCountryId, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement | null>(null)

    // Click-outside closes the menu.
    useEffect(() => {
        if (!isOpen) return
        const onPointerDown = (e: MouseEvent | TouchEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', onPointerDown)
        document.addEventListener('touchstart', onPointerDown)
        return () => {
            document.removeEventListener('mousedown', onPointerDown)
            document.removeEventListener('touchstart', onPointerDown)
        }
    }, [isOpen])

    const handleSelect = useCallback(
        (countryId: string) => {
            setIsOpen(false)
            onSelect(countryId)
        },
        [onSelect]
    )

    const selected = countries.find((c) => c.id === selectedCountryId) ?? countries[0]
    if (!selected) return null

    return (
        <div
            ref={rootRef}
            className="relative h-full shrink-0">
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className="h-full flex items-center px-4 bg-grey-5 hover:bg-grey-4/60 transition-colors cursor-pointer">
                <span className="flex items-center gap-1 text-[14px] font-bold font-red-hat-display text-grey-0 tracking-[-0.28px] leading-[18px] whitespace-nowrap">
                    {selected.name}
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </span>
            </button>

            {isOpen && (
                <div
                    role="listbox"
                    className="absolute left-0 top-full mt-1 z-50 min-w-[200px] rounded-xl border border-grey-4 bg-white shadow-[0px_4px_12px_rgba(0,0,0,0.10)] overflow-hidden">
                    {countries.map((country) => {
                        const isSelected = country.id === selected.id
                        return (
                            <button
                                key={country.id}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => handleSelect(country.id)}
                                className={`w-full flex items-center px-4 py-3 text-left transition-colors cursor-pointer ${
                                    isSelected ? 'bg-grey-5' : 'bg-white hover:bg-grey-5'
                                }`}>
                                <span className="text-[14px] font-bold font-red-hat-display text-grey-0 tracking-[-0.28px] leading-[18px] whitespace-nowrap">
                                    {country.name}
                                </span>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default ActivitiesCountrySwitcher
