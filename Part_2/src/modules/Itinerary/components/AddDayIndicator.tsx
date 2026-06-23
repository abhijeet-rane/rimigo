import React, { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'

interface AddDayIndicatorProps {
    columns: number
    columnWidth: number
    startDate: Date
    onAddDay: (position: number, date: Date) => void
}

const AddDayIndicator: React.FC<AddDayIndicatorProps> = ({ columns, columnWidth, startDate, onAddDay }) => {
    const [columnRightEdges, setColumnRightEdges] = useState<number[]>([])

    useEffect(() => {
        const computePositions = () => {
            const calendarRoot = document.getElementById('calendar-root')
            if (!calendarRoot) return

            const timeGridCols = calendarRoot.querySelectorAll('.fc-timegrid-col')
            if (timeGridCols.length === 0) {
                // Fallback: calculate positions
                const timeAxisWidth = 60
                setColumnRightEdges(
                    Array.from({ length: columns }, (_, i) => timeAxisWidth + (i + 1) * columnWidth)
                )
                return
            }

            const rootRect = calendarRoot.getBoundingClientRect()
            const scrollLeft = calendarRoot.scrollLeft

            const positions: number[] = []
            timeGridCols.forEach((col) => {
                const rect = col.getBoundingClientRect()
                // Convert viewport-relative → content-relative by adding scroll offset
                positions.push(rect.right - rootRect.left + scrollLeft)
            })
            setColumnRightEdges(positions)
        }

        computePositions()
        // Recompute after FullCalendar finishes rendering
        const timer = setTimeout(computePositions, 200)

        // Recompute on resize
        const observer = new ResizeObserver(computePositions)
        const calendarRoot = document.getElementById('calendar-root')
        if (calendarRoot) observer.observe(calendarRoot)

        return () => {
            clearTimeout(timer)
            observer.disconnect()
        }
    }, [columns, columnWidth])

    const handleClick = (index: number) => {
        const columnDate = new Date(startDate)
        columnDate.setDate(columnDate.getDate() + index)
        onAddDay(index, columnDate)
    }

    return (
        <div className="absolute inset-0 pointer-events-none z-40">
            {columnRightEdges.map((rightEdge, index) => (
                <div
                    key={index}
                    className="group/addday absolute top-0 pointer-events-auto cursor-pointer flex items-center justify-center"
                    style={{
                        left: `${rightEdge - 16}px`,
                        width: '32px',
                        height: '56px',
                    }}
                    onClick={(e) => {
                        e.stopPropagation()
                        handleClick(index)
                    }}>
                    {/* Vertical line between day headers */}
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-primary-default opacity-0 group-hover/addday:opacity-100 transition-opacity duration-200" />
                    {/* Plus button - persistently visible */}
                    <div className="w-4 h-4 rounded-sm bg-primary-default-80 group-hover/addday:bg-primary-default shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 z-10">
                        <Plus className="text-primary-default group-hover/addday:text-white" size={10} strokeWidth={3} />
                    </div>
                </div>
            ))}
        </div>
    )
}

export default AddDayIndicator
