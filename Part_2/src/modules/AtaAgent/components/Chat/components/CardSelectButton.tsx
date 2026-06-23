const CardSelectButton = ({ isSelected, onSelect }: { isSelected: boolean; onSelect: () => void }) => {
    return (
        <div
            className="rounded-[8px] bg-white border-grey-4 border-[1px] flex items-start py-2.5 px-3 gap-2 text-[16px] text-gray font-red-hat-display cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={(e) => {
                e.stopPropagation()
                onSelect?.()
            }}>
            {/* change color if is  */}
            <div
                className={`h-5 w-5 relative rounded-[50%] border-grey-4 box-border ${isSelected ? 'border-solid border-[4px] border-primary-default' : 'border-solid border-[1px] border-grey-4'}`}
            />
            <div className="relative tracking-num--0_02 leading-5 text-grey-0 font-semibold">Select</div>
        </div>
    )
}

export default CardSelectButton
