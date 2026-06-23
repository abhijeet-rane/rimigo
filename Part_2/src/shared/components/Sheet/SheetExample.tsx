import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from './Sheet'

// Example usage of the reusable Sheet component
const SheetExample: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="p-4 space-y-4">
            <h2 className="text-2xl font-bold">Sheet Component Examples</h2>

            {/* Example 1: Basic Sheet with Trigger */}
            <div>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button>Open Basic Sheet</Button>
                    </SheetTrigger>
                    <SheetContent side="right">
                        <SheetHeader>
                            <SheetTitle>Basic Sheet</SheetTitle>
                            <SheetDescription>This is a basic sheet that slides in from the right.</SheetDescription>
                        </SheetHeader>
                        <div className="mt-4">
                            <p>This sheet demonstrates the basic functionality with a trigger button.</p>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Example 2: Controlled Sheet */}
            <div>
                <Button onClick={() => setIsOpen(true)}>Open Controlled Sheet</Button>
                <Sheet
                    open={isOpen}
                    onOpenChange={setIsOpen}>
                    <SheetContent side="left">
                        <SheetHeader>
                            <SheetTitle>Controlled Sheet</SheetTitle>
                            <SheetDescription>This sheet is controlled by React state and slides from the left.</SheetDescription>
                        </SheetHeader>
                        <div className="mt-4 space-y-4">
                            <p>This sheet is controlled by the `isOpen` state.</p>
                            <Button onClick={() => setIsOpen(false)}>Close Sheet</Button>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Example 3: Sheet without Close Button */}
            <div>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline">Open Sheet (No Close Button)</Button>
                    </SheetTrigger>
                    <SheetContent
                        side="right"
                        showCloseButton={false}>
                        <SheetHeader>
                            <SheetTitle>No Close Button</SheetTitle>
                            <SheetDescription>This sheet doesn't have a close button in the top-right corner.</SheetDescription>
                        </SheetHeader>
                        <div className="mt-4">
                            <p>You can only close this sheet by clicking outside or using the trigger.</p>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>

            {/* Example 4: Custom Styled Sheet */}
            <div>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="secondary">Open Custom Styled Sheet</Button>
                    </SheetTrigger>
                    <SheetContent
                        side="right"
                        className="bg-gradient-to-br from-blue-50 to-indigo-100">
                        <SheetHeader>
                            <SheetTitle className="text-blue-900">Custom Styled Sheet</SheetTitle>
                            <SheetDescription className="text-blue-700">This sheet has custom styling with a gradient background.</SheetDescription>
                        </SheetHeader>
                        <div className="mt-4 space-y-4">
                            <div className="p-4 bg-white rounded-lg shadow-sm">
                                <h3 className="font-semibold text-gray-900">Custom Content</h3>
                                <p className="text-gray-600 mt-2">You can add any content here with custom styling.</p>
                            </div>
                            <div className="p-4 bg-white rounded-lg shadow-sm">
                                <h3 className="font-semibold text-gray-900">Another Section</h3>
                                <p className="text-gray-600 mt-2">The sheet component is fully customizable.</p>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </div>
    )
}

export default SheetExample
