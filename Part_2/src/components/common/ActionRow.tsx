import { ReactNode } from 'react'

interface ActionRowProps {
    title: string
    description?: string
    icon: ReactNode
    onClick: () => void
    show?: boolean
}

export const ActionRow = ({
    title,
    description,
    icon,
    onClick,
    show = true,
}: ActionRowProps) => {
    if (!show) return null

    return (
        <div className="bg-white">
            <button
                type="button"
                onClick={onClick}
                className="w-full pl-6 pr-4 flex items-center justify-between py-3 text-left hover:bg-grey-5 cursor-pointer"
            >
                <div className="flex items-center gap-3">
                    <div>
                        <div className="text-[14px] font-medium font-red-hat-display text-grey-0">
                            {title}
                        </div>
                        {description && (
                            <div className="text-[12px] font-medium font-manrope text-grey-2 mt-1">
                                {description}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-2 bg-primary-default/10 rounded-lg">
                    {icon}
                </div>
            </button>
        </div>
    )
}
