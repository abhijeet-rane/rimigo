import Typography from '@/components/shared/Typography'

export const SlotBasicInfo = ({ slot }: { slot: any }) => {
    const start = slot.start ?? slot.extendedProps?.start_time
    const end = slot.end ?? slot.extendedProps?.end_time
    const formatTimeNoConvert = (value?: string | Date) => {
        if (!value) return ''

        if (value instanceof Date) {
            const hours = value.getUTCHours()
            const minutes = value.getUTCMinutes()
            const period = hours >= 12 ? 'PM' : 'AM'
            const hour12 = hours % 12 || 12
            return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`
        }

        if (typeof value === 'string') {
            const timePart = value.split('T')[1]?.slice(0, 5)
            if (!timePart) return ''
            let [hour, minute] = timePart.split(':').map(Number)
            const period = hour >= 12 ? 'PM' : 'AM'
            hour = hour % 12 || 12
            return `${hour}:${minute.toString().padStart(2, '0')} ${period}`
        }

        return ''
    }

    const formatTimeRange = (start?: string | Date, end?: string | Date) => {
        if (!start || !end) return 'Time unavailable'
        return `${formatTimeNoConvert(start)} - ${formatTimeNoConvert(end)}`
    }

    const timeRange = formatTimeRange(start, end)

    return (
        <div className="flex flex-col gap-2">
            <Typography
                size="12"
                family="manrope"
                weight="medium"
                color="grey-2">
                {slot.extendedProps?.kind?.toUpperCase()}
            </Typography>

            <Typography
                size="18"
                family="manrope"
                weight="semibold">
                {slot.title || 'Untitled Slot'}
            </Typography>

            <Typography
                size="14"
                color="grey-1">
                {timeRange}
            </Typography>

            {slot.notes && (
                <Typography
                    size="14"
                    family="manrope"
                    weight="medium"
                    color="grey-1"
                    className="whitespace-pre-line">
                    {slot.notes}
                </Typography>
            )}
        </div>
    )
}
