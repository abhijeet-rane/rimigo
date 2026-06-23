interface AboutLayoutProps {
    children: React.ReactNode
}
const AboutLayout = ({ children }: AboutLayoutProps) => {
    return (
        <div className="min-h-screen flex flex-col">
            <main className="flex-1">{children}</main>
        </div>
    )
}

export default AboutLayout
