import React, { useCallback, useEffect, useMemo, useState } from 'react'
import type { DynamicFormData } from './types'

interface DynamicFormCardProps {
    data: DynamicFormData
    onSendAgentMessage?: (message: string, metadata?: Record<string, any>) => void
    sourceInteractionId?: string
}

/**
 * Build a short, natural-language summary of a form submission. The summary
 * is shown to the user in the chat transcript and acts as a "hint" for the
 * concierge agent — the structured `form_data` is still attached as metadata
 * inside the <selection> envelope and is what the agent actually acts on.
 */
function describeFormSubmission(
    ctx: string,
    formData: Record<string, any>,
): string {
    if (ctx === 'slot_add') {
        const day = formData._day ?? formData.day ?? '?'
        const activity =
            formData.activity ??
            formData.title ??
            formData.name ??
            'an activity'
        return `Add ${activity} to Day ${day}`
    }
    if (ctx === 'slot_replace') {
        const day = formData._day ?? formData.day ?? '?'
        const slot = formData._slot ?? formData.slot ?? 'a slot'
        const replacement =
            formData.activity ?? formData.title ?? formData.name ?? 'a new activity'
        return `Replace ${slot} on Day ${day} with ${replacement}`
    }
    const fields = Object.entries(formData)
        .filter(([k]) => !k.startsWith('_'))
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')
    return fields ? `Submit form (${ctx}): ${fields}` : `Submit form (${ctx})`
}

const DynamicFormCard: React.FC<DynamicFormCardProps> = ({ data, onSendAgentMessage, sourceInteractionId }) => {
    const consumed = (data as any)._consumed
    const [formData, setFormData] = useState<Record<string, any>>({})
    const [currentStep, setCurrentStep] = useState(0)
    const [submitted, setSubmitted] = useState(!!consumed)

    const schema = useMemo(() => {
        try {
            return JSON.parse(data.form_schema_json)
        } catch {
            return { type: 'object', properties: {} }
        }
    }, [data.form_schema_json])

    const _uiSchema = useMemo(() => {
        try {
            return JSON.parse(data.ui_schema_json || '{}')
        } catch {
            return {}
        }
    }, [data.ui_schema_json])
    void _uiSchema

    // Initialize formData with all schema defaults (so hidden/pre-filled fields are included on submit)
    useEffect(() => {
        const props = schema.properties || {}
        const defaults: Record<string, any> = {}
        for (const [key, fieldSchema] of Object.entries(props) as [string, any][]) {
            if (fieldSchema.default !== undefined) {
                defaults[key] = fieldSchema.default
            }
        }
        if (Object.keys(defaults).length > 0) {
            setFormData(prev => ({ ...defaults, ...prev }))
        }
    }, [schema])

    const totalSteps = data.step_count || 1
    const isMultiStep = totalSteps > 1

    const stepFields = useMemo(() => {
        const fields = Object.keys(schema.properties || {})
        if (!isMultiStep) return [fields]
        const perStep = Math.ceil(fields.length / totalSteps)
        const steps: string[][] = []
        for (let i = 0; i < totalSteps; i++) {
            steps.push(fields.slice(i * perStep, (i + 1) * perStep))
        }
        return steps
    }, [schema, totalSteps, isMultiStep])

    const handleSubmit = useCallback(() => {
        if (!onSendAgentMessage) return
        setSubmitted(true)
        // Concierge rebuild: structured intent envelope (action =
        // form_submission) replaces the legacy form-submission marker
        // string. The natural-language summary is a hint; the agent reads
        // `metadata` from the inline <selection> envelope as the
        // authoritative intent.
        const summary = describeFormSubmission(data.form_context, formData)
        onSendAgentMessage(summary, {
            action: 'form_submission',
            form_context: data.form_context,
            form_data: formData,
            source_interaction_id: sourceInteractionId,
        })
    }, [onSendAgentMessage, data.form_context, formData, sourceInteractionId])

    // Check if all required fields are filled
    const allRequiredFilled = useMemo(() => {
        const required: string[] = schema.required || []
        return required.every((key: string) => {
            const val = formData[key]
            return val !== undefined && val !== null && val !== ''
        })
    }, [schema.required, formData])

    const currentFields = stepFields[currentStep] || []

    // When slot_kind changes, clear sub_kind if it no longer belongs to the
    // new category (driven by x-sub-kind-map in the schema root).
    const subKindMap: Record<string, string[]> | undefined = schema['x-sub-kind-map']

    const handleChipClick = useCallback((fieldKey: string, value: string) => {
        setFormData(prev => {
            const next = { ...prev, [fieldKey]: value }
            // If the user just changed slot_kind and we have a sub-kind map,
            // clear sub_kind when the current selection isn't valid for the
            // newly chosen kind.
            if (fieldKey === 'slot_kind' && subKindMap) {
                const allowedForKind = [...(subKindMap[value] || []), 'Something else']
                if (prev.sub_kind && !allowedForKind.includes(prev.sub_kind)) {
                    delete next.sub_kind
                }
            }
            return next
        })
    }, [subKindMap])

    const renderChipField = (fieldKey: string, fieldSchema: any) => {
        const selected = formData[fieldKey] ?? ''

        // For sub_kind: if x-sub-kind-map exists, show only the options
        // that belong to the currently selected slot_kind.
        let options: string[] = fieldSchema.enum as string[]
        if (fieldKey === 'sub_kind' && subKindMap) {
            const currentKind = formData['slot_kind']
            if (currentKind && subKindMap[currentKind]) {
                options = [...subKindMap[currentKind], 'Something else']
            }
        }

        return (
            <div className="flex flex-wrap gap-1.5">
                {options.map((opt: string) => {
                    const isActive = selected === opt
                    return (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => handleChipClick(fieldKey, opt)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium font-manrope transition-all cursor-pointer
                                ${isActive
                                    ? 'bg-primary-default text-white shadow-sm'
                                    : 'bg-white text-grey_1 border border-grey_4 hover:border-primary-default/40 hover:text-primary-default'
                                }`}
                        >
                            {opt}
                        </button>
                    )
                })}
            </div>
        )
    }

    if (submitted) {
        const visibleEntries = Object.entries(formData).filter(([k]) => !k.startsWith('_'))
        return (
            <div className="w-full flex flex-col gap-2 px-4 py-3 rounded-[16px] bg-grey_5/40">
                <p className="text-xs font-medium text-grey_2 font-manrope">Submitted</p>
                {visibleEntries.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {visibleEntries.map(([key, val]) => {
                            const label = schema.properties?.[key]?.title || key
                            return (
                                <span key={key} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-grey_4 text-[11px] text-grey_1 font-manrope">
                                    <span className="text-grey_3">{label}:</span> {String(val)}
                                </span>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="w-full max-w-lg flex flex-col gap-3 px-1 py-1">
            {data.response && (
                <p className="text-sm font-semibold text-grey_0 font-manrope leading-6 px-1">{data.response}</p>
            )}

            {/* Progress indicator for multi-step */}
            {isMultiStep && (
                <div className="flex items-center gap-1.5 px-1">
                    {Array.from({ length: totalSteps }).map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                                idx <= currentStep ? 'bg-primary-default' : 'bg-grey_4'
                            }`}
                        />
                    ))}
                    <span className="text-[10px] text-grey_3 font-manrope ml-1.5">
                        {currentStep + 1}/{totalSteps}
                    </span>
                </div>
            )}

            {/* Form fields */}
            <div className="flex flex-col gap-3">
                {currentFields.map((fieldKey) => {
                    const fieldSchema = schema.properties?.[fieldKey] || {}

                    // Skip hidden fields
                    if (fieldKey.startsWith('_')) {
                        if (formData[fieldKey] === undefined && fieldSchema.default !== undefined) {
                            setFormData(prev => ({ ...prev, [fieldKey]: fieldSchema.default }))
                        }
                        return null
                    }

                    // Enum → chip selector
                    if (fieldSchema.enum) {
                        return (
                            <div key={fieldKey} className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-medium text-grey_2 font-manrope uppercase tracking-wide px-1">
                                    {fieldSchema.title || fieldKey}
                                </label>
                                {renderChipField(fieldKey, fieldSchema)}
                            </div>
                        )
                    }

                    // Boolean → toggle-style chip
                    if (fieldSchema.type === 'boolean') {
                        const checked = formData[fieldKey] ?? fieldSchema.default ?? false
                        return (
                            <button
                                key={fieldKey}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, [fieldKey]: !checked }))}
                                className={`self-start px-3 py-1.5 rounded-full text-xs font-medium font-manrope transition-all cursor-pointer
                                    ${checked
                                        ? 'bg-primary-default text-white'
                                        : 'bg-white text-grey_1 border border-grey_4'
                                    }`}
                            >
                                {fieldSchema.title || fieldKey}
                            </button>
                        )
                    }

                    // Date picker
                    if (fieldSchema.format === 'date' || fieldSchema['x-input-type'] === 'date') {
                        return (
                            <div key={fieldKey} className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-medium text-grey_2 font-manrope uppercase tracking-wide px-1">
                                    {fieldSchema.title || fieldKey}
                                </label>
                                {fieldSchema.description && (
                                    <p className="text-[11px] text-grey_3 font-manrope px-1">{fieldSchema.description}</p>
                                )}
                                <input
                                    type="date"
                                    className="w-full px-3 py-2.5 text-sm font-manrope bg-white border border-grey_4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-default/30 focus:border-primary-default cursor-pointer"
                                    value={formData[fieldKey] ?? fieldSchema.default ?? ''}
                                    min={fieldSchema.minimum || fieldSchema['x-min-date']}
                                    max={fieldSchema.maximum || fieldSchema['x-max-date']}
                                    onChange={(e) => setFormData(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                                />
                            </div>
                        )
                    }

                    // Number
                    if (fieldSchema.type === 'integer' || fieldSchema.type === 'number') {
                        return (
                            <div key={fieldKey} className="flex flex-col gap-1.5">
                                <label className="text-[11px] font-medium text-grey_2 font-manrope uppercase tracking-wide px-1">
                                    {fieldSchema.title || fieldKey}
                                </label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 text-sm font-manrope bg-grey_5/50 border-0 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-default/30 placeholder:text-grey_3"
                                    value={formData[fieldKey] ?? fieldSchema.default ?? ''}
                                    min={fieldSchema.minimum}
                                    max={fieldSchema.maximum}
                                    placeholder={fieldSchema.description || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, [fieldKey]: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                        )
                    }

                    // Default: string input
                    return (
                        <div key={fieldKey} className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-medium text-grey_2 font-manrope uppercase tracking-wide px-1">
                                {fieldSchema.title || fieldKey}
                            </label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 text-sm font-manrope bg-grey_5/50 border-0 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary-default/30 placeholder:text-grey_3"
                                value={formData[fieldKey] ?? fieldSchema.default ?? ''}
                                placeholder={fieldSchema.description || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                            />
                        </div>
                    )
                })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-1">
                {isMultiStep && currentStep > 0 && (
                    <button
                        onClick={() => setCurrentStep(s => s - 1)}
                        className="px-4 py-2 rounded-full text-xs font-semibold text-grey_2 font-manrope hover:text-grey_0 transition-colors cursor-pointer"
                    >
                        Back
                    </button>
                )}
                {isMultiStep && currentStep < totalSteps - 1 ? (
                    <button
                        onClick={() => setCurrentStep(s => s + 1)}
                        className="px-5 py-2 rounded-full bg-primary-default text-white text-xs font-semibold font-manrope hover:bg-primary-dark transition-all cursor-pointer shadow-sm"
                    >
                        Next
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={!allRequiredFilled}
                        className={`px-5 py-2 rounded-full text-xs font-semibold font-manrope transition-all cursor-pointer
                            ${allRequiredFilled
                                ? 'bg-primary-default text-white hover:bg-primary-dark shadow-sm'
                                : 'bg-grey_4 text-grey_3 cursor-not-allowed'
                            }`}
                    >
                        Confirm
                    </button>
                )}
            </div>
        </div>
    )
}

export default DynamicFormCard
