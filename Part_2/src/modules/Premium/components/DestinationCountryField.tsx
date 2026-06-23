import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Search, X } from 'lucide-react'
import { countryCodes } from '@/utils/country-code'

interface Props {
    value: string
    onChange: (countryName: string) => void
    /** Validation message shown under the trigger when no destination is picked. */
    error?: string
}

/**
 * Destination picker used in the destination-callback modal.
 *
 * Custom searchable combobox (button → portaled list with a search input).
 * Reuses `countryCodes` — same source the phone picker uses, so we never
 * need a separate API call. Portaled so the modal's overflow-y-auto doesn't
 * clip / scroll-trap the list, and z-[300] floats above the modal (z-260).
 */
export function DestinationCountryField({ value, onChange, error }: Props) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const wrapperRef = useRef<HTMLDivElement | null>(null)
    const dropdownRef = useRef<HTMLDivElement | null>(null)
    const inputRef = useRef<HTMLInputElement | null>(null)

    // Phone-codes list has duplicates for shared dial codes (e.g. +1).
    // Show each country once and keep India pinned to the top.
    const options = useMemo(() => {
        const seen = new Set<string>()
        return countryCodes.filter((c) => {
            if (seen.has(c.name)) return false
            seen.add(c.name)
            return true
        })
    }, [])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return options
        return options.filter((c) => c.name.toLowerCase().includes(q))
    }, [options, query])

    // Position the portaled list relative to the trigger, and clamp height
    // to the viewport. Flips above if there isn't room below.
    const [pos, setPos] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
    useLayoutEffect(() => {
        if (!open) {
            setPos(null)
            return
        }
        const update = () => {
            const el = wrapperRef.current
            if (!el) return
            const r = el.getBoundingClientRect()
            const vh = window.innerHeight
            const gap = 8
            const desired = 320
            const spaceBelow = vh - r.bottom - gap
            const spaceAbove = r.top - gap
            const placeAbove = spaceBelow < 220 && spaceAbove > spaceBelow
            const height = Math.min(desired, Math.max(180, placeAbove ? spaceAbove : spaceBelow))
            const top = placeAbove ? r.top - gap - height : r.bottom + gap
            setPos({ top, left: r.left, width: r.width, height })
        }
        update()
        window.addEventListener('resize', update)
        window.addEventListener('scroll', update, true)
        return () => {
            window.removeEventListener('resize', update)
            window.removeEventListener('scroll', update, true)
        }
    }, [open])

    // Close on outside click. Both trigger AND portaled list count as inside.
    useEffect(() => {
        if (!open) return
        const onMouseDown = (e: MouseEvent) => {
            const t = e.target as Node
            if (wrapperRef.current?.contains(t)) return
            if (dropdownRef.current?.contains(t)) return
            setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', onMouseDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onMouseDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [open])

    // Autofocus the search input when the list opens; reset query on close.
    useEffect(() => {
        if (open) {
            inputRef.current?.focus()
        } else {
            setQuery('')
        }
    }, [open])

    const selected = options.find((c) => c.name === value)
    // Only surface the error while no destination is picked — selecting one
    // clears it; we never want a stale phone-validation message bleeding in.
    const showError = !!error && !value

    return (
        <div ref={wrapperRef}>
            <label className="font-red-hat-display text-[13px] font-semibold tracking-[0.04em] text-grey-1 uppercase">
                Destination
            </label>
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-invalid={showError}
                onClick={() => setOpen((o) => !o)}
                className={`mt-2 flex h-11 w-full items-center justify-between rounded-xl border bg-white px-3 text-[14px] font-manrope text-grey-0 transition-colors focus:outline-none ${showError ? 'border-secondary-red focus:border-secondary-red' : 'border-grey-4 focus:border-primary-default/60'}`}>
                <span className={selected ? '' : 'text-grey-2'}>
                    {selected ? (
                        <>
                            <span className="mr-2">{selected.flag}</span>
                            {selected.name}
                        </>
                    ) : (
                        'Select a country'
                    )}
                </span>
                <ChevronDown className={`h-4 w-4 text-grey-2 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {showError && (
                <p
                    role="alert"
                    className="mt-1 text-[12px] font-medium font-manrope"
                    style={{ color: 'var(--color-secondary-red)' }}>
                    {error}
                </p>
            )}

            {open && pos && createPortal(
                <div
                    ref={dropdownRef}
                    role="listbox"
                    style={{
                        position: 'fixed',
                        top: pos.top,
                        left: pos.left,
                        width: pos.width,
                        height: pos.height
                    }}
                    className="z-[300] flex flex-col rounded-xl border border-grey-4 bg-white shadow-lg overflow-hidden animate-in fade-in-0 slide-in-from-top-1 duration-150">
                    <div className="relative border-b border-grey-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-2" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search countries"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="h-10 w-full pl-9 pr-9 text-[14px] font-manrope text-grey-0 placeholder:text-grey-2 focus:outline-none"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery('')
                                    inputRef.current?.focus()
                                }}
                                aria-label="Clear search"
                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-grey-5">
                                <X className="h-3.5 w-3.5 text-grey-2" />
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-6 text-center text-[13px] font-manrope text-grey-2">
                                No matches
                            </div>
                        ) : (
                            filtered.map((c) => {
                                const isActive = c.name === value
                                return (
                                    <button
                                        key={c.name}
                                        type="button"
                                        onClick={() => {
                                            onChange(c.name)
                                            setOpen(false)
                                        }}
                                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] font-manrope text-grey-0 hover:bg-grey-5 ${isActive ? 'bg-grey-5 font-semibold' : ''}`}>
                                        <span>{c.flag}</span>
                                        <span>{c.name}</span>
                                    </button>
                                )
                            })
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
