import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useBreadcrumbs } from './useBreadcrumbs'
import Typography from '@/components/shared/Typography'
import { cn } from '@/lib/utils'

interface BreadcrumbsProps {
    /**
     * Custom className for the breadcrumb container
     */
    className?: string
    /**
     * Custom separator component (defaults to ChevronRight icon)
     */
    separator?: React.ReactNode
    /**
     * Show loading skeleton for items that are loading
     */
    showLoadingSkeleton?: boolean
    /**
     * Optional search params to preserve in breadcrumb links
     * If not provided, uses current page's search params
     */
    searchParams?: URLSearchParams
}

/**
 * Breadcrumbs Component
 *
 * A production-grade breadcrumb component that:
 * - Automatically parses the current route
 * - Resolves segment names from APIs
 * - Handles loading states
 * - Ignores query parameters
 * - Provides clickable navigation
 *
 * Usage:
 * ```tsx
 * <Breadcrumbs />
 * ```
 */
const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ className, separator, showLoadingSkeleton = true, searchParams }) => {
    const breadcrumbItems = useBreadcrumbs(undefined, searchParams)

    if (breadcrumbItems.length === 0) {
        return null
    }

    const defaultSeparator = <ChevronRight className="w-4 h-4 text-grey-2" />

    return (
        <nav
            aria-label="Breadcrumb"
            className={cn('flex items-center gap-1 md:gap-2', className)}>
            {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1

                return (
                    <React.Fragment key={`${item.href}-${index}`}>
                        {index > 0 && (separator || defaultSeparator)}

                        {isLast ? (
                            // Last item is not clickable
                            <Typography
                                size="14"
                                weight="medium"
                                family="manrope"
                                color="grey-0"
                                className="truncate">
                                {item.isLoading && showLoadingSkeleton ? (
                                    <span className="inline-block w-24 h-0 bg-grey-4 rounded animate-pulse" />
                                ) : (
                                    item.label
                                )}
                            </Typography>
                        ) : (
                            // Other items are clickable links
                            <Link
                                to={item.href}
                                className="hover:text-primary-default transition-colors">
                                <Typography
                                    size="14"
                                    weight="medium"
                                    family="manrope"
                                    color="grey-2"
                                    className="truncate">
                                    {item.isLoading && showLoadingSkeleton ? (
                                        <span className="inline-block w-24 h-4 bg-grey-4 rounded animate-pulse" />
                                    ) : (
                                        item.label
                                    )}
                                </Typography>
                            </Link>
                        )}
                    </React.Fragment>
                )
            })}
        </nav>
    )
}

export default Breadcrumbs
