# Filter Registry Pattern - Usage Guide

## Architecture Overview

The filter system uses a **Registry Pattern** with **Metadata/InitialData separation**:

- **Metadata**: UI structure data (options, buckets, etc.) - what can be selected
- **InitialData**: Preselected/prefilled values - what is currently selected
- **Result**: Filter output when user changes selections

## Key Files

```
src/pages/Stays/Components/
├── Filters/
│   ├── types.ts                    # Generic interfaces
│   ├── registry.ts                 # Filter registry
│   └── StaysFilter/
│       ├── types.ts                # Stays-specific types
│       └── StaysFilterContent.tsx  # Stays filter implementation
├── FilterDialog.tsx                # Generic dialog container
└── StaysHeader.tsx                 # Manages filter state
```

## Usage Example: StaysExplore

```typescript
import { StaysHeader } from './Components'
import type {
    StaysFilterMetadata,
    StaysFilterInitialData,
    StaysFilterResult
} from './Components/Filters/StaysFilter/types'

const StaysExplore = () => {
    const [searchParams, setSearchParams] = useSearchParams()

    // Your data states
    const [ratesData, setRatesData] = useState(...)
    const [propertyTypes, setPropertyTypes] = useState([...])
    const [allAmenities, setAllAmenities] = useState(...)

    // Filter metadata (UI structure - what CAN be selected)
    const filterMetadata: StaysFilterMetadata = {
        priceData: ratesData,
        propertyTypes: propertyTypes,
        amenities: allAmenities,
    }

    // Filter initial data (preselected values - what IS selected)
    const filterInitialData: StaysFilterInitialData = {
        selectedPriceRange: {
            min: Number(searchParams.get('budget_min')) || undefined,
            max: Number(searchParams.get('budget_max')) || undefined,
        },
        selectedPropertyTypes: searchParams.getAll('pt'),
        selectedAmenities: searchParams.getAll('am'),
    }

    // Handle filter changes (real-time, fires on every change)
    const handleFilterChange = (result: StaysFilterResult) => {
        // Optional: Use this for real-time updates (e.g., preview)
        console.log('Filter changed:', result)
    }

    // Handle filter apply (fires when "Apply filters" button is clicked)
    const handleFilterApply = (result: StaysFilterResult) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev)

            // Update price range
            if (result.priceRange) {
                next.set('budget_min', String(Math.floor(result.priceRange.min)))
                next.set('budget_max', String(Math.ceil(result.priceRange.max)))
            }

            // Update property types
            next.delete('pt')
            result.propertyTypes.forEach((type) => next.append('pt', type))

            // Update amenities
            next.delete('am')
            result.amenities.forEach((amenity) => next.append('am', amenity))

            return next
        })
    }

    // Handle clear filters
    const handleFilterClear = () => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            next.delete('budget_min')
            next.delete('budget_max')
            next.delete('pt')
            next.delete('property_types')
            next.delete('am')
            next.delete('amenities')
            return next
        })
    }

    return (
        <div>
            <StaysHeader
                // ... other props

                // Filter configuration
                filterType="stays"
                filterMetadata={filterMetadata}
                filterInitialData={filterInitialData}
                onFilterChange={handleFilterChange}
                onFilterApply={handleFilterApply}
                onFilterClear={handleFilterClear}

                // Search bar configuration
                whereConfig={{ enabled: true }}
                whenConfig={{ enabled: true }}
                preferencesConfig={{ enabled: true }}
                showFilters={true}
                showSort={true}
            />

            {/* Rest of your page */}
        </div>
    )
}
```

## Adding a New Filter Type

### 1. Create Filter Types

```typescript
// src/pages/Experiences/Components/Filters/ExperienceFilter/types.ts
export interface ExperienceFilterMetadata {
    durationOptions: Array<{ id: string; label: string }>
    difficultyLevels: Array<{ id: string; label: string }>
    categoryOptions: Array<{ id: string; label: string; icon: string }>
}

export interface ExperienceFilterInitialData {
    selectedDuration?: string
    selectedDifficulty?: string
    selectedCategories?: string[]
}

export interface ExperienceFilterResult {
    duration?: string
    difficulty?: string
    categories: string[]
}
```

### 2. Create Filter Content Component

```typescript
// src/pages/Experiences/Components/Filters/ExperienceFilter/ExperienceFilterContent.tsx
import type { FilterContentProps } from '@/pages/Stays/Components/Filters/types'
import type {
    ExperienceFilterMetadata,
    ExperienceFilterInitialData,
    ExperienceFilterResult
} from './types'

export const ExperienceFilterContent = ({
    metadata,
    initialData,
    onChange,
}: FilterContentProps<
    ExperienceFilterMetadata,
    ExperienceFilterInitialData,
    ExperienceFilterResult
>) => {
    const [selectedDuration, setSelectedDuration] = useState(initialData?.selectedDuration)
    const [selectedDifficulty, setSelectedDifficulty] = useState(initialData?.selectedDifficulty)
    const [selectedCategories, setSelectedCategories] = useState(initialData?.selectedCategories || [])

    useEffect(() => {
        onChange({
            duration: selectedDuration,
            difficulty: selectedDifficulty,
            categories: selectedCategories,
        })
    }, [selectedDuration, selectedDifficulty, selectedCategories, onChange])

    return (
        <div className="px-6 py-4">
            {/* Your filter UI */}
            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Duration</h3>
                {metadata?.durationOptions.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => setSelectedDuration(option.id)}
                        className={selectedDuration === option.id ? 'selected' : ''}>
                        {option.label}
                    </button>
                ))}
            </div>
            {/* More filters... */}
        </div>
    )
}
```

### 3. Register Filter Type

```typescript
// src/pages/Stays/Components/Filters/registry.ts
import { StaysFilterContent } from './StaysFilter/StaysFilterContent'
import { ExperienceFilterContent } from '@/pages/Experiences/Components/Filters/ExperienceFilter/ExperienceFilterContent'

export const FilterRegistry: Record<string, FilterContentComponent> = {
    stays: StaysFilterContent,
    experiences: ExperienceFilterContent // ← Add new type
}

export type FilterType = keyof typeof FilterRegistry
```

### 4. Use in Your Page

```typescript
<StaysHeader
    filterType="experiences"  // ← Use new type
    filterMetadata={experienceFilterMetadata}
    filterInitialData={experienceFilterInitialData}
    onFilterChange={handleExperienceFilterChange}
    onFilterClear={handleExperienceFilterClear}
/>
```

## Benefits

1. **Separation of Concerns**: Metadata (what can be) vs InitialData (what is)
2. **Type Safety**: TypeScript enforces correct usage
3. **Flexibility**: Easy to add new filter types
4. **Reusability**: Same FilterDialog for all pages
5. **Simplicity**: Parent just passes data, no complex logic
6. **State Management**: StaysHeader owns filter state, no prop drilling

## Example: Price Slider

```typescript
// Metadata (UI structure)
const metadata = {
    priceData: {
        min_rate: 0,
        max_rate: 1000,
        buckets: [
            { min: 0, max: 100, count: 10 },
            { min: 100, max: 200, count: 25 }
            // ... more buckets
        ]
    }
}

// InitialData (current selection)
const initialData = {
    selectedPriceRange: {
        min: 200, // User selected min
        max: 800 // User selected max
    }
}

// Result (after user changes)
const result = {
    priceRange: {
        min: 150, // New min
        max: 900 // New max
    }
}
```

## Migration from Old Pattern

### Before (Old Pattern)

```typescript
<StaysHeader
    onFilterClick={() => setIsFilterOpen(true)}
/>
<FilterDialog
    isOpen={isFilterOpen}
    onClose={() => setIsFilterOpen(false)}
    priceData={priceData}
    propertyTypes={propertyTypes}
    // ... many specific props
/>
```

### After (New Pattern)

```typescript
<StaysHeader
    filterType="stays"
    filterMetadata={{ priceData, propertyTypes, amenities }}
    filterInitialData={{ selectedPriceRange, selectedPropertyTypes }}
    onFilterChange={handleFilterChange}
    onFilterClear={handleFilterClear}
/>
// FilterDialog is managed inside StaysHeader!
```

## onChange vs onApply

The filter system provides two callbacks for different use cases:

### `onChange(result)` - Real-time Updates
- **When**: Fires every time user changes any filter value
- **Use case**: 
  - Preview changes (e.g., show result count)
  - Debounced API calls
  - Update UI in real-time
- **Example**:
  ```typescript
  onFilterChange={(result) => {
      // Show preview: "234 hotels match your criteria"
      setPreviewCount(result.propertyTypes.length * 10)
  }}
  ```

### `onApply(result)` - Committed Changes
- **When**: Fires only when user clicks "Apply filters" button
- **Use case**:
  - Update URL params (recommended)
  - Trigger API calls
  - Commit changes to state
- **Example**:
  ```typescript
  onFilterApply={(result) => {
      // Commit to URL and fetch data
      setSearchParams(...)
      fetchHotels(result)
  }}
  ```

### Both Together (Recommended Pattern)
```typescript
<StaysHeader
    // Real-time preview
    onFilterChange={(result) => {
        setFilterPreview(result)
        // Show: "234 hotels found"
    }}
    // Commit on apply
    onFilterApply={(result) => {
        setSearchParams(...)
        // Actually fetch the filtered data
    }}
/>
```

## Key Takeaways

- **Metadata**: Structure of what's available to filter
- **InitialData**: Current selected values (for prefill)
- **Result**: New values after user interaction
- **onChange**: Real-time updates as user selects
- **onApply**: Committed changes when "Apply" clicked
- **Registry**: Central place to add new filter types
- **StaysHeader**: Owns filter state, manages FilterDialog
- **StaysExplore**: Just provides data and handles results
