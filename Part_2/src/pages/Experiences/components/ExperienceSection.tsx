import React from 'react'
import { ChevronRight } from 'lucide-react'
import ExperienceCarousel from './ExperienceCarousel'
import { Experience } from './ExperienceCard'

interface ExperienceSectionProps {
    title: string
    subtitle?: string
    experiences: Experience[]
    showViewAll?: boolean
    onViewAll?: () => void
    onLike?: (id: string) => void
    onUpload?: (id: string) => void
    onClick?: (id: string) => void
    className?: string
}

const ExperienceSection: React.FC<ExperienceSectionProps> = ({
    title,
    subtitle,
    experiences,
    showViewAll = false,
    onViewAll,
    onLike,
    onUpload,
    onClick,
    className = ''
}) => {
    return (
        <section className={`py-8 ${className}`}>
            <div className="container mx-auto px-4">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                            {showViewAll && (
                                <button
                                    onClick={onViewAll}
                                    className="flex items-center gap-1 text-gray-600 hover:text-primary transition-colors">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        {subtitle && <p className="text-gray-600">{subtitle}</p>}
                    </div>
                </div>

                {/* Carousel */}
                <ExperienceCarousel
                    experiences={experiences}
                    onLike={onLike}
                    onUpload={onUpload}
                    onClick={onClick}
                />
            </div>
        </section>
    )
}

export default ExperienceSection
