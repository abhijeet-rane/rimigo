import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import React, { ReactNode } from 'react'

// Define context interface
interface AccordionContextProps {
    isActive?: boolean
    value?: string
    onChangeIndex?: (value: string) => void
}

const AccordionContext = React.createContext<AccordionContextProps>({})
const useAccordion = () => React.useContext(AccordionContext)

export function AccordionContainer({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('grid grid-cols-2 gap-1', className)}>{children}</div>
}

export function AccordionWrapper({ children }: { children: ReactNode }) {
    return <div className="w-full">{children}</div>
}

export function Accordion({ children, multiple, defaultValue }: { children: ReactNode; multiple?: boolean; defaultValue?: string | string[] }) {
    const [activeIndex, setActiveIndex] = React.useState<string | string[] | null>(
        multiple ? (defaultValue ? (Array.isArray(defaultValue) ? defaultValue : [defaultValue]) : []) : null
    )

    function onChangeIndex(value: string) {
        setActiveIndex((currentActiveIndex) => {
            if (!multiple) {
                return value === currentActiveIndex ? null : value
            }

            if (Array.isArray(currentActiveIndex) && currentActiveIndex.includes(value)) {
                return currentActiveIndex.filter((i) => i !== value)
            }

            return Array.isArray(currentActiveIndex) ? [...currentActiveIndex, value] : [value]
        })
    }

    return React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return null

        const value = (child as React.ReactElement<{ value: string }>).props.value
        const isActive = multiple
            ? Array.isArray(activeIndex) && activeIndex.includes(value)
            : Array.isArray(activeIndex)
              ? activeIndex[0] === value
              : activeIndex === value

        return <AccordionContext.Provider value={{ isActive, value, onChangeIndex }}>{child}</AccordionContext.Provider>
    })
}

export function AccordionItem({ children }: { children: ReactNode; value: string }) {
    const { isActive } = useAccordion()

    return (
        <div
            className={`rounded-md overflow-hidden mb-2  ${
                isActive ? 'active border-[1px]   border-feature-card-border  bg-white' : 'bg-transparent border-[1px] border-feature-card-border '
            }
    `}>
            {children}
        </div>
    )
}

export function AccordionHeader({ children, icon }: { children: ReactNode; icon?: React.ReactNode }) {
    const { isActive, value, onChangeIndex } = useAccordion()

    return (
        <motion.div
            className={`p-4 cursor-pointer transition-all font-semibold w-full  text-black hover:text-black flex justify-between items-center ${
                isActive ? 'active  bg-white' : ' bg-white'
            }
      `}
            onClick={() => onChangeIndex && value && onChangeIndex(value)}>
            {children}
            {icon ? (
                <div className={`${isActive ? 'rotate-45 ' : 'rotate-0 '} transition-transform`}>{icon}</div>
            ) : (
                <>
                    {isActive ? (
                        <img
                            src="/faq/closed.svg"
                            alt="minus"
                            className="object-cover"
                        />
                    ) : (
                        <img
                            src="/faq/open.svg"
                            className="object-cover"
                            alt="plus"
                        />
                    )}
                </>
            )}
        </motion.div>
    )
}

export function AccordionPanel({ children }: { children: ReactNode }) {
    const { isActive } = useAccordion()

    return (
        <AnimatePresence initial={true}>
            {isActive && (
                <motion.div
                    initial={{ height: 0, overflow: 'hidden' }}
                    animate={{ height: 'auto', overflow: 'hidden' }}
                    exit={{ height: 0 }}
                    transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                    className={`bg-white w-full`}>
                    <motion.article
                        initial={{ clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)' }}
                        animate={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)' }}
                        exit={{
                            clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)'
                        }}
                        transition={{
                            type: 'spring',
                            duration: 0.4,
                            bounce: 0
                        }}
                        className={`p-3 bg-white text-black `}>
                        {children}
                    </motion.article>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
