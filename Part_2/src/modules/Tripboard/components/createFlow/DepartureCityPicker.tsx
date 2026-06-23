import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Loader2, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { POPULAR_DEPARTURE_CITIES, type DepartureCityConfig } from './popularDepartureCities'
import { searchAirports, type Airport } from '@/api/flights/airportSearchAPI'
import { useDebounce } from '@/hooks/useDebounce'
import { countryEmoji } from './countryEmoji'

export interface DepartureCityPickerProps {
    /** Currently-selected departure city, or null when nothing is picked yet. */
    value: DepartureCityConfig | null
    /** Fires when the user picks a city from the dropdown. */
    onSelect: (city: DepartureCityConfig) => void
    /** Trigger style — 'default' is the bordered pill in the journey strip;
     *  'edit-link' is a compact brand-purple "Edit" text button used next to
     *  the Start/End city rows in the route panel. Same dropdown either way. */
    variant?: 'default' | 'edit-link'
    /** When this value changes (to a defined number), open the dropdown
     *  programmatically. Used by the mobile route screen to pop the picker when
     *  the user taps Next without a departure city set. */
    autoOpenNonce?: number
}

/** Convert an Airport search result into the picker's city shape. */
function airportToCity(a: Airport): DepartureCityConfig {
    return {
        city_name: a.city_name || a.name,
        country_name: a.country_name,
        iata: a.code
    }
}

/**
 * Compact "flying from" picker that lives inline in the journey strip at the
 * top of the Select-Cities frame. Renders as a small button showing the
 * selected city (or a prompt); clicking opens a searchable dropdown of
 * popular + live-searched airports. Replaces the old full-screen FLYING FROM?
 * sub-tab.
 */
export function DepartureCityPicker({ value, onSelect, variant = 'default', autoOpenNonce }: DepartureCityPickerProps) {
    const [open, setOpen] = useState(false)

    // Parent-driven open (mobile route screen taps Next without a departure).
    // Skips the initial mount so it only fires on an actual nonce change (a
    // fresh Next tap), not when re-entering the screen with a stale nonce.
    const autoOpenMountedRef = useRef(false)
    useEffect(() => {
        if (!autoOpenMountedRef.current) {
            autoOpenMountedRef.current = true
            return
        }
        if (autoOpenNonce === undefined) return
        setOpen(true)
    }, [autoOpenNonce])
    const [query, setQuery] = useState('')
    const debouncedQuery = useDebounce(query.trim(), 300)
    const isSearching = debouncedQuery.length >= 2
    const buttonRef = useRef<HTMLButtonElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    /** Viewport coords for the portalled dropdown, measured from the button. */
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null)

    // The dropdown is rendered in a portal on document.body with fixed
    // positioning so it always paints above the sticky journey strip /
    // animated wizard content (no z-index / stacking-context fights). Re-measure
    // whenever it opens and on scroll/resize while open.
    useLayoutEffect(() => {
        if (!open) return
        const measure = () => {
            const r = buttonRef.current?.getBoundingClientRect()
            if (!r) return
            const width = Math.max(r.width, 280)
            // 'edit-link' sits at the panel's right edge → right-align so the
            // 280px panel doesn't spill across the route. Default = left-align.
            const rawLeft = variant === 'edit-link' ? r.right - width : r.left
            // Clamp into the viewport.
            const left = Math.max(8, Math.min(rawLeft, window.innerWidth - width - 8))
            setCoords({ top: r.bottom + 6, left, width })
        }
        measure()
        window.addEventListener('scroll', measure, true)
        window.addEventListener('resize', measure)
        return () => {
            window.removeEventListener('scroll', measure, true)
            window.removeEventListener('resize', measure)
        }
    }, [open, variant])

    // Close on outside click / Escape. The panel lives in a portal, so the
    // outside check must allow clicks inside either the button or the panel.
    useEffect(() => {
        if (!open) return
        const onPointerDown = (e: MouseEvent) => {
            const t = e.target as Node
            if (buttonRef.current?.contains(t) || panelRef.current?.contains(t)) return
            setOpen(false)
        }
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('mousedown', onPointerDown)
            document.removeEventListener('keydown', onKeyDown)
        }
    }, [open])

    const { data, isFetching, isError } = useQuery({
        queryKey: ['departure-airport-search', debouncedQuery],
        queryFn: () => searchAirports(debouncedQuery, 8),
        enabled: open && isSearching,
        staleTime: 60_000
    })

    const searchResults: DepartureCityConfig[] = isSearching ? (data?.data?.airports ?? []).map(airportToCity) : []
    const rows = isSearching ? searchResults : POPULAR_DEPARTURE_CITIES

    const flag = value ? countryEmoji(value.country_name) : undefined

    return (
        <>
            {variant === 'edit-link' ? (
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    aria-label={value ? `Change departure city (currently ${value.city_name})` : 'Select departure city'}
                    className="shrink-0 transition-colors"
                    style={{
                        color: 'var(--text-brand, #7011F6)',
                        fontFamily: 'var(--font-family-body, Manrope)',
                        fontSize: 'var(--font-size-14, 14px)',
                        fontWeight: 600,
                        lineHeight: '18px',
                        letterSpacing: '-0.28px'
                    }}>
                    Edit
                </button>
            ) : (
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 transition-colors hover:bg-[var(--surface-sunken,#F5F4F7)]"
                    /* Empty = required: brand-purple border so it reads as a field the
                       user still has to fill (the red `*` reinforces it). */
                    style={{ borderColor: value ? 'var(--color-grey-4, #E0E0E0)' : 'var(--border-focus, #7011F6)' }}>
                    {flag && (
                        <span
                            aria-hidden
                            className="text-base leading-none">
                            {flag}
                        </span>
                    )}
                    <span
                        style={{
                            color: value ? '#000' : 'var(--text-brand, #7011F6)',
                            fontFamily: 'var(--font-family-title)',
                            fontSize: 'var(--font-size-12)',
                            fontWeight: 550,
                            lineHeight: '16px',
                            letterSpacing: '-0.24px'
                        }}>
                        {value ? `${value.city_name} (${value.iata})` : 'Select departure city'}
                        {!value && <span style={{ color: '#E11D48' }}> *</span>}
                    </span>
                    <ChevronDown
                        size={14}
                        strokeWidth={2}
                        className="shrink-0"
                        style={{ color: 'var(--text-tertiary, #4F4F50)' }}
                    />
                </button>
            )}

            {open &&
                coords &&
                createPortal(
                    <div
                        ref={panelRef}
                        role="listbox"
                        className="overflow-hidden rounded-xl border bg-white shadow-lg"
                        style={{
                            position: 'fixed',
                            top: coords.top,
                            left: coords.left,
                            width: coords.width,
                            zIndex: 1000,
                            borderColor: 'var(--color-grey-4, #E0E0E0)'
                        }}>
                        {/* Search input */}
                        <div
                        className="flex items-center gap-2 border-b px-3 py-2.5"
                        style={{ borderColor: 'var(--border-subtle, #DFDDE0)' }}>
                        <Search
                            size={16}
                            className="shrink-0"
                            style={{ color: 'var(--text-placeholder, #ACAAAE)' }}
                        />
                        <input
                            /* No autoFocus — opening the picker should show the
                               dropdown list, NOT pop the mobile keyboard. The
                               keyboard appears only when the user taps the field. */
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search departure city"
                            className="flex-1 border-0 bg-transparent text-[16px] outline-none placeholder:text-[var(--text-placeholder,#ACAAAE)]"
                            style={{
                                fontFamily: 'var(--font-family-body, Manrope)',
                                // 16px minimum so iOS Safari doesn't auto-zoom the
                                // page when the field is focused on mobile.
                                fontSize: '16px',
                                fontWeight: 500,
                                color: 'var(--text-primary, #0D0C0D)'
                            }}
                        />
                        {isSearching && isFetching && (
                            <Loader2
                                size={14}
                                className="animate-spin"
                                style={{ color: 'var(--text-placeholder, #ACAAAE)' }}
                            />
                        )}
                    </div>

                    {/* Results */}
                    <div className="max-h-[260px] overflow-y-auto py-1">
                        {!isSearching && (
                            <p
                                className="px-3 pb-1 pt-2"
                                style={{
                                    color: 'var(--text-tertiary, #4F4F50)',
                                    fontFamily: 'var(--font-family-title)',
                                    fontSize: '11px',
                                    fontWeight: 645,
                                    letterSpacing: '0.04em',
                                    textTransform: 'uppercase'
                                }}>
                                Popular
                            </p>
                        )}
                        {isSearching && isError ? (
                            <p
                                className="px-3 py-3 text-center"
                                style={{ color: 'var(--text-tertiary, #4F4F50)', fontSize: '13px' }}>
                                Couldn&apos;t search airports. Try again.
                            </p>
                        ) : isSearching && !isFetching && rows.length === 0 ? (
                            <p
                                className="px-3 py-3 text-center"
                                style={{ color: 'var(--text-tertiary, #4F4F50)', fontSize: '13px' }}>
                                No cities match &ldquo;{debouncedQuery}&rdquo;
                            </p>
                        ) : (
                            rows.map((c) => {
                                const selected = value?.iata === c.iata
                                return (
                                    <button
                                        key={c.iata}
                                        type="button"
                                        role="option"
                                        aria-selected={selected}
                                        onClick={() => {
                                            onSelect(c)
                                            setOpen(false)
                                            setQuery('')
                                        }}
                                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--surface-sunken,#F5F4F7)]"
                                        style={{ background: selected ? 'var(--surface-sunken, #F5F4F7)' : 'transparent' }}>
                                        <span className="flex min-w-0 items-center gap-2">
                                            <span
                                                aria-hidden
                                                className="text-base leading-none">
                                                {countryEmoji(c.country_name)}
                                            </span>
                                            <span className="min-w-0">
                                                <span
                                                    className="block truncate"
                                                    style={{
                                                        color: 'var(--text-primary, #0D0C0D)',
                                                        fontFamily: 'var(--font-family-body, Manrope)',
                                                        fontSize: '14px',
                                                        fontWeight: 600,
                                                        lineHeight: '18px'
                                                    }}>
                                                    {c.city_name}
                                                </span>
                                                <span
                                                    className="block truncate"
                                                    style={{
                                                        color: 'var(--text-tertiary, #4F4F50)',
                                                        fontFamily: 'var(--font-family-body, Manrope)',
                                                        fontSize: '12px',
                                                        fontWeight: 500,
                                                        lineHeight: '16px'
                                                    }}>
                                                    {c.country_name}
                                                </span>
                                            </span>
                                        </span>
                                        <span
                                            className="shrink-0 rounded-md px-1.5 py-0.5"
                                            style={{
                                                background: 'var(--surface-brand-subtle, #F3ECFE)',
                                                color: 'var(--text-brand, #7011F6)',
                                                fontFamily: 'var(--font-family-body, Manrope)',
                                                fontSize: '11px',
                                                fontWeight: 600
                                            }}>
                                            {c.iata}
                                        </span>
                                    </button>
                                )
                            })
                        )}
                        </div>
                    </div>,
                    document.body
                )}
        </>
    )
}
