import { motion } from 'framer-motion'
import { memo } from 'react'

type StepCardProps = {
    isActive: boolean
    progress?: number
    icon: any
    title: string
    onClick: () => void
}

export const StepCard = memo(({
    isActive,
    icon: Icon,
    title,
    onClick
}: StepCardProps) => {
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ x: isActive ? 0 : 4 }}
            className={`relative w-full text-left p-4 rounded-xl transition-all
                ${isActive
                    ? 'bg-primary-default-08 border border-primary-default-8 shadow-sm'
                    : 'hover:bg-grey-4'}`}
        >
            <div className="flex items-center gap-4">
                <div
                    className={`flex items-center justify-center
                        w-11 h-11 min-w-[44px] min-h-[44px]
                        rounded-full transition-all
                        ${isActive
                            ? 'bg-primary-default text-white shadow-md'
                            : 'bg-grey-5 text-grey-2'}`}
                >
                    <Icon size={18} />
                </div>

                <h3
                    className={`font-semibold text-[16px] transition-colors leading-tight w-[80%]
                        ${isActive ? 'text-header-black' : 'text-grey-2'}`}
                >
                    {title}
                </h3>
            </div>
        </motion.button>
    )
}
)