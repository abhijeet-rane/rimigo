interface ButtonProps {
    children: React.ReactNode
    className?: string
    href?: string
}

const Button = ({ children, className, href }: ButtonProps) => {
    return (
        <>
            {href ? (
                <a
                    href={href}
                    className={`bg-primary-default text-white px-4 py-2 rounded-sm ${className}`}>
                    {children}
                </a>
            ) : (
                <button className={`bg-primary-default text-white px-4 py-2 rounded-sm ${className}`}>{children}</button>
            )}
        </>
    )
}

export default Button
