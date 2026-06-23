import { ChevronDown } from 'lucide-react'

interface GenericDropownButtonProps {
    title: string
    icon?: string
    onClick: () => void
    isOpen?: boolean
}

const GenericDropownButton = ({ title, onClick, isOpen = false }: GenericDropownButtonProps) => {
    return (
        <button
            className="relative rounded-3xl bg-grey-5 border-grey-4 border-solid border box-border flex items-center py-2 px-3 gap-1 text-left text-sm text-grey-0 font-red-hat-display w-fit"
            onClick={onClick}>
            <div className="relative tracking-[-0.01em] leading-[18px] font-semibold text-grey-0">{title}</div>
            <ChevronDown className={`w-4 h-4 text-grey-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
    )
}

export default GenericDropownButton
