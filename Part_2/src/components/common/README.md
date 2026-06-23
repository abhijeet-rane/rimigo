# Common Search Components

This directory contains reusable search components that can be used across different pages (Stays, Experiences, Activities, etc.).

## Components

### SearchHeader
**Location**: `SearchHeader.tsx`

Generic header component with integrated search functionality, filters, and sorting.

**Features**:
- Customizable page name
- Integrated SearchBar
- Filter dialog management
- Sort modal management
- Assistant button integration
- Favorites button

**Usage**:
```typescript
import SearchHeader from '@/components/common/SearchHeader'

<SearchHeader
    pageName="Stays"
    formattedCityName={cityName}
    cityId={cityId}
    onSearch={handleSearch}
    // Filter configuration
    filterType="stays"
    filterMetadata={filterMetadata}
    filterInitialData={filterInitialData}
    onFilterApply={handleFilterApply}
    // Sort configuration
    sortType="stays"
    sortMetadata={sortMetadata}
    sortInitialData={sortInitialData}
    onSortApply={handleSortApply}
    // ... other props
/>
```

### SearchBar
**Location**: `SearchBar.tsx`

Flexible search bar with configurable segments (Where, When, Preferences, Country).

**Features**:
- Configurable segments with enable/disable
- Custom labels and placeholders
- Internal state management
- Debounced city/country search
- Date range selection
- Travel preferences
- Filter and sort button integration

**Segments**:
- **Where**: City/destination search
- **Country**: Country selection (optional)
- **When**: Date range picker
- **Preferences**: Travel preferences (group type, purpose, location preferences)

**Usage**:
```typescript
import SearchBar from '@/components/common/SearchBar'

<SearchBar
    cityName={cityName}
    cityId={cityId}
    onSearch={handleSearch}
    // Configure segments
    whereConfig={{ enabled: true, label: 'Where', placeholder: 'Search destinations' }}
    whenConfig={{ enabled: true, label: 'When', placeholder: 'Add dates' }}
    preferencesConfig={{ enabled: true, label: 'Preferences', placeholder: 'Add preferences' }}
    countryConfig={{ enabled: false }} // Optional
    // Show/hide filter and sort
    showFilters={true}
    showSort={true}
    onFilterClick={handleFilterClick}
    onSortClick={handleSortClick}
/>
```

### Modals
**Location**: `SearchBar/modals/`

Individual modal components for each search segment:

#### WhereModal
City/destination search modal with autocomplete.

#### WhenModal
Dual-month calendar for date range selection with animations.

#### PreferencesModal
Travel preferences selection (group type, travel purpose, location preferences).

#### CountryModal
Country search and selection modal (optional).

## Configuration

### Segment Configuration
Each segment accepts a `SegmentConfig` object:

```typescript
interface SegmentConfig {
    enabled: boolean
    label?: string
    placeholder?: string
}
```

**Example**:
```typescript
// Default Stays configuration
whereConfig={{ enabled: true, label: 'Where', placeholder: 'Search destinations' }}
whenConfig={{ enabled: true, label: 'When', placeholder: 'Add dates' }}
preferencesConfig={{ enabled: true, label: 'Preferences', placeholder: 'Add preferences' }}

// Custom Experiences configuration
whereConfig={{ enabled: true, label: 'Location', placeholder: 'Search locations' }}
whenConfig={{ enabled: true, label: 'Date', placeholder: 'Select date' }}
preferencesConfig={{ enabled: false }} // Hide preferences
```

## Integration with Page-Specific Features

The SearchHeader integrates with page-specific filter and sort systems:

### Filters
Uses the registry pattern from `/pages/Stays/Components/Filters/`:
- `FilterDialog`: Generic container
- `FilterRegistry`: Maps filter types to implementations
- Each page provides its own filter metadata and handlers

### Sorts
Uses the registry pattern from `/pages/Stays/Components/Sorts/`:
- `SortModal`: Generic container
- `SortRegistry`: Maps sort types to implementations
- Each page provides its own sort options and handlers

## File Structure

```
src/components/common/
├── README.md                           # This file
├── SearchHeader.tsx                    # Main header component
├── SearchBar.tsx                       # Search bar component
└── SearchBar/
    ├── index.ts                        # Exports
    └── modals/
        ├── WhereModal.tsx             # City search modal
        ├── WhenModal.tsx              # Date picker modal
        ├── PreferencesModal.tsx       # Preferences modal
        └── CountryModal.tsx           # Country search modal
```

## Migration from Stays-Specific Components

### Before (Stays-specific)
```typescript
import StaysHeader from '@/pages/Stays/Components/StaysHeader'
import StaysSearchBar from '@/pages/Stays/Components/StaysSearchBar'

<StaysHeader pageName="Stays" />
```

### After (Generic)
```typescript
import SearchHeader from '@/components/common/SearchHeader'
import SearchBar from '@/components/common/SearchBar'

<SearchHeader pageName="Stays" />
```

## Benefits

1. **Reusability**: Use across Stays, Experiences, Activities, etc.
2. **Consistency**: Same UI/UX patterns across all pages
3. **Maintainability**: Single source of truth
4. **Flexibility**: Highly configurable via props
5. **Type Safety**: Full TypeScript support
6. **Scalability**: Easy to add new pages with search functionality

## Examples

### Stays Page
```typescript
<SearchHeader
    pageName="Stays"
    whereConfig={{ enabled: true }}
    whenConfig={{ enabled: true }}
    preferencesConfig={{ enabled: true }}
    filterType="stays"
    sortType="stays"
/>
```

### Experiences Page (Future)
```typescript
<SearchHeader
    pageName="Experiences"
    whereConfig={{ enabled: true, label: 'Location' }}
    whenConfig={{ enabled: true, label: 'Date' }}
    preferencesConfig={{ enabled: false }} // No preferences for experiences
    filterType="experiences"
    sortType="experiences"
/>
```

### Activities Page (Future)
```typescript
<SearchHeader
    pageName="Activities"
    countryConfig={{ enabled: true }} // Country selector
    whereConfig={{ enabled: true }}
    whenConfig={{ enabled: false }} // No date selection
    preferencesConfig={{ enabled: false }}
    filterType="activities"
    sortType="activities"
/>
```

## Notes

- Filter/Sort implementations remain page-specific in `/pages/[Page]/Components/`
- Service layer (API calls) remain page-specific in `/pages/[Page]/Services/`
- Only UI components are in common
- Components use absolute imports (`@/components/common/...`)

## Related Documentation

- Filter System: `/pages/Stays/Components/Filters/USAGE.md`
- Sort System: `/pages/Stays/Components/Sorts/USAGE.md`
- Search Services: `/pages/Stays/Services/`

