interface ViewDetailsAndPricesProps {
    onOpenModal?: () => void
}

const ViewDetailsAndPrices = ({ onOpenModal }: ViewDetailsAndPricesProps) => {
    return (
        <div className="relative rounded-xl bg-white border-grey-4 border-solid border-[1px] box-border  w-fit flex items-center p-3 gap-3 text-left text-sm text-gray font-red-hat-display">
            <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 relative shadow-[0px_0px_8px_rgba(112,_17,_246,_0.24)] rounded-[50%] bg-primary-default" />
                <div className="w-40 relative tracking-[-0.02em] font-medium inline-block shrink-0">Select your preferred option to continue</div>
            </div>
            <button
                onClick={onOpenModal}
                className="rounded-xl bg-white border-gray border-solid border-[1px] flex items-center justify-center py-3 px-4 text-base cursor-pointer hover:bg-gray-50 transition-colors">
                <b className="relative tracking-[-0.02em] leading-5">{`View Details & Prices`}</b>
            </button>
        </div>
    )
}

export default ViewDetailsAndPrices
