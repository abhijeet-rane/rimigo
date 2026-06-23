interface StaysListHeaderProps {
    cityName?: string
    totalStays?: number
}

const StaysListHeader = ({ cityName, totalStays = 1000 }: StaysListHeaderProps) => {
    return (
        <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-grey-grey_2">
                Over {totalStays.toLocaleString()} stays in {cityName}
            </div>
            <div className="hidden lg:flex items-center gap-2 text-sm text-grey-grey_2">
                <span className="inline-flex items-center gap-1 text-primary-default">
                    <img
                        src="/illustrations/tag.png"
                        alt="tag"
                        className="h-6 w-6"
                        style={{
                            transform: 'scaleX(-1)',
                            mixBlendMode: 'multiply'
                        }}
                    />
                    Prices include all fees
                </span>
            </div>
        </div>
    )
}

export default StaysListHeader
