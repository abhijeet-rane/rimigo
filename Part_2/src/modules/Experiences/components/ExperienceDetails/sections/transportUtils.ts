export const labelMap: Record<string, string> = {
    bus: 'Bus',
    metro: 'Metro',
    train: 'Train',
    taxi: 'Taxi',
    car: 'Car',
    bike: 'Bike',
    cable_car: 'Cable Car',
    walking: 'Walking',
    shuttle_service: 'Shuttle',
    boat_service: 'Boat',
    ferry_service: 'Ferry'
}

export const isValidRecommendedOption = (option: string): boolean => option in labelMap && labelMap[option] !== undefined

export const createDescriptionLookup = (descriptions?: Array<{ key: string; description: string }>) => {
    const lookup = new Map<string, string>()
    ;(descriptions ?? []).forEach(({ key, description }) => {
        lookup.set(key, description)
        const label = labelMap[key]
        if (label) {
            lookup.set(label, description)
        }
    })
    return lookup
}
