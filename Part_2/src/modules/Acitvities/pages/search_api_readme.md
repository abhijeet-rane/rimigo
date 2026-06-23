# Global Search API Documentation

## Overview

The Global Search API provides a unified search endpoint that searches across three models:

- **Experiences** (attractions/activities)
- **Location Personalization - Country** (country-level personalization)
- **Location Personalization - City** (city-level personalization)

The API uses fuzzy matching with RapidFuzz scoring to provide relevant results even with partial or slightly misspelled queries.

## Endpoint

```
GET /curation/search/?q=<search_query>
```

### Base URL

- **Development**: `http://localhost:8000/curation/search/`
- **Production**: `https://your-domain.com/curation/search/`

## Request Parameters

### Query Parameters

| Parameter | Type   | Required | Description         |
| --------- | ------ | -------- | ------------------- |
| `q`       | string | Yes      | Search query string |

### Example Request

```javascript
// Using fetch
const response = await fetch('/curation/search/?q=paris')
const data = await response.json()

// Using axios
const response = await axios.get('/curation/search/', {
    params: { q: 'paris' }
})
```

## Response Format

### Success Response (200 OK)

```json
{
    "query": "paris",
    "count": 5,
    "results": [
        {
            "type": "location_city",
            "id": "507f1f77bcf86cd799439011",
            "score": 95.5,
            "city_name": "Paris",
            "city_id": "507f1f77bcf86cd799439012",
            "image_url": "https://example.com/images/paris.jpg"
        },
        {
            "type": "experience",
            "id": "507f1f77bcf86cd799439013",
            "score": 88.2,
            "name": "Eiffel Tower",
            "identifier": "eiffel-tower",
            "landscape_image": "https://example.com/images/eiffel-landscape.jpg",
            "portrait_image": "https://example.com/images/eiffel-portrait.jpg"
        },
        {
            "type": "location_country",
            "id": "507f1f77bcf86cd799439014",
            "score": 75.0,
            "country_name": "France",
            "country_id": "507f1f77bcf86cd799439015",
            "image_url": "https://example.com/images/france.jpg"
        }
    ]
}
```

### Error Responses

#### 400 Bad Request - Missing Query Parameter

```json
{
    "error": "Query parameter \"q\" is required"
}
```

#### 500 Internal Server Error

```json
{
    "error": "Internal server error during search"
}
```

## Result Types

### 1. Experience (`type: "experience"`)

Represents an experience/attraction.

**Fields:**

- `type`: Always `"experience"`
- `id`: Experience document ID (string)
- `score`: Fuzzy match score (0-100, float)
- `name`: Experience name (string)
- `identifier`: Experience identifier (string)
- `landscape_image`: Landscape image URL (string, optional)
- `portrait_image`: Portrait image URL (string, optional)

**Example:**

```json
{
    "type": "experience",
    "id": "507f1f77bcf86cd799439013",
    "score": 88.2,
    "name": "Eiffel Tower",
    "identifier": "eiffel-tower",
    "landscape_image": "https://example.com/images/eiffel-landscape.jpg",
    "portrait_image": "https://example.com/images/eiffel-portrait.jpg"
}
```

### 2. Location Country (`type: "location_country"`)

Represents country-level personalization.

**Fields:**

- `type`: Always `"location_country"`
- `id`: LocationPersonalization document ID (string)
- `score`: Fuzzy match score (0-100, float)
- `country_name`: Country name (string)
- `country_id`: Country document ID (string)
- `image_url`: Hero or filter image URL (string, optional)

**Example:**

```json
{
    "type": "location_country",
    "id": "507f1f77bcf86cd799439014",
    "score": 75.0,
    "country_name": "France",
    "country_id": "507f1f77bcf86cd799439015",
    "image_url": "https://example.com/images/france.jpg"
}
```

### 3. Location City (`type: "location_city"`)

Represents city-level personalization.

**Fields:**

- `type`: Always `"location_city"`
- `id`: LocationPersonalizationCity document ID (string)
- `score`: Fuzzy match score (0-100, float)
- `city_name`: City name (string)
- `city_id`: City document ID (string)
- `image_url`: Hero or thumbnail image URL (string, optional)

**Example:**

```json
{
    "type": "location_city",
    "id": "507f1f77bcf86cd799439011",
    "score": 95.5,
    "city_name": "Paris",
    "city_id": "507f1f77bcf86cd799439012",
    "image_url": "https://example.com/images/paris.jpg"
}
```

## Frontend Implementation Examples

### React Example

```jsx
import React, { useState, useEffect } from 'react'
import axios from 'axios'

const SearchComponent = () => {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleSearch = async (searchQuery) => {
        if (!searchQuery.trim()) {
            setResults([])
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await axios.get('/curation/search/', {
                params: { q: searchQuery }
            })
            setResults(response.data.results)
        } catch (err) {
            setError(err.response?.data?.error || 'Search failed')
            setResults([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            if (query) {
                handleSearch(query)
            }
        }, 300) // Debounce for 300ms

        return () => clearTimeout(debounceTimer)
    }, [query])

    const renderResult = (result) => {
        switch (result.type) {
            case 'experience':
                return (
                    <div
                        key={result.id}
                        className="result-item">
                        <img
                            src={result.portrait_image || result.landscape_image}
                            alt={result.name}
                        />
                        <div>
                            <h3>{result.name}</h3>
                            <p>Experience • Score: {result.score.toFixed(1)}</p>
                        </div>
                    </div>
                )
            case 'location_country':
                return (
                    <div
                        key={result.id}
                        className="result-item">
                        <img
                            src={result.image_url}
                            alt={result.country_name}
                        />
                        <div>
                            <h3>{result.country_name}</h3>
                            <p>Country • Score: {result.score.toFixed(1)}</p>
                        </div>
                    </div>
                )
            case 'location_city':
                return (
                    <div
                        key={result.id}
                        className="result-item">
                        <img
                            src={result.image_url}
                            alt={result.city_name}
                        />
                        <div>
                            <h3>{result.city_name}</h3>
                            <p>City • Score: {result.score.toFixed(1)}</p>
                        </div>
                    </div>
                )
            default:
                return null
        }
    }

    return (
        <div className="search-container">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search experiences, cities, countries..."
                className="search-input"
            />
            {loading && <div className="loading">Searching...</div>}
            {error && <div className="error">{error}</div>}
            <div className="results">{results.map(renderResult)}</div>
        </div>
    )
}

export default SearchComponent
```

### Vanilla JavaScript Example

```javascript
class SearchAPI {
    constructor(baseURL = '/curation/search/') {
        this.baseURL = baseURL
    }

    async search(query) {
        if (!query || !query.trim()) {
            return { query: '', count: 0, results: [] }
        }

        try {
            const url = new URL(this.baseURL, window.location.origin)
            url.searchParams.append('q', query.trim())

            const response = await fetch(url)

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Search failed')
            }

            return await response.json()
        } catch (error) {
            console.error('Search error:', error)
            throw error
        }
    }
}

// Usage
const searchAPI = new SearchAPI()

// With debouncing
let debounceTimer
const searchInput = document.getElementById('search-input')
const resultsContainer = document.getElementById('results')

searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer)
    const query = e.target.value

    debounceTimer = setTimeout(async () => {
        if (query.trim()) {
            try {
                const data = await searchAPI.search(query)
                displayResults(data.results)
            } catch (error) {
                displayError(error.message)
            }
        } else {
            resultsContainer.innerHTML = ''
        }
    }, 300)
})

function displayResults(results) {
    resultsContainer.innerHTML = results
        .map((result) => {
            const title = result.type === 'experience' ? result.name : result.type === 'location_country' ? result.country_name : result.city_name

            const image = result.image_url || result.portrait_image || result.landscape_image || ''

            return `
      <div class="result-item" data-type="${result.type}" data-id="${result.id}">
        ${image ? `<img src="${image}" alt="${title}" />` : ''}
        <div>
          <h3>${title}</h3>
          <p>${result.type.replace('_', ' ')} • Score: ${result.score.toFixed(1)}</p>
        </div>
      </div>
    `
        })
        .join('')
}

function displayError(message) {
    resultsContainer.innerHTML = `<div class="error">${message}</div>`
}
```

### Vue.js Example

```vue
<template>
    <div class="search-container">
        <input
            v-model="query"
            @input="debouncedSearch"
            type="text"
            placeholder="Search experiences, cities, countries..."
            class="search-input" />
        <div
            v-if="loading"
            class="loading">
            Searching...
        </div>
        <div
            v-if="error"
            class="error">
            {{ error }}
        </div>
        <div class="results">
            <div
                v-for="result in results"
                :key="result.id"
                :class="['result-item', `result-${result.type}`]">
                <img
                    :src="getImageUrl(result)"
                    :alt="getTitle(result)" />
                <div>
                    <h3>{{ getTitle(result) }}</h3>
                    <p>{{ formatType(result.type) }} • Score: {{ result.score.toFixed(1) }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import axios from 'axios'

export default {
    name: 'SearchComponent',
    data() {
        return {
            query: '',
            results: [],
            loading: false,
            error: null,
            debounceTimer: null
        }
    },
    methods: {
        async performSearch() {
            if (!this.query.trim()) {
                this.results = []
                return
            }

            this.loading = true
            this.error = null

            try {
                const response = await axios.get('/curation/search/', {
                    params: { q: this.query }
                })
                this.results = response.data.results
            } catch (err) {
                this.error = err.response?.data?.error || 'Search failed'
                this.results = []
            } finally {
                this.loading = false
            }
        },
        debouncedSearch() {
            clearTimeout(this.debounceTimer)
            this.debounceTimer = setTimeout(() => {
                this.performSearch()
            }, 300)
        },
        getTitle(result) {
            if (result.type === 'experience') return result.name
            if (result.type === 'location_country') return result.country_name
            if (result.type === 'location_city') return result.city_name
            return ''
        },
        getImageUrl(result) {
            return result.image_url || result.portrait_image || result.landscape_image || ''
        },
        formatType(type) {
            return type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
        }
    }
}
</script>
```

## Important Notes

### Result Limits

- The API returns a **maximum of 5 results total** (not 5 per type)
- Results are merged from all three models and sorted by relevance score

### Scoring

- Scores range from 0 to 100
- Higher scores indicate better matches
- Results are sorted by score in descending order

### Deduplication

- Results are automatically deduplicated by `type + id`
- If the same item appears in multiple search results, only one instance is returned

### Fuzzy Matching

- The API uses fuzzy matching, so partial matches and typos are handled gracefully
- Example: Searching "paris" will match "Paris", "París", etc.

### Performance

- Consider implementing debouncing (300-500ms) to avoid excessive API calls
- The API is optimized to fetch ~20 candidates per collection before filtering

## Error Handling Best Practices

```javascript
try {
    const response = await fetch('/curation/search/?q=' + encodeURIComponent(query))

    if (!response.ok) {
        if (response.status === 400) {
            // Bad request - missing or invalid query parameter
            const error = await response.json()
            console.error('Validation error:', error.error)
        } else if (response.status === 500) {
            // Server error
            console.error('Server error occurred')
        }
        return
    }

    const data = await response.json()
    // Process results
} catch (error) {
    // Network error or other exception
    console.error('Network error:', error)
}
```

## TypeScript Types (Optional)

```typescript
interface SearchResult {
    type: 'experience' | 'location_country' | 'location_city'
    id: string
    score: number
}

interface ExperienceResult extends SearchResult {
    type: 'experience'
    name: string
    identifier: string
    landscape_image?: string
    portrait_image?: string
}

interface LocationCountryResult extends SearchResult {
    type: 'location_country'
    country_name: string
    country_id: string
    image_url?: string
}

interface LocationCityResult extends SearchResult {
    type: 'location_city'
    city_name: string
    city_id: string
    image_url?: string
}

type SearchResultUnion = ExperienceResult | LocationCountryResult | LocationCityResult

interface SearchResponse {
    query: string
    count: number
    results: SearchResultUnion[]
}
```

## Testing

### Example Queries to Test

1. **City Search**: `q=paris`
2. **Country Search**: `q=france`
3. **Experience Search**: `q=eiffel`
4. **Partial Match**: `q=par` (should match Paris)
5. **Typo Handling**: `q=paris` vs `q=paris` (fuzzy matching)

### cURL Examples

```bash
# Basic search
curl "http://localhost:8000/curation/search/?q=paris"

# URL-encoded query
curl "http://localhost:8000/curation/search/?q=New%20York"
```

## Support

For issues or questions, please contact the backend team or refer to the main API documentation.
