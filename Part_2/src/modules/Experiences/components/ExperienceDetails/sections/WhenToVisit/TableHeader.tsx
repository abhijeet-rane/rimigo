import React from 'react'
import { LucideIcon } from 'lucide-react'

/**
 * Interface for table column header definition
 * Makes the component generic and reusable for different table types
 */
export interface TableColumnHeader {
    id: string // Unique identifier for the column
    icon: LucideIcon // Icon component from lucide-react
    label: string // Display text for the header
    className?: string // Optional additional CSS classes
    iconColor?: string // Optional custom icon color
}

interface TableHeaderProps {
    columns: TableColumnHeader[] // Array of column definitions
    className?: string // Optional container className
}

/**
 * Generic Table Header Component
 *
 * Renders a table header row with icons and labels for each column.
 * This component is modular and can be reused for different table structures.
 *
 * @param columns - Array of column header definitions with icon, label, etc.
 * @param className - Optional additional CSS classes for the header container
 */
const TableHeader: React.FC<TableHeaderProps> = ({ columns, className = '' }) => {
    return (
        <div
            className={`grid gap-3 px-4 border-none bg-grey-5 ${className}`}
            style={{ gridTemplateColumns: '0.9fr 0.9fr 1.2fr 1.2fr 1.8fr' }}>
            {columns.map((column) => {
                const Icon = column.icon
                return (
                    <div
                        key={column.id}
                        className={`flex items-center gap-2 py-3 ${column.className || ''}`}>
                        <Icon
                            className="w-[18px] h-[18px]"
                            style={{ color: column.iconColor || 'var(--color-grey-0, #101010)' }}
                        />
                        <div
                            className="max-md:whitespace-nowrap"
                            style={{
                                fontFamily: 'Red Hat Display',
                                fontSize: '16px',
                                fontWeight: 467,
                                lineHeight: '18px',
                                fontStyle: 'medium',
                                letterSpacing: '-1%',
                                color: 'var(--color-grey-0, #101010)'
                            }}>
                            {column.label}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export default TableHeader
