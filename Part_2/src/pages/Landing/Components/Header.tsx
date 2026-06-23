import React from 'react'

export const Header: React.FC = () => {
    return (
        <header className="flex items-center justify-between px-6 py-8">
            {/* Left spacer */}
            <div className="w-24"></div>
            
            {/* Center - Logo */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <img 
                        src="/rimigo_black_logo.png" 
                        alt="Rimigo AI" 
                        className="h-8 w-auto"
                    />
                    <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full">BETA</span>
                </div>
                <div className="w-px h-6 bg-gray-400" />
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-600 rounded-sm" />
                    <span className="text-gray-800 text-sm">Dubai</span>
                </div>
            </div>
            
            {/* Right - Create trip button */}
            <button className="bg-black -mt-2 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                Create trip
            </button>
        </header>
    )
}







