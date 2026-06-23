import React from 'react'
import ContentBox from '../primitives/ContentBox'

export interface DataTableColumn {
    key: string
    label: string
    align?: 'left' | 'right'
    /** Custom cell renderer */
    render?: (value: any, row: Record<string, any>) => React.ReactNode
}

interface DataTableProps {
    columns: DataTableColumn[]
    rows: Record<string, any>[]
    /** Optional footer row (e.g., "Total") */
    footer?: Record<string, any>
    footerBold?: boolean
    className?: string
}

const DataTable: React.FC<DataTableProps> = ({
    columns,
    rows,
    footer,
    footerBold = true,
    className = '',
}) => {
    if (rows.length === 0) return null

    return (
        <ContentBox padding="flush" className={className}>
            {/* Header row */}
            <div className="flex items-center px-3 py-2 border-b border-grey_4 bg-grey-5/50">
                {columns.map((col) => (
                    <span
                        key={col.key}
                        className={`text-[10px] font-semibold text-grey_2 font-manrope uppercase tracking-wide ${
                            col.align === 'right' ? 'text-right flex-shrink-0' : 'flex-1'
                        }`}
                    >
                        {col.label}
                    </span>
                ))}
            </div>

            {/* Data rows */}
            {rows.map((row, idx) => (
                <div
                    key={idx}
                    className="flex items-center px-3 py-2 border-b border-grey_4 last:border-b-0"
                >
                    {columns.map((col) => {
                        const value = row[col.key]
                        const rendered = col.render ? col.render(value, row) : value

                        return (
                            <span
                                key={col.key}
                                className={`text-sm font-manrope ${
                                    col.align === 'right'
                                        ? 'text-right flex-shrink-0 font-medium text-grey_0'
                                        : 'flex-1 min-w-0 text-grey_0 truncate'
                                }`}
                            >
                                {rendered}
                            </span>
                        )
                    })}
                </div>
            ))}

            {/* Footer row */}
            {footer && (
                <div className="flex items-center px-3 py-3 border-t-2 border-grey_4 bg-grey-5/30">
                    {columns.map((col) => {
                        const value = footer[col.key]
                        const rendered = col.render ? col.render(value, footer) : value

                        return (
                            <span
                                key={col.key}
                                className={`text-sm font-manrope ${
                                    footerBold ? 'font-bold' : 'font-medium'
                                } text-grey_0 ${
                                    col.align === 'right' ? 'text-right flex-shrink-0' : 'flex-1'
                                }`}
                            >
                                {rendered}
                            </span>
                        )
                    })}
                </div>
            )}
        </ContentBox>
    )
}

export default DataTable
