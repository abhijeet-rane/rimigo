const ContinueButton = ({ handleContinue, disabled }: { handleContinue: () => void; disabled: boolean }) => {
    return (
        <button
            onClick={handleContinue}
            disabled={disabled}
            className="px-6 py-3 cursor-pointer bg-primary-default text-white rounded-[16px] font-semibold hover:bg-primary-default-80 transition-colors font-red-hat-display uppercase hover:text-primary-default">
            Continue
        </button>
    )
}

export default ContinueButton
