import React from 'react'
import { Search } from 'lucide-react'

interface SearchBarProps {
    placeholder?: string
    onSearch?: (query: string) => void
}

/**
 * Standalone search bar component
 * Can be used independently or integrated into other components
 */
export const SearchBar: React.FC<SearchBarProps> = ({
    placeholder = 'Search for anything',
    onSearch
}) => {
    const [searchQuery, setSearchQuery] = React.useState('')

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setSearchQuery(value)
        if (onSearch) {
            onSearch(value)
        }
    }

    return (
        <div 
            className="w-full rounded-xl mb-8"
            style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                padding: '12px 16px'
            }}>
            <div className="flex items-center gap-2 w-full">
                <div 
                    className="flex items-center gap-2 w-full"
                    style={{
                        padding: '8px 12px',
                        borderRadius: '24px',
                        background: '#FFFFFF',
                        border: '1px solid #E5E7EB'
                    }}>
                    <Search className="w-5 h-5 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder={placeholder}
                        value={searchQuery}
                        onChange={handleInputChange}
                        className="flex-1 bg-transparent outline-none border-none"
                        style={{
                            fontFamily: 'Manrope',
                            fontWeight: 400,
                            fontSize: '14px',
                            lineHeight: '18px',
                            color: '#9CA3AF'
                        }}
                    />
                </div>
            </div>
        </div>
    )
}








