interface ChipProps {
    text: string
}

export const Chip = ({ text }: ChipProps) => {
    return (
        <span className={`px-1.5 w-fit py-0.5 rounded-full text-[8px] font-medium whitespace-nowrap text-grey-0 bg-grey-4`}>
            {text.toLocaleUpperCase()}
        </span>
    )
}
