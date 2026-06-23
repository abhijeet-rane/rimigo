/**
 * Breadcrumb item structure
 */
export interface BreadcrumbItem {
    label: string
    href: string
    isLoading?: boolean
}

/**
 * Route segment configuration
 */
export interface BreadcrumbSegmentConfig {
    /**
     * The segment key (e.g., 'country', 'city', 'collection')
     */
    key: string
    /**
     * Function to resolve the display name from the segment ID
     */
    resolveName: (id: string) => Promise<string | null>
    /**
     * Function to build the href for this segment
     * Receives all previous segments, current segment ID, and optional search params
     */
    buildHref: (segments: BreadcrumbSegment[], currentId: string, searchParams?: URLSearchParams) => string
}

/**
 * Parsed route segment
 */
export interface BreadcrumbSegment {
    key: string
    id: string
    paramName: string // The route param name (e.g., 'countryId', 'cityId')
}

/**
 * Breadcrumb configuration
 */
export interface BreadcrumbConfig {
    /**
     * Home breadcrumb (always shown first)
     */
    home: {
        label: string
        href: string
    }
    /**
     * Segment configurations for dynamic routes
     */
    segments: BreadcrumbSegmentConfig[]
}
