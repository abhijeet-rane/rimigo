type ExclusiveCardBottomProps = {
    title: React.ReactNode
    subtitle: string
}

const ExclusiveCardBottom = ({ title, subtitle }: ExclusiveCardBottomProps) => {
    return (
        <div className="mt-8">
            <h3 className="text-grey-0 font-semibold text-[20px] font-red-hat-display">
                {title}
            </h3>

            <p className="mt-1 text-[15px] font-medium text-grey-2 font-manrope">
                {subtitle}
            </p>
        </div>
    )
}

export default ExclusiveCardBottom
