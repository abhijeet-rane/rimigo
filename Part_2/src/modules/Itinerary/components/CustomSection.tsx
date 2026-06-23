import { forwardRef, useImperativeHandle, useState, useEffect } from 'react'
import { SlotPayloadProvider } from './SlotPayloadProvider'
import AddSlotLabel from './AddSlotLabel'
import { Check } from 'lucide-react'

interface CustomData {
    title: string
    iconUrl: string | null
    bgColor: string | null
    iconMode: string | null
    timeBound: boolean
    description: string
}

interface CustomSectionProps {
    initialData?: {
        title?: string
        iconUrl?: string | null
        bgColor?: string | null
        iconMode?: string | null
        timeBound?: boolean
        description?: string
    }
    onChange?: (data: CustomData) => void
}

const DESCRIPTION_MAX_CHARS = 800

/**
 * Six curated custom-slot mode icons paired with matching pale
 * secondary-palette backgrounds. Each tile is a single choice —
 * picking an icon picks its background colour too. Both values are
 * saved together (``slot_data.icon_url`` + ``slot_data.bg_color``)
 * so the custom card renders the traveler's exact pick.
 *
 * ``bg`` is the pale tinted variant (~7% alpha) used as the card
 * background; ``accent`` is the solid hue used for the selected
 * tile's border + check badge.
 */
const CUSTOM_ICON_MODES: {
    /** Short semantic key saved to ``slot_data.icon_mode``. */
    name: string
    /** Traveler-facing label (hover tooltip + aria). */
    label: string
    url: string
    bg: string
    accent: string
}[] = [
    {
        name: 'rest',
        label: 'Rest',
        url: 'https://media.rimigo.com/compressed/1777045290907_image-fCUCZIbOMwyFIEPHpSaknMVdlzdBWV.webp',
        bg: '#7011F614',
        accent: '#7011F6',
    },
    {
        name: 'hotel',
        label: 'Hotel',
        url: 'https://media.rimigo.com/compressed/1777045291954_image-k1AoNwPz3uxZaY74Lwbuxi0s2YAuyE%20(1).webp',
        bg: '#1588CF14',
        accent: '#1588CF',
    },
    {
        name: 'chill',
        label: 'Chill',
        url: 'https://media.rimigo.com/compressed/1777359187921_chill_icon_beach.webp',
        bg: '#26BC6D14',
        accent: '#26BC6D',
    },
    {
        name: 'note',
        label: 'Note',
        url: 'https://media.rimigo.com/compressed/1777045293926_image-zGyBqZLV8MGRs1NxccwHoHjQc5XtsK.webp',
        bg: '#CDAE0014',
        accent: '#CDAE00',
    },
    {
        name: 'walk',
        label: 'Walk',
        url: 'https://media.rimigo.com/compressed/1777045864669_image-LnBkOp3vtoZxgA1Bbe9AQGMoa0Okez.webp',
        bg: '#E55A3414',
        accent: '#E55A34',
    },
    {
        name: 'locationpin',
        label: 'Location',
        url: 'https://media.rimigo.com/compressed/1777046143056_image-JgVvskF7j2zQ9LmIWmnCHHInmpJcTJ.webp',
        bg: '#E7343414',
        accent: '#E73434',
    },
    {
        name: 'party',
        label: 'Party',
        url: 'https://media.rimigo.com/compressed/1777359188736_party_disco_ball.webp',
        bg: '#E7349214',
        accent: '#E73492',
    },
    {
        name: 'cafe',
        label: 'Cafe',
        url: 'https://media.rimigo.com/compressed/1777359189832_cafe_hoping_coffee.webp',
        bg: '#8B5A2B14',
        accent: '#8B5A2B',
    },
    {
        name: 'tip',
        label: 'Tip',
        url: 'https://media.rimigo.com/compressed/1777359190649_tip_lightbulb.webp',
        bg: '#F59E0B14',
        accent: '#F59E0B',
    },
    {
        name: 'shopping',
        label: 'Shopping',
        url: 'https://media.rimigo.com/compressed/1777359191430_coat_rack.webp',
        bg: '#14B8A614',
        accent: '#14B8A6',
    },
    {
        name: 'souvenir',
        label: 'Souvenir',
        url: 'https://media.rimigo.com/compressed/1777359192551_fridge_magnet.webp',
        bg: '#6366F114',
        accent: '#6366F1',
    },
    {
        name: 'photo',
        label: 'Photo',
        url: 'https://media.rimigo.com/compressed/1777359193590_photo_camera.webp',
        bg: '#64748B14',
        accent: '#64748B',
    },
]

export const CustomSection = forwardRef<SlotPayloadProvider, CustomSectionProps>(
    ({ initialData, onChange }, ref) => {
        // Resolve the ``icon_mode`` semantic key from either the prior
        // value or a best-guess match of the saved ``icon_url`` (for
        // legacy slots that predate the ``icon_mode`` field).
        const resolveInitialMode = (): string | null => {
            if (initialData?.iconMode) return initialData.iconMode
            const byUrl = CUSTOM_ICON_MODES.find((m) => m.url === initialData?.iconUrl)
            return byUrl?.name || null
        }

        const [title, setTitle] = useState(initialData?.title || '')
        const [iconUrl, setIconUrl] = useState<string | null>(initialData?.iconUrl || null)
        const [bgColor, setBgColor] = useState<string>(initialData?.bgColor || '')
        const [iconMode, setIconMode] = useState<string | null>(resolveInitialMode())
        // Default ``timeBound`` is true so pre-existing custom slots
        // keep showing their timings. User toggles it off for "all
        // day"-ish slots (Rest / Chill / Walk) where the clock feels
        // noisy on the card.
        const [timeBound, setTimeBound] = useState<boolean>(
            initialData?.timeBound !== undefined ? Boolean(initialData.timeBound) : true
        )
        const [description, setDescription] = useState<string>(
            (initialData?.description || '').slice(0, DESCRIPTION_MAX_CHARS)
        )
        const [titleError, setTitleError] = useState<string | null>(null)

        // Initialize once
        useEffect(() => {
            setTitle(initialData?.title || '')
            setIconUrl(initialData?.iconUrl || null)
            setBgColor(initialData?.bgColor || '')
            setIconMode(resolveInitialMode())
            setTimeBound(
                initialData?.timeBound !== undefined ? Boolean(initialData.timeBound) : true
            )
            setDescription((initialData?.description || '').slice(0, DESCRIPTION_MAX_CHARS))
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [])

        // Notify parent
        useEffect(() => {
            onChange?.({
                title,
                iconUrl,
                bgColor: bgColor || null,
                iconMode: iconMode || null,
                timeBound,
                description,
            })
        }, [title, iconUrl, bgColor, iconMode, timeBound, description, onChange])

        useImperativeHandle(ref, () => ({
            getPayload() {
                if (!title.trim()) {
                    setTitleError('Title is required')
                    return null
                }
                const slotData: Record<string, unknown> = {}
                if (iconMode) slotData.icon_mode = iconMode
                if (iconUrl) slotData.icon_url = iconUrl
                if (bgColor) slotData.bg_color = bgColor
                slotData.time_bound = timeBound
                const trimmedDesc = description.trim()
                if (trimmedDesc) slotData.description = trimmedDesc
                return {
                    title: title.trim(),
                    slot_data: slotData,
                }
            },
        }))

        return (
            <div className="flex flex-col gap-4">
                {/* Title Input */}
                <div className="flex flex-col gap-1">
                    <AddSlotLabel isRequired text="Title" />
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value)
                            if (titleError) setTitleError(null)
                        }}
                        placeholder="Enter event title"
                        className={`h-10 px-4 border rounded-[12px] focus:outline-none focus:border-primary-default transition-colors text-sm font-manrope placeholder:text-grey-3 ${
                            titleError
                                ? 'border-secondary-red focus:border-secondary-red'
                                : 'border-grey-4'
                        }`}
                    />
                    {titleError && (
                        <p className="text-sm text-secondary-red font-medium font-manrope">
                            {titleError}
                        </p>
                    )}
                </div>

                {/* Unified mode picker — one row, six tiles, each icon
                    sits inside its paired pale secondary-palette
                    background. Picking a tile saves both
                    ``icon_url`` and ``bg_color`` in one go; tapping
                    the active tile clears the pair. The "Time bound"
                    pill sits on the right so the traveler can flip
                    off the clock for all-day-ish slots (Rest /
                    Chill / Walk). */}
                <div className="flex flex-col gap-2">
                    <AddSlotLabel text="Mode" />
                    <div className="flex flex-wrap items-center gap-2">
                        {CUSTOM_ICON_MODES.map((m) => {
                            const active = iconMode === m.name
                            return (
                                <button
                                    key={m.name}
                                    type="button"
                                    onClick={() => {
                                        if (active) {
                                            setIconMode(null)
                                            setIconUrl(null)
                                            setBgColor('')
                                        } else {
                                            setIconMode(m.name)
                                            setIconUrl(m.url)
                                            setBgColor(m.bg)
                                        }
                                    }}
                                    aria-label={m.label}
                                    aria-pressed={active}
                                    title={m.label}
                                    className="relative grid h-[63px] w-[63px] shrink-0 place-items-center rounded-[14px] transition-transform hover:scale-[1.04]"
                                    style={{
                                        background: m.bg,
                                        border: `${active ? 2 : 1}px solid ${
                                            active ? m.accent : `${m.accent}33`
                                        }`,
                                    }}>
                                    <img
                                        src={m.url}
                                        alt=""
                                        className="h-[42px] w-[42px] object-contain"
                                    />
                                    {active && (
                                        <span
                                            className="absolute top-1 right-1 grid h-[14px] w-[14px] place-items-center rounded-full"
                                            style={{ background: m.accent }}
                                            aria-hidden>
                                            <Check size={10} color="#fff" strokeWidth={3} />
                                        </span>
                                    )}
                                </button>
                            )
                        })}

                    </div>

                    {/* Time-bound toggle — plain checkbox row that
                        matches the rest of the composer's form
                        chrome instead of floating off as a pill. */}
                    <button
                        type="button"
                        role="switch"
                        aria-checked={timeBound}
                        onClick={() => setTimeBound((v) => !v)}
                        className="mt-1 flex items-center gap-2 w-fit cursor-pointer group">
                        <span
                            className={`grid h-[18px] w-[18px] place-items-center rounded-[5px] border transition-colors ${
                                timeBound
                                    ? 'border-primary-default bg-primary-default'
                                    : 'border-grey-3 bg-white group-hover:border-grey-2'
                            }`}>
                            {timeBound && (
                                <Check size={12} color="#fff" strokeWidth={3} />
                            )}
                        </span>
                        <span className="text-[13px] font-manrope font-medium text-grey-0">
                            Time bound slot
                        </span>
                    </button>
                </div>

                {/* Free-form details — capped at 200 chars; card
                    renderers show the first 6 lines with a
                    "Show more" CTA. */}
                <div className="flex flex-col gap-1">
                    <AddSlotLabel text="Details" />
                    <textarea
                        value={description}
                        onChange={(e) =>
                            setDescription(
                                e.target.value.slice(0, DESCRIPTION_MAX_CHARS)
                            )
                        }
                        rows={3}
                        maxLength={DESCRIPTION_MAX_CHARS}
                        placeholder="Add a short note — what's the plan, who's coming, anything to bring…"
                        className="px-3 py-2 border border-grey-4 rounded-[12px] focus:outline-none focus:border-primary-default transition-colors text-sm font-manrope placeholder:text-grey-3 resize-none leading-[20px]"
                    />
                    <div className="self-end text-[11px] font-manrope font-medium text-grey-2 tabular-nums">
                        {description.length}/{DESCRIPTION_MAX_CHARS}
                    </div>
                </div>
            </div>
        )
    }
)

CustomSection.displayName = 'CustomSection'
