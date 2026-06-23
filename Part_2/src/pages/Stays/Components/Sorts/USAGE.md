# Sort System - Registry Pattern

This directory implements a **flexible, registry-based sort system** that allows different pages to define their own sort options and UI while using a shared `SortModal` container.

## Architecture Overview

```
┌─────────────────┐
│  StaysExplore   │  (Parent page)
│                 │  - Provides sort metadata (available options)
│                 │  - Provides initial data (current sort)
│                 │  - Handles onSortApply (commits to URL)
└────────┬────────┘
         │
         │ Props
         ▼
┌─────────────────┐
│  StaysHeader    │  (Manages sort state)
│                 │  - Manages isSortOpen state
│                 │  - Renders SortModal
└────────┬────────┘
         │
         │ onSortClick
         ▼
┌─────────────────┐
│StaysSearchBar   │  (UI trigger)
│                 │  - Sort button
│                 │  - Visual indicator of current sort
└─────────────────┘

         │
         │ Props (type, metadata, initialData)
         ▼
┌─────────────────┐
│   SortModal     │  (Generic container)
│                 │  - Uses registry to load content
│                 │  - Handles dialog/overlay
│                 │  - Manages onChange/onApply flow
└────────┬────────┘
         │
         │ Loads from registry
         ▼
┌─────────────────┐
│StaysSortContent │  (Specific implementation)
│                 │  - Renders sort options
│                 │  - Handles selection
│                 │  - Calls onApply (commits and closes)
└─────────────────┘
```

## Core Concepts

### 1. Metadata vs InitialData

- **Metadata**: The available sort options (structure/options)

    ```typescript
    {
        sortOptions: [
            { id: 'relevance', label: 'Relevance', orderBy: { relevance: -1 } },
            { id: 'price_low', label: 'Price: Low to High', orderBy: { rate: 1 } }
        ]
    }
    ```

- **InitialData**: Currently selected sort
    ```typescript
    {
        currentOrderBy: {
            relevance: -1
        }
    }
    ```

### 2. Registry Pattern

All sort types are registered in `registry.ts`:

```typescript
export const SortRegistry: Record<string, SortContentComponent> = {
    stays: StaysSortContent,
    experiences: ExperienceSortContent // Add more types here
}
```

### 3. Generic Types

The sort system uses generics to support different data structures:

```typescript
interface SortContentProps<TMetadata, TInitialData, TResult>
```

- `TMetadata`: Type of metadata (available options)
- `TInitialData`: Type of initial data (current selection)
- `TResult`: Type of result returned

## Usage Example

### In Your Page Component (e.g., StaysExplore.tsx)

```typescript
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { StaysHeader } from './Components'

const StaysExplore = () => {
    const [searchParams, setSearchParams] = useSearchParams()

    // Derive current sort from URL
    const currentOrderBy = (() => {
        const ob = searchParams.get('order_by')
        if (!ob) return { relevance: -1 }
        try {
            return JSON.parse(ob)
        } catch {
            return { relevance: -1 }
        }
    })()

    return (
        <div>
            <StaysHeader
                // ... other props

                // Sort configuration
                sortType="stays"
                sortMetadata={{
                    sortOptions: [
                        {
                            id: 'relevance',
                            label: 'Relevance',
                            description: 'Best match for your search',
                            orderBy: { relevance: -1 }
                        },
                        {
                            id: 'price_low',
                            label: 'Price: Low to High',
                            description: 'Lowest price first',
                            orderBy: { rate: 1 }
                        },
                        {
                            id: 'price_high',
                            label: 'Price: High to Low',
                            description: 'Highest price first',
                            orderBy: { rate: -1 }
                        }
                    ]
                }}
                sortInitialData={{
                    currentOrderBy: currentOrderBy
                }}
                onSortChange={() => {
                    // Optional: Real-time preview (not typically needed for sort)
                }}
                onSortApply={(result) => {
                    // Commit sort change to URL when an option is selected
                    const next = new URLSearchParams(searchParams)
                    next.set('order_by', JSON.stringify(result.orderBy))
                    setSearchParams(next, { replace: true })
                }}
            />

            {/* Your page content */}
        </div>
    )
}
```

## Adding a New Sort Type

### Step 1: Create Type Definitions

Create `Sorts/MySort/types.ts`:

```typescript
export interface MySortMetadata {
    sortOptions: Array<{
        id: string
        label: string
        orderBy: Record<string, number>
    }>
}

export interface MySortInitialData {
    currentOrderBy: Record<string, number>
}

export interface MySortResult {
    orderBy: Record<string, number>
}
```

### Step 2: Create Sort Content Component

Create `Sorts/MySort/MySortContent.tsx`:

```typescript
import type { SortContentProps } from '../types'
import type { MySortMetadata, MySortInitialData, MySortResult } from './types'

export const MySortContent = ({
    metadata,
    initialData,
    onChange,
    onApply
}: SortContentProps<MySortMetadata, MySortInitialData, MySortResult>) => {
    const handleSortSelect = (orderBy: Record<string, number>) => {
        const result: MySortResult = { orderBy }
        onChange(result)  // Real-time update
        onApply(result)   // Commit and close
    }

    return (
        <div>
            {metadata?.sortOptions.map((option) => (
                <button
                    key={option.id}
                    onClick={() => handleSortSelect(option.orderBy)}>
                    {option.label}
                </button>
            ))}
        </div>
    )
}
```

### Step 3: Register in Registry

Update `Sorts/registry.ts`:

```typescript
import { MySortContent } from './MySort/MySortContent'

export const SortRegistry: Record<string, SortContentComponent> = {
    stays: StaysSortContent,
    mySort: MySortContent // Add your new sort type
}
```

### Step 4: Use in Your Page

```typescript
<StaysHeader
    sortType="mySort"
    sortMetadata={{ /* your metadata */ }}
    sortInitialData={{ /* your initial data */ }}
    onSortApply={(result) => { /* handle result */ }}
/>
```

## Simplified Pattern

For most sort implementations, the pattern is simple:

1. **Define available options** (metadata)
2. **Track current selection** (initialData)
3. **On selection**: Call both `onChange` and `onApply` immediately
4. **Modal closes automatically** when `onApply` is called

Unlike filters (which may have complex state), sorts typically:

- Don't need a "Clear" button
- Don't need an "Apply" button in the UI (selection applies immediately)
- Call `onApply` as soon as a selection is made (which closes the modal)

## onChange vs onApply

### `onChange(result)` - Real-time Updates

- **When**: Fires when a sort option is selected
- **Use case**:
    - Preview changes (rarely needed for sort)
    - Update UI indicators
- **Example**:
    ```typescript
    onSortChange={(result) => {
        // Optional: Update some preview state
        setPreviewSort(result.orderBy)
    }}
    ```

### `onApply(result)` - Committed Changes

- **When**: Fires when a sort option is selected (and closes modal)
- **Use case**:
    - Update URL params (recommended)
    - Trigger API calls
    - Commit changes to state
- **Example**:
    ```typescript
    onSortApply={(result) => {
        // Commit to URL and fetch data
        setSearchParams(...)
    }}
    ```

### Typical Pattern (Sort)

For sorts, both are called immediately on selection:

```typescript
const handleSortSelect = (orderBy) => {
    const result = { orderBy }
    onChange(result) // Optional preview
    onApply(result) // Commit and close modal
}
```

This is different from filters, where:

- `onChange` fires on every change
- `onApply` fires only when "Apply filters" button is clicked

## Key Differences from Filters

| Aspect           | Filters                     | Sorts                  |
| ---------------- | --------------------------- | ---------------------- |
| **Complexity**   | Multiple selections, ranges | Single selection       |
| **UI**           | Apply button, Clear button  | Selection closes modal |
| **Apply timing** | On button click             | On selection           |
| **Clear action** | Separate button             | Not typically needed   |
| **Preview**      | Useful (show count)         | Less useful            |

## File Structure

```
Sorts/
├── types.ts                    # Generic sort interfaces
├── registry.ts                 # Sort type registry
├── USAGE.md                    # This file
└── StaysSort/
    ├── types.ts                # Stays-specific types
    └── StaysSortContent.tsx    # Stays sort UI
```

## Key Takeaways

- **Metadata**: Available sort options
- **InitialData**: Currently selected sort
- **Result**: Selected sort order
- **onChange**: Real-time updates (optional for sort)
- **onApply**: Committed changes (closes modal)
- **Registry**: Central place to add new sort types
- **StaysHeader**: Owns sort state, manages SortModal
- **StaysExplore**: Provides data and handles results
- **Immediate application**: Selection applies and closes modal instantly
