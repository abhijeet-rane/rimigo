import React from 'react'

interface SubjectLineProps {
    /** Prefix text, e.g., "About", "Alternatives for", "Searched for" */
    prefix: string
    /** The highlighted subject value */
    subject: string
    className?: string
}

const SubjectLine: React.FC<SubjectLineProps> = ({
    prefix,
    subject,
    className = '',
}) => (
    <p className={`text-xs text-grey_2 font-manrope ${className}`}>
        {prefix}:{' '}
        <span className="font-medium text-primary-default">{subject}</span>
    </p>
)

export default SubjectLine
