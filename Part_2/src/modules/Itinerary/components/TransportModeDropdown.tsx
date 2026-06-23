/**
 * Searchable transport mode picker for the Add Slot modal.
 *
 * Renders the ~150 entries from ``transportModes.ts`` grouped by
 * category with typeahead search across labels + aliases + hints.
 * Selection stores the ``TransportMode`` (label + kind) so the parent
 * can forward ``label`` as ``slot_data.mode`` and ``kind`` as
 * ``slot.kind``.
 */
import { ChangeEvent, useMemo, useRef, useState, useEffect } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import {
    TRANSPORT_CATEGORY_ORDER,
    TRANSPORT_MODES,
    TransportCategory,
    TransportMode,
    findTransportMode,
} from '../constants/transportModes'

interface Props {
    value?: TransportMode | null
    onChange: (mode: TransportMode | null) => void
    placeholder?: string
    /** Pre-select by free-form label (e.g. loading an existing slot's ``slot_data.mode``). */
    initialLabel?: string | null
}

const MATCH_LIMIT = 12 // cap per category in search results so typeahead stays readable

const TransportModeDropdown = ({
    value,
    onChange,
    placeholder = 'Search modes (train, tuk-tuk, ferry…)',
    initialLabel,
}: Props) => {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Preload from a stored label when the parent rehydrates an existing slot.
    useEffect(() => {
        if (!value && initialLabel) {
            const match = findTransportMode(initialLabel)
            if (match) onChange(match)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialLabel])

    // Close on outside click.
    useEffect(() => {
        if (!open) return
        const onDocClick = (ev: MouseEvent) => {
            if (!containerRef.current?.contains(ev.target as Node)) {
                setOpen(false)
                setQuery('')
            }
        }
        document.addEventListener('mousedown', onDocClick)
        return () => document.removeEventListener('mousedown', onDocClick)
    }, [open])

    // Focus the input whenever the dropdown opens.
    useEffect(() => {
        if (open) {
            // next tick — the input only exists after the panel mounts
            const id = window.setTimeout(() => inputRef.current?.focus(), 0)
            return () => window.clearTimeout(id)
        }
    }, [open])

    const filtered: Record<TransportCategory, TransportMode[]> = useMemo(() => {
        const groups: Record<string, TransportMode[]> = {}
        const needle = query.trim().toLowerCase()
        if (!needle) {
            // No query → show everything, ordered by category.
            for (const mode of TRANSPORT_MODES) {
                if (!groups[mode.category]) groups[mode.category] = []
                groups[mode.category].push(mode)
            }
            return groups as Record<TransportCategory, TransportMode[]>
        }
        // Token-AND match: every whitespace-separated token must appear in
        // label, aliases, or hint (all lowercased). Lets "tokyo metro"
        // find Tokyo Metro without matching "Metro" in Paris.
        const tokens = needle.split(/\s+/).filter(Boolean)
        for (const mode of TRANSPORT_MODES) {
            const haystack = [
                mode.label,
                mode.category,
                mode.hint ?? '',
                ...mode.aliases,
            ]
                .join(' ')
                .toLowerCase()
            const hit = tokens.every((t) => haystack.includes(t))
            if (!hit) continue
            if (!groups[mode.category]) groups[mode.category] = []
            if (groups[mode.category].length < MATCH_LIMIT) groups[mode.category].push(mode)
        }
        return groups as Record<TransportCategory, TransportMode[]>
    }, [query])

    const orderedGroups = TRANSPORT_CATEGORY_ORDER.filter((c) => filtered[c]?.length).map((c) => ({
        category: c,
        modes: filtered[c],
    }))

    const totalHits = orderedGroups.reduce((sum, g) => sum + g.modes.length, 0)

    const handleSelect = (mode: TransportMode) => {
        onChange(mode)
        setOpen(false)
        setQuery('')
    }

    const handleClear = (ev: React.MouseEvent) => {
        ev.stopPropagation()
        onChange(null)
        setQuery('')
    }

    const handleQueryChange = (ev: ChangeEvent<HTMLInputElement>) => {
        setQuery(ev.target.value)
    }

    return (
        <div className="relative" ref={containerRef}>
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 h-10 px-4 border border-grey-4 rounded-[12px] bg-white hover:border-grey-3 focus-within:border-primary-default transition-colors text-left cursor-pointer">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    {value ? (
                        <>
                            <value.icon
                                size={16}
                                className="text-grey-1 shrink-0"
                            />
                            <span className="text-sm font-manrope font-medium text-grey-0 truncate">
                                {value.label}
                            </span>
                            {value.hint && (
                                <span className="text-xs font-manrope text-grey-2 truncate">
                                    · {value.hint}
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="text-sm font-manrope text-grey-2">Select transport mode</span>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    {value && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-0.5 rounded hover:bg-grey-4 transition-colors"
                            aria-label="Clear selection">
                            <X size={14} className="text-grey-2" />
                        </button>
                    )}
                    <ChevronDown
                        size={16}
                        className={`text-grey-2 transition-transform ${open ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-grey-4 rounded-[12px] shadow-lg max-h-[360px] flex flex-col overflow-hidden">
                    {/* Search input */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-grey-5 bg-grey-6">
                        <Search size={14} className="text-grey-2 shrink-0" />
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={handleQueryChange}
                            placeholder={placeholder}
                            className="flex-1 bg-transparent outline-none text-sm font-manrope text-grey-0 placeholder:text-grey-3"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                className="p-0.5 rounded hover:bg-grey-4 transition-colors"
                                aria-label="Clear search">
                                <X size={12} className="text-grey-2" />
                            </button>
                        )}
                    </div>

                    {/* Results */}
                    <div className="flex-1 overflow-y-auto">
                        {totalHits === 0 ? (
                            <div className="px-4 py-6 text-center text-sm font-manrope text-grey-2">
                                No modes match "{query}". Try a different term.
                            </div>
                        ) : (
                            orderedGroups.map(({ category, modes }) => (
                                <div key={category} className="py-1">
                                    <div className="px-3 py-1 text-[11px] font-manrope font-bold uppercase tracking-wide text-grey-2 bg-grey-6">
                                        {category}
                                    </div>
                                    {modes.map((mode) => {
                                        const isSelected = value?.label === mode.label
                                        return (
                                            <button
                                                key={mode.label}
                                                type="button"
                                                onClick={() => handleSelect(mode)}
                                                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-grey-5 transition-colors cursor-pointer ${
                                                    isSelected ? 'bg-primary-default/5' : ''
                                                }`}>
                                                <mode.icon
                                                    size={16}
                                                    className={`shrink-0 ${
                                                        isSelected ? 'text-primary-default' : 'text-grey-1'
                                                    }`}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-manrope font-medium text-grey-0 truncate">
                                                        {mode.label}
                                                    </div>
                                                    {mode.hint && (
                                                        <div className="text-xs font-manrope text-grey-2 truncate">
                                                            {mode.hint}
                                                        </div>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <Check
                                                        size={14}
                                                        className="text-primary-default shrink-0"
                                                    />
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default TransportModeDropdown
