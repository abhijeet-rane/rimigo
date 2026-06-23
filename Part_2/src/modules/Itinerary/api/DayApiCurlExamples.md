# Day API CUD Operations - cURL Examples

Based on the slot API pattern: `/api/trips/{tripId}/trip-itineraries/{itineraryId}/slots/`
Day API pattern: `/api/trips/{tripId}/trip-itineraries/{itineraryId}/days/`

## Variables
```bash
BASE_URL="https://api.example.com"  # Replace with actual base URL
TRIP_ID="your-trip-id"
ITINERARY_ID="your-itinerary-id"
DAY_ID="your-day-id"  # For update/delete operations
AUTH_TOKEN="your-auth-token"  # Bearer token or session token
```

## CREATE Day (POST)

```bash
curl -X POST "${BASE_URL}/api/trips/${TRIP_ID}/trip-itineraries/${ITINERARY_ID}/days/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "date": "2025-12-15",
    "base_city": {
      "id": "city-id-123",
      "name": "Paris",
      "country": "France"
    },
    "destination_city": {
      "id": "city-id-456",
      "name": "Lyon",
      "country": "France"
    },
    "type": "travel",
    "notes": "Optional notes for the day",
    "is_checkout_day": false,
    "is_checkin_day": false,
    "overnight_transit": false
  }'
```

## UPDATE Day (PUT - Full Update)

```bash
curl -X PUT "${BASE_URL}/api/trips/${TRIP_ID}/trip-itineraries/${ITINERARY_ID}/days/${DAY_ID}/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "date": "2025-12-15",
    "base_city": {
      "id": "city-id-789",
      "name": "Marseille",
      "country": "France"
    },
    "destination_city": null,
    "type": "stay",
    "notes": "Updated notes",
    "is_checkout_day": false,
    "is_checkin_day": false,
    "overnight_transit": false
  }'
```

## UPDATE Day (PATCH - Partial Update)

```bash
curl -X PATCH "${BASE_URL}/api/trips/${TRIP_ID}/trip-itineraries/${ITINERARY_ID}/days/${DAY_ID}/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "base_city": {
      "id": "city-id-789",
      "name": "Marseille",
      "country": "France"
    },
    "notes": "Updated notes only"
  }'
```

## DELETE Day (DELETE)

```bash
curl -X DELETE "${BASE_URL}/api/trips/${TRIP_ID}/trip-itineraries/${ITINERARY_ID}/days/${DAY_ID}/" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
```

## Example with Minimal Payload (Create)

```bash
curl -X POST "${BASE_URL}/api/trips/${TRIP_ID}/trip-itineraries/${ITINERARY_ID}/days/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "date": "2025-12-15",
    "base_city": {
      "id": "city-id-123",
      "name": "Paris",
      "country": "France"
    },
    "type": "travel",
    "is_checkout_day": false,
    "is_checkin_day": false,
    "overnight_transit": false
  }'
```

## Example: Update Only City (PATCH)

```bash
curl -X PATCH "${BASE_URL}/api/trips/${TRIP_ID}/trip-itineraries/${ITINERARY_ID}/days/${DAY_ID}/" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "base_city": {
      "id": "city-id-123",
      "name": "Paris",
      "country": "France"
    }
  }'
```

## Notes:
- Replace `${BASE_URL}`, `${TRIP_ID}`, `${ITINERARY_ID}`, `${DAY_ID}`, and `${AUTH_TOKEN}` with actual values
- Date format: `YYYY-MM-DD` (ISO 8601 date format)
- `base_city` is required for day operations
- `destination_city` is optional
- `type` field values may include: "travel", "stay", "transit", etc.
- Response format follows the slot API pattern: `{ data: IItineraryCompletedResponse }`

