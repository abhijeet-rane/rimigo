export interface IRegion {
    id: string
    name: string
    created_at: string
    updated_at: string
}
export interface ICountry {
    id: string
    name: string
    region: IRegion
    created_at: string
    updated_at: string
}

export interface ICity {
    id: string
    name: string
    province: string | null
    country: ICountry
    experience_count: number
    created_at: string
    updated_at: string
}
