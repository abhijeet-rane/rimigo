# Experiences Flow Documentation

This document explains how the Experiences page handles different scenarios with trip-based filtering and country selection.

## Overview

The Experiences page supports two main modes:

1. **Trip-based mode**: When a `trip_id` is present in the URL
2. **Regular mode**: When only `country_name` and `country_id` are present

## URL Parameters

- `trip_id`: ID of the trip (optional)
- `country_name`: Modified country name (e.g., "japan", "dubai") (optional)
- `country_id`: ID of the selected country (optional)

## Flow Scenarios

### Scenario 1: Initial Load with Trip ID

**URL**: `/experiences/?trip_id=686e3a9c28bb6f806ca6239c`

#### What Happens:

1. `ExperiencesExploreLandingPage` reads `trip_id` from URL
2. Fetches trip data using `getFinalDestinationCountriesCities(trip_id)`
3. Extracts final destination countries from trip data
4. Passes `trip_id` and `tripCountries` to `ExperiencesPage`
5. **In ExperiencesPage**:
    - First country from trip is automatically selected
    - URL is updated with both `trip_id` and first country params
    - Country filter dropdown is displayed
    - Experiences for first country are fetched immediately
    - Cities for first country are loaded

#### Result:

- User sees experiences for the first country in the trip
- Country filter shows all trip countries
- First country is pre-selected in the dropdown
- URL becomes: `/experiences/?trip_id=...&country_name=japan&country_id=67a31d03aa84ea4b97d24fa5`

---

### Scenario 2: Selecting a Different Country via Filter Dropdown

**URL**: `/experiences/?trip_id=...&country_name=japan&country_id=...`

#### What Happens:

1. User opens country filter dropdown
2. User clicks on a different country (e.g., "Dubai")
3. **Single Select Mode**: Previous selection is replaced (not multi-select)
4. `handleTripCountrySelect` is called with new country ID
5. URL is updated with:
    - `trip_id` preserved
    - `country_name` changed to "dubai"
    - `country_id` changed to Dubai's ID
6. Experiences query is automatically refetched for new country
7. Cities data is refetched for new country

#### Result:

- User sees experiences for the newly selected country
- Country filter dropdown remains visible
- Selected country changes in the dropdown badge
- URL: `/experiences/?trip_id=...&country_name=dubai&country_id=68a5cb4ea8cf9f580aad560a`

---

### Scenario 3: Searching for a Country in Search Box

**URL**: `/experiences/?trip_id=686e3a9c28bb6f806ca6239c`

#### What Happens:

1. User opens search bar and searches for a country (e.g., "Japan")
2. User selects a country from search results
3. `handleCountrySelect` is called
4. **Trip ID Preservation**:
    - Checks if `trip_id` is present
    - If yes, includes `trip_id` in new URL
    - Also updates `selectedCountries` state
5. Navigation happens with all params: `trip_id` + `country_name` + `country_id`

#### Result:

- Page navigates to new country experiences
- `trip_id` is preserved in URL
- Country filter dropdown remains visible (because trip_id is present)
- New country is selected in the dropdown
- URL: `/experiences/?trip_id=...&country_name=japan&country_id=...`

---

### Scenario 4: Deselecting a Country (Clicking Selected Country)

**URL**: `/experiences/?trip_id=...&country_name=japan&country_id=...`

#### What Happens:

1. User clicks on the already-selected country in the filter dropdown
2. `handleCountryToggle` is called with empty array
3. `handleTripCountrySelect` receives empty array
4. URL is updated:
    - `trip_id` is preserved
    - `country_name` is removed
    - `country_id` is removed
5. `selectedCountries` state is cleared

#### Result:

- No experiences are shown (query disabled because no country_id)
- Country filter dropdown remains visible (because trip_id is present)
- No country is selected
- URL: `/experiences/?trip_id=686e3a9c28bb6f806ca6239c`

---

### Scenario 5: Direct Navigation with All Params

**URL**: `/experiences/?trip_id=...&country_name=dubai&country_id=...`

#### What Happens:

1. `ExperiencesExploreLandingPage` detects all params present
2. Fetches trip data using `trip_id`
3. Passes all params to `ExperiencesPage`
4. **In ExperiencesPage**:
    - Checks if URL has `country_id`
    - If yes, uses that country
    - Updates `selectedCountries` state to match URL
    - Initializes country_id for queries
    - Displays country filter with URL country selected

#### Result:

- Experiences load for the specified country
- Country filter shows the correct country selected
- Everything is in sync with URL params

---

### Scenario 6: Missing Trip ID but Country Params Present

**URL**: `/experiences/?country_name=japan&country_id=67a31d03aa84ea4b97d24fa5`

#### What Happens:

1. `ExperiencesExploreLandingPage` detects only country params
2. No trip data is fetched
3. Country filter dropdown is NOT displayed
4. Regular search bar is shown
5. `ExperiencesPage` renders in regular mode (no trip-based features)

#### Result:

- Experiences load for the specified country
- No country filter dropdown
- Standard experiences page behavior
- User can change country via search bar only

---

### Scenario 7: Missing Country Params but Trip ID Present

**URL**: `/experiences/?trip_id=686e3a9c28bb6f806ca6239c`

This is the same as Scenario 1. The first country is automatically selected and added to URL.

---

### Scenario 8: All Params Missing

**URL**: `/experiences/`

#### What Happens:

1. `ExperiencesExploreLandingPage` detects no params
2. Shows `ExperienceDestionationSelectorPage` (country selector UI)
3. User must select a country from the selector
4. Once selected, navigates to `/experiences/?country_name=...&country_id=...`

#### Result:

- Landing page with country selector
- No experiences shown until country is selected

---

## Key Behaviors

### Country Filter Dropdown Visibility

The country filter is shown ONLY when `trip_id` is present in the URL, regardless of:

- Whether a country is selected or not
- Whether the user came via search or direct URL
- Current selection state

### Single Select vs Multi-Select

- **Trip-based filtering**: Single select only
    - Selecting a new country replaces the previous selection
    - Clicking the same country deselects it (clears selection)
- **Regular mode**: Works through search bar only
    - Navigates to the selected country
    - No filter dropdown available

### Trip ID Preservation

The `trip_id` is preserved in ALL scenarios:

- When selecting a country from the filter dropdown
- When searching for a country in the search box
- When deselecting a country
- Always included in URL updates

### API Fetching Strategy

#### Experiences Query

- Enabled when: `country_id` is available (from URL or auto-selected from trip)
- Disabled when: No `country_id`
- Auto-refetches when `country_id` changes

#### Cities Query

- Enabled when: `properCountryName` is available
- Uses either URL country name or first trip country name
- Auto-refetches when country changes

---

## State Management

### `selectedCountries`

- Array of country IDs (single select = max 1 item)
- Synced with URL `country_id` param
- Updated when:
    - Country selected from filter dropdown
    - Country searched in search box (when trip_id present)
    - Page loaded with country_id in URL
    - Country deselected

### `country_id` (Derived)

- Source 1: URL param `country_id`
- Source 2: First country from trip (when trip_id present, no URL country_id)
- Used to enable/disable experiences query
- Determines which experiences to fetch

### `tripCountries`

- List of countries from the trip
- Passed to country filter dropdown
- Only available when `trip_id` is present
- Source: `tripData.data.final_destination_countries`

---

## Component Hierarchy

```
ExperiencesExploreLandingPage
├── Fetches trip data (if trip_id present)
├── Fetches all countries (location personalization)
├── Determines which component to render:
│   ├── ExperiencesPage (if params present)
│   └── ExperienceDestionationSelectorPage (if no params)
│
ExperiencesPage
├── ExperiencesHeader
│   ├── ExperienceNavbarSearch
│   │   ├── Country Search Bar (always visible)
│   │   ├── ExperiencesCountryFilter (if trip_id present)
│   │   └── ExperiencesCityFilter (if country selected)
│   └── Filter/Sort Buttons
├── FilterChips (selected filters display)
└── Experiences Grid (infinite scroll)
```

---

## Edge Cases Handled

1. **No countries in trip**: Country filter hidden, experiences don't load
2. **Trip data loading**: Shows shimmer loader
3. **Trip data error**: Shows error message
4. **Empty selection after country deselected**: No experiences shown, filter still visible
5. **Direct URL with both trip_id and country_id**: Everything syncs correctly
6. **Navigating back/forward**: All params preserved in browser history
7. **Country filter + City filter interaction**: Both work independently
8. **Priorities and city filters**: Independent of country selection

---

## Summary

The system provides a seamless experience for users with trips, allowing them to:

- Auto-load experiences for their trip destinations
- Filter between different countries in their trip
- Search for countries while maintaining trip context
- See which countries are part of their trip
- Have full control over country selection

The `trip_id` acts as a context that enables additional features (country filter dropdown) while remaining persistent throughout the user's journey.
