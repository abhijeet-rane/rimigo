import React from 'react'

interface MobileSearchExpandContentProps {
    title: string
    children: React.ReactNode
}

const MobileSearchExpandContent: React.FC<MobileSearchExpandContentProps> = ({ children }) => {
    return (
        <div className="flex flex-col gap-5 ">
            {/* <Typography
                size="18"
                className="pt-[10px] px-[10px]"
                weight="semibold"
                family="redhat"
                color="grey-0">
                {title}
            </Typography> */}
            <div></div>
            {children}
        </div>
    )
}

export default MobileSearchExpandContent
