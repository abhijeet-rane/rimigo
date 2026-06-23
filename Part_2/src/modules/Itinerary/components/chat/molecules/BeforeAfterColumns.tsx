import React from 'react'

interface ColumnData {
    label?: string
    items: Array<{ text: string; subtext?: string }>
    emptyText?: string
}

interface BeforeAfterColumnsProps {
    before: ColumnData
    after: ColumnData
    className?: string
}

const Column: React.FC<{ data: ColumnData; variant: 'before' | 'after' }> = ({ data, variant }) => {
    const isBefore = variant === 'before'
    const label = data.label || (isBefore ? 'Before' : 'Now')

    return (
        <div
            className={`flex flex-col gap-1 px-2.5 py-2 rounded-lg border ${
                isBefore
                    ? 'bg-red-50/60 border-red-100'
                    : 'bg-emerald-50/60 border-emerald-100'
            }`}
        >
            <span
                className={`text-[9px] font-semibold uppercase tracking-wider font-manrope ${
                    isBefore ? 'text-red-400' : 'text-emerald-500'
                }`}
            >
                {label}
            </span>
            {data.items.length > 0 ? (
                data.items.map((item, idx) => (
                    <div key={idx} className="flex flex-col">
                        <span
                            className={`text-xs font-manrope truncate ${
                                isBefore
                                    ? 'text-grey_2 line-through'
                                    : 'text-grey_0 font-medium'
                            }`}
                            title={item.text}
                        >
                            {item.text}
                        </span>
                        {item.subtext && (
                            <span className="text-[10px] text-grey_3 font-manrope">
                                {item.subtext}
                            </span>
                        )}
                    </div>
                ))
            ) : (
                <span className="text-xs text-grey_3 font-manrope italic">
                    {data.emptyText || 'No activities'}
                </span>
            )}
        </div>
    )
}

const BeforeAfterColumns: React.FC<BeforeAfterColumnsProps> = ({
    before,
    after,
    className = '',
}) => (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
        <Column data={before} variant="before" />
        <Column data={after} variant="after" />
    </div>
)

export default BeforeAfterColumns
