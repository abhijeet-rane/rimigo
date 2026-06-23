export const RenderNextButton = (onClick: () => void, disabled: boolean) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary-default text-white font-medium disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed  transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 disabled:hover:scale-100">
        <span>Next</span>
        <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
            />
        </svg>
    </button>
)
