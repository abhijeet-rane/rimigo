import React, { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, ArrowUpRight } from 'lucide-react'
import { getAirlineLogo } from '@/pages/Flights/utils/airlineLogoUtils'

interface FlightSegment {
    airline: { code: string; name: string; flight_number: string }
    origin: { airport_code: string; airport_name: string; city_code: string; city_name: string; departure_time: string }
    destination: { airport_code: string; airport_name: string; city_code: string; city_name: string; arrival_time: string }
    duration: { minutes: number; formatted: string }
}

interface FlightLike {
    reference_id: string
    total_price: string
    formatted_duration: string
    stop_count: number
    total_layovers: number
    is_refundable: boolean
    departure_date?: string | null
    return_date?: string | null
    segments: FlightSegment[]
    best_offer?: {
        provider?: string
        price?: number
        currency?: string
        affiliate_url?: string | null
        is_rimigo?: boolean
    }
    price_comparison?: Array<{
        provider: string
        price: number
        cabin?: string
        is_self_transfer?: boolean
        affiliate_url?: string | null
    }>
}

const AIRLINE_PALETTE: Record<string, { bg: string; fg: string; accent: string }> = {
    AF: { bg: '#0B2240', fg: '#FFFFFF', accent: '#E2003F' },
    AI: { bg: '#FFE4D2', fg: '#C0392B', accent: '#C0392B' },
    LH: { bg: '#FFE100', fg: '#05164D', accent: '#05164D' },
    EK: { bg: '#D71921', fg: '#FFFFFF', accent: '#FFFFFF' },
    QR: { bg: '#5C0931', fg: '#FFFFFF', accent: '#FFFFFF' },
    BA: { bg: '#1B3F8B', fg: '#FFFFFF', accent: '#E11C2D' },
    SQ: { bg: '#0B3477', fg: '#FFFFFF', accent: '#FFD200' },
    '6E': { bg: '#001F5C', fg: '#FFFFFF', accent: '#142C5C' },
    UK: { bg: '#5E2C8A', fg: '#FFFFFF', accent: '#FFFFFF' },
    SG: { bg: '#EF4123', fg: '#FFFFFF', accent: '#FFFFFF' },
    G8: { bg: '#FF7522', fg: '#FFFFFF', accent: '#FFFFFF' }
}

function AirlineMark({ code, size = 40 }: { code: string; size?: number }) {
    const [errored, setErrored] = useState(false)
    useEffect(() => {
        setErrored(false)
    }, [code])

    const palette = AIRLINE_PALETTE[code] || { bg: '#101010', fg: '#FFFFFF', accent: '#7011F6' }
    const padding = Math.max(3, Math.round(size * 0.14))

    if (errored || !code || code === '--') {
        return (
            <div
                className="grid place-items-center font-red-hat-display flex-shrink-0 relative overflow-hidden"
                style={{
                    width: size,
                    height: size,
                    borderRadius: 10,
                    background: palette.bg,
                    color: palette.fg,
                    fontWeight: 800,
                    fontSize: Math.round(size * 0.4),
                    letterSpacing: '-0.03em'
                }}>
                <span className="relative z-[1]">{code || '✈'}</span>
                <div
                    className="absolute"
                    style={{
                        right: -4,
                        bottom: -2,
                        width: size * 0.5,
                        height: size * 0.5,
                        background: palette.accent,
                        transform: 'rotate(35deg)',
                        opacity: 0.55,
                        borderRadius: 2
                    }}
                />
            </div>
        )
    }

    return (
        <div
            className="flex-shrink-0 grid place-items-center bg-white"
            style={{
                width: size,
                height: size,
                borderRadius: 10,
                border: '1px solid var(--flight-border, #E0E0E0)',
                overflow: 'hidden'
            }}>
            <img
                src={getAirlineLogo(code)}
                alt={code}
                onError={() => setErrored(true)}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    padding
                }}
            />
        </div>
    )
}

const formatTimeOfDay = (iso?: string) => {
    if (!iso) return '--:--'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '--:--'
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
}

const formatDayMonth = (iso?: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const formatINR = (value: string | number | undefined) => {
    const n = typeof value === 'string' ? Number(value) : (value ?? 0)
    if (!Number.isFinite(n)) return '₹0'
    return `₹${Math.round(n).toLocaleString('en-IN')}`
}

const dayDiff = (from?: string, to?: string) => {
    if (!from || !to) return 0
    const a = new Date(from)
    const b = new Date(to)
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0
    const aDay = new Date(a.getFullYear(), a.getMonth(), a.getDate())
    const bDay = new Date(b.getFullYear(), b.getMonth(), b.getDate())
    return Math.round((bDay.getTime() - aDay.getTime()) / 86400000)
}

const stopsLabel = (segments: FlightSegment[]) => {
    const count = Math.max(0, segments.length - 1)
    if (count === 0) return { count: 0, text: 'Direct', codes: [] as string[] }
    const codes = segments.slice(0, -1).map((s) => s.destination?.airport_code).filter(Boolean) as string[]
    return { count, text: `${count} · ${codes.join(' · ')}`, codes }
}

interface Props {
    flight: FlightLike
    rank: number
    rankMode: 'best' | 'cheapest' | 'fastest' | 'fewest_stops'
    expanded: boolean
    onToggle: () => void
    onSelect: () => void
    onAddToTrip: () => void
    narrow?: boolean
}

const RANK_BADGE: Record<Props['rankMode'], string> = {
    best: 'Top pick',
    cheapest: 'Cheapest',
    fastest: 'Fastest',
    fewest_stops: 'Fewest stops'
}

const FlightDenseRow: React.FC<Props> = ({ flight, rank, rankMode, expanded, onToggle, onSelect, onAddToTrip, narrow }) => {
    const segments = flight.segments || []
    const first = segments[0]
    const last = segments[segments.length - 1]
    const code = first?.airline?.code || '--'
    const airlineName = first?.airline?.name || code
    const departTime = formatTimeOfDay(first?.origin?.departure_time)
    const arriveTime = formatTimeOfDay(last?.destination?.arrival_time)
    const fromCode = first?.origin?.airport_code || ''
    const toCode = last?.destination?.airport_code || ''
    const offset = dayDiff(first?.origin?.departure_time, last?.destination?.arrival_time)
    const stops = stopsLabel(segments)
    const price = flight.best_offer?.price ?? flight.total_price
    const badge = rank === 1 ? RANK_BADGE[rankMode] : null
    const primaryOffer =
        (flight.price_comparison || []).find((o) => !!o.affiliate_url) ||
        (flight.price_comparison || [])[0] ||
        flight.best_offer

    return (
        <div
            className="bg-white rounded-[12px] transition-colors"
            style={{
                border: '1px solid',
                borderColor: expanded ? 'var(--flight-indigo-strong)' : 'var(--flight-border)',
                boxShadow: expanded ? '0 4px 16px rgba(16,16,16,0.06)' : 'none'
            }}>
            <button
                type="button"
                onClick={onToggle}
                className="w-full text-left bg-transparent border-0 cursor-pointer"
                style={{
                    padding: narrow ? '12px 14px' : '14px 18px',
                    display: 'grid',
                    gridTemplateColumns: narrow ? 'auto 1fr auto' : 'auto 80px 1fr 96px 110px auto',
                    columnGap: narrow ? 10 : 16,
                    alignItems: 'center'
                }}>
                <AirlineMark code={code} size={narrow ? 36 : 40} />

                {!narrow && (
                    <div>
                        <div className="font-red-hat-display" style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.03em' }}>
                            {departTime}
                        </div>
                        <div className="font-manrope" style={{ fontWeight: 500, fontSize: 11, color: 'var(--flight-fg-2)' }}>
                            {fromCode}
                        </div>
                    </div>
                )}

                <div className="min-w-0">
                    {narrow ? (
                        <div>
                            <div className="flex items-baseline gap-2">
                                <span className="font-red-hat-display" style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>
                                    {departTime}
                                </span>
                                <span className="font-manrope text-[12px]" style={{ color: 'var(--flight-fg-2)' }}>→</span>
                                <span className="font-red-hat-display" style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>
                                    {arriveTime}
                                </span>
                                {offset > 0 && (
                                    <span className="font-manrope" style={{ fontWeight: 600, fontSize: 10, color: '#E55A34' }}>
                                        +{offset}
                                    </span>
                                )}
                            </div>
                            <div className="font-manrope mt-0.5" style={{ fontWeight: 500, fontSize: 12, color: 'var(--flight-fg-2)' }}>
                                {airlineName} · {flight.formatted_duration} · {stops.count === 0 ? 'Direct' : stops.count === 1 ? '1 stop' : `${stops.count} stops`}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-red-hat-display" style={{ fontWeight: 700, fontSize: 13 }}>
                                    {airlineName}
                                </span>
                                {badge && (
                                    <span
                                        className="font-red-hat-display"
                                        style={{
                                            padding: '2px 7px',
                                            borderRadius: 999,
                                            background: 'var(--flight-indigo-50)',
                                            color: 'var(--flight-indigo-deep)',
                                            border: '1px solid var(--flight-indigo-100)',
                                            fontWeight: 700,
                                            fontSize: 10
                                        }}>
                                        {badge}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3.5 mt-1.5">
                                <span className="font-manrope" style={{ fontWeight: 600, fontSize: 12, color: 'var(--flight-fg-2)' }}>
                                    {flight.formatted_duration}
                                </span>
                                <span className="relative flex-1" style={{ height: 2, background: 'var(--flight-border)', borderRadius: 2 }}>
                                    {Array.from({ length: stops.count }).map((_, i) => (
                                        <span
                                            key={i}
                                            className="absolute"
                                            style={{
                                                left: `${((i + 1) / (stops.count + 1)) * 100}%`,
                                                top: -3,
                                                width: 8,
                                                height: 8,
                                                borderRadius: 999,
                                                background: '#fff',
                                                border: '2px solid var(--flight-indigo-strong)',
                                                transform: 'translateX(-50%)'
                                            }}
                                        />
                                    ))}
                                </span>
                                <span
                                    className="font-manrope"
                                    style={{
                                        fontWeight: 600,
                                        fontSize: 12,
                                        color: stops.count > 0 ? 'var(--flight-indigo-strong)' : '#0E8645'
                                    }}>
                                    {stops.text}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {!narrow && (
                    <div className="text-right">
                        <div className="font-red-hat-display" style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.03em' }}>
                            {arriveTime}
                        </div>
                        <div className="font-manrope" style={{ fontWeight: 500, fontSize: 11, color: 'var(--flight-fg-2)' }}>
                            {toCode}
                            {offset > 0 && (
                                <span className="ml-1" style={{ color: '#E55A34' }}>
                                    +{offset}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {!narrow && (
                    <div className="text-right">
                        <div className="font-red-hat-display" style={{ fontWeight: 800, fontSize: 19, letterSpacing: '-0.03em' }}>
                            {formatINR(price)}
                        </div>
                        <div className="font-manrope" style={{ fontWeight: 500, fontSize: 11, color: 'var(--flight-fg-2)' }}>
                            per traveler
                        </div>
                    </div>
                )}

                <div className="text-right flex flex-col items-end gap-1">
                    {narrow && (
                        <div className="font-red-hat-display" style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em' }}>
                            {formatINR(price)}
                        </div>
                    )}
                    {expanded ? (
                        <ChevronUp className="w-4 h-4" style={{ color: 'var(--flight-fg-2)' }} />
                    ) : (
                        <ChevronDown className="w-4 h-4" style={{ color: 'var(--flight-fg-2)' }} />
                    )}
                </div>
            </button>

            {expanded && (
                <div
                    style={{
                        padding: narrow ? '0 14px 14px' : '0 18px 16px',
                        borderTop: '1px solid var(--flight-border)'
                    }}>
                    <div
                        className="pt-3.5"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: narrow ? '1fr' : '1fr 280px',
                            gap: 16
                        }}>
                        {/* Legs */}
                        <div className="flex flex-col gap-2">
                            {segments.map((seg, idx) => {
                                const next = segments[idx + 1]
                                const layoverMin = next
                                    ? Math.max(
                                          0,
                                          Math.round(
                                              (new Date(next.origin?.departure_time).getTime() -
                                                  new Date(seg.destination?.arrival_time).getTime()) /
                                                  60000
                                          )
                                      )
                                    : 0
                                return (
                                    <React.Fragment key={`${flight.reference_id}-leg-${idx}`}>
                                        <div
                                            className="bg-white"
                                            style={{
                                                border: '1px solid var(--flight-border)',
                                                borderRadius: 10,
                                                padding: '10px 12px'
                                            }}>
                                            <div className="flex items-center gap-2 mb-1">
                                                <AirlineMark code={seg.airline?.code || code} size={26} />
                                                <span className="font-red-hat-display" style={{ fontWeight: 700, fontSize: 12 }}>
                                                    {seg.airline?.code} {seg.airline?.flight_number}
                                                </span>
                                                <span
                                                    className="font-manrope ml-auto"
                                                    style={{ fontWeight: 500, fontSize: 11, color: 'var(--flight-fg-2)' }}>
                                                    {seg.duration?.formatted || '—'}
                                                </span>
                                            </div>
                                            <div
                                                className="grid items-baseline"
                                                style={{ gridTemplateColumns: '1fr auto 1fr', gap: 8 }}>
                                                <div>
                                                    <div className="font-red-hat-display" style={{ fontWeight: 800, fontSize: 15 }}>
                                                        {formatTimeOfDay(seg.origin?.departure_time)}
                                                    </div>
                                                    <div
                                                        className="font-manrope"
                                                        style={{ fontWeight: 500, fontSize: 11, color: 'var(--flight-fg-2)' }}>
                                                        {seg.origin?.airport_code} · {seg.origin?.city_name}
                                                    </div>
                                                </div>
                                                <div
                                                    className="font-manrope text-center"
                                                    style={{ fontWeight: 500, fontSize: 11, color: 'var(--flight-fg-3)' }}>
                                                    {formatDayMonth(seg.origin?.departure_time)}
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-red-hat-display" style={{ fontWeight: 800, fontSize: 15 }}>
                                                        {formatTimeOfDay(seg.destination?.arrival_time)}
                                                    </div>
                                                    <div
                                                        className="font-manrope"
                                                        style={{ fontWeight: 500, fontSize: 11, color: 'var(--flight-fg-2)' }}>
                                                        {seg.destination?.airport_code} · {seg.destination?.city_name}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {next && layoverMin > 0 && (
                                            <div
                                                className="font-red-hat-display self-center"
                                                style={{
                                                    background: 'var(--flight-indigo-50)',
                                                    color: 'var(--flight-indigo-deep)',
                                                    border: '1px solid var(--flight-indigo-100)',
                                                    padding: '4px 10px',
                                                    borderRadius: 999,
                                                    fontWeight: 700,
                                                    fontSize: 11
                                                }}>
                                                {Math.floor(layoverMin / 60) > 0 ? `${Math.floor(layoverMin / 60)}h ` : ''}
                                                {layoverMin % 60}m layover · {seg.destination?.airport_code}
                                            </div>
                                        )}
                                    </React.Fragment>
                                )
                            })}
                        </div>

                        {/* Fare summary + actions */}
                        <div
                            className="flex flex-col gap-2.5"
                            style={{
                                background: 'var(--flight-grey-5)',
                                border: '1px solid var(--flight-border)',
                                borderRadius: 12,
                                padding: 14
                            }}>
                            <div
                                className="font-red-hat-display"
                                style={{ fontWeight: 800, fontSize: 11, letterSpacing: '0.06em', color: 'var(--flight-fg-2)' }}>
                                FARE SUMMARY
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Detail label={flight.is_refundable ? 'Refundable' : 'Non-refundable'} on={flight.is_refundable} />
                                {primaryOffer && 'cabin' in primaryOffer && primaryOffer.cabin && (
                                    <Detail label={primaryOffer.cabin} on />
                                )}
                                {primaryOffer && 'is_self_transfer' in primaryOffer && primaryOffer.is_self_transfer && (
                                    <Detail label="Self-transfer between flights" on tone="warn" />
                                )}
                                <Detail
                                    label={`${stops.count === 0 ? 'Direct' : `${stops.count} stop${stops.count > 1 ? 's' : ''}`} · ${flight.formatted_duration}`}
                                    on
                                />
                            </div>
                            <div className="flex flex-col gap-1.5 mt-1">
                                <button
                                    type="button"
                                    onClick={onSelect}
                                    className="font-red-hat-display inline-flex items-center justify-center gap-1.5 cursor-pointer"
                                    style={{
                                        padding: '10px 14px',
                                        background: 'var(--flight-indigo-strong)',
                                        color: '#fff',
                                        border: 0,
                                        borderRadius: 10,
                                        fontWeight: 700,
                                        fontSize: 13
                                    }}>
                                    Select for {formatINR(price)}
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={onAddToTrip}
                                    className="font-red-hat-display inline-flex items-center justify-center gap-1.5 cursor-pointer bg-white"
                                    style={{
                                        padding: '9px 14px',
                                        border: '1px solid var(--flight-border)',
                                        color: 'var(--flight-fg-1)',
                                        borderRadius: 10,
                                        fontWeight: 700,
                                        fontSize: 13
                                    }}>
                                    <Plus className="w-3.5 h-3.5" />
                                    Shortlist
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function Detail({ label, on, tone = 'neutral' }: { label: string; on: boolean; tone?: 'neutral' | 'warn' }) {
    const color = !on ? 'var(--flight-fg-3)' : tone === 'warn' ? '#E55A34' : 'var(--flight-fg-1)'
    return (
        <div className="font-manrope flex items-center gap-2" style={{ fontWeight: 600, fontSize: 12, color }}>
            <span
                className="grid place-items-center flex-shrink-0"
                style={{
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    background: on ? (tone === 'warn' ? '#FDEEE6' : '#E6F8EE') : 'var(--flight-grey-5)',
                    color: on ? (tone === 'warn' ? '#E55A34' : '#0E8645') : 'var(--flight-fg-3)',
                    fontSize: 9,
                    fontWeight: 800
                }}>
                {on ? '✓' : '–'}
            </span>
            {label}
        </div>
    )
}

export default FlightDenseRow
