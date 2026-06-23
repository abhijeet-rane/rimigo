import React from 'react'
import { Pencil, Plus } from 'lucide-react'
import type { FlightLeg } from '../../api/travelerCollectionApi'

interface LegStripProps {
    legs: FlightLeg[]
    activeLegId: string | null
    onSelectLeg: (legId: string) => void
    onEditLeg: (legId: string) => void
    onAddLeg: () => void
    /** When true, edit + add affordances render. Read-only viewers (shared links) get false. */
    canEdit?: boolean
}

const LEG_KIND_LABEL: Record<FlightLeg['kind'], string> = {
    outbound: 'Outbound',
    inter_city: 'Inter-city',
    return: 'Return',
    round_trip: 'Round trip'
}

const formatShortDate = (iso?: string | null): string => {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const legNeedsSetup = (leg: FlightLeg): boolean => !leg.from || !leg.to || !leg.date

const formatDateSubtitle = (leg: FlightLeg): string => {
    const dep = formatShortDate(leg.date)
    if (leg.kind === 'round_trip' && leg.return_date && leg.date) {
        const start = new Date(leg.date)
        const end = new Date(leg.return_date)
        if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start.getMonth() === end.getMonth()) {
            // Collapse "18 May – 25 May" → "18 – 25 May" when same month.
            return `${start.getDate()} – ${formatShortDate(leg.return_date)}`
        }
        return `${dep} – ${formatShortDate(leg.return_date)}`
    }
    return dep
}

const LegStrip: React.FC<LegStripProps> = ({ legs, activeLegId, onSelectLeg, onEditLeg, onAddLeg, canEdit = true }) => {
    return (
        <div className="border-b border-grey-4 bg-white">
            <div className="flex items-stretch overflow-x-auto no-scrollbar">
                {legs.map((leg) => {
                    const active = leg.id === activeLegId
                    const needsSetup = legNeedsSetup(leg)
                    const showFromPlaceholder = !leg.from
                    const showToPlaceholder = !leg.to
                    const arrow = leg.kind === 'round_trip' ? '⇄' : '→'
                    const dateLabel = formatDateSubtitle(leg)
                    return (
                        <div
                            key={leg.id}
                            className={`relative flex items-start gap-1.5 px-4 py-3 border-r border-grey-4 cursor-pointer shrink-0 transition-colors ${
                                active ? 'bg-[#dfdde0]' : 'bg-white hover:bg-grey-6'
                            }`}
                            onClick={() => onSelectLeg(leg.id)}>
                            <div className="flex flex-col items-start min-w-0">
                                <span
                                    className="text-[14px] font-bold font-red-hat-display tracking-[-0.28px] leading-[18px] whitespace-nowrap"
                                    style={{ color: '#101010' }}>
                                    <span style={{ color: showFromPlaceholder ? '#92660B' : '#101010', fontStyle: showFromPlaceholder ? 'italic' : 'normal' }}>
                                        {leg.from || 'Set origin'}
                                    </span>
                                    <span style={{ color: '#747474' }}>{` ${arrow} `}</span>
                                    <span style={{ color: showToPlaceholder ? '#92660B' : '#101010', fontStyle: showToPlaceholder ? 'italic' : 'normal' }}>
                                        {leg.to || 'Set destination'}
                                    </span>
                                </span>
                                <span className="text-[12px] font-semibold font-manrope text-grey-2 tracking-[-0.24px] leading-4 whitespace-nowrap">
                                    {LEG_KIND_LABEL[leg.kind]}
                                    {dateLabel ? ` · ${dateLabel}` : ''}
                                </span>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onEditLeg(leg.id)
                                        }}
                                        className="p-0.5 rounded hover:bg-white/60 transition-colors"
                                        aria-label={`Edit ${LEG_KIND_LABEL[leg.kind]} leg`}>
                                        <Pencil className="w-3 h-3" style={{ color: '#747474' }} />
                                    </button>
                                )}
                                {needsSetup && (
                                    <span
                                        className="font-manrope inline-flex items-center gap-1 rounded-full px-1.5 py-px"
                                        style={{
                                            background: '#FEF3CD',
                                            color: '#92660B',
                                            fontWeight: 700,
                                            fontSize: 9,
                                            letterSpacing: '0.04em',
                                            textTransform: 'uppercase'
                                        }}>
                                        <span
                                            style={{
                                                width: 5,
                                                height: 5,
                                                borderRadius: 999,
                                                background: '#CDAE00'
                                            }}
                                        />
                                        Setup
                                    </span>
                                )}
                            </div>
                        </div>
                    )
                })}
                {canEdit && (
                    <button
                        type="button"
                        onClick={onAddLeg}
                        className="flex items-center gap-1.5 px-4 py-3 cursor-pointer shrink-0 bg-white hover:bg-grey-6 transition-colors">
                        <Plus className="w-3.5 h-3.5" style={{ color: '#7011F6' }} />
                        <span className="text-[14px] font-bold font-red-hat-display tracking-[-0.28px] leading-[18px]" style={{ color: '#7011F6' }}>
                            Add leg
                        </span>
                    </button>
                )}
            </div>
        </div>
    )
}

export default LegStrip
