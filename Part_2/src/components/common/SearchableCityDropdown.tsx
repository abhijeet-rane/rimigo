import React, { useState, useEffect, useRef } from 'react'
import { MapPin, ChevronDown, X, Loader2, Search } from 'lucide-react'
import { searchCities } from '@/pages/Stays/Services/Cities'
import { CityListItem } from '@/components/common/SearchBar'
import { toast } from 'sonner'

interface SearchableCityDropdownProps {
    value?: CityListItem | null
    onChange: (city: CityListItem | null) => void
    placeholder?: string
    initialCities?: CityListItem[]
    countryIds?: string[]
    className?: string
    disabled?: boolean
    /**
     * Compact form-field sizing (``h-10`` / ``text-sm``) to match the
     * standard composer inputs. Defaults to the original roomier
     * 16px-padding / 16px-text styling used by existing callers.
     */
    compact?: boolean
}

const SearchableCityDropdown: React.FC<SearchableCityDropdownProps> = ({
    value,
    onChange,
    placeholder = 'Search for a city...',
    initialCities = [],
    className = '',
    disabled = false,
    compact = false
}) => {
    const [isOpen, setIsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [cities, setCities] = useState<CityListItem[]>(initialCities)
    const [isLoading, setIsLoading] = useState(false)
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const initialCitiesRef = useRef(initialCities)

    const [highlightedIndex, setHighlightedIndex] = useState(-1)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    // Update ref when initialCities changes
    useEffect(() => {
        initialCitiesRef.current = initialCities
    }, [initialCities])

    // Handle search query changes with debouncing
    useEffect(() => {
        // Clear any pending search
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current)
            searchTimeoutRef.current = null
        }

        if (!isOpen) {
            setIsLoading(false)
            return
        }

        const trimmedQuery = searchQuery.trim()

        // If query is too short, show initial cities immediately without loading
        if (trimmedQuery.length < 2) {
            setIsLoading(false)
            if (initialCitiesRef.current.length > 0) {
                setCities(initialCitiesRef.current)
            } else {
                setCities([])
            }
            return
        }

        // Debounce the search - set loading immediately, then search after delay
        setIsLoading(true)
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const results = await searchCities(trimmedQuery)
                setCities(results)
            } catch (error) {
                toast.error((error as Error).message || 'Error searching cities')
                setCities([])
            } finally {
                setIsLoading(false)
            }
        }, 300)

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current)
                searchTimeoutRef.current = null
            }
        }
    }, [searchQuery, isOpen])

    // Load initial cities when dropdown opens (only if no search query)
    useEffect(() => {
        if (isOpen && !searchQuery.trim() && initialCitiesRef.current.length > 0) {
            setCities(initialCitiesRef.current)
            setIsLoading(false)
        }
    }, [isOpen, searchQuery])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
                setSearchQuery('')
                setHighlightedIndex(-1)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                if (!isOpen) {
                    setIsOpen(true)
                } else {
                    setHighlightedIndex((prev) => (prev < cities.length - 1 ? prev + 1 : prev))
                }
                break
            case 'ArrowUp':
                e.preventDefault()
                if (isOpen) {
                    setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
                }
                break
            case 'Enter':
                e.preventDefault()
                if (isOpen && highlightedIndex >= 0 && cities[highlightedIndex]) {
                    handleSelect(cities[highlightedIndex])
                } else if (!isOpen) {
                    setIsOpen(true)
                }
                break
            case 'Escape':
                setIsOpen(false)
                setSearchQuery('')
                setHighlightedIndex(-1)
                break
        }
    }

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const items = listRef.current.querySelectorAll('[data-city-index]')
            const highlightedItem = items[highlightedIndex] as HTMLElement
            if (highlightedItem) {
                highlightedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            }
        }
    }, [highlightedIndex])

    const handleSelect = (city: CityListItem) => {
        onChange(city)
        setIsOpen(false)
        setSearchQuery('')
        setHighlightedIndex(-1)
        inputRef.current?.blur()
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        onChange(null)
        setSearchQuery('')
        setIsOpen(false)
    }

    return (
        <div
            ref={dropdownRef}
            className={`relative ${className}`}>
            {/* Trigger — ALWAYS a static field showing the current
                selection (or the placeholder). Tapping it just opens
                the dropdown; it never turns into an input, so the
                mobile keyboard doesn't pop the moment the user taps
                the field. The search box lives inside the dropdown
                menu instead — the user opts into typing by tapping
                it there. */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen((prev) => !prev)}
                className={`relative flex items-center gap-2 w-full rounded-xl bg-white border border-grey-4 text-left transition-colors ${
                    compact ? 'px-4 py-2 min-h-[40px]' : 'px-4 py-4'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-grey-3'}`}
                style={{ fontFamily: "'Manrope', sans-serif" }}>
                <MapPin className="h-4.5 w-4.5 text-primary-default shrink-0" />
                <span
                    className="flex-1 font-medium truncate"
                    style={{
                        fontFamily: "'Manrope', sans-serif",
                        color: value ? 'var(--color-grey-0)' : 'var(--color-grey-2)',
                        fontSize: compact ? '14px' : '16px',
                        lineHeight: '100%',
                        letterSpacing: '-1%'
                    }}>
                    {value ? value.name : placeholder}
                </span>

                <div className="flex items-center gap-1 shrink-0">
                    {value && !disabled && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={handleClear}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    onChange(null)
                                    setSearchQuery('')
                                    setIsOpen(false)
                                }
                            }}
                            className="p-1 hover:bg-grey-5 rounded transition-colors cursor-pointer"
                            aria-label="Clear selection">
                            <X className="h-3 w-3 text-grey-2" />
                        </span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-grey-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Dropdown Menu — opens upwards on mobile (where the
                modal/sheet sits near the bottom of the viewport and
                opening downwards either clips off-screen or hides the
                list behind the on-screen keyboard) and downwards on
                tablet/desktop (regular dropdown affordance). The menu
                contains its own search input at the top + scrollable
                city list.
                Height is capped via `max-h` so the list scrolls
                internally instead of overflowing the modal / running
                under the mobile keyboard. The `max-md` cap is tighter
                (260px) because the available space above the trigger
                shrinks once the keyboard slides up. */}
            {isOpen && (
                <div className="absolute z-50 w-full max-md:bottom-full max-md:mb-1 md:top-full md:mt-1 bg-white border border-grey-4 rounded-xl shadow-lg overflow-hidden flex flex-col max-md:max-h-[260px] md:max-h-[280px]">
                    {/* Search input — lives inside the dropdown so the
                        mobile keyboard only appears when the user
                        actively taps to type. No autoFocus. */}
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-grey-4">
                        <Search className="h-4 w-4 text-grey-2 shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                                setHighlightedIndex(-1)
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Search for a city..."
                            className="flex-1 outline-none font-medium text-grey-0 placeholder:text-grey-2 bg-transparent"
                            style={{
                                fontFamily: "'Manrope', sans-serif",
                                color: 'var(--color-grey-0)',
                                fontSize: '16px',
                                lineHeight: '100%',
                                letterSpacing: '-1%'
                            }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('')
                                    setHighlightedIndex(-1)
                                }}
                                aria-label="Clear search"
                                className="p-1 hover:bg-grey-5 rounded transition-colors">
                                <X className="h-3 w-3 text-grey-2" />
                            </button>
                        )}
                    </div>

                    <div
                        ref={listRef}
                        data-overlay-scroll
                        className="overflow-y-auto overscroll-contain flex-1">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-5 w-5 text-primary-default animate-spin" />
                            </div>
                        ) : cities.length > 0 ? (
                            cities.map((city, index) => (
                                <div
                                    key={city.id}
                                    data-city-index={index}
                                    className={`
                                        flex items-center gap-2 px-3.5 py-3.5 cursor-pointer
                                        transition-colors duration-150
                                        ${highlightedIndex === index ? 'bg-primary-default/10' : 'hover:bg-grey-5'}
                                    `}
                                    onClick={() => handleSelect(city)}
                                    onMouseEnter={() => setHighlightedIndex(index)}>
                                    <MapPin className="h-4.5 w-4.5 text-primary-default shrink-0" />
                                    <span
                                        className="font-medium text-grey-0 flex-1"
                                        style={{
                                            fontFamily: "'Manrope', sans-serif",
                                            fontSize: compact ? '0.875rem' : 'var(--font-size-16)',
                                            color: 'var(--color-grey-0)',
                                            lineHeight: '100%',
                                            letterSpacing: '-1%'
                                        }}>
                                        {city.name}
                                    </span>
                                    {value?.id === city.id && <div className="h-2 w-2 rounded-full bg-primary-default shrink-0" />}
                                </div>
                            ))
                        ) : searchQuery.length >= 2 ? (
                            <div className="px-3 py-8 text-center text-sm text-grey-2">No cities found</div>
                        ) : (
                            <div className="px-3 py-8 text-center text-sm text-grey-2">
                                {searchQuery.length > 0 && searchQuery.length < 2
                                    ? 'Type at least 2 characters to search'
                                    : 'Start typing to search for cities'}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default SearchableCityDropdown
