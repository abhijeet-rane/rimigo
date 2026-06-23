// Inline-SVG kind icons rendered via react-pdf's <Svg>. Zero network
// fetches — no CORS risk, no validation overhead, sharp at any zoom.
//
// Paths are simplified versions of lucide-react icons (MIT-licensed).
// Stroke-style geometry keeps file size small and reads clearly in the
// time-column at 14-18pt. Returns null for unknown kinds so call sites
// can fall back to the colored pill alone.
import { Path, Svg } from '@react-pdf/renderer'

interface KindIconProps {
    kind: string | null | undefined
    size?: number
    color?: string
}

const PATHS: Record<string, string> = {
    // Plane — leaning slightly, like a takeoff silhouette.
    flight:
        'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z',
    // Train.
    train: 'M16 3H8a4 4 0 0 0-4 4v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a4 4 0 0 0-4-4ZM7 19l-2 3M17 19l2 3M4 11h16M9 16h.01M15 16h.01',
    // Bus.
    bus: 'M8 6v6M15 6v6M2 12h19.6M18 18h.01M21 12V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4M3 18.4V14a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4.4M6 18h.01',
    // Car / transfer / taxi.
    car: 'M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2',
    // Ship / ferry / boat.
    ferry: 'M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2c1.3 0 1.9.5 2.5 1M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.66 2.5 7.91M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6M12 10v4M2 5l2-2h16l2 2',
    // Bed (stay).
    stay: 'M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9',
    // Utensils (meal).
    meal: 'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7',
    // Camera (experience / activity).
    experience:
        'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z',
    // MapPin (place).
    place: 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z',
    // Calendar (custom / free_time).
    custom: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
    // Lightbulb (tips / hint).
    tips: 'M9 18h6M10 22h4M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14',
    // FileCheck (visa).
    visa: 'M15.5 21 14 3l7 3-1 4-1 4M3 3v18h11M14 3 3 3M9 14l2 2 4-4',
    // Wifi (sim / connectivity).
    sim: 'M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0M2 8.82a15 15 0 0 1 20 0M12 20h.01',
    // Link icon (useful links group).
    link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    // Users (travellers).
    users:
        'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
}

// Aliases — same path, different slot.kind value.
const ALIASES: Record<string, keyof typeof PATHS> = {
    transport: 'car',
    transfer: 'car',
    taxi: 'car',
    private_transport: 'car',
    shuttle: 'bus',
    boat: 'ferry',
    cable_car: 'train',
    metro: 'train',
    hotel: 'stay',
    restaurant: 'meal',
    activity: 'experience',
    free_time: 'custom',
}

export function KindIcon({ kind, size = 16, color = '#363636' }: KindIconProps) {
    if (!kind) return null
    const k = kind.toLowerCase()
    const pathKey = (PATHS[k] ? k : ALIASES[k]) as keyof typeof PATHS | undefined
    if (!pathKey || !PATHS[pathKey]) return null
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path
                d={PATHS[pathKey]}
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </Svg>
    )
}
