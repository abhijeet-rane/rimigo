import { AnimatePresence, motion } from 'framer-motion'
import { STAR_PRIMARY_DEFAULT } from '@/constants/icons/svgFromCDN'
import GenericCarousel from '@/components/shared/Carousel/GenericCarousel'

interface Props {
    suggestions: string[]
    visible: boolean
    onChipClick: (chip: string) => void
}

/** Horizontally scrollable carousel of prompt chips with edge-fade hints. */
const SuggestionChips: React.FC<Props> = ({ suggestions, visible, onChipClick }) => {
    return (
        <AnimatePresence initial={false}>
            {visible && (
                <motion.div
                    key="chips"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                >
                    <div className="pb-2">
                        <GenericCarousel
                            gap={6}
                            containerClassName="py-1"
                            scrollControls={{ leftScrollBtn: '!hidden', rightScrollBtn: '!hidden' }}
                            leftGradientStyle="max-md:!block"
                            rightGradientStyle="max-md:!block"
                            gradientStartColor="white"
                            gradientEndColor="rgba(255,255,255,0)">
                            {suggestions.map((chip, idx) => (
                                <motion.button
                                    key={chip}
                                    type="button"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.28, delay: 0.06 + idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => onChipClick(chip)}
                                    className="flex shrink-0 items-center gap-1 rounded-full border border-primary-light/50 bg-white px-3 py-1 font-manrope text-[12px] font-medium text-primary-default cursor-pointer">
                                    <img
                                        src={STAR_PRIMARY_DEFAULT}
                                        alt=""
                                        aria-hidden
                                        className="h-3 w-3 shrink-0"
                                    />
                                    <span className="whitespace-nowrap">{chip}</span>
                                </motion.button>
                            ))}
                        </GenericCarousel>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default SuggestionChips
