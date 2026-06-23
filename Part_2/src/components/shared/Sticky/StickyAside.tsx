import React from 'react'

type StickyAsideProps = {
    children: React.ReactNode
    top?: number
    className?: string
    style?: React.CSSProperties
}

const StickyAside: React.FC<StickyAsideProps> = ({ children, top = 16, className, style }) => {
    return (
        <div
            className={className}
            style={{ position: 'sticky', top, height: 'fit-content', ...style }}>
            {children}
        </div>
    )
}

export default StickyAside
