// Parse the concierge's transport titles into structured
// {mode, from, to}.
//
// Two title shapes are supported:
//
//   1. **New (preferred)** — ``"<Mode>: <From> to <To>"`` (or ``→``):
//      • "Shinkansen Nozomi 220: Kyoto to Nagoya"
//      • "Kintetsu Limited Express: Kyoto to Nara"
//      • "Ferry: Naoshima to Takamatsu"
//      • "KLM KL 777: Delhi to Amsterdam"
//      • "Taxi: Narita Airport to Asakusa Hotel"
//
//   2. **Legacy (fallback)** — ``"<Mode phrase> from <From> to <To>"``:
//      • "Car from Phuket to Krabi"
//      • "Flight from Bangkok to Tokyo"
//      • "Overnight train from Yangon to Mandalay"
//      • "Private Car from Colombo Airport to Galle"
//      • "Car from Kandy (via Sigiriya) to Dambulla"
//
// When the backend enricher has not populated ``slot_data.from_city``
// / ``slot_data.to_city`` / ``slot_data.mode``, the kanban / calendar
// transport renderers fall back to parsing the title so the card can
// still display a proper origin → destination leg and pick the right
// mode icon.
//
// Returns null when the title doesn't match either shape — callers
// then keep their existing degraded-state rendering (title as-is,
// generic icon).
//
// ``canonicalizeMode`` is exported separately for callers that
// already have a raw mode string (e.g. ``slot_data.mode =
// "Shinkansen Nozomi 220"``) and just need to resolve it to one of
// the canonical pill-style keys for icon/color lookup.

export interface ParsedTransport {
    /** Canonical pill-style key (``flight`` / ``train`` / ``car`` / …). */
    mode: string
    /** Original mode phrase from the title (``"Shinkansen Nozomi 220"``,
     *  ``"Overnight train"``, ``"Private Car"``). Use this for display
     *  labels; use ``mode`` for icon / color lookup. */
    modePhrase: string
    from: string
    to: string
}

// Canonical transit modes. Values are the normalized mode name used
// for icon + pill-style lookup downstream; keys/aliases map variants
// to the canonical form. Keys are lowercase and whitespace-normalized.
// Multi-word aliases MUST be listed here so they take precedence over
// single-token matches (see ``extractMode`` scan order).
const MODE_ALIASES: Record<string, string> = {
    // ── air ──────────────────────────────────────────────────────────
    flight: 'flight',
    flights: 'flight',
    plane: 'flight',
    airplane: 'flight',
    aeroplane: 'flight',
    jet: 'flight',
    seaplane: 'flight',
    helicopter: 'flight',
    heli: 'flight',
    // ── rail: mainline, metro, bullet ────────────────────────────────
    train: 'train',
    rail: 'train',
    railway: 'train',
    metro: 'train',
    subway: 'train',
    underground: 'train',
    tube: 'train',
    tram: 'train',
    monorail: 'train',
    'light rail': 'train',
    'light-rail': 'train',
    shinkansen: 'train',
    'bullet train': 'train',
    'high-speed train': 'train',
    'high speed train': 'train',
    'express train': 'train',
    'sleeper train': 'train',
    'overnight train': 'train',
    tgv: 'train',
    eurostar: 'train',
    amtrak: 'train',
    // ── rail: cable / aerial ─────────────────────────────────────────
    // Map to ``train`` — closest guided-transit visual; pill text still
    // shows the original mode phrase so the user sees "Cable Car: X → Y".
    'cable car': 'train',
    'rope car': 'train',
    ropeway: 'train',
    gondola: 'train',
    funicular: 'train',
    'chair lift': 'train',
    chairlift: 'train',
    'aerial tram': 'train',
    'sky tram': 'train',
    skyline: 'train',
    // ── water ────────────────────────────────────────────────────────
    ferry: 'ferry',
    boat: 'boat',
    speedboat: 'boat',
    longtail: 'boat',
    'long tail': 'boat',
    'long-tail boat': 'boat',
    cruise: 'boat',
    yacht: 'boat',
    ship: 'boat',
    sailboat: 'boat',
    kayak: 'boat',
    // ── ground motor: taxi / hire / rickshaw ─────────────────────────
    car: 'car',
    taxi: 'car',
    cab: 'car',
    uber: 'car',
    lyft: 'car',
    ola: 'car',
    rickshaw: 'car',
    'auto rickshaw': 'car',
    'auto-rickshaw': 'car',
    auto: 'car',
    tuktuk: 'car',
    'tuk tuk': 'car',
    'tuk-tuk': 'car',
    // ── ground motor: transfer / shuttle / van ───────────────────────
    transfer: 'transfer',
    'private transfer': 'transfer',
    'airport transfer': 'transfer',
    shuttle: 'shuttle',
    'shuttle bus': 'shuttle',
    minivan: 'shuttle',
    van: 'shuttle',
    // ── ground motor: bus ────────────────────────────────────────────
    bus: 'bus',
    minibus: 'bus',
    coach: 'bus',
    'tour bus': 'bus',
    // ── two-wheel ────────────────────────────────────────────────────
    scooter: 'scooter',
    motorbike: 'scooter',
    motorcycle: 'scooter',
    moped: 'scooter',
    bike: 'scooter',
    bicycle: 'scooter',
    ebike: 'scooter',
    'e-bike': 'scooter',
    // ── feet ─────────────────────────────────────────────────────────
    walk: 'walk',
    walking: 'walk',
    hike: 'walk',
    trek: 'walk',
    stroll: 'walk'
}

// Longest multi-word alias (in tokens). Used as the upper bound for
// the n-gram scan in ``extractMode``; keep in sync with MODE_ALIASES
// keys — currently the longest is 3 tokens ("high speed train",
// "long tail boat", "light rail", etc., plus 2-token aliases).
const MODE_MAX_NGRAM = 3

// The ``from`` / ``to`` city captures may contain parenthetical
// qualifiers like "(via Sigiriya)" or trailing punctuation. Strip
// those on the way out so the card shows a clean endpoint label.
const PARENTHETICAL_RE = /\s*\([^)]*\)\s*/g
const TRIM_PUNCT_RE = /^[\s,;:.\-–—]+|[\s,;:.\-–—]+$/g

function cleanEndpoint(raw: string): string {
    if (!raw) return ''
    return raw
        .replace(PARENTHETICAL_RE, ' ')
        .replace(/\s+/g, ' ')
        .replace(TRIM_PUNCT_RE, '')
        .trim()
}

// Split the title into {modePhrase, from, to}.
//
// Tries the new ``"<Mode>: <From> to|→ <To>"`` shape first, then
// falls back to the legacy ``"<Mode phrase> from <From> to <To>"``
// shape. In both cases the LAST occurrence of ``" to "`` / ``" → "``
// is used as the origin→destination separator — defensive against
// multi-leg prose like "Flight from Hanoi to Halong to Cat Ba
// Island" or "Shinkansen: Tokyo → Shin-Yokohama to Kyoto", where
// stopovers live in the from_city and the final segment is the
// ultimate destination.
//
// Returns null if neither shape matches. Separators require
// whitespace on both sides to avoid false hits on substrings like
// "Tokyo Narita" (contains "to " but not " to ").
const FROM_TO_SEPARATORS = [' → ', ' -> ', ' to ']

function findLastSeparator(lower: string, startAfter: number): { idx: number; len: number } | null {
    let best = -1
    let bestLen = 0
    for (const sep of FROM_TO_SEPARATORS) {
        const idx = lower.lastIndexOf(sep)
        if (idx > best && idx >= startAfter) {
            best = idx
            bestLen = sep.length
        }
    }
    if (best < 0) return null
    return { idx: best, len: bestLen }
}

// Composite flight reference embedded inside a slot title (new format).
// Mirrors the Python regex in
// ``krysto/trip/services/ata/concierge/enricher/transport.py``:
//   <FN>@<ORIG>-<DEST>@<HH:MM>(+<FN>@<ORIG>-<DEST>@<HH:MM>)*
// where FN is 2–3 alphanumeric carrier code + 1–4 digits ("AI2391",
// "6E1632", "VJ143"). IATA codes are 3 uppercase letters.
const FLIGHT_REF_SEGMENT = '[A-Z0-9]{2,3}\\d{1,4}@[A-Z]{3}-[A-Z]{3}@\\d{1,2}:\\d{2}'
const FLIGHT_REFERENCE_RE = new RegExp(
    `(${FLIGHT_REF_SEGMENT}(?:\\+${FLIGHT_REF_SEGMENT})*)`
)

// Strict ``from: <city> to: <city>`` clause used by the project's
// canonical transport title format. Captures the city names; the
// keywords ``from:`` and ``to:`` are literal markers.
const FROM_TO_CLAUSE_RE = /\bfrom:\s*(.+?)\s+to:\s*(.+?)\s*$/i

function splitTitle(title: string): { modePhrase: string; from: string; to: string } | null {
    // Normalize internal whitespace but preserve case for mode alias
    // lookup (we lowercase for comparison only).
    const trimmed = title.trim().replace(/\s+/g, ' ')
    const lower = trimmed.toLowerCase()

    // Shape 0 (canonical, post-composite-migration):
    //   "<Mode>: <FlightRefOrName>: from: <From City> to: <To City>"
    // Example: "Flight: AI2391@HAN-DEL@08:20: from: Hanoi to: Bangalore"
    //          "Flight: VJ 716: from: Phu Quoc to: Da Nang"
    //          "Train: Shinkansen Nozomi: from: Tokyo to: Kyoto"
    // The composite reference (or plain service name) sits between the
    // first colon and ``from:`` — we drop it from the route portion
    // because it doesn't represent a city. Without this branch the
    // fallback below would emit ``from = "AI2391@HAN-DEL@08:20: from:
    // Hanoi"`` and a junk-prefixed display.
    const fromToMatch = trimmed.match(FROM_TO_CLAUSE_RE)
    if (fromToMatch) {
        const colonIdx = trimmed.indexOf(':')
        if (colonIdx > 0) {
            const modePhrase = trimmed.slice(0, colonIdx).trim()
            const from = fromToMatch[1].trim()
            const to = fromToMatch[2].trim()
            if (modePhrase && from && to) {
                return { modePhrase, from, to }
            }
        }
    }

    // Shape 1 (legacy non-canonical): "<Mode>: <From> to|→ <To>". The
    // mode is everything before the FIRST colon; the route is
    // everything after. Used by old enricher-emitted titles that
    // didn't follow the ``from:``/``to:`` strict format.
    const colonIdx = trimmed.indexOf(':')
    if (colonIdx > 0) {
        const modePhrase = trimmed.slice(0, colonIdx).trim()
        const route = trimmed.slice(colonIdx + 1).trim()
        const routeLower = route.toLowerCase()
        const sep = findLastSeparator(routeLower, 1)
        if (modePhrase && sep) {
            const from = route.slice(0, sep.idx).trim()
            const to = route.slice(sep.idx + sep.len).trim()
            if (from && to) return { modePhrase, from, to }
        }
        // Colon present but route portion didn't parse — fall through
        // to the legacy shape in case the title has both ``from`` and
        // a stray colon somewhere else.
    }

    // Shape 2 (legacy unstructured): "<Mode phrase> from <From> to <To>".
    const fromIdx = lower.indexOf(' from ')
    if (fromIdx < 1) return null
    const sep = findLastSeparator(lower, fromIdx + 6)
    if (!sep) return null
    const modePhrase = trimmed.slice(0, fromIdx).trim()
    const from = trimmed.slice(fromIdx + 6, sep.idx).trim()
    const to = trimmed.slice(sep.idx + sep.len).trim()
    if (!modePhrase || !from || !to) return null
    return { modePhrase, from, to }
}

// Extract the core mode keyword from the mode phrase. Strategy:
//
//   1. Scan for multi-word aliases first, longest n-gram → shortest,
//      right-to-left within each size. This makes "rope car" map to
//      the cable-car canonical (train) instead of falling through to
//      the single-token "car" alias. Same for "bullet train",
//      "cable car", "light rail", "tuk tuk", "auto rickshaw".
//   2. Fall back to single-token, scanned right-to-left so descriptor
//      prefixes like "Overnight", "Direct", "Morning", "Luxury",
//      "Private" are skipped and the operative mode word wins —
//      "overnight train" → train, "private car" → car, "morning
//      shuttle" → shuttle.
//
// Returns the canonical mode name or null when no recognized mode
// token is present (rejects prose like "Free time from X to Y"
// where no mode keyword appears).
function extractMode(modePhrase: string): string | null {
    const tokens = modePhrase
        .toLowerCase()
        .replace(/[^a-z\s-]/g, ' ')
        .split(/\s+/)
        .filter(Boolean)
    if (!tokens.length) return null

    // Multi-word scan: try n-grams from longest to shortest, right to
    // left within each size. Right-to-left lets "morning cable car"
    // match "cable car" before "morning" is considered.
    for (let n = Math.min(MODE_MAX_NGRAM, tokens.length); n >= 2; n--) {
        for (let i = tokens.length - n; i >= 0; i--) {
            const ngram = tokens.slice(i, i + n).join(' ')
            if (MODE_ALIASES[ngram]) return MODE_ALIASES[ngram]
        }
    }

    // Single-token fallback, right to left.
    for (let i = tokens.length - 1; i >= 0; i--) {
        if (MODE_ALIASES[tokens[i]]) return MODE_ALIASES[tokens[i]]
    }
    return null
}

/**
 * Parse a transport title into {mode, from, to}. Returns null when
 * the title doesn't match either supported shape or the mode word
 * isn't recognizable. Callers use this as a fallback when the
 * enricher hasn't populated slot_data.from_city / to_city / mode.
 *
 * Supported shapes:
 *   • New: "<Mode>: <From> to <To>" / "<Mode>: <From> → <To>"
 *   • Legacy: "<Mode phrase> from <From> to <To>"
 *
 * Behavior notes:
 *   • Multi-word cities handled ("Kuala Lumpur", "Ko Pha Ngan",
 *     "Rio de Janeiro", "Ho Chi Minh City", "New Delhi").
 *   • Parenthetical qualifiers stripped ("Kandy (via Sigiriya)" → "Kandy").
 *   • Descriptor-prefixed modes collapse to the core mode
 *     ("Shinkansen Nozomi 220" → "train", "Overnight train" → "train",
 *     "Private Car" → "car", "KLM KL 777" → "flight").
 *   • Multi-leg prose uses the LAST " to " / " → " as the
 *     destination separator ("Flight from Hanoi to Halong to Cat Ba
 *     Island" → from="Hanoi", to="Cat Ba Island").
 *   • Unknown modes reject rather than guess ("Board the flight …"
 *     returns null to avoid false positives on verb-prefixed prose).
 */
export function parseTransportTitle(title: string | null | undefined): ParsedTransport | null {
    if (!title) return null
    const split = splitTitle(title)
    if (!split) return null
    const mode = extractMode(split.modePhrase)
    if (!mode) return null
    const from = cleanEndpoint(split.from)
    const to = cleanEndpoint(split.to)
    if (!from || !to) return null
    return { mode, modePhrase: split.modePhrase, from, to }
}

/** Parsed shape of a composite flight reference. */
export interface ParsedFlightReference {
    /** First segment's origin IATA (the itinerary's overall origin). */
    origin: string
    /** Last segment's destination IATA (the itinerary's overall destination). */
    destination: string
    segments: Array<{
        /** Carrier code + number compacted, e.g. ``"AI2391"``. */
        flightNumber: string
        origin: string
        destination: string
        /** ``HH:MM`` 24-hour. */
        time: string
    }>
}

/**
 * Inverse of the Python ``build_flight_reference`` — parse a composite
 * such as ``"AI2391@HAN-DEL@08:20+AI2653@DEL-BLR@04:30"`` into the
 * structured shape the UI can render from.
 *
 * Returns null when the string isn't a valid composite (legacy slot
 * titles, free-form transport, malformed strings). Callers fall back
 * to ``slot_data.flight_data`` for rendering, or omit the flight-card
 * details entirely.
 */
export function parseFlightReference(
    reference: string | null | undefined
): ParsedFlightReference | null {
    if (!reference) return null
    const parts = reference.split('+')
    const segments: ParsedFlightReference['segments'] = []
    for (const part of parts) {
        const bits = part.split('@')
        if (bits.length !== 3) return null
        const [fn, route, time] = bits
        const dashIdx = route.indexOf('-')
        if (dashIdx < 0) return null
        const origin = route.slice(0, dashIdx)
        const destination = route.slice(dashIdx + 1)
        if (!fn || !origin || !destination || !time) return null
        segments.push({ flightNumber: fn, origin, destination, time })
    }
    if (!segments.length) return null
    return {
        origin: segments[0].origin,
        destination: segments[segments.length - 1].destination,
        segments,
    }
}

/**
 * Extract a composite flight reference from a slot title.
 *
 * Recognizes the new title format
 * (``Flight: AI2391@HAN-DEL@08:20: from: Hanoi to: Bangalore``).
 * Returns the composite string verbatim, or null when the title
 * doesn't carry one (legacy ``Flight: AI 2391: ...`` slots).
 */
export function extractFlightReferenceFromTitle(
    title: string | null | undefined
): string | null {
    if (!title) return null
    const match = title.match(FLIGHT_REFERENCE_RE)
    return match ? match[1] : null
}

/**
 * Render a user-facing flight-number label from a composite reference
 * or, failing that, the title's legacy plain flight number.
 *
 * - Composite present, direct → ``"AI 2391"``
 * - Composite present, 1-stop → ``"AI 2391 + AI 2653"``
 * - Composite present, 2-stop → ``"AI 2391 + AI 2653 + AI 2412"``
 * - No composite → first matched ``[A-Z]{2}\s?\d+`` token in the title
 *   formatted as ``"AI 2391"`` (legacy support).
 * - Nothing matches → null (UI suppresses the row).
 *
 * Prefer the slot's ``slot_data.flight_data.flight_number`` when it's
 * present (live cache hydration). Use this helper only for the
 * descriptive fallback or when reasoning purely from the title.
 */
export function flightNumberDisplayFromTitle(
    title: string | null | undefined
): string | null {
    if (!title) return null
    const composite = extractFlightReferenceFromTitle(title)
    if (composite) {
        const parsed = parseFlightReference(composite)
        if (parsed) {
            return parsed.segments
                .map((s) => prettifyFlightNumber(s.flightNumber))
                .join(' + ')
        }
    }
    // Legacy plain flight-number fallback.
    const legacy = title.match(/\b([A-Z]{2})\s?(\d{1,4})\b/)
    if (legacy) return `${legacy[1]} ${legacy[2]}`
    return null
}

/**
 * Insert a space between carrier code and number for display.
 * ``"AI2391"`` → ``"AI 2391"``. Handles 2- and 3-character codes
 * (``"6E1632"`` → ``"6E 1632"``).
 */
function prettifyFlightNumber(compact: string): string {
    const match = compact.match(/^([A-Z0-9]{2,3})(\d{1,4})$/)
    if (!match) return compact
    return `${match[1]} ${match[2]}`
}

/**
 * True when a transport slot is a flight. Checks ``slot_data.mode``
 * first, then falls back to parsing the title's ``<Mode>:`` prefix.
 *
 * The fallback exists because slots persisted during the composite
 * migration window may have ``slot_data = {flight_data: {...}}``
 * with no ``mode`` field — the backend's strict route regex used to
 * choke on composite-internal colons (``08:20``) and emitted partial
 * slot_data. The fix is in place server-side, but already-persisted
 * slots need the FE to derive mode from the title until they're
 * re-saved.
 */
export function isFlightTransport(
    slotData: { mode?: string | null } | null | undefined,
    title?: string | null
): boolean {
    const sdMode = slotData?.mode
    if (typeof sdMode === 'string' && sdMode.trim().toLowerCase() === 'flight') {
        return true
    }
    const parsed = parseTransportTitle(title)
    return parsed?.mode === 'flight'
}

/**
 * Strip the composite flight reference from a title and replace it
 * with the human-readable flight number(s). Use this whenever a
 * component renders the raw title as user-facing text — without it
 * the dense composite (``AI2391@HAN-DEL@08:20``) shows up verbatim.
 *
 * - ``"Flight: AI2391@HAN-DEL@08:20: from: Hanoi to: Bangalore"``
 *   → ``"Flight: AI 2391: from: Hanoi to: Bangalore"``
 * - ``"Flight: AI2391@HAN-DEL@08:20+AI2653@DEL-BLR@04:30: from: ..."``
 *   → ``"Flight: AI 2391 + AI 2653: from: ..."``
 * - Title without composite (legacy or non-flight) → returned as-is.
 */
export function displayTitle(title: string | null | undefined): string {
    if (!title) return ''
    const composite = extractFlightReferenceFromTitle(title)
    if (!composite) return title
    const parsed = parseFlightReference(composite)
    if (!parsed) return title
    const pretty = parsed.segments
        .map((s) => prettifyFlightNumber(s.flightNumber))
        .join(' + ')
    return title.replace(composite, pretty)
}

/**
 * Canonicalize a raw mode string to one of the pill-style keys
 * (``flight``, ``train``, ``car``, ``bus``, ``ferry``, ``boat``,
 * ``shuttle``, ``transfer``, ``taxi``, ``scooter``, ``walk``).
 *
 * Returns null when no recognizable mode token is present — the
 * caller should keep its existing fallback behavior (typically a
 * generic ``car`` icon with the raw string as a label).
 *
 * Use this when you already have a mode string from the backend
 * (e.g. ``slot_data.mode = "Shinkansen Nozomi 220"``) and just need
 * to pick the right icon / color. For free-form titles, use
 * ``parseTransportTitle`` instead.
 */
export function canonicalizeMode(raw: string | null | undefined): string | null {
    if (!raw) return null
    return extractMode(raw)
}
