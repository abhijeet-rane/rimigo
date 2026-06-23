# Stays Components - Filter & Sort System

This directory contains a **flexible, registry-based architecture** for filters and sorts that can be reused across different pages.

## Quick Start

### Filter System

```typescript
<StaysHeader
    filterType="stays"
    filterMetadata={{ priceData, propertyTypes, amenities }}
    filterInitialData={{ selectedPropertyTypes, selectedAmenities, priceRange }}
    onFilterChange={(result) => { /* real-time preview */ }}
    onFilterApply={(result) => { /* commit to URL */ }}
    onFilterClear={() => { /* clear all */ }}
/>
```

### Sort System

```typescript
<StaysHeader
    sortType="stays"
    sortMetadata={{ sortOptions }}
    sortInitialData={{ currentOrderBy }}
    onSortChange={(result) => { /* optional preview */ }}
    onSortApply={(result) => { /* commit to URL */ }}
/>
```

## Architecture

Both systems follow the same pattern:

```
Page (StaysExplore)
  ↓ Provides: metadata, initialData, callbacks
Header (StaysHeader)
  ↓ Manages: modal state
SearchBar (StaysSearchBar)
  ↓ Triggers: onClick handlers
Modal (FilterDialog / SortModal)
  ↓ Uses registry to load:
Content (StaysFi lterContent / StaysSortContent)
  ↓ Renders: UI and handles user interaction
```

### Key Principles

1. **Separation of Concerns**:
    - **Metadata**: What's available (options, structure)
    - **InitialData**: What's currently selected
    - **Result**: What the user chose

2. **Registry Pattern**:
    - Register different implementations (stays, experiences, etc.)
    - Generic container loads the right content

3. **Callback Flow**:
    - **onChange**: Real-time updates as user interacts
    - **onApply**: Committed changes (filters: button click, sorts: selection)

## File Structure

```
Components/
├── README.md                      # This file
├── Filters/
│   ├── types.ts                   # Generic filter interfaces
│   ├── registry.ts                # Filter registry
│   ├── USAGE.md                   # Detailed filter docs
│   └── StaysFilter/
│       ├── types.ts               # Stays-specific types
│       └── StaysFilterContent.tsx # Stays filter UI
├── Sorts/
│   ├── types.ts                   # Generic sort interfaces
│   ├── registry.ts                # Sort registry
│   ├── USAGE.md                   # Detailed sort docs
│   └── StaysSort/
│       ├── types.ts               # Stays-specific types
│       └── StaysSortContent.tsx   # Stays sort UI
├── FilterDialog.tsx               # Generic filter container
├── SortModal.tsx                  # Generic sort container
├── StaysHeader.tsx                # Manages filter/sort state
└── StaysSearchBar.tsx             # UI triggers
```

## When to Use Each System

### Filters

- **Multiple selections**: Property types, amenities
- **Ranges**: Price, ratings
- **Complex state**: Multiple interdependent values
- **Apply button**: User reviews before applying
- **Clear all**: Reset to defaults

**Example**: Hotel filters (price, property type, amenities, ratings)

### Sorts

- **Single selection**: One sort order at a time
- **Immediate application**: Selection applies instantly
- **Simple state**: Just one sort order
- **No apply button**: Selection closes modal
- **No clear**: Just select a different sort

**Example**: Sort by relevance, price, rating

## Extending the System

### Adding a New Filter Type

1. Create `Filters/MyFilter/types.ts`
2. Create `Filters/MyFilter/MyFilterContent.tsx`
3. Register in `Filters/registry.ts`
4. Use in your page:
    ```typescript
    <StaysHeader
        filterType="myFilter"
        filterMetadata={{ /* ... */ }}
        // ...
    />
    ```

### Adding a New Sort Type

1. Create `Sorts/MySort/types.ts`
2. Create `Sorts/MySort/MySortContent.tsx`
3. Register in `Sorts/registry.ts`
4. Use in your page:
    ```typescript
    <StaysHeader
        sortType="mySort"
        sortMetadata={{ /* ... */ }}
        // ...
    />
    ```

## Key Differences: Filters vs Sorts

| Aspect             | Filters                     | Sorts               |
| ------------------ | --------------------------- | ------------------- |
| **Selections**     | Multiple                    | Single              |
| **Apply timing**   | Button click                | Immediate           |
| **Clear action**   | Separate button             | Switch selection    |
| **Complexity**     | High (ranges, multi-select) | Low (single choice) |
| **Preview**        | Useful                      | Less useful         |
| **Modal behavior** | Stays open until apply      | Closes on selection |

## Benefits

### 1. **Reusability**

- Same `FilterDialog` and `SortModal` work for any page
- Just provide different `type` and `metadata`

### 2. **Type Safety**

- Generics ensure type safety across different filter/sort types
- `FilterContentProps<TMetadata, TInitialData, TResult>`

### 3. **Maintainability**

- Clear separation of concerns
- Easy to add new filter/sort types
- Centralized logic in registry

### 4. **Flexibility**

- Each page controls its own metadata and data flow
- Can customize labels, options, behavior per page
- Can disable filters/sorts per page

### 5. **Consistency**

- Same patterns across all pages
- Predictable behavior for users
- Easier for developers to understand

## Common Patterns

### URL-Based State Management

Most pages store filter/sort state in URL params:

```typescript
// Read from URL
const selectedPropertyTypes = searchParams.getAll('pt')
const currentOrderBy = JSON.parse(searchParams.get('order_by') || '{}')

// Write to URL on apply
onFilterApply={(result) => {
    const next = new URLSearchParams(searchParams)
    result.propertyTypes.forEach(t => next.append('pt', t))
    setSearchParams(next)
}}
```

### Preview Pattern (Filters)

Show result counts without applying:

```typescript
onFilterChange={(result) => {
    // Calculate how many results match
    const count = calculateMatchingResults(result)
    setPreviewCount(count)
}}

onFilterApply={(result) => {
    // Actually apply the filters
    setSearchParams(...)
}}
```

### Immediate Apply Pattern (Sorts)

Apply and close modal immediately:

```typescript
const handleSortSelect = (orderBy) => {
    const result = { orderBy }
    onChange(result) // Optional preview
    onApply(result) // Commit and close
}
```

## Best Practices

1. **Keep metadata separate from initialData**
    - Metadata = structure (what's available)
    - InitialData = state (what's selected)

2. **Use onChange for preview, onApply for commits**
    - Real-time feedback with onChange
    - Actual changes with onApply

3. **Store state in URL when possible**
    - Shareable links
    - Browser back/forward support
    - Persistence across refreshes

4. **Provide clear labels and descriptions**
    - Helps users understand options
    - Improves accessibility

5. **Use TypeScript generics properly**
    - Define specific types for your filter/sort
    - Don't use `any` unnecessarily

## Detailed Documentation

- **Filters**: See `Filters/USAGE.md`
- **Sorts**: See `Sorts/USAGE.md`

## Examples

Complete examples can be found in:

- `StaysExplore.tsx` - Full implementation
- `Filters/USAGE.md` - Filter examples
- `Sorts/USAGE.md` - Sort examples
