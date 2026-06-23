import { AnimatePresence, motion } from 'framer-motion'

const FallBackMainContent = ({
    config,
    currentExampleIndex,
    examples,
    handleExamplePress
}: {
    config: { title: string; subtitle: string }
    currentExampleIndex: number
    examples: string[]
    handleExamplePress: (example: string) => void
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-1 px-5 pt-7 overflow-y-auto">
            <div className="mb-3.5">
                <h1 className="text-2xl font-bold text-grey_0 leading-7 mb-4 font-red-hat-display whitespace-pre-line">
                    {config.title || 'Describe your stay the\nway you want'}
                </h1>
                <p className="text-sm font-bold text-grey_1 pt-9 font-red-hat-display">{config.subtitle || 'Try something like:'}</p>
            </div>

            {/* Example queries */}
            <div className="mb-7 relative">
                <div className="h-20 relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentExampleIndex}
                            initial={{ opacity: 0, scale: 0.67, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.67, y: -20 }}
                            transition={{ duration: 0.8 }}
                            className="absolute inset-0">
                            <button
                                onClick={() => handleExamplePress(examples[currentExampleIndex])}
                                className="w-full text-left hover:opacity-80 transition-opacity">
                                <p className="text-sm font-semibold text-grey_3 italic leading-6 font-red-hat-display">
                                    "{examples[currentExampleIndex]}"
                                </p>
                            </button>
                        </motion.div>
                    </AnimatePresence>
                </div>
                {/* White gradient overlay at bottom */}
                {/* <div className="absolute -bottom-16 left-0 right-0 h-14 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none"></div> */}
            </div>
        </motion.div>
    )
}

export default FallBackMainContent
