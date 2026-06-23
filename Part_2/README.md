# Itinerary-Skeleton

A standalone, **frontend-only** copy of Rimigo's **Itinerary View**, running entirely on
dummy data — no backend, no API keys, no auth. Built for sharing/interview purposes.

It is the real production Itinerary feature (desktop Kanban board + mobile list/map view,
day cards, flight/transport/experience/meal/place/custom slots, hotels, route strip), lifted
out of the main `rimigo_web` app and fed from a single in-memory fixture.

## Quick start

```bash
npm install
npm run dev
```

Open the printed local URL. Any path redirects to the demo itinerary
(`/itinerary/RIMIGO-TRIP-DEMO000001`).

## How the dummy data works

There is **no server**. All "trip data" lives in one file:

- **`src/mocks/itineraryFixture.ts`** — the full dummy trip (Japan: Tokyo → Hakone → Kyoto,
  6 days / 5 nights), including days, slots, hotels and the derived route summary.
- **`src/lib/api/apiClient.ts`** — a mock of the app's API client. The real app fetches from
  the backend through this module; here it resolves the two itinerary endpoints from the
  fixture above and returns empty payloads for everything else. No network request is made.
- **`src/App.tsx`** — trimmed to mount only the Itinerary route (the production app's auth,
  analytics and other routes are not used here).

To change the trip, edit `src/mocks/itineraryFixture.ts`.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS v4 · TanStack Query · React Router.

## Scripts

| Command           | What it does            |
| ----------------- | ----------------------- |
| `npm run dev`     | Vite dev server         |
| `npm run build`   | Production build (Vite) |
| `npm run preview` | Preview the build       |
| `npm run lint`    | ESLint                  |
