/**
 * Canonical list of ``slot.kind`` values that should render as a
 * transport card across every view (Kanban, calendar, mobile kanban,
 * mobile calendar, map).
 *
 * Historically each view kept its own 10-kind list (``TRANSPORT_TYPES``)
 * that predated the 150-mode transport dropdown. Slots saved with
 * kinds the dropdown can emit — ``metro``, ``tram``, ``monorail``,
 * ``tuk-tuk``, ``auto-rickshaw``, ``ride-hail``, ``boda boda``, etc.
 * — weren't in any list, so the calendar transformer defaulted
 * ``uiType`` to ``'custom'`` and the slot rendered with the target
 * emoji instead of the transport pill. Single source of truth here
 * stops that drift.
 *
 * Mirror of ``trip/constants/itinerary_slot_constants.TRANSPORT_SLOT_KINDS``
 * on the backend.
 */
export const TRANSPORT_SLOT_KINDS: ReadonlySet<string> = new Set([
    // Generic + hubs
    'transport',
    'transfer',
    'shuttle',
    'park-and-ride',
    // Air
    'flight',
    'helicopter',
    'private-jet',
    'charter-flight',
    'seaplane',
    // Rail (intercity + urban + light + monorail)
    'train',
    'metro',
    'subway',
    'tram',
    'monorail',
    'light-rail',
    // Road — public
    'bus',
    'coach',
    'minibus',
    // Road — taxi / ride-hail / three-wheeler / motorcycle
    'taxi',
    'ride-hail',
    'shared-cab',
    'rickshaw',
    'auto-rickshaw',
    'tuk-tuk',
    'motorbike',
    'scooter',
    // Road — car
    'car',
    'car-rental',
    'private_transport',
    'campervan',
    // Two-wheelers — personal / micromobility
    'bicycle',
    'e-bike',
    'e-scooter',
    'bike-rental',
    // Water
    'ferry',
    'boat',
    'speedboat',
    'cruise',
    'houseboat',
    'water-taxi',
    // Active / walk
    'walk',
    'hike',
])

export const isTransportKind = (kind: string | null | undefined): boolean =>
    Boolean(kind && TRANSPORT_SLOT_KINDS.has(kind))
