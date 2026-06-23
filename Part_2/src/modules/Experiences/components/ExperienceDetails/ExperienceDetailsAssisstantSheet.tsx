interface ExperienceDetailsAssisstantSheetProps {
    onClose: () => void
}

const ExperienceDetailsAssisstantSheet = ({ onClose }: ExperienceDetailsAssisstantSheetProps) => {
    return (
        <div className="h-screen flex flex-col bg-white">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">Assistant</h2>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl">
                    ×
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="bg-gray-100 p-3 rounded-lg">
                    <p className="text-sm">Hello! I'm here to help you with any questions about this experience.</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg ml-8">
                    <p className="text-sm">What are the best times to visit Vondelpark?</p>
                </div>
                <div className="bg-gray-100 p-3 rounded-lg">
                    <p className="text-sm">
                        The best times to visit Vondelpark are early morning (8-10 AM) for peaceful walks, or late afternoon (4-6 PM) for beautiful
                        lighting. Avoid weekends if you prefer fewer crowds.
                    </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg ml-8">
                    <p className="text-sm">Is it suitable for families with children?</p>
                </div>
                <div className="bg-gray-100 p-3 rounded-lg">
                    <p className="text-sm">
                        Absolutely! Vondelpark is very family-friendly with playgrounds, open spaces for kids to run around, and safe cycling paths.
                        There are also several cafes with outdoor seating.
                    </p>
                </div>
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 p-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Ask me anything..."
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
                    />
                    <button className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 sm:px-4 rounded-lg text-sm sm:text-base">Send</button>
                </div>
            </div>
        </div>
    )
}

export default ExperienceDetailsAssisstantSheet
