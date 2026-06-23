interface BottomSelectButtonsProps {
    config: {
        title: string
        buttons: {
            label: string
            onClick: () => void
            className?: string
        }[]
    }
    onOpenModal?: () => void
}

/*
config = {
    title: 'Select your preferred option to continue',
    buttons:[
    {
        label: 'View Details & Prices',
        onClick: () => onOpenModal()
        className: 'rounded-xl bg-white border-gray border-solid border-[1px] flex items-center justify-center py-3 px-4 text-base cursor-pointer hover:bg-gray-50 transition-colors'
    }
    ]

}

*/

const BottomSelectButtons = ({ config }: BottomSelectButtonsProps) => {
    return (
        <div className="relative rounded-xl bg-white border-grey-4 border-solid border-[1px] box-border  w-fit flex items-center p-3 gap-3 text-left text-sm text-gray font-red-hat-display">
            <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 relative shadow-[0px_0px_8px_rgba(112,_17,_246,_0.24)] rounded-[50%] bg-primary-default" />
                {config.title && <div className="w-40 relative tracking-[-0.02em] font-medium inline-block shrink-0">{config.title}</div>}
            </div>
            <div className="flex items-center gap-2">
                {config.buttons.map((button) => (
                    <button
                        key={button.label}
                        onClick={button.onClick}
                        className={button.className}>
                        <b className="relative tracking-[-0.02em] leading-5">{button.label}</b>
                    </button>
                ))}
            </div>
        </div>
    )
}

export default BottomSelectButtons
