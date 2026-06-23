import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Plane } from 'lucide-react'
import { countryEmoji } from './countryEmoji'
import { DepartureCityPicker } from './DepartureCityPicker'
import type { DepartureCityConfig } from './popularDepartureCities'
import type { SelectedCountry } from './types'

/**
 * Top strip rendered on the Select-Cities frame (replaces the SubTabBar).
 *
 *   [departure picker ▾]  ----- ✈ -----  [flag] <destination_country_names>
 *
 * The departure side is an inline searchable dropdown (DepartureCityPicker)
 * so the user picks their flying-from city right here instead of on a
 * separate sub-tab. Destination flag = first selected country's flag.
 */
export interface JourneyStripProps {
    /** Selected departure city, or null until the user picks one. */
    departureCity: DepartureCityConfig | null
    /** Fires when the user picks a departure city from the inline dropdown. */
    onSelectDeparture: (city: DepartureCityConfig) => void
    /** Destinations: the selected countries. The first country's flag is used
     *  as the visual marker; all names are joined comma-separated. */
    destinations: SelectedCountry[]
    /** Show the "departure required" error (set when Next is tapped with no
     *  departure picked). Desktop: left of the picker. Mobile: below it. */
    departureError?: boolean
    /** When this nonce changes, open the departure picker — used on the mobile
     *  route screen to surface the picker when Next is tapped without one. */
    departureOpenNonce?: number
}

export function JourneyStrip({
    departureCity,
    onSelectDeparture,
    destinations,
    departureError,
    departureOpenNonce,
}: JourneyStripProps) {
    const destFlag = destinations[0]?.flag
    const destFlagIsUrl = typeof destFlag === 'string' && destFlag.startsWith('http')
    const destFallbackEmoji = destinations[0]
        ? countryEmoji(destinations[0].name)
        : undefined
    // Show only the FIRST destination name; everything else collapses into a
    // "+N" tag. Keeps the strip to a single bounded line on mobile so it never
    // overflows the viewport (which caused the weird horizontal scroll).
    const VISIBLE_DEST_LIMIT = 1
    const visibleDestNames = destinations.slice(0, VISIBLE_DEST_LIMIT).map((c) => c.name).join(', ')
    const overflowCount = Math.max(0, destinations.length - VISIBLE_DEST_LIMIT)
    const destNames = overflowCount > 0 ? `${visibleDestNames} +${overflowCount}` : visibleDestNames

    return (
        <div
            /* Surface-Sunken bg with a soft downward Overlay-Button-Shadow per
               the desktop spec — the strip sits flush against the wizard top
               and casts a faint shadow onto the content area below. */
            className="w-full"
            style={{
                background: 'var(--surface-sunken, #F5F4F7)',
                boxShadow: '0 2px 8px 0 rgba(13, 12, 13, 0.16)',
            }}
        >
            <div className="mx-auto flex w-full max-w-[690px] items-center justify-center px-6 py-2">
                {/* Departure picker + its "required" cue. The cue is ABSOLUTELY
                    positioned to the LEFT of the picker (red text on desktop,
                    compact red icon on mobile) so showing/hiding it never adds or
                    removes layout width — otherwise this centered row would
                    re-center and visibly shift the departure button. */}
                <span className="relative inline-flex shrink-0 items-center">
                    <AnimatePresence initial={false}>
                        {departureError && (
                            <motion.span
                                key="dep-error"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                                className="pointer-events-none absolute right-full top-1/2 mr-2 inline-flex shrink-0 -translate-y-1/2 items-center">
                                <AlertCircle
                                    size={18}
                                    strokeWidth={2}
                                    className="md:hidden"
                                    style={{ color: '#E11D48' }}
                                />
                                <span
                                    className="hidden whitespace-nowrap md:inline"
                                    style={{
                                        color: '#E11D48',
                                        fontFamily: 'var(--font-family-body, Manrope)',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        lineHeight: '16px',
                                        letterSpacing: '-0.24px',
                                    }}
                                >
                                    Select a departure city
                                </span>
                            </motion.span>
                        )}
                    </AnimatePresence>
                    <DepartureCityPicker
                        value={departureCity}
                        onSelect={onSelectDeparture}
                        autoOpenNonce={departureOpenNonce}
                    />
                </span>

                {/* Middle track: single full-width dashed line whose color follows
                    a 90deg linear-gradient (transparent → Icon-Primary → transparent),
                    with the plane icon centered on top. The dashes are produced by
                    masking the gradient with a repeating-linear-gradient. */}
                <div className="relative mx-4 flex w-14 items-center justify-center">
                    <span
                        aria-hidden
                        className="absolute inset-x-0 h-px"
                        style={{
                            top: '50%',
                            background:
                                'linear-gradient(90deg, rgba(13, 12, 13, 0) 0%, #0D0C0D 50%, rgba(13, 12, 13, 0) 100%)',
                            WebkitMaskImage:
                                'repeating-linear-gradient(90deg, #000 0 8px, transparent 8px 11px)',
                            maskImage:
                                'repeating-linear-gradient(90deg, #000 0 8px, transparent 8px 11px)',
                        }}
                    />
                    {/* Plane sits on top of the dashed line. Surface-Sunken bg
                        masks the dashes immediately under the icon so the line
                        appears to break around the plane. */}
                    <span
                        className="relative z-10 inline-flex items-center justify-center px-2"
                        style={{ background: 'var(--surface-sunken, #F5F4F7)' }}
                    >
                        <Plane size={16} className="rotate-45" strokeWidth={1.5} />
                    </span>
                </div>

                <span className="inline-flex min-w-0 items-center gap-2">
                    {destFlagIsUrl ? (
                        <img src={destFlag} alt="" className="h-4 w-4 shrink-0" />
                    ) : destFallbackEmoji ? (
                        <span aria-hidden className="shrink-0 text-base leading-none">{destFallbackEmoji}</span>
                    ) : null}
                    <span
                        className="block max-w-[42vw] truncate text-left md:max-w-[200px]"
                        style={{
                            color: '#000',
                            fontFamily: 'var(--font-family-title)',
                            fontSize: 'var(--font-size-12)',
                            fontWeight: 550,
                            lineHeight: '16px',
                            letterSpacing: '-0.24px',
                        }}
                    >
                        {destNames}
                    </span>
                </span>
            </div>
        </div>
    )
}
