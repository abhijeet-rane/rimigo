import { Compass, Heart, ListChecks } from 'lucide-react'

export type ShortlistViewMode = 'in_itinerary' | 'shortlisted'

interface ShortlistViewToggleProps {
    mode: ShortlistViewMode
    onChange: (mode: ShortlistViewMode) => void
    className?: string
    /**
     * Label for the primary (non-shortlisted) mode. Defaults to "In your
     * itinerary" — the Activities tab overrides this to "Explore".
     */
    primaryLabel?: string
    /** Label for the shortlisted mode. Defaults to "Shortlisted". */
    secondaryLabel?: string
    /** Icon variant. 'itinerary' (default) shows ListChecks; 'explore' shows Compass. */
    primaryIcon?: 'itinerary' | 'explore'
}

const ShortlistViewToggle: React.FC<ShortlistViewToggleProps> = ({
    mode,
    onChange,
    className,
    primaryLabel = 'In your itinerary',
    secondaryLabel = 'Shortlisted',
    primaryIcon = 'itinerary'
}) => {
    const baseBtn =
        'flex items-center gap-1 px-2 py-1.5 rounded-[4px] text-[12px] font-semibold font-manrope tracking-[-0.24px] leading-4 transition-colors'
    const activeBtn = 'bg-grey-0 text-white'
    const inactiveBtn = 'text-grey-0 hover:bg-grey-5'

    const PrimaryIcon = primaryIcon === 'explore' ? Compass : ListChecks

    return (
        <div
            className={`flex items-center border border-[#dfdde0] rounded-[8px] p-1 shrink-0${
                className ? ` ${className}` : ''
            }`}>
            <button
                type="button"
                onClick={() => onChange('in_itinerary')}
                className={`${baseBtn} ${mode === 'in_itinerary' ? activeBtn : inactiveBtn}`}>
                <PrimaryIcon className="w-3.5 h-3.5" />
                {primaryLabel}
            </button>
            <button
                type="button"
                onClick={() => onChange('shortlisted')}
                className={`${baseBtn} ${mode === 'shortlisted' ? activeBtn : inactiveBtn}`}>
                <Heart className="w-3.5 h-3.5" />
                {secondaryLabel}
            </button>
        </div>
    )
}

export default ShortlistViewToggle
