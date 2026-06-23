/**
 * Collapsible wrapper for one flight search on the /flights page.
 *
 * Collapsed = dense summary bar (route, date, pax, cheapest price, result count,
 * recency). Expanded = full search content (refine row + flight list), passed
 * in as children. Open/closed state is controlled by the parent.
 *
 * Mobile layout stacks meta below the route row; desktop keeps it on one line.
 */
import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Loader, Users, Calendar, Sparkles } from 'lucide-react'

interface FlightSearchAccordionProps {
    isOpen: boolean
    onToggle: () => void
    route?: string
    dateLabel?: string
    travellersLabel?: string
    resultsCountLabel?: string
    fromPriceLabel?: string
    recencyLabel?: string
    isLatest?: boolean
    isLoading?: boolean
    children: React.ReactNode
}

const FlightSearchAccordion: React.FC<FlightSearchAccordionProps> = ({
    isOpen,
    onToggle,
    route,
    dateLabel,
    travellersLabel,
    resultsCountLabel,
    fromPriceLabel,
    recencyLabel,
    isLatest,
    isLoading,
    children
}) => {
    return (
        <div
            className={`rounded-2xl border bg-white overflow-hidden transition-colors ${
                isOpen ? 'border-primary-default/30 shadow-[0_4px_16px_rgba(17,24,39,0.05)]' : 'border-grey-4 hover:border-grey-3'
            }`}>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={isOpen}
                className="w-full text-left px-3 md:px-5 py-3 flex items-start md:items-center gap-3 cursor-pointer">
                {/* Left: route + meta */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        {isLatest && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary-default/10 px-2 py-0.5 font-red-hat-display text-[10px] font-bold text-primary-default uppercase tracking-wide shrink-0">
                                <Sparkles className="w-2.5 h-2.5" />
                                Latest
                            </span>
                        )}
                        <p className="font-red-hat-display text-base md:text-[17px] font-bold text-grey-0 truncate">
                            {route || 'Flight search'}
                        </p>
                        {isLoading && <Loader className="w-3.5 h-3.5 text-primary-default animate-spin shrink-0" />}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 font-manrope text-[12px] text-grey-2">
                        {dateLabel && (
                            <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {dateLabel}
                            </span>
                        )}
                        {travellersLabel && (
                            <span className="inline-flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {travellersLabel}
                            </span>
                        )}
                        {resultsCountLabel && <span className="text-grey-3">· {resultsCountLabel}</span>}
                        {recencyLabel && <span className="text-grey-3">· {recencyLabel}</span>}
                    </div>
                </div>

                {/* Right: price + chevron */}
                <div className="flex items-center gap-3 shrink-0">
                    {fromPriceLabel && (
                        <div className="text-right">
                            <p className="font-manrope text-[10px] font-semibold uppercase tracking-wide text-grey-3 leading-none">from</p>
                            <p className="font-red-hat-display text-base md:text-lg font-extrabold text-grey-0 tabular-nums leading-none mt-0.5">
                                {fromPriceLabel}
                            </p>
                        </div>
                    )}
                    <div
                        aria-hidden
                        className={`w-8 h-8 rounded-full border border-grey-4 bg-white text-grey-2 flex items-center justify-center transition-transform ${
                            isOpen ? 'rotate-180 border-primary-default/40 text-primary-default' : ''
                        }`}>
                        <ChevronDown className="w-4 h-4" />
                    </div>
                </div>
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        key="panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden">
                        <div className="px-0 md:px-5 pb-3 pt-0 border-t border-grey-4/60 bg-grey-5/40">
                            <div className="pt-3">{children}</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default FlightSearchAccordion
