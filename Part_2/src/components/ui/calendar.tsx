import * as React from 'react'
import { DayPicker } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
    return (
        <div className="w-full overflow-x-auto">
            <DayPicker
                showOutsideDays={showOutsideDays}
                className={cn('p-3 w-full', className)}
                classNames={{
                    months: 'flex flex-col sm:flex-row sm:space-x-4 sm:space-y-0 space-y-4 justify-center',
                    month: 'space-y-4 w-full flex flex-col items-center',
                    caption: 'flex items-center justify-between px-4 pt-1 relative text-center',
                    caption_label: 'text-sm font-medium text-center',
                    nav: 'flex items-center justify-between w-full absolute top-3 left-0 right-0 px-4 pointer-events-none',
                    nav_button: cn(buttonVariants({ variant: 'ghost' }), 'h-7 w-7 p-0 opacity-70 hover:opacity-100 pointer-events-auto'),
                    table: 'w-full border-collapse',
                    head_row: '',
                    head_cell: 'text-muted-foreground rounded-md text-center font-normal text-[0.8rem] w-8 h-8',
                    row: '',
                    cell: cn(
                        'p-0 text-center text-sm align-middle',
                        '[&_[role=button]]:inline-block [&_[role=button]]:h-8 [&_[role=button]]:w-8 [&_[role=button]]:rounded-md'
                    ),
                    day: cn(
                        'text-sm font-normal transition-all h-8 w-8 rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring'
                    ),
                    // ✅ Use your primary-default color for selected days
                    day_selected: 'bg-primary-default text-white hover:bg-primary-default focus:bg-primary-default',
                    // Keep today’s border as primary
                    day_today: 'border border-primary-default text-primary-default font-semibold hover:bg-primary-default/10',
                    day_outside: 'text-muted-foreground opacity-50 hover:bg-transparent hover:text-muted-foreground',
                    day_disabled: 'text-muted-foreground opacity-30 cursor-not-allowed',
                    ...classNames
                }}
                {...props}
            />
        </div>
    )
}

Calendar.displayName = 'Calendar'

export { Calendar }
