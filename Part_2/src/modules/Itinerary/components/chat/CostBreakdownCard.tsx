import React from 'react'
import { IndianRupee } from 'lucide-react'
import type { CostEstimateData } from './types'
import ChatCardShell from './primitives/ChatCardShell'
import ResponseText from './primitives/ResponseText'
import CardHeader from './molecules/CardHeader'
import DataTable from './molecules/DataTable'
import CollapsibleSection from './molecules/CollapsibleSection'

interface CostBreakdownCardProps {
    data: CostEstimateData
}

const formatCost = (amount: number | undefined, currency: string | undefined) => {
    if (amount == null) return '—'
    return amount.toLocaleString('en-IN', {
        style: 'currency',
        currency: currency || 'INR',
        maximumFractionDigits: 0,
    })
}

const CostBreakdownCard: React.FC<CostBreakdownCardProps> = ({ data }) => {
    if (!data) return null

    const hasItems = (data.items || []).length > 0
    const totalText = (data as any).total_text || formatCost(data.total, data.currency)

    const tableColumns = [
        {
            key: 'title',
            label: 'Item',
            render: (value: string, row: any) => (
                <div className="flex flex-col min-w-0">
                    <span className="truncate">{value}</span>
                    {row.day_index != null && (
                        <span className="text-[10px] text-grey_3 font-manrope">Day {row.day_index + 1}</span>
                    )}
                </div>
            ),
        },
        {
            key: 'cost',
            label: 'Cost',
            align: 'right' as const,
            render: (_: any, row: any) =>
                row.amount_text || formatCost(row.cost, row.currency || data.currency),
        },
    ]

    const tableRows = (data.items || []).map((item) => ({
        title: item.title,
        cost: item.cost,
        currency: item.currency,
        day_index: item.day_index,
        amount_text: (item as any).amount_text,
    }))

    return (
        <ChatCardShell intent="warning">
            {data.response && <ResponseText text={data.response} size="body" />}

            <CardHeader
                icon={<IndianRupee size={16} />}
                title="Cost Breakdown"
                badge={{
                    text: data.scope === 'trip' ? 'Full Trip' : 'Single Day',
                    variant: 'primary',
                }}
            />

            {/* Always-visible total */}
            {hasItems && (
                <div className="flex items-center justify-between px-3 py-2.5 bg-white rounded-[12px] border border-grey_4">
                    <span className="text-sm font-bold text-grey_0 font-manrope">Total</span>
                    <span className="text-sm font-bold text-grey_0 font-manrope">{totalText}</span>
                </div>
            )}

            {/* Expandable line items */}
            {hasItems && tableRows.length > 2 ? (
                <CollapsibleSection
                    title="Line Items"
                    itemCount={tableRows.length}
                    showLabel="Show breakdown"
                    hideLabel="Hide breakdown"
                >
                    <DataTable
                        columns={tableColumns}
                        rows={tableRows}
                    />
                </CollapsibleSection>
            ) : hasItems ? (
                <DataTable columns={tableColumns} rows={tableRows} />
            ) : data.response ? null : (
                <ResponseText text="No cost data available." size="caption" />
            )}
        </ChatCardShell>
    )
}

export default CostBreakdownCard
