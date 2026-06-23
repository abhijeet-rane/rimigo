
const FiltersSkeleton = () => {
    return (
        <div className="flex flex-row flex-nowrap gap-2 animate-pulse">
            {Array.from({ length: 3 }).map((_, idx) => (
                <div
                    key={idx}
                    className="h-[32px] w-[120px] rounded-full bg-grey_3 shrink-0"
                />
            ))}
        </div>
    )
}

export default FiltersSkeleton