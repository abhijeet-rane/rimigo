import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'

interface PaginationProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    className?: string
}

export default function Pagination({ currentPage, totalPages, onPageChange, className = '' }: PaginationProps) {
    if (totalPages <= 1) return null

    const getVisiblePages = () => {
        const delta = 2
        const range = []
        const rangeWithDots = []

        for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
            range.push(i)
        }

        if (currentPage - delta > 2) {
            rangeWithDots.push(1, '...')
        } else {
            rangeWithDots.push(1)
        }

        rangeWithDots.push(...range)

        if (currentPage + delta < totalPages - 1) {
            rangeWithDots.push('...', totalPages)
        } else if (totalPages > 1) {
            rangeWithDots.push(totalPages)
        }

        return rangeWithDots
    }

    const visiblePages = getVisiblePages()

    return (
        <div className={`flex items-center justify-center space-x-2 ${className}`}>
            {/* Previous button */}
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500">
                <IconChevronLeft className="w-4 h-4 mr-1" />
                Previous
            </button>

            {/* Page numbers */}
            <div className="hidden sm:flex space-x-1">
                {visiblePages.map((page, index) => {
                    if (page === '...') {
                        return (
                            <span
                                key={`dots-${index}`}
                                className="px-3 py-2 text-sm font-medium text-gray-500">
                                ...
                            </span>
                        )
                    }

                    const pageNumber = page as number
                    const isActive = pageNumber === currentPage

                    return (
                        <button
                            key={pageNumber}
                            onClick={() => onPageChange(pageNumber)}
                            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                isActive ? 'bg-primary-default text-white' : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}>
                            {pageNumber}
                        </button>
                    )
                })}
            </div>

            {/* Mobile page info */}
            <div className="sm:hidden">
                <span className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                </span>
            </div>

            {/* Next button */}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500">
                Next
                <IconChevronRight className="w-4 h-4 ml-1" />
            </button>
        </div>
    )
}
