/**
 * Central configuration for map components
 * All map-related variables and constants should be defined here
 */

export const MAP_CONFIG = {
    // Mapbox token (from environment)
    token: import.meta.env.VITE_MAPBOX_TOKEN as string | undefined,

    // Map style
    style: 'mapbox://styles/mapbox/standard' as const,

    // Initial map settings
    initialZoom: 10,
    initialPitch: 45,
    initialBearing: 0,
    minZoom: 4,
    maxZoom: 18,
    fitBoundsMaxZoom: 13,

    // Map padding
    fitBoundsPadding: {
        top: 80,
        bottom: 80,
        left: 60,
        right: 60
    },

    // Bounds padding factor (percentage)
    boundsPaddingFactor: 0.1,

    // Marker settings
    marker: {
        // Accommodation/Stay markers
        accommodation: {
            width: '60px',
            height: '26px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: '700',
            padding: '0 12px',
            defaultColor: '#FFFFFF',
            defaultBorderColor: '#747474',
            hoverBorderColor: 'white',
            textColor: '#101010',
            hoverTextColor: 'white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            zIndex: {
                default: '1',
                hovered: '1000'
            }
        },
        // Experience markers
        experience: {
            width: '60px',
            height: '26px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: '700',
            padding: '0 12px',
            defaultColor: '#7011F6', // Primary purple
            defaultBorderColor: '#747474',
            hoverBorderColor: 'white',
            textColor: 'white',
            hoverTextColor: 'white',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            zIndex: {
                default: '1',
                hovered: '1000'
            }
        }
    },

    // Popup card settings
    popup: {
        width: '240px',
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        imageHeight: '120px',
        padding: '12px',
        nameFontSize: '14px',
        nameFontWeight: '700',
        priceFontSize: '16px',
        priceFontWeight: '700',
        buttonPadding: '8px 16px',
        buttonFontSize: '12px',
        buttonFontWeight: '645',
        closeButtonSize: '24px',
        closeButtonTop: '8px',
        closeButtonRight: '8px',
        markerOffsetY: 50, // Offset above marker
        zIndex: 10000
    },

    // Map container settings
    container: {
        height: {
            mobile: '70vh',
            tablet: '60vh',
            desktop: 'calc(100vh-8rem)'
        },
        transitionDuration: 300
    },

    // Animation settings
    animation: {
        fitBoundsDuration: 1000,
        flyToDuration: 1100,
        flyToZoom: 16,
        flyToPadding: {
            top: 80,
            bottom: 80,
            left: 80,
            right: 80
        }
    },

    // Rating color thresholds (for accommodation markers)
    ratingColors: {
        excellent: {
            threshold: 90,
            color: '#7011F6' // primary-default
        },
        great: {
            threshold: 80,
            color: '#26BC6D' // secondary-green
        },
        good: {
            threshold: 70,
            color: '#CDAE00' // secondary-yellow
        },
        average: {
            threshold: 50,
            color: '#E55A34' // secondary-orange
        },
        poor: {
            threshold: 0,
            color: '#E73434' // secondary-red
        }
    },

    // Coordinate validation
    coordinate: {
        minLat: -90,
        maxLat: 90,
        minLng: -180,
        maxLng: 180,
        // Thresholds for detecting swapped coordinates
        maxValidLat: 90,
        maxValidLng: 180
    },

    // Route line settings
    routeLine: {
        overview: {
            color: '#7011F6',
            width: 3,
            opacity: 0.8,
            dashArray: [6, 4] as readonly number[]
        },
        day: {
            color: '#7011F6',
            width: 2.5,
            opacity: 0.7,
            dashArray: [4, 3] as readonly number[]
        },
        // Glow layer rendered beneath the main route line for a polished look
        glow: {
            color: '#7011F6',
            width: 8,
            opacity: 0.15,
            blur: 4
        },
        sourceId: 'route-line-source',
        layerId: 'route-line-layer',
        glowLayerId: 'route-line-glow-layer',
        arcPoints: 50,
        // Number of interpolation points per segment for Catmull-Rom spline curves
        curvePoints: 32
    }
} as const
