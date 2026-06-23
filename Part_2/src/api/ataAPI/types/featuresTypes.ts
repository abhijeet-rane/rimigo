export interface ATAFeature {
    id: string
    name: string
    description: string
    category: 'hero' | 'featured' | 'stays' | 'experiences' | 'transportation' | 'other'
    status: 'active' | 'coming_soon' | 'inactive'
    agent: {
        id: string
        name: string
        identifier: string
    }
    entity: {
        id: string
        category: string
        name: string
    }
    country: {
        id: string
        name: string
    }
    city: {
        id: string
        name: string
    }
    card_props: CardProps
}

export interface CardProps {
    name: string
    highlight_text: string | null
    text_color?: string | null
    highlight_text_color?: string | null
    highlight_text_bg_color?: string | null
    background_image: string | null
    icon: string | null
    background_color: string | null
    card_type: 'rectangle_big' | 'rectangle_normal'
    cta_props: CTAProps
    actions?: FeatureAction[]
    // Legacy fields for backward compatibility
    redirection?: RedirectionAction
    api_actions?: APIAction[]
}

export interface CTAProps {
    cta_text: string
    cta_bg_color: string
    cta_color: string
}

export interface RedirectionAction {
    path: string
    path_params: Record<string, string>
    query_params: Record<string, string>
}

export interface APIAction {
    type: 'firePrompt' | string
    input_data: {
        agent_id: string
        prompt: string
    }
}

// New unified action interface
export interface FeatureAction {
    type: 'redirection' | 'firePrompt'
    // For redirection type
    path?: string
    path_params?: Record<string, string>
    query_params?: Record<string, string>
    // For firePrompt type
    agent?: string
    prompt?: string
    // Legacy support
    input_data?: Record<string, any>
}

export interface CategoryInfo {
    title: string
    description: string
}

export interface ATAFeaturesResponse {
    message: string
    response_code: string
    data: {
        data: ATAFeature[]
        category_info?: Record<string, CategoryInfo>
        pagination: {
            page: number
            total_pages: number
            count: number
            limit: number
            offset: number
        }
    }
}

