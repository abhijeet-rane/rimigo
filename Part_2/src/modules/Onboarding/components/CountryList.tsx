import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import Typography from '@/components/shared/Typography'
import { filterCountries, type Country } from '../utils/countrySearch'
import { CountryRow } from './CountryRow'

interface CountryListProps {
    selected: Country
    onSelect: (c: Country) => void
    onClose?: () => void
    autoFocus?: boolean
    title?: string
}

export const CountryList: React.FC<CountryListProps> = ({
    selected,
    onSelect,
    onClose,
    autoFocus,
    title = 'Select country'
}) => {
    const [search, setSearch] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!autoFocus) return
        const t = setTimeout(() => inputRef.current?.focus(), 60)
        return () => clearTimeout(t)
    }, [autoFocus])

    const filtered = useMemo(() => filterCountries(search), [search])

    return (
        <div className="flex flex-col h-full min-h-0 bg-natural-white">
            <div className="sticky top-0 z-10 bg-natural-white px-3 pt-3 pb-2 border-b border-grey-5">
                {onClose && (
                    <div className="flex items-center justify-between mb-2 px-1">
                        <Typography
                            family="manrope"
                            weight="semibold"
                            size="16"
                            color="grey-0">
                            {title}
                        </Typography>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className="p-1 -mr-1 rounded-full text-grey-1 hover:text-grey-0 hover:bg-grey-5 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                )}
                <div className="flex items-center gap-2 h-10 px-3 rounded-[10px] bg-grey-5 border border-grey-4 focus-within:border-grey-0 transition-colors">
                    <Search
                        size={16}
                        className="text-grey-2 shrink-0"
                    />
                    <input
                        ref={inputRef}
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search country or dial code"
                        className="flex-1 bg-transparent outline-none font-manrope text-size-sm text-grey-0 placeholder-grey-2"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch('')}
                            aria-label="Clear search"
                            className="text-grey-2 hover:text-grey-0 shrink-0">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain py-1 scrollbar-thin scrollbar-thumb-grey-4 scrollbar-track-transparent">
                {filtered.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                        <Typography
                            family="manrope"
                            weight="medium"
                            size="14"
                            color="grey-2">
                            No countries match "{search}"
                        </Typography>
                    </div>
                ) : (
                    filtered.map((item) => (
                        <CountryRow
                            key={item.code + item.name}
                            country={item}
                            selected={selected.code === item.code && selected.name === item.name}
                            onClick={() => onSelect(item)}
                        />
                    ))
                )}
            </div>
        </div>
    )
}
