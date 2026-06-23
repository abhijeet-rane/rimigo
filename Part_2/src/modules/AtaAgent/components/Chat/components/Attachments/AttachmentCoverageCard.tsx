import { Check, Sparkles, X as XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { AttachmentCoverage } from '@/modules/AtaAgent/types/Attachments'

const FIELD_LABEL: Record<string, string> = {
    hotels: 'Hotels',
    activities: 'Activities',
    destinations: 'Destinations',
    meals: 'Meals',
    transport: 'Transport',
    dates: 'Dates',
}

const labelFor = (key: string) => FIELD_LABEL[key] || key

export interface AttachmentCoverageCardProps {
    coverage: AttachmentCoverage
    onAction?: (prefillText: string, label: string) => void
}

const defaultActionsForMissing = (
    coverage: AttachmentCoverage,
): Array<{ label: string; prefill_text: string }> => {
    const out: Array<{ label: string; prefill_text: string }> = []
    coverage.missing.slice(0, 4).forEach((key) => {
        switch (key) {
            case 'activities':
                out.push({
                    label: 'Add activities',
                    prefill_text: 'Add activities based on this attachment.',
                })
                break
            case 'hotels':
                out.push({
                    label: 'Pick hotels',
                    prefill_text: 'Pick hotels based on this attachment.',
                })
                break
            case 'transport':
                out.push({
                    label: 'Plan transport',
                    prefill_text: 'Plan transport between these destinations.',
                })
                break
            case 'dates':
                out.push({
                    label: 'Set dates',
                    prefill_text: 'Help me set the trip dates.',
                })
                break
            case 'meals':
                out.push({
                    label: 'Add meals',
                    prefill_text: 'Recommend meals or restaurants for this trip.',
                })
                break
            case 'destinations':
                out.push({
                    label: 'Add destinations',
                    prefill_text: 'Add the missing destinations from the attachment.',
                })
                break
            default:
                break
        }
    })
    return out
}

export const AttachmentCoverageCard: React.FC<AttachmentCoverageCardProps> = ({
    coverage,
    onAction,
}) => {
    const actions =
        coverage.suggested_actions && coverage.suggested_actions.length
            ? coverage.suggested_actions
            : defaultActionsForMissing(coverage)

    return (
        <div className="rounded-2xl border border-grey_4 bg-white px-4 py-3 my-2">
            <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-primary-default" />
                <span className="text-xs font-semibold uppercase tracking-wide text-grey_1">
                    From your {coverage.kind || 'attachment'}
                </span>
                {coverage.title && (
                    <span className="text-xs text-grey_2 truncate">{coverage.title}</span>
                )}
            </div>

            {coverage.highlights && (
                <p className="text-sm text-grey_0 mb-3 leading-snug">
                    {coverage.highlights}
                </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                    <div className="text-xs font-medium text-emerald-700 mb-1">Covered</div>
                    {coverage.covered.length === 0 ? (
                        <div className="text-xs text-grey_2">Nothing structured.</div>
                    ) : (
                        <ul className="space-y-1">
                            {coverage.covered.map((c) => (
                                <li
                                    key={c}
                                    className="flex items-center gap-1.5 text-xs text-emerald-900"
                                >
                                    <Check size={12} className="text-emerald-600" />
                                    {labelFor(c)}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div>
                    <div className="text-xs font-medium text-amber-700 mb-1">Missing or unclear</div>
                    {coverage.missing.length === 0 ? (
                        <div className="text-xs text-grey_2">All fields covered.</div>
                    ) : (
                        <ul className="space-y-1">
                            {coverage.missing.map((m) => (
                                <li
                                    key={m}
                                    className="flex items-center gap-1.5 text-xs text-amber-900"
                                >
                                    <XIcon size={12} className="text-amber-600" />
                                    {labelFor(m)}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {actions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-grey_5">
                    {actions.map((a) => (
                        <button
                            key={a.label}
                            type="button"
                            onClick={() => onAction?.(a.prefill_text, a.label)}
                            className={cn(
                                'rounded-full border border-grey_4 bg-grey_5 hover:bg-grey_4',
                                'px-3 py-1 text-xs font-medium text-grey_0 transition-colors',
                            )}
                        >
                            {a.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
