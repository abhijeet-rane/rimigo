/**
 * First frame of the When step. Asks whether the user has fixed travel
 * dates, in the same style as the cities-question frame.
 *
 *   [calendar icon — 160px from top]
 *   "Do you know your travel dates?"
 *   [Yes]   [No]
 */
import { CALENDAR_RED_ICON } from '@/constants/thiingsIcons'

export interface WhenQuestionProps {
    /** Currently selected answer — controls the filled/outlined pill state. */
    selectedAnswer: 'yes' | 'no' | null
    /** Fires when the user picks "Yes" (knows the dates). */
    onChooseYes: () => void
    /** Fires when the user picks "No" (let us decide). */
    onChooseNo: () => void
}

export function WhenQuestion({ selectedAnswer, onChooseYes, onChooseNo }: WhenQuestionProps) {
    const yesSelected = selectedAnswer === 'yes'
    const noSelected = selectedAnswer === 'no'

    const baseClass =
        'rounded-full px-4 py-2 font-manrope text-[16px] leading-[20px] tracking-[-0.32px]'
    const selectedClass = 'bg-black text-white'
    const unselectedClass =
        'border border-[var(--color-grey-4)] bg-white text-[var(--color-grey-0)]'

    return (
        <div className="mx-auto flex w-full max-w-[690px] flex-col items-center px-4 pt-8">
            <img
                src={CALENDAR_RED_ICON}
                alt=""
                aria-hidden
                className="mb-6 h-16 w-16"
                style={{ aspectRatio: '1 / 1' }}
            />
            <h2
                className="wf-heading-m text-center mb-4"
                style={{ color: 'var(--text-primary)' }}
            >
                Do you know your travel dates?
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                    type="button"
                    onClick={onChooseYes}
                    aria-pressed={yesSelected}
                    className={`${baseClass} ${yesSelected ? selectedClass : unselectedClass}`}
                    style={{ fontWeight: 600 }}
                >
                    Yes
                </button>
                <button
                    type="button"
                    onClick={onChooseNo}
                    aria-pressed={noSelected}
                    className={`${baseClass} ${noSelected ? selectedClass : unselectedClass}`}
                    style={{ fontWeight: 600 }}
                >
                    No
                </button>
            </div>
        </div>
    )
}
