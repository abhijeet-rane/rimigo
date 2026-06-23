import React from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '@/components/ui/drawer' // Adjust the import path if needed
import { Button } from '@/components/ui/button'

interface BottomSheetProps {
    title: string
    onClose: () => void
    children?: React.ReactNode
    isOpen: boolean
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ title, onClose, children, isOpen }) => {
    return (
        <Drawer
            open={isOpen}
            onOpenChange={(open) => !open && onClose()}>
            {/* Optional trigger can be used somewhere else */}
            <DrawerContent className="">
                <DrawerHeader>
                    <DrawerTitle>{title}</DrawerTitle>
                    <DrawerDescription>This action cannot be undone.</DrawerDescription>
                </DrawerHeader>

                <div className="py-5 px-5 flex-1 overflow-y-auto">{children}</div>

                <DrawerFooter className="flex gap-2">
                    <Button onClick={() => console.debug('Submit clicked')}>Submit</Button>
                    <DrawerClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}
