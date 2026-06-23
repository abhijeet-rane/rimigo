/**
 * Third frame of the Where step: asks the user whether they want to pick
 * cities themselves or let us decide. Replaces the SubTabBar with a journey
 * strip in the shell.
 *
 * Layout:
 *   [fanned 3 city images]
 *   "Do you know which cities to visit?"
 *   [Yes, let me choose]   [No, decide for me]
 *
 * Spacing per Figma: images→heading = 24px, heading→buttons = 16px.
 */
import { useIsMobile } from '@/modules/Itinerary/hooks/ItineraryHook'

const FANNED_IMAGE_URLS = [
    'https://media.rimigo.com/compressed/1778506115578_christoph-theisinger-txwDMvvcpEc-unsplash.webp',
    'https://media.rimigo.com/compressed/1778506117657_jj-ying-9Qwbfa_RM94-unsplash.webp',
    'https://media.rimigo.com/compressed/1778506119578_tianshu-liu-aqZ3UAjs_M4-unsplash.webp',
]

export interface CitiesQuestionProps {
    /** Currently selected answer — controls the pill's filled/outlined state.
     *  `null` means neither pill is selected yet. */
    selectedAnswer: 'manual' | 'auto' | null
    /** Fires when the user chooses to pick cities manually. */
    onChooseManual: () => void
    /** Fires when the user opts in to automatic city selection. */
    onChooseAuto: () => void
}

export function CitiesQuestion({ selectedAnswer, onChooseManual, onChooseAuto }: CitiesQuestionProps) {
    const isMobile = useIsMobile()
    const manualSelected = selectedAnswer === 'manual'
    const autoSelected = selectedAnswer === 'auto'
    // Selected pill: black bg + white text, no border. Unselected pill: white
    // bg, grey-4 border, grey-0 text. Both share the base size/spacing tokens.
    const baseClass =
        'rounded-full px-4 py-2 font-manrope text-[16px] leading-[20px] tracking-[-0.32px]'
    const selectedClass = 'bg-black text-white'
    const unselectedClass =
        'border border-[var(--color-grey-4)] bg-white text-[var(--color-grey-0)]'

    return (
        <div className={`mx-auto flex w-full max-w-[690px] flex-col items-center px-4 ${isMobile ? 'py-12' : 'py-24'}`}>
            {/* Fanned 3-image stack. Each card 64x64, 12px radius, 2px white
                border, drop shadow rgba(13,12,13,0.30). Rotated and overlapped
                for the "deck of photos" look. */}
            <div className="relative mb-6 h-[80px] w-[176px]" aria-hidden>
                {FANNED_IMAGE_URLS.map((url, i) => {
                    const rotation = i === 0 ? -10 : i === 2 ? 10 : 0
                    const offset = i === 0 ? 0 : i === 1 ? 56 : 112
                    const zIndex = i === 1 ? 2 : 1
                    return (
                        <div
                            key={url}
                            className="absolute top-1/2 -translate-y-1/2"
                            style={{
                                left: offset,
                                width: 64,
                                height: 64,
                                transform: `translateY(-50%) rotate(${rotation}deg)`,
                                borderRadius: 12,
                                border: '2px solid #FFFFFF',
                                backgroundColor: '#D3D3D3',
                                backgroundImage: `url(${url})`,
                                backgroundSize: 'cover',
                                backgroundPosition: '50% 50%',
                                backgroundRepeat: 'no-repeat',
                                boxShadow: '0 2px 8px 0 rgba(13, 12, 13, 0.30)',
                                zIndex,
                            }}
                        />
                    )
                })}
            </div>

            {/* Heading — same style as 'Where are you headed?'. mb-4 = 16px
                to the buttons below. */}
            <h2
                className="wf-heading-m text-center mb-4"
                style={{ color: 'var(--text-primary)' }}
            >
                Do you know which cities to visit?
            </h2>

            {/* Action pills: 8/16 padding, 4px gap, 32px radius. The selected
                pill is filled black + white text per Figma; the unselected pill
                keeps the grey-4 outline. */}
            <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                    type="button"
                    onClick={onChooseManual}
                    aria-pressed={manualSelected}
                    className={`${baseClass} ${manualSelected ? selectedClass : unselectedClass}`}
                    style={{ fontWeight: 600 }}
                >
                    Yes, let me choose
                </button>
                <button
                    type="button"
                    onClick={onChooseAuto}
                    aria-pressed={autoSelected}
                    className={`${baseClass} ${autoSelected ? selectedClass : unselectedClass}`}
                    style={{ fontWeight: 600 }}
                >
                    No, decide for me
                </button>
            </div>
        </div>
    )
}
