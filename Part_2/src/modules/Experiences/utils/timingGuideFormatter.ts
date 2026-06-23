/*

{
    "recommended_time_slots": [
        "late_evening",
        "evening",
        "afternoon"
    ],
    "monday": {
        "start_time": "12:00 PM",
        "end_time": "12:00 AM",
        "description": "Dotonbori is always open; however, individual establishments have varying hours. Many restaurants and shops operate from late morning until midnight.",
        "is_closed": false
    },
    "tuesday": {
        "start_time": "12:00 PM",
        "end_time": "12:00 AM",
        "description": "Dotonbori is always open; however, individual establishments have varying hours. Many restaurants and shops operate from late morning until midnight.",
        "is_closed": false
    },
    "wednesday": {
        "start_time": "12:00 PM",
        "end_time": "12:00 AM",
        "description": "Dotonbori is always open; however, individual establishments have varying hours. Many restaurants and shops operate from late morning until midnight.",
        "is_closed": false
    },
    "thursday": {
        "start_time": "12:00 PM",
        "end_time": "12:00 AM",
        "description": "Dotonbori is always open; however, individual establishments have varying hours. Many restaurants and shops operate from late morning until midnight.",
        "is_closed": false
    },
    "friday": {
        "start_time": "12:00 PM",
        "end_time": "12:00 AM",
        "description": "Dotonbori is always open; however, individual establishments have varying hours. Many restaurants and shops operate from late morning until midnight.",
        "is_closed": false
    },
    "saturday": {
        "start_time": "12:00 PM",
        "end_time": "12:00 AM",
        "description": "Dotonbori is always open; however, individual establishments have varying hours. Many restaurants and shops operate from late morning until midnight.",
        "is_closed": false
    },
    "sunday": {
        "start_time": "12:00 PM",
        "end_time": "12:00 AM",
        "description": "Dotonbori is always open; however, individual establishments have varying hours. Many restaurants and shops operate from late morning until midnight.",
        "is_closed": false
    }
}

*/

type DayInfo = {
    start_time: string | null
    end_time: string | null
    description?: string
    is_closed?: boolean
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const formatTimingGuide = (timing_guide: Record<string, any> | null) => {
    if (!timing_guide) return []

    const result: { dayRange: string; time: string }[] = []
    let currentGroup: { startDay: string; endDay: string; time: string } | null = null

    for (let i = 0; i < DAYS.length; i++) {
        const dayKey = DAYS[i]
        const dayLabel = DAY_LABELS[i]
        const info: DayInfo = timing_guide[dayKey]
        if (!info || info.is_closed) continue

        const timeStr = info.start_time && info.end_time ? `${info.start_time} - ${info.end_time}` : '-'

        if (currentGroup && currentGroup.time === timeStr) {
            currentGroup.endDay = dayLabel
        } else {
            if (currentGroup) {
                result.push({
                    dayRange:
                        currentGroup.startDay === currentGroup.endDay ? currentGroup.startDay : `${currentGroup.startDay} - ${currentGroup.endDay}`,
                    time: currentGroup.time
                })
            }
            currentGroup = { startDay: dayLabel, endDay: dayLabel, time: timeStr }
        }
    }

    if (currentGroup) {
        result.push({
            dayRange: currentGroup.startDay === currentGroup.endDay ? currentGroup.startDay : `${currentGroup.startDay} - ${currentGroup.endDay}`,
            time: currentGroup.time
        })
    }

    return result
}
