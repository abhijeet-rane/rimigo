const IsInputCorrect = () => {
    return (
        <div className="relative rounded-xl bg-white border-gainsboro border-solid border-[1px] box-border w-full flex items-center p-3 gap-3 text-left text-sm text-gray font-red-hat-display">
            <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 relative shadow-[0px_0px_8px_rgba(112,_17,_246,_0.24)] rounded-[50%] bg-blue" />
                <div className="w-40 relative tracking-[-0.02em] font-medium inline-block shrink-0">Is this information correct?</div>
            </div>
            <div className="flex items-center gap-3 text-base">
                <div className="rounded-lg bg-white border-gray border-solid border-[1px] flex items-center justify-center py-3 px-4">
                    <b className="relative tracking-[-0.02em] leading-5">Yes, this is correct</b>
                </div>
                <div className="rounded-lg bg-white border-gray border-solid border-[1px] flex items-center justify-center py-3 px-4">
                    <b className="relative tracking-[-0.02em] leading-5">No, let me edit</b>
                </div>
            </div>
        </div>
    )
}

export default IsInputCorrect
