# Reusable Sheet Component

A flexible, animated sheet component that can slide in from any side of the screen. Built with Radix UI and styled with Tailwind CSS.

## Features

- ✅ **Smooth Animations**: 2-second slide-in animation with custom easing
- ✅ **Multiple Sides**: Support for top, bottom, left, and right positioning
- ✅ **Customizable**: Full control over styling and content
- ✅ **Accessible**: Built on Radix UI primitives
- ✅ **TypeScript**: Full type safety
- ✅ **Optional Close Button**: Can be hidden if needed

## Basic Usage

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/shared/components/Sheet'

function MyComponent() {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button>Open Sheet</Button>
            </SheetTrigger>
            <SheetContent side="right">
                <SheetHeader>
                    <SheetTitle>Sheet Title</SheetTitle>
                    <SheetDescription>Sheet description</SheetDescription>
                </SheetHeader>
                <div className="mt-4">Your content here</div>
            </SheetContent>
        </Sheet>
    )
}
```

## Controlled Usage

```tsx
import { useState } from 'react'
import { Sheet, SheetContent } from '@/shared/components/Sheet'

function MyComponent() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <Button onClick={() => setIsOpen(true)}>Open Sheet</Button>
            <Sheet
                open={isOpen}
                onOpenChange={setIsOpen}>
                <SheetContent side="left">
                    <div>Your content here</div>
                </SheetContent>
            </Sheet>
        </>
    )
}
```

## Props

### SheetContent Props

| Prop              | Type                                     | Default   | Description                         |
| ----------------- | ---------------------------------------- | --------- | ----------------------------------- |
| `side`            | `'top' \| 'bottom' \| 'left' \| 'right'` | `'right'` | Which side the sheet slides in from |
| `showCloseButton` | `boolean`                                | `true`    | Whether to show the close button    |
| `className`       | `string`                                 | -         | Additional CSS classes              |
| `children`        | `ReactNode`                              | -         | Sheet content                       |

### Sheet Props

| Prop           | Type                      | Default | Description                    |
| -------------- | ------------------------- | ------- | ------------------------------ |
| `open`         | `boolean`                 | -       | Controlled open state          |
| `onOpenChange` | `(open: boolean) => void` | -       | Called when open state changes |

## Animation

The sheet includes smooth 2-second animations:

- **Opening**: Slides in from the specified side with `ease-out` timing
- **Closing**: Slides out to the specified side
- **Overlay**: Fades in/out with the sheet

## Examples

See `SheetExample.tsx` for comprehensive usage examples including:

- Basic sheet with trigger
- Controlled sheet with state
- Sheet without close button
- Custom styled sheet

## Styling

The sheet uses Tailwind CSS classes and can be customized:

```tsx
<SheetContent
    side="right"
    className="bg-gradient-to-br from-blue-50 to-indigo-100">
    {/* Custom styled content */}
</SheetContent>
```

## Accessibility

- Built on Radix UI primitives for full accessibility
- Proper ARIA labels and keyboard navigation
- Focus management
- Screen reader support
