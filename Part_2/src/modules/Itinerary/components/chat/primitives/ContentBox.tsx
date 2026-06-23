import React from 'react'

interface ContentBoxProps {
    children: React.ReactNode
    /** 'default' has padding, 'flush' removes padding (for tables/lists that manage their own) */
    padding?: 'default' | 'flush'
    className?: string
}

const ContentBox: React.FC<ContentBoxProps> = ({
    children,
    padding = 'default',
    className = '',
}) => (
    <div
        className={`bg-white rounded-[12px] border border-grey_4 ${
            padding === 'flush' ? 'overflow-hidden' : 'p-3'
        } ${className}`}
    >
        {children}
    </div>
)

export default ContentBox
