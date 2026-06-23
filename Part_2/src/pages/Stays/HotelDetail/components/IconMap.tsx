import React from 'react'
import {
    Wifi,
    Tv,
    Coffee,
    Bed,
    Wind,
    Dumbbell,
    ShieldCheck,
    Refrigerator,
    GlassWater,
    Utensils,
    Car,
    Sun,
    ParkingCircle,
    Fan,
    Toilet,
    ShowerHead,
    Key,
    DoorClosed,
    Mountain,
    Heart,
    Home,
    MapPin,
    BusFront,
    Footprints,
    Map as MapIcon,
    PlaneLanding,
    Shield,
    Flame,
    Smile,
    Bath,
    CigaretteOff,
    Snowflake,
    Building,
    Bell,
    Users,
    Plane,
    Waves,
    Trees,
    UtensilsCrossed,
    Wine,
    Crown,
    Leaf,
    DoorOpen as RoomService,
    Dumbbell as FitnessCenter
} from 'lucide-react'

/**
 * Consistent icon sizing utility
 */
const getLucideIcon = (Icon: React.ElementType, size = 16) => (
    <Icon
        width={size}
        height={size}
        strokeWidth={1.7}
    />
)

/**
 * Base Lucide Icon Map for hotel amenities
 */
const LucideIconMap = (size = 16) => ({
    wifi: getLucideIcon(Wifi, size),
    tv: getLucideIcon(Tv, size),
    coffee: getLucideIcon(Coffee, size),
    tea: getLucideIcon(Coffee, size),
    bed: getLucideIcon(Bed, size),
    airconditioner: getLucideIcon(Wind, size),
    ac: getLucideIcon(Wind, size),
    wind: getLucideIcon(Wind, size),
    gym: getLucideIcon(Dumbbell, size),
    fitness: getLucideIcon(FitnessCenter, size),
    safe: getLucideIcon(ShieldCheck, size),
    fridge: getLucideIcon(Refrigerator, size),
    minibar: getLucideIcon(Refrigerator, size),
    pool: getLucideIcon(Waves, size),
    spa: getLucideIcon(Leaf, size),
    restaurant: getLucideIcon(Utensils, size),
    dining: getLucideIcon(UtensilsCrossed, size),
    breakfast: getLucideIcon(Coffee, size),
    bar: getLucideIcon(Wine, size),
    parking: getLucideIcon(ParkingCircle, size),
    valet: getLucideIcon(Car, size),
    car: getLucideIcon(Car, size),
    sun: getLucideIcon(Sun, size),
    balcony: getLucideIcon(Sun, size),
    terrace: getLucideIcon(Sun, size),
    fan: getLucideIcon(Fan, size),
    toilet: getLucideIcon(Toilet, size),
    bath: getLucideIcon(Bath, size),
    shower: getLucideIcon(ShowerHead, size),
    key: getLucideIcon(Key, size),
    door: getLucideIcon(DoorClosed, size),
    mountain: getLucideIcon(Mountain, size),
    view: getLucideIcon(MapPin, size),
    garden: getLucideIcon(Trees, size),
    home: getLucideIcon(Home, size),
    heater: getLucideIcon(Flame, size),
    smokeFree: getLucideIcon(CigaretteOff, size),
    snow: getLucideIcon(Snowflake, size),
    acunit: getLucideIcon(Snowflake, size),
    bell: getLucideIcon(Bell, size),
    concierge: getLucideIcon(Bell, size),
    family: getLucideIcon(Users, size),
    airportshuttle: getLucideIcon(Plane, size),
    transportation: getLucideIcon(Car, size),
    sea: getLucideIcon(Waves, size),
    water: getLucideIcon(GlassWater, size),
    premium: getLucideIcon(Crown, size),
    luxury: getLucideIcon(Crown, size),
    heart: getLucideIcon(Heart, size),
    security: getLucideIcon(Shield, size),
    smile: getLucideIcon(Smile, size),
    resort: getLucideIcon(Building, size),
    roomservice: getLucideIcon(RoomService, size),
    barlounge: getLucideIcon(Wine, size),
    fitnesscenter: getLucideIcon(Dumbbell, size)
})

/**
 * Direct icon name mappings for PascalCase icon names from API
 */
const directIconMap: Record<string, React.ElementType> = {
    mappin: MapPin,
    busfront: BusFront,
    footprints: Footprints,
    map: MapIcon,
    planelanding: PlaneLanding,
}

/**
 * 🧠 Smart facility-to-icon resolver with fuzzy matching
 */
export const getFacilityIcon = (item: any, size = 16) => {
    const iconMap = LucideIconMap(size)
    const iconName = (item?.icon || item?.name || '').trim()
    const value = iconName.toLowerCase()

    if (!value) return iconMap['bed']

    // 0️⃣ Direct PascalCase icon name match (e.g., "MapPin", "BusFront")
    if (directIconMap[value]) {
        return getLucideIcon(directIconMap[value], size)
    }

    // 1️⃣ Direct match first
    const directKey = Object.keys(iconMap).find((key) => value.replace(/\s|-/g, '').includes(key))
    if (directKey) return iconMap[directKey as keyof typeof iconMap]

    // 2️⃣ Fuzzy keyword match
    const fuzzyGroups: Record<string, string[]> = {
        wifi: ['internet', 'broadband', 'hotspot'],
        tv: ['television', 'screen', 'smart tv'],
        airconditioner: ['air', 'conditioning', 'cooling'],
        coffee: ['tea', 'espresso', 'breakfast', 'cafe'],
        fridge: ['refrigerator', 'minibar', 'cooler'],
        pool: ['swimming', 'infinity', 'jacuzzi'],
        spa: ['massage', 'sauna', 'wellness'],
        gym: ['fitness', 'exercise', 'workout'],
        bar: ['pub', 'alcohol', 'cocktail'],
        parking: ['garage', 'car park', 'valet'],
        heater: ['hot', 'heating'],
        fan: ['ventilation'],
        shower: ['bathroom', 'washroom', 'toilet', 'restroom'],
        smokeFree: ['nosmoking', 'smokefree'],
        concierge: ['reception', 'front desk', 'service'],
        security: ['guard', 'safe', 'protection']
    }

    for (const [key, keywords] of Object.entries(fuzzyGroups)) {
        if (keywords.some((kw) => value.includes(kw))) {
            return iconMap[key as keyof typeof iconMap]
        }
    }

    // 3️⃣ Fallback
    return iconMap['bed']
}
